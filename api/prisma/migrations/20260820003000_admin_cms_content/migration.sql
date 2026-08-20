-- Admin CMS + product editorial fields

CREATE TYPE "AdminRole" AS ENUM ('owner', 'editor', 'viewer');

CREATE TABLE "admin_users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'editor',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

CREATE TABLE "admin_sessions" (
    "id" UUID NOT NULL,
    "admin_user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_sessions_token_hash_key" ON "admin_sessions"("token_hash");
CREATE INDEX "admin_sessions_admin_user_id_idx" ON "admin_sessions"("admin_user_id");
CREATE INDEX "admin_sessions_expires_at_idx" ON "admin_sessions"("expires_at");

ALTER TABLE "admin_sessions" ADD CONSTRAINT "admin_sessions_admin_user_id_fkey" FOREIGN KEY ("admin_user_id") REFERENCES "admin_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "content_documents" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "data" JSONB NOT NULL DEFAULT '{}',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "content_documents_kind_slug_key" ON "content_documents"("kind", "slug");
CREATE INDEX "content_documents_kind_idx" ON "content_documents"("kind");

ALTER TABLE "products" ADD COLUMN "pieces" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "products" ADD COLUMN "color_variants" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "products" ADD COLUMN "image_bindings" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "products" ADD COLUMN "art_couture" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "products" ADD COLUMN "recommend_order" INTEGER NOT NULL DEFAULT 9990;
