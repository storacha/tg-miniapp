/**
    Migration: Add 'canceled' status to the 'jobs' table.

    This migration alters the 'jobs' table to allow jobs to have a new status: 'canceled'.
*/
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_status_check;

ALTER TABLE jobs
  ADD CONSTRAINT jobs_status_check
  CHECK (status IN ('waiting','queued','running','failed','completed','canceled'));