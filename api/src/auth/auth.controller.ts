import {
  Body,
  Controller,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  CurrentCustomer,
  CustomerGuard,
  sessionTokenFrom,
} from './customer.guard';
import { LoginDto, RegisterDto, ChangePasswordDto, ChangeEmailDto } from './dto/auth.dto';
import type { CustomerDto } from './dto/auth.dto';
import { RateLimit, RateLimitGuard } from './rate-limit.guard';

@Controller('api/auth')
@UseGuards(RateLimitGuard)
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @RateLimit(5, 60_000)
  register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerDto> {
    return this.auth.register(dto, res);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(10, 60_000)
  login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerDto> {
    return this.auth.login(dto, res);
  }

  @Post('dev-login')
  @HttpCode(HttpStatus.OK)
  @RateLimit(30, 60_000)
  devLogin(@Res({ passthrough: true }) res: Response): Promise<CustomerDto> {
    return this.auth.devLogin(res);
  }

  @Post('password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CustomerGuard)
  @RateLimit(5, 60_000)
  changePassword(
    @CurrentCustomer() customer: CustomerDto,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<CustomerDto> {
    return this.auth.changePassword(customer.id, dto, res);
  }

  @Post('email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(CustomerGuard)
  @RateLimit(5, 60_000)
  changeEmail(
    @CurrentCustomer() customer: CustomerDto,
    @Body() dto: ChangeEmailDto,
  ): Promise<CustomerDto> {
    return this.auth.changeEmail(customer.id, dto);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RateLimit(30, 60_000)
  logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<void> {
    return this.auth.logout(sessionTokenFrom(req, this.auth.cookieName), res);
  }

  @Get('me')
  @UseGuards(CustomerGuard)
  @Header('Cache-Control', 'no-store')
  @RateLimit(120, 60_000)
  me(@CurrentCustomer() customer: CustomerDto): CustomerDto {
    return customer;
  }
}
