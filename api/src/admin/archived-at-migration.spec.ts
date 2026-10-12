import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL_PATH = join(
  __dirname,
  '../../prisma/migrations/20261012214500_add_archived_at/migration.sql',
);

describe('archived_at migration (deploy / rollback safety)', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');

  it('adds a nullable archived_at with no required default on all 3 tables', () => {
    const expected = [
      'ALTER TABLE "collections" ADD COLUMN "archived_at" TIMESTAMP(3);',
      'ALTER TABLE "products" ADD COLUMN "archived_at" TIMESTAMP(3);',
      'ALTER TABLE "content_documents" ADD COLUMN "archived_at" TIMESTAMP(3);',
    ];
    for (const line of expected) {
      expect(sql).toContain(line);
    }

    const addLines = sql
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /ADD COLUMN "archived_at"/.test(line));
    expect(addLines).toHaveLength(3);

    for (const line of addLines) {
      expect(line.toUpperCase()).not.toContain('NOT NULL');
      expect(line.toUpperCase()).not.toMatch(/\bDEFAULT\b/);
    }
  });
});
