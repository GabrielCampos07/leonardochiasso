import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CheckoutController, OrdersController, WebhooksController } from './checkout.controller';
import { CheckoutService } from './checkout.service';

@Module({
  imports: [AuthModule],
  controllers: [CheckoutController, OrdersController, WebhooksController],
  providers: [CheckoutService],
})
export class CheckoutModule {}
