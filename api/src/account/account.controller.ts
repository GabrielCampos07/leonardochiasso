import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentCustomer, CustomerGuard } from '../auth/customer.guard';
import type { CustomerDto } from '../auth/dto/auth.dto';
import { AddressBodyDto, UpdateProfileDto } from './account.dto';
import { AccountService } from './account.service';

@Controller('api/account')
@UseGuards(CustomerGuard)
export class AccountController {
  constructor(private readonly account: AccountService) {}

  @Get('profile')
  @Header('Cache-Control', 'no-store')
  getProfile(@CurrentCustomer() customer: CustomerDto) {
    return this.account.getProfile(customer.id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentCustomer() customer: CustomerDto,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.account.updateProfile(customer.id, dto);
  }

  @Get('addresses')
  @Header('Cache-Control', 'no-store')
  listAddresses(@CurrentCustomer() customer: CustomerDto) {
    return this.account.listAddresses(customer.id);
  }

  @Post('addresses')
  createAddress(
    @CurrentCustomer() customer: CustomerDto,
    @Body() dto: AddressBodyDto,
  ) {
    return this.account.createAddress(customer.id, dto);
  }

  @Patch('addresses/:id')
  updateAddress(
    @CurrentCustomer() customer: CustomerDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddressBodyDto,
  ) {
    return this.account.updateAddress(customer.id, id, dto);
  }

  @Delete('addresses/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteAddress(
    @CurrentCustomer() customer: CustomerDto,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.account.deleteAddress(customer.id, id);
  }
}
