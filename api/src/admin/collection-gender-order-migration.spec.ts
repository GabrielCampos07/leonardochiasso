import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL_PATH = join(
  __dirname,
  '../../prisma/migrations/20261013183000_collection_gender_order/migration.sql',
);

describe('collection_gender_order migration (deploy safety)', () => {
  const sql = readFileSync(SQL_PATH, 'utf8');

  it('is additive: creates the table, unique key and sort index', () => {
    expect(sql).toContain('CREATE TABLE "collection_gender_orders"');
    expect(sql).toContain(
      'PRIMARY KEY ("collection_id", "gender", "product_id")',
    );
    expect(sql).toContain(
      'ON "collection_gender_orders"("collection_id", "gender", "sort_order")',
    );
    expect(sql.toUpperCase()).not.toContain('DROP TABLE');
    expect(sql.toUpperCase()).not.toContain('DROP COLUMN');
  });

  it('does not rewrite existing product genders', () => {
    expect(sql.toUpperCase()).not.toMatch(/UPDATE\s+"PRODUCTS"/);
    expect(sql).toMatch(/WHERE NOT EXISTS \(SELECT 1 FROM "categories" WHERE "slug" = 'unissex'\)/);
    expect(sql).toContain("SELECT gen_random_uuid(), 'unissex', 'Unissex'");
  });

  it('seeds feminino/masculino/unissex from ProductCollection.sortOrder', () => {
    expect(sql).toContain('INSERT INTO "collection_gender_orders"');
    expect(sql).toContain("WHERE c.\"slug\" IN ('feminino', 'unissex')");
    expect(sql).toContain("WHERE c.\"slug\" IN ('masculino', 'unissex')");
    expect(sql).toContain('pc."sort_order"');
  });
});
