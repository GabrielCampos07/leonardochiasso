import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const CONNECT_ATTEMPTS = 5;
const CONNECT_BASE_DELAY_MS = 2000;

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    for (let attempt = 1; attempt <= CONNECT_ATTEMPTS; attempt++) {
      try {
        await this.$connect();
        if (attempt > 1) {
          this.logger.log(`Connected to database on attempt ${attempt}.`);
        }
        return;
      } catch (err) {
        const isLast = attempt === CONNECT_ATTEMPTS;
        this.logger.warn(
          `Database connect attempt ${attempt}/${CONNECT_ATTEMPTS} failed` +
            (isLast ? '' : ` — retrying in ${CONNECT_BASE_DELAY_MS * attempt}ms`),
        );
        if (isLast) throw err;
        await sleep(CONNECT_BASE_DELAY_MS * attempt);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
