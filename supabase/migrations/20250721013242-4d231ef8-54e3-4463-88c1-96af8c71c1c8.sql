-- Enable RLS and create policies

-- Enable RLS policies
ALTER TABLE public.delivery_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_gps_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for delivery_schedules
CREATE POLICY "Admins can manage all delivery schedules"
  ON public.delivery_schedules FOR ALL
  USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can view their assigned delivery schedules"
  ON public.delivery_schedules FOR SELECT
  USING (
    pickup_driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    ) OR
    delivery_driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can update their delivery schedules"
  ON public.delivery_schedules FOR UPDATE
  USING (
    pickup_driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    ) OR
    delivery_driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for delivery_gps_tracking
CREATE POLICY "Admins can view all GPS tracking"
  ON public.delivery_gps_tracking FOR SELECT
  USING (is_admin(auth.uid()));

CREATE POLICY "Drivers can insert their own GPS data"
  ON public.delivery_gps_tracking FOR INSERT
  WITH CHECK (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Drivers can view their own GPS data"
  ON public.delivery_gps_tracking FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- RLS Policies for driver_sessions
CREATE POLICY "Drivers can manage their own sessions"
  ON public.driver_sessions FOR ALL
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all driver sessions"
  ON public.driver_sessions FOR SELECT
  USING (is_admin(auth.uid()));

-- Create storage buckets for delivery photos and signatures
INSERT INTO storage.buckets (id, name, public) VALUES 
  ('delivery-photos', 'delivery-photos', false),
  ('delivery-signatures', 'delivery-signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for delivery photos and signatures
CREATE POLICY "Admins can view all delivery photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-photos' AND is_admin(auth.uid()));

CREATE POLICY "Drivers can upload delivery photos"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'delivery-photos' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can view all delivery signatures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'delivery-signatures' AND is_admin(auth.uid()));

CREATE POLICY "Drivers can upload delivery signatures"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'delivery-signatures' AND auth.uid() IS NOT NULL);