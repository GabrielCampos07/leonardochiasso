import { Controller, Get, Header, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CollectionDetailDto, CollectionDto, ProductDto } from './dto/catalog.dto';

@Controller('api')
export class CatalogController {
  constructor(private readonly catalog: CatalogService) {}

  @Get('products')
  @Header('Cache-Control', 'public, max-age=60')
  listProducts(): Promise<ProductDto[]> {
    return this.catalog.listProducts();
  }

  @Get('products/:slug')
  @Header('Cache-Control', 'public, max-age=60')
  getProduct(@Param('slug') slug: string): Promise<ProductDto> {
    return this.catalog.getProductBySlug(slug);
  }

  @Get('collections')
  @Header('Cache-Control', 'public, max-age=60')
  listCollections(): Promise<CollectionDto[]> {
    return this.catalog.listCollections();
  }

  @Get('collections/:slug')
  @Header('Cache-Control', 'public, max-age=60')
  getCollection(@Param('slug') slug: string): Promise<CollectionDetailDto> {
    return this.catalog.getCollectionBySlug(slug);
  }
}
