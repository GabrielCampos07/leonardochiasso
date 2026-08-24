import { Module } from '@nestjs/common';
import { AdminAuthController } from './admin-auth.controller';
import { AdminAuthService } from './admin-auth.service';
import { AdminCollectionsController } from './admin-collections.controller';
import { AdminCollectionsService } from './admin-collections.service';
import { AdminGuard } from './admin.guard';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';

@Module({
  controllers: [
    AdminAuthController,
    AdminProductsController,
    AdminCollectionsController,
  ],
  providers: [
    AdminAuthService,
    AdminProductsService,
    AdminCollectionsService,
    AdminGuard,
  ],
  exports: [AdminAuthService, AdminGuard],
})
export class AdminModule {}
