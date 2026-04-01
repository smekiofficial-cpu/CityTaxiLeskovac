
-- Daily reports table for storing end-of-day statistics
CREATE TABLE public.daily_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  report_date date NOT NULL UNIQUE,
  total_rides integer NOT NULL DEFAULT 0,
  completed_rides integer NOT NULL DEFAULT 0,
  cancelled_rides integer NOT NULL DEFAULT 0,
  total_revenue numeric NOT NULL DEFAULT 0,
  avg_fare numeric NOT NULL DEFAULT 0,
  total_drivers integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dispatchers can view reports" ON public.daily_reports
  FOR SELECT TO authenticated USING (public.is_dispatcher());

CREATE POLICY "Dispatchers can insert reports" ON public.daily_reports
  FOR INSERT TO authenticated WITH CHECK (public.is_dispatcher());

CREATE POLICY "Dispatchers can delete reports" ON public.daily_reports
  FOR DELETE TO authenticated USING (public.is_dispatcher());

-- Zone queue table for tracking vehicle order in zones
CREATE TABLE public.zone_queue (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  zone_id integer NOT NULL REFERENCES public.taxi_zones(id) ON DELETE CASCADE,
  vehicle_id uuid NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id uuid NOT NULL,
  position integer NOT NULL DEFAULT 1,
  entered_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(zone_id, vehicle_id)
);

ALTER TABLE public.zone_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view zone queue" ON public.zone_queue
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Dispatchers can manage zone queue" ON public.zone_queue
  FOR INSERT TO authenticated WITH CHECK (public.is_dispatcher() OR driver_id = auth.uid());

CREATE POLICY "Dispatchers can update zone queue" ON public.zone_queue
  FOR UPDATE TO authenticated USING (public.is_dispatcher());

CREATE POLICY "Dispatchers can delete from zone queue" ON public.zone_queue
  FOR DELETE TO authenticated USING (public.is_dispatcher());

-- Enable realtime for zone_queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.zone_queue;
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_reports;
