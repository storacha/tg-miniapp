/**
    Migration: Add 'canceled' status to the 'jobs' table and add 'updated_at' column.

    This migration alters the 'jobs' table to allow jobs to have a new status: 'canceled'
    and adds an 'updated_at' timestamp column.
*/

ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('waiting','queued','running','failed','completed','canceled'));

ALTER TABLE jobs
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;