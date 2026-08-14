import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus, ProductStatus } from '@prisma/client';
import { randomBytes } from 'crypto';
import Stripe from 'stripe';
import {
  isValidCpf,
  normalizeCep,
  normalizePhone,
  onlyDigits,
} from '../account/account.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCheckoutSessionDto } from './checkout.dto';

type ShippingSnapshot = {
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
};

@Injectable()
export class CheckoutService {
  private stripe: Stripe | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const key = this.config.get<string>('STRIPE_SECRET_KEY');
    if (key) {
      this.stripe = new Stripe(key);
    }
  }

  private requireStripe(): Stripe {
    if (!this.stripe) {
      throw new ServiceUnavailableException(
        'Stripe não configurado. Defina STRIPE_SECRET_KEY em api/.env (veja .env.example).',
      );
    }
    return this.stripe;
  }

  async createSession(
    dto: CreateCheckoutSessionDto,
    customerId: string,
  ): Promise<{ url: string; publicCode: string }> {
    const stripe = this.requireStripe();
    if (!customerId) {
      throw new UnauthorizedException('Faça login para finalizar a compra.');
    }
    if (!dto.items?.length) {
      throw new BadRequestException('Carrinho vazio.');
    }
    if (!dto.addressId && !dto.address) {
      throw new BadRequestException('Informe o endereço de entrega.');
    }

    const cpf = onlyDigits(dto.cpf);
    if (!isValidCpf(cpf)) {
      throw new BadRequestException('CPF inválido.');
    }
    const phone = normalizePhone(dto.phone);

    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
    });

    const shipping = await this.resolveShipping(customerId, dto);

    if (customer.cpf && customer.cpf !== cpf) {
      // allow correction at checkout; uniqueness checked below
    }
    const cpfTaken = await this.prisma.customer.findFirst({
      where: { cpf, NOT: { id: customerId } },
      select: { id: true },
    });
    if (cpfTaken) {
      throw new BadRequestException('Já existe uma conta com este CPF.');
    }
    await this.prisma.customer.update({
      where: { id: customerId },
      data: { cpf, phone },
    });

    const idempotencyKey =
      dto.idempotencyKey?.trim() || randomBytes(16).toString('hex');

    const existing = await this.prisma.order.findUnique({
      where: { idempotencyKey },
    });
    if (existing?.pspCheckoutId) {
      const session = await stripe.checkout.sessions.retrieve(existing.pspCheckoutId);
      if (session.url) {
        return { url: session.url, publicCode: existing.publicCode };
      }
    }

    const slugs = dto.items.map((i) => i.productSlug);
    const products = await this.prisma.product.findMany({
      where: { slug: { in: slugs }, status: ProductStatus.published },
    });
    const bySlug = new Map(products.map((p) => [p.slug, p]));

    let subtotalCents = 0;
    const lines: {
      productId: string;
      quantity: number;
      unitPriceCents: number;
      lineTotalCents: number;
      snapshot: object;
    }[] = [];

    for (const item of dto.items) {
      const product = bySlug.get(item.productSlug);
      if (!product) {
        throw new BadRequestException(`Produto não encontrado: ${item.productSlug}`);
      }
      if (product.stockQty < item.quantity) {
        throw new BadRequestException(`Estoque insuficiente: ${product.name}`);
      }
      const lineTotalCents = product.priceCents * item.quantity;
      subtotalCents += lineTotalCents;
      lines.push({
        productId: product.id,
        quantity: item.quantity,
        unitPriceCents: product.priceCents,
        lineTotalCents,
        snapshot: {
          slug: product.slug,
          name: product.name,
          priceCents: product.priceCents,
        },
      });
    }

    const shippingCents = 0;
    const totalCents = subtotalCents + shippingCents;
    const publicCode = `LC-${randomBytes(4).toString('hex').toUpperCase()}`;
    const storefront =
      this.config.get<string>('STOREFRONT_URL') ?? 'http://localhost:4200';

    const order = await this.prisma.order.create({
      data: {
        publicCode,
        customerId,
        guestEmail: null,
        status: OrderStatus.pending_payment,
        subtotalCents,
        shippingCents,
        totalCents,
        currency: 'BRL',
        buyerName: customer.name,
        buyerEmail: customer.email,
        buyerCpf: cpf,
        buyerPhone: phone,
        shippingAddress: shipping,
        pspName: 'stripe',
        idempotencyKey,
        items: {
          create: lines.map((l) => ({
            productId: l.productId,
            productSnapshot: l.snapshot,
            quantity: l.quantity,
            unitPriceCents: l.unitPriceCents,
            lineTotalCents: l.lineTotalCents,
          })),
        },
      },
    });

    const session = await stripe.checkout.sessions.create(
      {
        mode: 'payment',
        success_url: `${storefront}/checkout/sucesso?code=${publicCode}`,
        cancel_url: `${storefront}/checkout/cancelado?code=${publicCode}`,
        client_reference_id: order.id,
        customer_email: customer.email,
        metadata: {
          orderId: order.id,
          publicCode,
          cpfLast4: cpf.slice(-4),
        },
        line_items: lines.map((l) => {
          const snap = l.snapshot as { name: string };
          return {
            quantity: l.quantity,
            price_data: {
              currency: 'brl',
              unit_amount: l.unitPriceCents,
              product_data: { name: snap.name },
            },
          };
        }),
      },
      { idempotencyKey: `checkout-${idempotencyKey}` },
    );

    await this.prisma.order.update({
      where: { id: order.id },
      data: { pspCheckoutId: session.id },
    });

    if (!session.url) {
      throw new ServiceUnavailableException('Stripe não retornou URL de checkout.');
    }

    return { url: session.url, publicCode };
  }

  private async resolveShipping(
    customerId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<ShippingSnapshot> {
    if (dto.addressId) {
      const row = await this.prisma.address.findFirst({
        where: { id: dto.addressId, customerId },
      });
      if (!row) throw new BadRequestException('Endereço não encontrado.');
      return {
        cep: row.cep,
        street: row.street,
        number: row.number,
        complement: row.complement,
        district: row.district,
        city: row.city,
        state: row.state,
      };
    }

    const a = dto.address!;
    return {
      cep: normalizeCep(a.cep),
      street: a.street.trim(),
      number: a.number.trim(),
      complement: a.complement?.trim() || null,
      district: a.district.trim(),
      city: a.city.trim(),
      state: a.state.trim().toUpperCase(),
    };
  }

  async getOrderByPublicCode(publicCode: string) {
    const order = await this.prisma.order.findUnique({
      where: { publicCode },
      include: { items: true },
    });
    if (!order) throw new NotFoundException('Pedido não encontrado.');
    return this.toOrderDto(order);
  }

  /** Orders tied to the account. */
  async listOrdersForCustomer(customerId: string, email: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        OR: [{ customerId }, { guestEmail: email.toLowerCase() }],
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map((order) => this.toOrderDto(order));
  }

  private toOrderDto(order: {
    publicCode: string;
    status: OrderStatus;
    totalCents: number;
    currency: string;
    paidAt: Date | null;
    createdAt: Date;
    items: {
      quantity: number;
      lineTotalCents: number;
      productSnapshot: unknown;
    }[];
  }) {
    return {
      publicCode: order.publicCode,
      status: order.status,
      totalCents: order.totalCents,
      currency: order.currency,
      paidAt: order.paidAt,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        quantity: i.quantity,
        lineTotalCents: i.lineTotalCents,
        product: i.productSnapshot,
      })),
    };
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string) {
    const stripe = this.requireStripe();
    const secret = this.config.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!secret) {
      throw new ServiceUnavailableException(
        'Defina STRIPE_WEBHOOK_SECRET em api/.env',
      );
    }

    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, secret);
    } catch {
      throw new BadRequestException('Assinatura Stripe inválida.');
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId ?? session.client_reference_id;
      if (!orderId) return { received: true };

      const existingEvent = await this.prisma.paymentEvent.findUnique({
        where: { pspEventId: event.id },
      });
      if (existingEvent) return { received: true };

      await this.prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true },
        });
        if (!order) return;

        await tx.paymentEvent.create({
          data: {
            orderId: order.id,
            psp: 'stripe',
            eventType: event.type,
            pspEventId: event.id,
            payload: event as object,
            verified: true,
          },
        });

        if (order.status === OrderStatus.paid) return;

        await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.paid,
            paidAt: new Date(),
            pspPaymentId:
              typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id ?? null,
          },
        });

        for (const item of order.items) {
          await tx.product.update({
            where: { id: item.productId },
            data: { stockQty: { decrement: item.quantity } },
          });
        }
      });
    }

    return { received: true };
  }
}
