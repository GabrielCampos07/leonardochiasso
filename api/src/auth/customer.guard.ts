import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import type { CustomerDto } from './dto/auth.dto';

export interface CustomerRequest extends Request {
  customer?: CustomerDto;
}

/** Reads the session cookie set at login/register (populated by cookie-parser). */
export function sessionTokenFrom(
  req: Request,
  cookieName: string,
): string | undefined {
  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  return cookies?.[cookieName];
}

/** Rejects the request with 401 unless a valid customer session cookie is present. */
@Injectable()
export class CustomerGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<CustomerRequest>();
    const token = sessionTokenFrom(req, this.auth.cookieName);
    const customer = await this.auth.customerFromToken(token);
    if (!customer) {
      throw new UnauthorizedException('Sessão expirada ou inexistente.');
    }
    req.customer = {
      id: customer.id,
      email: customer.email,
      name: customer.name,
    };
    return true;
  }
}

/** Injects the customer attached by `CustomerGuard`. */
export const CurrentCustomer = createParamDecorator(
  (_data: unknown, context: ExecutionContext): CustomerDto => {
    const req = context.switchToHttp().getRequest<CustomerRequest>();
    if (!req.customer) {
      throw new UnauthorizedException('Sessão expirada ou inexistente.');
    }
    return req.customer;
  },
);
