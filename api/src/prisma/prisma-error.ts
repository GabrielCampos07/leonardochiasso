import {
  ConflictException,
  HttpException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

export function mapPrismaWriteError(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      throw new ConflictException('Registro já existe.');
    }
    if (err.code === 'P2025') {
      throw new NotFoundException('Registro não encontrado.');
    }
    if (err.code === 'P2028') {
      throw new ServiceUnavailableException(
        'A operação demorou demais. Tente de novo.',
      );
    }
  }
  throw err;
}

export function rethrowIfHttpOrPrisma(err: unknown): never {
  if (err instanceof HttpException) throw err;
  mapPrismaWriteError(err);
}

export function unknownProductSlugsMessage(missing: string[]): string {
  if (missing.length === 0) {
    return 'A lista de peças contém slugs repetidos.';
  }
  return `Unknown product slugs: ${missing.join(', ')}`;
}
