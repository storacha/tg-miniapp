-- DROP TABLE IF EXISTS users

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  telegram_id BIGINT NOT NULL UNIQUE,
  storacha_space TEXT NOT NULL CHECK (storacha_space LIKE 'did:key:%'),
	points DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS users_telegram_id_index ON users (telegram_id);
CREATE INDEX IF NOT EXISTS users_points ON users (points);
