/*
  Warnings:

  - Made the column `providerEventId` on table `MatchEvent` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "MatchEvent" ALTER COLUMN "providerEventId" SET NOT NULL,
ALTER COLUMN "providerEventId" SET DATA TYPE BIGINT;
