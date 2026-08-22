import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { Request, Response } from 'express';
import { AdminAuthService } from './admin-auth.service';
import { AdminGuard } from './admin.guard';

class AdminLoginDto {
  @IsEmail({}, { message: 'Informe um e-mail válido.' })
  @MaxLength(180)
  email!: string;

  @IsString()
  @MinLength(1, { message: 'Informe a senha.' })
  @MaxLength(120)
  password!: string;
}

@Controller('api/admin/auth')
export class AdminAuthController {
  constructor(private readonly auth: AdminAuthService) {}

  @Post('login')
  login(@Body() dto: AdminLoginDto, @Res({ passthrough: true }) res: Response) {
    return this.auth.login(dto.email, dto.password, res);
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.auth.logout(res, (req.cookies ?? {}) as Record<string, string>);
  }

  @Get('me')
  @UseGuards(AdminGuard)
  me(@Req() req: Request & { adminUser?: { email: string; role: string } }) {
    return req.adminUser!;
  }
}
