-- Add blockchain_redirect_url column to store DocOnChain redirect link
ALTER TABLE "DocumentAdditionalDetails"
ADD COLUMN IF NOT EXISTS "blockchain_redirect_url" TEXT;
