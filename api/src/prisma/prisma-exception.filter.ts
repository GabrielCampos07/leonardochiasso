import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

const PRISMA_HTTP: Record<
  string,
  { status: number; error: string; message: string }
> = {
  P2002: {
    status: HttpStatus.CONFLICT,
    error: 'Conflict',
    message: 'Registro já existe.',
  },
  P2025: {
    status: HttpStatus.NOT_FOUND,
    error: 'Not Found',
    message: 'Registro não encontrado.',
  },
  P2028: {
    status: HttpStatus.SERVICE_UNAVAILABLE,
    error: 'Service Unavailable',
    message: 'A operação demorou demais. Tente de novo.',
  },
};

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const mapped = PRISMA_HTTP[exception.code];
    if (!mapped) {
      res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      });
      return;
    }
    res.status(mapped.status).json({
      statusCode: mapped.status,
      error: mapped.error,
      message: mapped.message,
    });
  }
}
