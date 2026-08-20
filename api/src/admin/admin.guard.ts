import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly adminAuth: AdminAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      cookies?: Record<string, string>;
      adminUser?: { email: string; role: string };
    }>();
    const user = await this.adminAuth.validateRequest(req.cookies ?? {});
    if (!user) throw new UnauthorizedException();
    req.adminUser = user;
    return true;
  }
}
