
CREATE TABLE public.taxi_zones (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  landmark TEXT NOT NULL,
  center_lat DOUBLE PRECISION NOT NULL,
  center_lng DOUBLE PRECISION NOT NULL,
  radius INTEGER NOT NULL DEFAULT 350,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.taxi_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view zones"
  ON public.taxi_zones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Dispatchers can insert zones"
  ON public.taxi_zones FOR INSERT
  TO authenticated
  WITH CHECK (is_dispatcher());

CREATE POLICY "Dispatchers can update zones"
  ON public.taxi_zones FOR UPDATE
  TO authenticated
  USING (is_dispatcher());

CREATE POLICY "Dispatchers can delete zones"
  ON public.taxi_zones FOR DELETE
  TO authenticated
  USING (is_dispatcher());

-- Seed existing zones
INSERT INTO public.taxi_zones (id, name, landmark, center_lat, center_lng, radius, color) VALUES
  (1, 'Zona 1', 'Legas / Autobuska stanica', 42.9983, 21.9537, 350, '#3b82f6'),
  (2, 'Zona 2', 'Centar / Ivana Milutinovića', 42.9981, 21.9461, 350, '#22c55e'),
  (3, 'Zona 3', 'Bolnica', 42.9945, 21.9415, 350, '#ef4444'),
  (4, 'Zona 4', 'Radničko naselje', 43.0030, 21.9380, 400, '#a855f7'),
  (6, 'Zona 6', 'Južnomoravskih brigada', 42.9920, 21.9530, 380, '#f59e0b');

-- Update sequence to avoid conflicts
SELECT setval('taxi_zones_id_seq', (SELECT MAX(id) FROM taxi_zones));
