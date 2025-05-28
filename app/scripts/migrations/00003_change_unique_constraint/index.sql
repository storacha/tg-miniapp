ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_telegram_id_key;

ALTER TABLE users
ADD CONSTRAINT users_telegram_id_storacha_space_key UNIQUE (telegram_id, storacha_space);