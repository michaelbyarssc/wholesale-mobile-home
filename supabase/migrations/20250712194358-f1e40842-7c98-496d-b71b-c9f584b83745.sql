-- Add customer activity notifications field to notification_preferences table
ALTER TABLE public.notification_preferences 
ADD COLUMN customer_activity_notifications BOOLEAN DEFAULT true;