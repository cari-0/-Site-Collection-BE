-- AlterTable
ALTER TABLE "FeaturedKeyword" ADD COLUMN "pinned" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "FeaturedKeyword" ADD COLUMN "hidden" BOOLEAN NOT NULL DEFAULT false;

DELETE FROM "FeaturedKeyword";

-- CreateTable
CREATE TABLE "SearchEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "keywordId" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SiteOpen" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "visitorKey" TEXT,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteOpen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SearchEvent_createdAt_idx" ON "SearchEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SearchEvent_slug_createdAt_idx" ON "SearchEvent"("slug", "createdAt");

-- CreateIndex
CREATE INDEX "SearchEvent_keywordId_createdAt_idx" ON "SearchEvent"("keywordId", "createdAt");

-- CreateIndex
CREATE INDEX "SiteOpen_createdAt_idx" ON "SiteOpen"("createdAt");

-- CreateIndex
CREATE INDEX "SiteOpen_siteId_createdAt_idx" ON "SiteOpen"("siteId", "createdAt");

-- AddForeignKey
ALTER TABLE "SearchEvent" ADD CONSTRAINT "SearchEvent_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "Keyword"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SiteOpen" ADD CONSTRAINT "SiteOpen_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
