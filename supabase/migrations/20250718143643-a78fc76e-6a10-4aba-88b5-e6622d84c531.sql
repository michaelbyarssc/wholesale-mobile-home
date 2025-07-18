-- Fix the trigger_delivery_notifications function to find orders properly
CREATE OR REPLACE FUNCTION public.trigger_delivery_notifications()
RETURNS trigger AS $$
DECLARE
  notification_rule RECORD;
  order_info RECORD;
BEGIN
  -- Get order information through estimate relationship
  SELECT o.*, c.name as company_name
  INTO order_info
  FROM orders o
  LEFT JOIN companies c ON o.company_id = c.id
  WHERE o.estimate_id = NEW.estimate_id
  LIMIT 1;

  -- Only proceed if we found an order
  IF order_info.id IS NOT NULL THEN
    -- Find applicable notification rules
    FOR notification_rule IN 
      SELECT * FROM notification_rules nr
      WHERE nr.active = true
      AND nr.company_id = order_info.company_id
      AND (
        (nr.trigger_event = 'delivery_started' AND NEW.new_status = 'in_transit') OR
        (nr.trigger_event = 'delivery_completed' AND NEW.new_status = 'completed') OR
        (nr.trigger_event = 'delivery_delayed' AND NEW.new_status = 'delayed')
      )
    LOOP
      -- Insert notification log entry
      INSERT INTO notification_logs (
        notification_rule_id, delivery_id, order_id,
        recipient_email, recipient_phone, notification_type,
        content, status
      ) VALUES (
        notification_rule.id, NEW.delivery_id, order_info.id,
        order_info.customer_email, order_info.customer_phone,
        notification_rule.notification_type,
        notification_rule.template_content, 'pending'
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;