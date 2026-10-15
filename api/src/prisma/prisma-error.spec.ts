import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { mapPrismaWriteError, unknownProductSlugsMessage } from './prisma-error';

function known(code: string) {
  return new Prisma.PrismaClientKnownRequestError('prisma', {
    code,
    clientVersion: '6.19.3',
  });
}

describe('prisma write errors', () => {
  it('maps P2002 to 409, P2025 to 404, P2028 to 503', () => {
    expect(() => mapPrismaWriteError(known('P2002'))).toThrow(ConflictException);
    expect(() => mapPrismaWriteError(known('P2025'))).toThrow(NotFoundException);
    expect(() => mapPrismaWriteError(known('P2028'))).toThrow(
      ServiceUnavailableException,
    );
  });

  it('does not emit an empty Unknown product slugs: message', () => {
    expect(unknownProductSlugsMessage([])).toBe(
      'A lista de peças contém slugs repetidos.',
    );
    expect(unknownProductSlugsMessage(['sumiu'])).toBe(
      'Unknown product slugs: sumiu',
    );
  });
});
