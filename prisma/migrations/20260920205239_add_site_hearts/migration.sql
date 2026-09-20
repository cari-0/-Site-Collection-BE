-- AlterTable
ALTER TABLE "Site" ADD COLUMN     "heartCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SiteHeart" (
    "id" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "visitorKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SiteHeart_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteHeart_siteId_idx" ON "SiteHeart"("siteId");

-- CreateIndex
CREATE UNIQUE INDEX "SiteHeart_siteId_visitorKey_key" ON "SiteHeart"("siteId", "visitorKey");

-- CreateIndex
CREATE INDEX "Site_status_language_heartCount_idx" ON "Site"("status", "language", "heartCount");

-- AddForeignKey
ALTER TABLE "SiteHeart" ADD CONSTRAINT "SiteHeart_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE CASCADE ON UPDATE CASCADE;
