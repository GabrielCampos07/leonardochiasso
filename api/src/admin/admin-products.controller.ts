import { Body, Controller, Param, Patch, UseGuards } from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminProductsService } from './admin-products.service';

class PatchProductDto {
  path!: string;
  value!: unknown;
}

@Controller('api/admin/products')
@UseGuards(AdminGuard)
export class AdminProductsController {
  constructor(private readonly products: AdminProductsService) {}

  @Patch(':slug')
  patch(@Param('slug') slug: string, @Body() dto: PatchProductDto) {
    return this.products.patchBySlug(slug, dto.path, dto.value);
  }
}
