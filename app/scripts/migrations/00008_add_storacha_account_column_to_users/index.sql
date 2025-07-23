ALTER TABLE users 
DROP COLUMN IF EXISTS "storacha_account";

ALTER TABLE users 
ADD COLUMN "storacha_account" TEXT CHECK (storacha_account LIKE 'did:mailto:%');

CREATE INDEX IF NOT EXISTS users_storacha_account_index ON users (storacha_account);