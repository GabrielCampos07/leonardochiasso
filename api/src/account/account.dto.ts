import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Informe seu nome.' })
  @MaxLength(120)
  name?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(180)
  email?: string;

  /** Digits only or formatted; stored as 11 digits. */
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{11}$/, { message: 'Informe um CPF válido.' })
  cpf?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.replace(/\D/g, '') : value,
  )
  @IsString()
  @Matches(/^\d{10,13}$/, {
    message: 'Informe um telefone válido (DDD + número).',
  })
  phone?: string;
}

export class AddressBodyDto {
  @IsOptional()
  @IsString()
  @MaxLength(60)
  label?: string;

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

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

export interface ProfileDto {
  id: string;
  email: string;
  name: string;
  cpf: string | null;
  phone: string | null;
}

export interface AddressDto {
  id: string;
  label: string | null;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  district: string;
  city: string;
  state: string;
  isDefault: boolean;
}
