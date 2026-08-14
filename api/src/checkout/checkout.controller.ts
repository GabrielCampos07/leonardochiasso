import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  CurrentCustomer,
  CustomerGuard,
} from '../auth/customer.guard';
import type { CustomerDto } from '../auth/dto/auth.dto';
import { CreateCheckoutSessionDto } from './checkout.dto';
import { CheckoutService } from './checkout.service';

@Controller('api/checkout')
export class CheckoutController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('sessions')
  @UseGuards(CustomerGuard)
  createSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentCustomer() customer: CustomerDto,
  ) {
    return this.checkout.createSession(dto, customer.id);
  }

  @Get('orders/:publicCode')
  getOrder(@Param('publicCode') publicCode: string) {
    return this.checkout.getOrderByPublicCode(publicCode);
  }
}

@Controller('api/orders')
@UseGuards(CustomerGuard)
export class OrdersController {
  constructor(private readonly checkout: CheckoutService) {}

  @Get()
  listMine(@CurrentCustomer() customer: CustomerDto) {
    return this.checkout.listOrdersForCustomer(customer.id, customer.email);
  }
}

@Controller('api/webhooks')
export class WebhooksController {
  constructor(private readonly checkout: CheckoutService) {}

  @Post('stripe')
  async stripe(
    @Req() req: Request & { rawBody?: Buffer },
    @Headers('stripe-signature') signature: string,
  ) {
    const raw = req.rawBody;
    if (!raw || !signature) {
      return { received: false, error: 'missing body or signature' };
    }
    return this.checkout.handleStripeWebhook(raw, signature);
  }
}
