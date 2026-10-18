-- ============================================================================
-- Migration: 007_realtime_publication.sql
-- Description: Add orders table to Supabase Realtime publication and configure REPLICA IDENTITY
-- ============================================================================

-- Ensure REPLICA IDENTITY FULL so row updates contain all fields for Realtime filters
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- Add orders table to the supabase_realtime publication (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'orders'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
  END IF;
END $$;
