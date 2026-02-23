-- Preserve existing image data by renaming to crestUrl.
ALTER TABLE "Team" RENAME COLUMN "logoUrl" TO "crestUrl";

-- Domain realism: shortName is optional because some provider payloads omit it.
ALTER TABLE "Team" ADD COLUMN "shortName" TEXT;
