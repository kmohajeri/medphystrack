-- Phase 12: soft-archive for residents and applications
ALTER TABLE residents    ADD COLUMN IF NOT EXISTS archived_at timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS archived_at timestamptz;
