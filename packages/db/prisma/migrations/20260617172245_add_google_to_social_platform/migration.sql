-- Add GOOGLE to SocialPlatform enum (idempotent)
ALTER TYPE "SocialPlatform" ADD VALUE IF NOT EXISTS 'GOOGLE';
