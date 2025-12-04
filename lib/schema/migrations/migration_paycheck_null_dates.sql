-- Migration to allow null dates in paychecks table
-- Run this SQL in Supabase if you already have the paychecks table created

ALTER TABLE paychecks 
ALTER COLUMN date DROP NOT NULL;
