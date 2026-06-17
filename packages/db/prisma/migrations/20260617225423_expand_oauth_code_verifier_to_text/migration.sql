-- Expand code_verifier column from VarChar(128) to Text to store Google token JSON
ALTER TABLE "oauth_states" ALTER COLUMN "code_verifier" TYPE TEXT;
