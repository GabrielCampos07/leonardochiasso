import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { CurrentCustomer, CustomerGuard } from '../auth/customer.guard';
import { ReplaceWishlistDto } from '../auth/dto/auth.dto';
import type { CustomerDto } from '../auth/dto/auth.dto';
import { WishlistService } from './wishlist.service';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

@Controller('api/wishlist')
@UseGuards(CustomerGuard)
export class WishlistController {
  constructor(private readonly wishlist: WishlistService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(@CurrentCustomer() customer: CustomerDto): Promise<string[]> {
    return this.wishlist.list(customer.id);
  }

  @Put()
  @Header('Cache-Control', 'no-store')
  replace(
    @CurrentCustomer() customer: CustomerDto,
    @Body() dto: ReplaceWishlistDto,
  ): Promise<string[]> {
    return this.wishlist.replace(customer.id, dto.productSlugs);
  }

  @Post(':slug')
  @Header('Cache-Control', 'no-store')
  add(
    @CurrentCustomer() customer: CustomerDto,
    @Param('slug') slug: string,
  ): Promise<string[]> {
    return this.wishlist.add(customer.id, assertSlug(slug));
  }

  @Delete(':slug')
  @Header('Cache-Control', 'no-store')
  remove(
    @CurrentCustomer() customer: CustomerDto,
    @Param('slug') slug: string,
  ): Promise<string[]> {
    return this.wishlist.remove(customer.id, assertSlug(slug));
  }
}

function assertSlug(slug: string): string {
  if (!SLUG_PATTERN.test(slug)) {
    throw new BadRequestException(`Slug inválido: ${slug}`);
  }
  return slug;
}
