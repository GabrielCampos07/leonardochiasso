import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Customer } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHmac, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { CustomerDto, LoginDto, RegisterDto } from './dto/auth.dto';
import type { ChangeEmailDto, ChangePasswordDto } from './dto/auth.dto';
import {
  DEFAULT_SESSION_COOKIE_NAME,
  SESSION_TTL_MS,
  sessionCookieOptions,
} from './session.constants';

@Injectable()
export class AuthService {
  readonly cookieName: string;
  private readonly sessionSecret: string;
  private readonly isProduction: boolean;
  private readonly devLoginEnabled: boolean;

  /**
   * Hash of a random throwaway secret. Verifying against it when an email is
   * unknown keeps login timing flat, so the endpoint cannot be used to
   * enumerate registered customers.
   */
  private readonly decoyHash = hashPassword(randomBytes(32).toString('hex'));

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.cookieName =
      config.get<string>('SESSION_COOKIE_NAME') ?? DEFAULT_SESSION_COOKIE_NAME;
    this.sessionSecret =
      config.get<string>('SESSION_SECRET') ?? 'lc-dev-session-secret';
    this.isProduction = config.get<string>('NODE_ENV') === 'production';
    this.devLoginEnabled =
      !this.isProduction &&
      config.get<string>('ENABLE_DEV_LOGIN') === 'true';
  }

  async register(dto: RegisterDto, res: Response): Promise<CustomerDto> {
    if (!dto.lgpdConsent) {
      throw new BadRequestException(
        'É necessário aceitar a política de privacidade (LGPD) para criar a conta.',
      );
    }

    const email = normalizeEmail(dto.email);
    const existing = await this.prisma.customer.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }

    const customer = await this.prisma.customer.create({
      data: {
        email,
        name: dto.name.trim(),
        passwordHash: await hashPassword(dto.password),
        lgpdConsentAt: new Date(),
      },
    });

    await this.issueSession(customer.id, res);
    return toCustomerDto(customer);
  }

  async login(dto: LoginDto, res: Response): Promise<CustomerDto> {
    const email = normalizeEmail(dto.email);
    const customer = await this.prisma.customer.findUnique({
      where: { email },
    });

    const valid = await argon2.verify(
      customer?.passwordHash ?? (await this.decoyHash),
      dto.password,
    );
    if (!customer || !valid) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }

    await this.prisma.session.deleteMany({
      where: { customerId: customer.id, expiresAt: { lt: new Date() } },
    });
    await this.issueSession(customer.id, res);
    return toCustomerDto(customer);
  }

  /**
   * Instant local session for UX work.
   * Requires ENABLE_DEV_LOGIN=true and NODE_ENV !== production.
   */
  async devLogin(res: Response): Promise<CustomerDto> {
    if (!this.devLoginEnabled) {
      throw new UnauthorizedException('Dev login desabilitado.');
    }

    const email = 'dev@leonardochiasso.local';
    let customer = await this.prisma.customer.findUnique({ where: { email } });
    if (!customer) {
      customer = await this.prisma.customer.create({
        data: {
          email,
          name: 'Dev Leonardo Chiasso',
          passwordHash: await hashPassword('dev-login-only'),
          lgpdConsentAt: new Date(),
        },
      });
    }

    await this.prisma.session.deleteMany({
      where: { customerId: customer.id, expiresAt: { lt: new Date() } },
    });
    await this.issueSession(customer.id, res);
    return toCustomerDto(customer);
  }

  async logout(token: string | undefined, res: Response): Promise<void> {
    if (token) {
      await this.prisma.session.deleteMany({
        where: { tokenHash: this.hashToken(token) },
      });
    }
    res.clearCookie(this.cookieName, {
      ...sessionCookieOptions(this.isProduction),
      maxAge: undefined,
    });
  }

  async changePassword(
    customerId: string,
    dto: ChangePasswordDto,
    res: Response,
  ): Promise<CustomerDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new UnauthorizedException('Sessão expirada ou inexistente.');
    }

    const valid = await argon2.verify(customer.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual.',
      );
    }

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { passwordHash: await hashPassword(dto.newPassword) },
    });

    // Invalidate every session, then mint a fresh one for this browser.
    await this.prisma.session.deleteMany({ where: { customerId } });
    await this.issueSession(customerId, res);
    return toCustomerDto(customer);
  }

  async changeEmail(
    customerId: string,
    dto: ChangeEmailDto,
  ): Promise<CustomerDto> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new UnauthorizedException('Sessão expirada ou inexistente.');
    }

    const valid = await argon2.verify(customer.passwordHash, dto.currentPassword);
    if (!valid) {
      throw new UnauthorizedException('Senha atual incorreta.');
    }

    const email = normalizeEmail(dto.email);
    if (email === customer.email) {
      throw new BadRequestException('Informe um e-mail diferente do atual.');
    }

    const taken = await this.prisma.customer.findUnique({
      where: { email },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException('Já existe uma conta com este e-mail.');
    }

    const updated = await this.prisma.customer.update({
      where: { id: customerId },
      data: { email },
    });
    return toCustomerDto(updated);
  }

  /** Resolves the customer behind a session token, or null when absent/expired. */
  async customerFromToken(token: string | undefined): Promise<Customer | null> {
    if (!token) return null;

    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { customer: true },
    });
    if (!session) return null;

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.prisma.session.delete({ where: { id: session.id } });
      return null;
    }
    return session.customer;
  }

  private async issueSession(customerId: string, res: Response): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    await this.prisma.session.create({
      data: {
        customerId,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + SESSION_TTL_MS),
      },
    });
    res.cookie(this.cookieName, token, sessionCookieOptions(this.isProduction));
  }

  /** Only the HMAC of a session token is persisted; the raw token lives in the cookie. */
  private hashToken(token: string): string {
    return createHmac('sha256', this.sessionSecret).update(token).digest('hex');
  }
}

export function toCustomerDto(customer: Customer): CustomerDto {
  return {
    id: customer.id,
    email: customer.email,
    name: customer.name,
    cpf: customer.cpf,
    phone: customer.phone,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, { type: argon2.argon2id });
}
