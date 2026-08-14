import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(8, { message: 'A senha deve ter ao menos 8 caracteres.' })
  @MaxLength(120)
  password!: string;

  @IsString()
  @MinLength(2, { message: 'Informe seu nome.' })
  @MaxLength(120)
  name!: string;

  @IsBoolean({ message: 'Aceite os termos e a política de privacidade.' })
  lgpdConsent!: boolean;
}

export class LoginDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(180)
  email!: string;

  @IsString()
  @MaxLength(120)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MaxLength(120)
  currentPassword!: string;

  @IsString()
  @MinLength(8, { message: 'A nova senha deve ter ao menos 8 caracteres.' })
  @MaxLength(120)
  newPassword!: string;
}

export class ChangeEmailDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(180)
  email!: string;

  @IsString()
  @MaxLength(120)
  currentPassword!: string;
}

export class ReplaceWishlistDto {
  @IsArray()
  @ArrayMaxSize(300)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    each: true,
    message: 'productSlugs deve conter apenas slugs válidos.',
  })
  productSlugs!: string[];
}

/** Public customer shape — never exposes password hash or timestamps. */
export interface CustomerDto {
  id: string;
  email: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
}
