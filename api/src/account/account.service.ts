import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddressBodyDto,
  AddressDto,
  ProfileDto,
  UpdateProfileDto,
} from './account.dto';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(customerId: string): Promise<ProfileDto> {
    const customer = await this.prisma.customer.findUniqueOrThrow({
      where: { id: customerId },
    });
    return toProfile(customer);
  }

  async updateProfile(
    customerId: string,
    dto: UpdateProfileDto,
  ): Promise<ProfileDto> {
    const data: {
      name?: string;
      email?: string;
      cpf?: string | null;
      phone?: string | null;
    } = {};

    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) {
      data.phone = normalizePhone(dto.phone);
    }
    if (dto.cpf !== undefined) {
      const cpf = onlyDigits(dto.cpf);
      if (!isValidCpf(cpf)) {
        throw new BadRequestException('CPF inválido.');
      }
      data.cpf = cpf;
    }

    if (data.email) {
      const taken = await this.prisma.customer.findFirst({
        where: { email: data.email, NOT: { id: customerId } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Já existe uma conta com este e-mail.');
    }
    if (data.cpf) {
      const taken = await this.prisma.customer.findFirst({
        where: { cpf: data.cpf, NOT: { id: customerId } },
        select: { id: true },
      });
      if (taken) throw new ConflictException('Já existe uma conta com este CPF.');
    }

    const customer = await this.prisma.customer.update({
      where: { id: customerId },
      data,
    });
    return toProfile(customer);
  }

  async listAddresses(customerId: string): Promise<AddressDto[]> {
    const rows = await this.prisma.address.findMany({
      where: { customerId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
    return rows.map(toAddress);
  }

  async createAddress(
    customerId: string,
    dto: AddressBodyDto,
  ): Promise<AddressDto> {
    const isDefault = dto.isDefault ?? false;
    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }
    const count = await this.prisma.address.count({ where: { customerId } });
    const row = await this.prisma.address.create({
      data: {
        customerId,
        label: dto.label?.trim() || null,
        cep: normalizeCep(dto.cep),
        street: dto.street.trim(),
        number: dto.number.trim(),
        complement: dto.complement?.trim() || null,
        district: dto.district.trim(),
        city: dto.city.trim(),
        state: dto.state.trim().toUpperCase(),
        isDefault: isDefault || count === 0,
      },
    });
    return toAddress(row);
  }

  async updateAddress(
    customerId: string,
    addressId: string,
    dto: AddressBodyDto,
  ): Promise<AddressDto> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
    });
    if (!existing) throw new NotFoundException('Endereço não encontrado.');

    if (dto.isDefault) {
      await this.prisma.address.updateMany({
        where: { customerId },
        data: { isDefault: false },
      });
    }

    const row = await this.prisma.address.update({
      where: { id: addressId },
      data: {
        label: dto.label?.trim() || null,
        cep: normalizeCep(dto.cep),
        street: dto.street.trim(),
        number: dto.number.trim(),
        complement: dto.complement?.trim() || null,
        district: dto.district.trim(),
        city: dto.city.trim(),
        state: dto.state.trim().toUpperCase(),
        isDefault: dto.isDefault ?? existing.isDefault,
      },
    });
    return toAddress(row);
  }

  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    const existing = await this.prisma.address.findFirst({
      where: { id: addressId, customerId },
    });
    if (!existing) throw new NotFoundException('Endereço não encontrado.');
    await this.prisma.address.delete({ where: { id: addressId } });
    if (existing.isDefault) {
      const next = await this.prisma.address.findFirst({
        where: { customerId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
  }
}

function toProfile(c: {
  id: string;
  email: string;
  name: string;
  cpf: string | null;
  phone: string | null;
}): ProfileDto {
  return {
    id: c.id,
    email: c.email,
    name: c.name,
    cpf: c.cpf,
    phone: c.phone,
  };
}

function toAddress(a: {
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
}): AddressDto {
  return {
    id: a.id,
    label: a.label,
    cep: a.cep,
    street: a.street,
    number: a.number,
    complement: a.complement,
    district: a.district,
    city: a.city,
    state: a.state,
    isDefault: a.isDefault,
  };
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function normalizeCep(cep: string): string {
  const d = onlyDigits(cep);
  return d.length === 8 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

export function normalizePhone(phone: string): string {
  return onlyDigits(phone);
}

/** Classic CPF check digits. */
export function isValidCpf(cpf: string): boolean {
  const digits = onlyDigits(cpf);
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calc = (base: string, factor: number) => {
    let sum = 0;
    for (let i = 0; i < base.length; i++) {
      sum += Number(base[i]) * (factor - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };
  const d1 = calc(digits.slice(0, 9), 10);
  const d2 = calc(digits.slice(0, 10), 11);
  return d1 === Number(digits[9]) && d2 === Number(digits[10]);
}
