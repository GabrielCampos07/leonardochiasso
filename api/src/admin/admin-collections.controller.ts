import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { AdminCollectionsService } from './admin-collections.service';
import {
  CreateCollectionDto,
  SetCollectionProductsDto,
  UpdateCollectionDto,
} from './dto/admin-products.dto';

@Controller('api/admin/collections')
@UseGuards(AdminGuard)
export class AdminCollectionsController {
  constructor(private readonly collections: AdminCollectionsService) {}

  @Get()
  list() {
    return this.collections.list();
  }

  @Post()
  create(@Body() dto: CreateCollectionDto) {
    return this.collections.create(dto);
  }

  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateCollectionDto) {
    return this.collections.update(slug, dto);
  }

  @Put(':slug/products')
  setProducts(
    @Param('slug') slug: string,
    @Body() dto: SetCollectionProductsDto,
  ) {
    return this.collections.setProducts(slug, dto.productSlugs);
  }
}
