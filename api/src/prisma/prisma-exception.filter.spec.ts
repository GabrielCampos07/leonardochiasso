import { HttpStatus } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaExceptionFilter } from './prisma-exception.filter';

function known(code: string) {
  return new Prisma.PrismaClientKnownRequestError('prisma', {
    code,
    clientVersion: '6.19.3',
  });
}

function hostWith(res: { status: jest.Mock; json: jest.Mock }) {
  return {
    switchToHttp: () => ({
      getResponse: () => res,
    }),
  };
}

describe('PrismaExceptionFilter', () => {
  const filter = new PrismaExceptionFilter();

  it('maps P2002/P2025/P2028 away from 500', () => {
    const cases = [
      [known('P2002'), HttpStatus.CONFLICT],
      [known('P2025'), HttpStatus.NOT_FOUND],
      [known('P2028'), HttpStatus.SERVICE_UNAVAILABLE],
    ] as const;
    for (const [err, status] of cases) {
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
      filter.catch(err, hostWith(res) as never);
      expect(res.status).toHaveBeenCalledWith(status);
      expect(res.status).not.toHaveBeenCalledWith(500);
    }
  });
});
