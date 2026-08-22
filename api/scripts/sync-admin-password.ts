/**
 * Sync AdminUser password hash from ADMIN_EMAIL / ADMIN_PASSWORD in api/.env
 *
 *   cd api && npx tsx scripts/sync-admin-password.ts
 */
import 'dotenv/config';
import * as argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? '';
  if (!email || !password) {
    throw new Error('Set ADMIN_EMAIL and ADMIN_PASSWORD in api/.env');
  }
  const passwordHash = await argon2.hash(password);
  const user = await prisma.adminUser.upsert({
    where: { email },
    create: { email, passwordHash, role: 'owner' },
    update: { passwordHash },
  });
  const ok = await argon2.verify(user.passwordHash, password);
  // eslint-disable-next-line no-console
  console.log(`Admin password synced for ${user.email} (verify=${ok})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
