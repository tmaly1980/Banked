-- Migration: Add checklist to gigs table
-- Date: 2025-12-04
-- Description: Adds a JSONB checklist column to the gigs table for tracking gig tasks with completion status

-- Add checklist column to gigs table
-- Each checklist item has: id (string), name (string), checked (boolean)
ALTER TABLE gigs ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]'::JSONB;

-- Add index for checklist queries
CREATE INDEX IF NOT EXISTS idx_gigs_checklist ON gigs USING GIN(checklist);
