-- =====================================================

-- Migration: 021_order_ready_reminder

-- Description: Timestamp for reception "re-alert" pings (customer pickup reminders).

-- Depends on: 005_create_orders

-- Safe to re-run: YES (IF NOT EXISTS)

-- =====================================================



ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS ready_reminder_at timestamptz;



COMMENT ON COLUMN public.orders.ready_reminder_at IS

  'Updated when staff sends another pickup reminder; drives customer OrderReadyNotifier via realtime.';


