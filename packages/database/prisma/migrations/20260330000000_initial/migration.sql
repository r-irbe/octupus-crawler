-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "crawl_urls" (
    "id" BIGSERIAL NOT NULL,
    "url" TEXT NOT NULL,
    "url_hash" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "status_code" INTEGER,
    "content_type" TEXT,
    "s3_key" TEXT,
    "depth" INTEGER NOT NULL DEFAULT 0,
    "discovered_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fetched_at" TIMESTAMPTZ,
    "parent_url_id" BIGINT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "crawl_urls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_links" (
    "source_url_id" BIGINT NOT NULL,
    "target_url_id" BIGINT NOT NULL,
    "anchor_text" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "crawl_links_pkey" PRIMARY KEY ("source_url_id","target_url_id")
);

-- CreateTable
CREATE TABLE "crawl_sessions" (
    "id" BIGSERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "started_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ,

    CONSTRAINT "crawl_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "crawl_urls_url_hash_key" ON "crawl_urls"("url_hash");

-- CreateIndex
CREATE INDEX "crawl_urls_domain_idx" ON "crawl_urls"("domain");

-- CreateIndex
CREATE INDEX "crawl_urls_status_idx" ON "crawl_urls"("status");

-- AddForeignKey
ALTER TABLE "crawl_urls" ADD CONSTRAINT "crawl_urls_parent_url_id_fkey" FOREIGN KEY ("parent_url_id") REFERENCES "crawl_urls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_links" ADD CONSTRAINT "crawl_links_source_url_id_fkey" FOREIGN KEY ("source_url_id") REFERENCES "crawl_urls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crawl_links" ADD CONSTRAINT "crawl_links_target_url_id_fkey" FOREIGN KEY ("target_url_id") REFERENCES "crawl_urls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
