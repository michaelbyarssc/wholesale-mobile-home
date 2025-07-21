-- Add new delivery status types for the two-phase scheduling system
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'awaiting_pickup_schedule';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'pickup_scheduled';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'pickup_in_progress';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'pickup_completed';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'awaiting_delivery_schedule';
ALTER TYPE delivery_status ADD VALUE IF NOT EXISTS 'delivery_scheduled';