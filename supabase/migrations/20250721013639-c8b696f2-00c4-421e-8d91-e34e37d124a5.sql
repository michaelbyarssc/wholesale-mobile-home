-- Create test data for the new scheduling system

-- First, let's create a test invoice with balance_due = 0 to trigger delivery creation
INSERT INTO public.invoices (
  invoice_number,
  customer_name,
  customer_email,
  customer_phone,
  delivery_address,
  mobile_home_id,
  total_amount,
  balance_due,
  status,
  due_date
) VALUES (
  'TEST-INV-001',
  'John Test Customer',
  'john.test@example.com',
  '555-123-4567',
  '123 Main St, Los Angeles, CA 90210',
  (SELECT id FROM mobile_homes LIMIT 1),
  25000.00,
  0.00,  -- This will trigger delivery creation
  'paid',
  CURRENT_DATE + INTERVAL '30 days'
) ON CONFLICT DO NOTHING;

-- Create some test drivers if none exist
INSERT INTO public.drivers (
  first_name,
  last_name,
  phone,
  email,
  status,
  license_number,
  cdl_class,
  hourly_rate,
  active
) VALUES 
  ('Mike', 'Driver', '555-100-0001', 'mike.driver@company.com', 'available', 'DL123456', 'Class A', 25.00, true),
  ('Sarah', 'Transport', '555-100-0002', 'sarah.transport@company.com', 'available', 'DL234567', 'Class A', 27.00, true),
  ('David', 'Logistics', '555-100-0003', 'david.logistics@company.com', 'available', 'DL345678', 'Class B', 24.00, true)
ON CONFLICT (email) DO NOTHING;

-- Create a test factory if none exists
INSERT INTO public.factories (
  name,
  address,
  phone,
  email,
  timezone,
  active
) VALUES (
  'Test Factory Inc',
  '456 Industrial Way, Phoenix, AZ 85001',
  '555-200-0001',
  'orders@testfactory.com',
  'America/Phoenix',
  true
) ON CONFLICT (email) DO NOTHING;

-- Update the test mobile home to have a factory
UPDATE public.mobile_homes 
SET factory_id = (SELECT id FROM public.factories WHERE name = 'Test Factory Inc' LIMIT 1)
WHERE id IN (SELECT id FROM mobile_homes LIMIT 1);

-- Create notification for the test delivery that should have been auto-created
INSERT INTO public.delivery_notifications (
  delivery_id,
  notification_type,
  recipient_type,
  recipient_identifier,
  message_content,
  delivery_method,
  scheduled_for
) 
SELECT 
  d.id,
  'schedule_required',
  'admin',
  'admin@company.com',
  'Test delivery #' || d.delivery_number || ' needs to be scheduled. Invoice TEST-INV-001 has been paid in full.',
  'email',
  now()
FROM public.deliveries d
JOIN public.invoices i ON i.id = d.invoice_id
WHERE i.invoice_number = 'TEST-INV-001'
ON CONFLICT DO NOTHING;