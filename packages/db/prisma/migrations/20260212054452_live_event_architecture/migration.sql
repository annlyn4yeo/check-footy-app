/*
  Warnings:

  - The `status` column on the `Fixture` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Made the column `minute` on table `Fixture` required. This step will fail if there are existing NULL values in that column.
  - Made the column `scoreHome` on table `Fixture` required. This step will fail if there are existing NULL values in that column.
  - Made the column `scoreAway` on table `Fixture` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "FixtureStatus" AS ENUM ('SCHEDULED', 'LIVE', 'HALF_TIME', 'FULL_TIME', 'POSTPONED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('GOAL', 'PENALTY_GOAL', 'OWN_GOAL', 'YELLOW_CARD', 'RED_CARD', 'SUBSTITUTION', 'VAR');

-- AlterTable
ALTER TABLE "Fixture" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "providerLastUpdatedAt" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "FixtureStatus" NOT NULL DEFAULT 'SCHEDULED',
ALTER COLUMN "minute" SET NOT NULL,
ALTER COLUMN "minute" SET DEFAULT 0,
ALTER COLUMN "scoreHome" SET NOT NULL,
ALTER COLUMN "scoreHome" SET DEFAULT 0,
ALTER COLUMN "scoreAway" SET NOT NULL,
ALTER COLUMN "scoreAway" SET DEFAULT 0;

-- CreateTable
CREATE TABLE "MatchEvent" (
    "id" TEXT NOT NULL,
    "providerEventId" INTEGER,
    "fixtureId" TEXT NOT NULL,
    "minute" INTEGER NOT NULL,
    "extraMinute" INTEGER,
    "type" "EventType" NOT NULL,
    "teamId" TEXT,
    "playerName" TEXT,
    "assistName" TEXT,
    "providerUpdatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchEvent_providerEventId_key" ON "MatchEvent"("providerEventId");

-- CreateIndex
CREATE INDEX "MatchEvent_fixtureId_idx" ON "MatchEvent"("fixtureId");

-- CreateIndex
CREATE INDEX "MatchEvent_fixtureId_minute_idx" ON "MatchEvent"("fixtureId", "minute");

-- CreateIndex
CREATE INDEX "Fixture_leagueId_isLive_idx" ON "Fixture"("leagueId", "isLive");

-- CreateIndex
CREATE INDEX "Fixture_isLive_kickoffUtc_idx" ON "Fixture"("isLive", "kickoffUtc");

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_fixtureId_fkey" FOREIGN KEY ("fixtureId") REFERENCES "Fixture"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchEvent" ADD CONSTRAINT "MatchEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
