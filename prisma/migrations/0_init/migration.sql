-- CreateEnum
CREATE TYPE "ListStatus" AS ENUM ('RECOMMENDED', 'PLANNED', 'WATCHED');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('MOVIE', 'TV_SHOW', 'ANIME');

-- CreateEnum
CREATE TYPE "WatchStatus" AS ENUM ('WATCHING', 'PLAN_TO_WATCH', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "RecommendationLabel" AS ENUM ('UNDERRATED', 'CRITICALLY_ACCLAIMED', 'AWARD_WINNING', 'FAN_FAVORITE', 'CULT_CLASSIC', 'VISUAL_SPECTACLE', 'IMMERSIVE_SOUND', 'TECHNICAL_MASTERY', 'DIRECTORIAL_DEBUT', 'GENRE_DEFINING');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatarColor" TEXT NOT NULL DEFAULT '#6366f1',
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "avatarEmoji" TEXT,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "title" TEXT NOT NULL,
    "originalTitle" TEXT,
    "year" INTEGER,
    "posterUrl" TEXT,
    "backdropUrl" TEXT,
    "overview" TEXT,
    "tagline" TEXT,
    "genres" JSONB NOT NULL DEFAULT '[]',
    "runtimeMins" INTEGER,
    "status" TEXT,
    "tmdbId" INTEGER,
    "imdbId" TEXT,
    "malId" INTEGER,
    "tmdbRating" DECIMAL(3,1),
    "tmdbVoteCount" INTEGER,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "adult" BOOLEAN DEFAULT false,
    "episodeRuntime" INTEGER,
    "episodes" INTEGER,
    "languages" JSONB NOT NULL DEFAULT '[]',
    "networks" JSONB NOT NULL DEFAULT '[]',
    "revenue" DOUBLE PRECISION,
    "seasons" INTEGER,
    "ageCertification" TEXT,
    "omdbRatings" JSONB NOT NULL DEFAULT '[]',
    "genreNames" TEXT,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentEnrichment" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentEnrichment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserContent" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "userRating" INTEGER,
    "notes" TEXT,
    "watchedDate" DATE,
    "watchStatus" "WatchStatus",
    "startDate" DATE,
    "endDate" DATE,
    "episodeCount" INTEGER,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "listStatus" "ListStatus" NOT NULL DEFAULT 'WATCHED',
    "recommendationReason" TEXT,
    "recommendationLabel" "RecommendationLabel",

    CONSTRAINT "UserContent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Profile_userId_idx" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Content_tmdbId_key" ON "Content"("tmdbId");

-- CreateIndex
CREATE UNIQUE INDEX "Content_malId_key" ON "Content"("malId");

-- CreateIndex
CREATE INDEX "Content_contentType_idx" ON "Content"("contentType");

-- CreateIndex
CREATE INDEX "Content_tmdbId_idx" ON "Content"("tmdbId");

-- CreateIndex
CREATE INDEX "Content_malId_idx" ON "Content"("malId");

-- CreateIndex
CREATE INDEX "Content_tmdbRating_idx" ON "Content"("tmdbRating" DESC);

-- CreateIndex
CREATE INDEX "Content_title_idx" ON "Content"("title");

-- CreateIndex
CREATE INDEX "Content_year_idx" ON "Content"("year" DESC);

-- CreateIndex
CREATE INDEX "Content_genreNames_idx" ON "Content"("genreNames");

-- CreateIndex
CREATE INDEX "ContentEnrichment_contentId_idx" ON "ContentEnrichment"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentEnrichment_contentId_source_key" ON "ContentEnrichment"("contentId", "source");

-- CreateIndex
CREATE INDEX "UserContent_profileId_listStatus_addedAt_idx" ON "UserContent"("profileId", "listStatus", "addedAt" DESC);

-- CreateIndex
CREATE INDEX "UserContent_profileId_userRating_idx" ON "UserContent"("profileId", "userRating" DESC);

-- CreateIndex
CREATE INDEX "UserContent_profileId_watchStatus_idx" ON "UserContent"("profileId", "watchStatus");

-- CreateIndex
CREATE INDEX "UserContent_contentId_idx" ON "UserContent"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "UserContent_profileId_contentId_key" ON "UserContent"("profileId", "contentId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentEnrichment" ADD CONSTRAINT "ContentEnrichment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContent" ADD CONSTRAINT "UserContent_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserContent" ADD CONSTRAINT "UserContent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

