import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';

interface RateLimitConfig {
  limit: number;
  windowMs: number;
}

const RATE_LIMIT_KEY = 'lc:rate-limit';
const DEFAULT_CONFIG: RateLimitConfig = { limit: 10, windowMs: 60_000 };

/** Caps attempts per client IP for a single route. */
export const RateLimit = (limit: number, windowMs = 60_000) =>
  SetMetadata(RATE_LIMIT_KEY, { limit, windowMs } satisfies RateLimitConfig);

/**
 * Deliberately in-memory and per-process: enough to blunt credential stuffing
 * on a single-node deploy. Swap for Redis when the API scales horizontally.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config =
      this.reflector.get<RateLimitConfig>(
        RATE_LIMIT_KEY,
        context.getHandler(),
      ) ?? DEFAULT_CONFIG;

    const req = context.switchToHttp().getRequest<Request>();
    const key = `${context.getClass().name}.${context.getHandler().name}:${req.ip ?? 'unknown'}`;
    const now = Date.now();

    this.sweep(now);

    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + config.windowMs });
      return true;
    }

    entry.count += 1;
    if (entry.count > config.limit) {
      throw new HttpException(
        'Muitas tentativas. Aguarde alguns instantes e tente novamente.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private sweep(now: number): void {
    for (const [key, entry] of this.hits) {
      if (entry.resetAt <= now) this.hits.delete(key);
    }
  }
}
