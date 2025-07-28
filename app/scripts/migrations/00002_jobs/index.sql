-- DROP TABLE IF EXISTS jobs;

CREATE TABLE IF NOT EXISTS jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('waiting','queued','running' ,'failed', 'completed')),
  space TEXT NOT NULL CHECK (space LIKE 'did:key:%'),
  dialogs JSONB NOT NULL,
  period_from DOUBLE PRECISION NOT NULL,
  period_to DOUBLE PRECISION NOT NULL,
  progress DOUBLE PRECISION,
  started_at TIMESTAMP,
  cause TEXT,
  finished_at TIMESTAMP,
  data_cid TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS jobs_user_id ON jobs (user_id);
