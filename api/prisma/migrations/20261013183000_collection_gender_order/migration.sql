-- Additive: unissex category + per-collection gender lists.
-- Safe for `prisma migrate deploy` on start — CREATE / INSERT only, no product rewrite.

INSERT INTO "categories" ("id", "slug", "name")
SELECT gen_random_uuid(), 'unissex', 'Unissex'
WHERE NOT EXISTS (SELECT 1 FROM "categories" WHERE "slug" = 'unissex');

CREATE TYPE "CollectionGender" AS ENUM ('feminino', 'masculino');

CREATE TABLE "collection_gender_orders" (
    "collection_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "gender" "CollectionGender" NOT NULL,
    "sort_order" INTEGER NOT NULL,

    CONSTRAINT "collection_gender_orders_pkey" PRIMARY KEY ("collection_id", "gender", "product_id")
);

CREATE INDEX "collection_gender_orders_collection_id_gender_sort_order_idx"
    ON "collection_gender_orders"("collection_id", "gender", "sort_order");

ALTER TABLE "collection_gender_orders"
    ADD CONSTRAINT "collection_gender_orders_collection_id_fkey"
    FOREIGN KEY ("collection_id") REFERENCES "collections"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "collection_gender_orders"
    ADD CONSTRAINT "collection_gender_orders_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Seed from current ProductCollection.sortOrder.
-- feminino → feminino list; masculino → masculino list; unissex → both.
INSERT INTO "collection_gender_orders" ("collection_id", "product_id", "gender", "sort_order")
SELECT pc."collection_id", pc."product_id", 'feminino'::"CollectionGender", pc."sort_order"
FROM "product_collections" pc
INNER JOIN "products" p ON p."id" = pc."product_id"
INNER JOIN "categories" c ON c."id" = p."category_id"
WHERE c."slug" IN ('feminino', 'unissex');

INSERT INTO "collection_gender_orders" ("collection_id", "product_id", "gender", "sort_order")
SELECT pc."collection_id", pc."product_id", 'masculino'::"CollectionGender", pc."sort_order"
FROM "product_collections" pc
INNER JOIN "products" p ON p."id" = pc."product_id"
INNER JOIN "categories" c ON c."id" = p."category_id"
WHERE c."slug" IN ('masculino', 'unissex');
