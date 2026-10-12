-- Soft-archive catalog items. Orders and wishlists keep their product FKs.
-- Archiving a collection must not touch product_collections.

ALTER TABLE "collections" ADD COLUMN "archived_at" TIMESTAMP(3);
ALTER TABLE "products" ADD COLUMN "archived_at" TIMESTAMP(3);
ALTER TABLE "content_documents" ADD COLUMN "archived_at" TIMESTAMP(3);

CREATE INDEX "collections_archived_at_idx" ON "collections"("archived_at");
CREATE INDEX "products_archived_at_idx" ON "products"("archived_at");
CREATE INDEX "content_documents_archived_at_idx" ON "content_documents"("archived_at");
