import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { CustomerGuard } from './customer.guard';
import { RateLimitGuard } from './rate-limit.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, CustomerGuard, RateLimitGuard],
  exports: [AuthService, CustomerGuard],
})
export class AuthModule {}
