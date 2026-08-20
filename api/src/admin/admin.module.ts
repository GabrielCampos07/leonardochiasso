import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard } from './admin.guard';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';

@Module({
  controllers: [AdminAuthController, AdminProductsController],
  providers: [AdminAuthService, AdminProductsService, AdminGuard],
  exports: [AdminAuthService, AdminGuard],
})
export class AdminModule {}
