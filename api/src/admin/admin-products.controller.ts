import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminProductsService } from './admin-products.service';
import {
  AttachProductMediaDto,
  CreateProductDto,
  PatchProductFieldDto,
  ReorderProductMediaDto,
  ReorderProductsDto,
  UpdateProductDto,
} from './dto/admin-products.dto';

@Controller('api/admin/products')
@UseGuards(AdminGuard)
export class AdminProductsController {
  constructor(private readonly products: AdminProductsService) {}

  @Get()
  list() {
    return this.products.list();
  }

  @Post()
  create(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Put('reorder')
  reorder(@Body() dto: ReorderProductsDto) {
    return this.products.reorder(dto.orderedSlugs);
  }

  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateProductDto) {
    return this.products.update(slug, dto);
  }

  /** Nested path/value patch for CMS editors (pieces, colorVariants, …). */
  @Patch(':slug/field')
  patchField(@Param('slug') slug: string, @Body() dto: PatchProductFieldDto) {
    return this.products.patchBySlug(slug, dto.path, dto.value);
  }

  @Put(':slug/media/reorder')
  reorderMedia(
    @Param('slug') slug: string,
    @Body() dto: ReorderProductMediaDto,
  ) {
    return this.products.reorderMedia(slug, dto.mediaIds);
  }

  @Post(':slug/media')
  attachMedia(@Param('slug') slug: string, @Body() dto: AttachProductMediaDto) {
    return this.products.attachMedia(slug, dto);
  }

  @Delete(':slug/media/:id')
  detachMedia(@Param('slug') slug: string, @Param('id') id: string) {
    return this.products.detachMedia(slug, id);
  }
}
