-- Additive: unpublished Arte and Casa collections for the admin 3D racks.
-- published_at stays NULL so the public catalog and storefront do not change.
-- Idempotent: skips a slug that already exists (staging may already have them).

INSERT INTO "collections" (
  "id",
  "slug",
  "name",
  "description",
  "sort_order",
  "published_at",
  "archived_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  'arte',
  'Arte',
  NULL,
  90,
  NULL,
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "collections" WHERE "slug" = 'arte');

INSERT INTO "collections" (
  "id",
  "slug",
  "name",
  "description",
  "sort_order",
  "published_at",
  "archived_at",
  "created_at",
  "updated_at"
)
SELECT
  gen_random_uuid(),
  'casa',
  'Casa',
  'Em breve',
  91,
  NULL,
  NULL,
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "collections" WHERE "slug" = 'casa');
