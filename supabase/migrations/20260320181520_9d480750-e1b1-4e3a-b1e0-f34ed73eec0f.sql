
-- Create driver_shifts table
CREATE TABLE public.driver_shifts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  driver_id UUID NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  total_rides INTEGER NOT NULL DEFAULT 0,
  completed_rides INTEGER NOT NULL DEFAULT 0,
  total_earnings NUMERIC NOT NULL DEFAULT 0,
  cash_earnings NUMERIC NOT NULL DEFAULT 0,
  card_earnings NUMERIC NOT NULL DEFAULT 0,
  duration_minutes INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.driver_shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can view own shifts"
  ON public.driver_shifts FOR SELECT
  USING (auth.uid() = driver_id);

CREATE POLICY "Drivers can insert own shifts"
  ON public.driver_shifts FOR INSERT
  WITH CHECK (auth.uid() = driver_id);

CREATE POLICY "Drivers can update own shifts"
  ON public.driver_shifts FOR UPDATE
  USING (auth.uid() = driver_id);

CREATE POLICY "Dispatchers can view all shifts"
  ON public.driver_shifts FOR SELECT
  USING (public.is_dispatcher());

-- Add payment_method to rides if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='rides' AND column_name='payment_method') THEN
    ALTER TABLE public.rides ADD COLUMN payment_method TEXT DEFAULT 'cash';
  END IF;
END $$;
