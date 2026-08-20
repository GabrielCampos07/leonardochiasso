import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AdminRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { createHmac, randomBytes } from 'node:crypto';
import type { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import {
  ADMIN_SESSION_COOKIE_NAME,
  ADMIN_SESSION_TTL_MS,
  adminSessionCookieOptions,
} from './admin-session.constants';

export interface AdminUserDto {
  email: string;
  role: string;
}

@Injectable()
export class AdminAuthService {
  private readonly secret: string;
  private readonly isProduction: boolean;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.secret = config.get<string>('SESSION_SECRET') ?? 'lc-dev-session-secret';
    this.isProduction = config.get<string>('NODE_ENV') === 'production';
  }

  async login(email: string, password: string, res: Response): Promise<AdminUserDto> {
    const normalized = email.trim().toLowerCase();
    const user = await this.prisma.adminUser.findUnique({ where: { email: normalized } });
    if (!user || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }
    await this.issueSession(user.id, res);
    return { email: user.email, role: user.role };
  }

  async logout(res: Response, cookies: Record<string, string>): Promise<void> {
    const token = cookies[ADMIN_SESSION_COOKIE_NAME];
    if (token) {
      await this.prisma.adminSession.deleteMany({
        where: { tokenHash: hashToken(this.secret, token) },
      });
    }
    res.clearCookie(ADMIN_SESSION_COOKIE_NAME, adminSessionCookieOptions(this.isProduction));
  }

  async validateRequest(cookies: Record<string, string>): Promise<AdminUserDto | null> {
    const token = cookies[ADMIN_SESSION_COOKIE_NAME];
    if (!token) return null;
    const session = await this.prisma.adminSession.findUnique({
      where: { tokenHash: hashToken(this.secret, token) },
      include: { adminUser: true },
    });
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.prisma.adminSession.delete({ where: { id: session.id } });
      }
      return null;
    }
    return { email: session.adminUser.email, role: session.adminUser.role };
  }

  async ensureSeedAdmin(email: string, password: string, role: AdminRole = AdminRole.owner): Promise<void> {
    const normalized = email.trim().toLowerCase();
    const existing = await this.prisma.adminUser.findUnique({ where: { email: normalized } });
    if (existing) return;
    await this.prisma.adminUser.create({
      data: {
        email: normalized,
        passwordHash: await argon2.hash(password),
        role,
      },
    });
  }

  private async issueSession(adminUserId: string, res: Response): Promise<void> {
    const token = randomBytes(32).toString('base64url');
    const tokenHash = hashToken(this.secret, token);
    await this.prisma.adminSession.create({
      data: {
        adminUserId,
        tokenHash,
        expiresAt: new Date(Date.now() + ADMIN_SESSION_TTL_MS),
      },
    });
    res.cookie(ADMIN_SESSION_COOKIE_NAME, token, adminSessionCookieOptions(this.isProduction));
  }
}

function hashToken(secret: string, token: string): string {
  return createHmac('sha256', secret).update(token).digest('hex');
}
