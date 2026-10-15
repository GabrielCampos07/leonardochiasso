import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  Allow,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import {
  GENDER_LISTS,
  GENDER_LIST_REQUIRED_MESSAGE,
  PRODUCT_GENDERS,
  PRODUCT_GENDER_MESSAGE,
} from '../../catalog/gender';

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

  /** Category slug = gender: feminino | masculino | unissex */
  @IsString()
  @IsIn([...PRODUCT_GENDERS], { message: PRODUCT_GENDER_MESSAGE })
  category!: (typeof PRODUCT_GENDERS)[number];

  /** Alias sent by the admin front; when present it wins over category. */
  @IsOptional()
  @IsString()
  @IsIn([...PRODUCT_GENDERS], { message: 'gender must be feminino, masculino or unissex.' })
  gender?: (typeof PRODUCT_GENDERS)[number];

  @IsString()
  @Matches(SLUG_PATTERN, {
    message: 'collectionSlug must be a valid kebab-case slug.',
  })
  @MaxLength(160)
  collectionSlug!: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999_999_999, { message: 'Preço máximo: R$ 9.999.999,99.' })
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
  @IsInt({ message: 'Estoque deve ser um número inteiro.' })
  @Min(0, { message: 'Estoque não pode ser negativo.' })
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
  @IsIn([...PRODUCT_GENDERS], { message: PRODUCT_GENDER_MESSAGE })
  category?: (typeof PRODUCT_GENDERS)[number];

  /** Alias sent by the admin front; when present it wins over category. */
  @IsOptional()
  @IsString()
  @IsIn([...PRODUCT_GENDERS], { message: 'gender must be feminino, masculino or unissex.' })
  gender?: (typeof PRODUCT_GENDERS)[number];

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
  @Max(999_999_999, { message: 'Preço máximo: R$ 9.999.999,99.' })
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
  @IsInt({ message: 'Estoque deve ser um número inteiro.' })
  @Min(0, { message: 'Estoque não pode ser negativo.' })
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
  @ArrayUnique({ message: 'A lista de peças contém slugs repetidos.' })
  @IsString({ each: true })
  @Matches(SLUG_PATTERN, {
    each: true,
    message: 'productSlugs must contain valid kebab-case slugs.',
  })
  productSlugs!: string[];
}

export class CollectionGenderQueryDto {
  @IsIn([...GENDER_LISTS], { message: GENDER_LIST_REQUIRED_MESSAGE })
  gender!: (typeof GENDER_LISTS)[number];
}

export class ReorderCollectionGenderDto {
  @IsArray()
  @ArrayUnique({ message: 'A lista de peças contém itens repetidos.' })
  @IsUUID('4', { each: true })
  productIds!: string[];
}
