import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AdminGuard } from './admin.guard';
import { parseArchivedFlag } from './archive-query';
import { CacheInvalidationInterceptor } from '../cache/cache-invalidation.interceptor';
import { AdminCollectionsService } from './admin-collections.service';
import {
  CreateCollectionDto,
  SetCollectionProductsDto,
  UpdateCollectionDto,
} from './dto/admin-products.dto';

@Controller('api/admin/collections')
@UseGuards(AdminGuard)
@UseInterceptors(CacheInvalidationInterceptor)
export class AdminCollectionsController {
  constructor(private readonly collections: AdminCollectionsService) {}

  @Get()
  list(@Query('archived') archived?: string) {
    return this.collections.list(parseArchivedFlag(archived));
  }

  @Post()
  create(@Body() dto: CreateCollectionDto) {
    return this.collections.create(dto);
  }

  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateCollectionDto) {
    return this.collections.update(slug, dto);
  }

  @Post(':slug/archive')
  archive(@Param('slug') slug: string) {
    return this.collections.archive(slug);
  }

  @Post(':slug/restore')
  restore(@Param('slug') slug: string) {
    return this.collections.restore(slug);
  }

  @Put(':slug/products')
  setProducts(
    @Param('slug') slug: string,
    @Body() dto: SetCollectionProductsDto,
  ) {
    return this.collections.setProducts(slug, dto.productSlugs);
  }
}
