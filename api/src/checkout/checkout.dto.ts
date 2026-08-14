import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class CheckoutLineDto {
  @IsString()
  productSlug!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CheckoutAddressInlineDto {
  @IsString()
  @Matches(/^\d{5}-?\d{3}$/, { message: 'Informe um CEP válido.' })
  cep!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(180)
  street!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  number!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  complement?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  district!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  city!: string;

  @IsString()
  @Matches(/^[A-Za-z]{2}$/, { message: 'UF inválida.' })
  state!: string;
}

/** Auth-only checkout — CPF, phone and shipping address required. */
export class CreateCheckoutSessionDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CheckoutLineDto)
  items!: CheckoutLineDto[];

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{11}$/, { message: 'Informe um CPF válido.' })
  cpf!: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{10,13}$/, { message: 'Informe um telefone válido.' })
  phone!: string;

  @IsOptional()
  @IsUUID()
  addressId?: string;

  @ValidateIf((o: CreateCheckoutSessionDto) => !o.addressId)
  @ValidateNested()
  @Type(() => CheckoutAddressInlineDto)
  address?: CheckoutAddressInlineDto;

  @IsOptional()
  @IsUUID()
  idempotencyKey?: string;
}
