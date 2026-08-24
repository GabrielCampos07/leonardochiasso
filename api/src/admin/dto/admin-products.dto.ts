import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateProductDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must be a valid kebab-case slug.' })
  @MaxLength(160)
  slug!: string;

  /** Category slug: feminino | masculino */
  @IsString()
  @Matches(/^(feminino|masculino)$/, {
    message: 'category must be feminino or masculino.',
  })
  category!: 'feminino' | 'masculino';

  @IsString()
  @Matches(SLUG_PATTERN, {
    message: 'collectionSlug must be a valid kebab-case slug.',
  })
  @MaxLength(160)
  collectionSlug!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents!: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fabric?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  season?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsBoolean()
  artCouture?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  recommendOrder?: number;
}

export class UpdateProductDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must be a valid kebab-case slug.' })
  @MaxLength(160)
  slug?: string;

  @IsOptional()
  @IsString()
  @Matches(/^(feminino|masculino)$/, {
    message: 'category must be feminino or masculino.',
  })
  category?: 'feminino' | 'masculino';

  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, {
    message: 'collectionSlug must be a valid kebab-case slug.',
  })
  @MaxLength(160)
  collectionSlug?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  priceCents?: number;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shippingCopy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  color?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  size?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  fabric?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  season?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQty?: number;

  @IsOptional()
  @IsBoolean()
  artCouture?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  recommendOrder?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  details?: string[];

  @IsOptional()
  @Allow()
  pieces?: unknown;

  @IsOptional()
  @Allow()
  colorVariants?: unknown;

  @IsOptional()
  @Allow()
  imageBindings?: unknown;
}

/** Legacy nested field patch (path/value) used by CMS editors. */
export class PatchProductFieldDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  path!: string;

  @Allow()
  value!: unknown;
}

export class ReorderProductsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  @Matches(SLUG_PATTERN, {
    each: true,
    message: 'orderedSlugs must contain valid kebab-case slugs.',
  })
  orderedSlugs!: string[];
}

export class ReorderProductMediaDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  mediaIds!: string[];
}

export class AttachProductMediaDto {
  @IsUUID('4')
  mediaAssetId!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateCollectionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must be a valid kebab-case slug.' })
  @MaxLength(160)
  slug!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  publishedAt?: string | null;
}

export class UpdateCollectionDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  /** ISO date string, or null to unpublish. */
  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsString()
  publishedAt?: string | null;
}

export class SetCollectionProductsDto {
  @IsArray()
  @IsString({ each: true })
  @Matches(SLUG_PATTERN, {
    each: true,
    message: 'productSlugs must contain valid kebab-case slugs.',
  })
  productSlugs!: string[];
}
