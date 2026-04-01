-- Swap coordinates, landmark, radius, and color between zone 4 and zone 6
-- Using a temp variable approach with a CTE

WITH zone4 AS (
  SELECT center_lat, center_lng, landmark, radius, color FROM public.taxi_zones WHERE id = 4
),
zone6 AS (
  SELECT center_lat, center_lng, landmark, radius, color FROM public.taxi_zones WHERE id = 6
)
UPDATE public.taxi_zones
SET
  center_lat = CASE WHEN id = 4 THEN (SELECT center_lat FROM zone6) ELSE (SELECT center_lat FROM zone4) END,
  center_lng = CASE WHEN id = 4 THEN (SELECT center_lng FROM zone6) ELSE (SELECT center_lng FROM zone4) END,
  landmark = CASE WHEN id = 4 THEN (SELECT landmark FROM zone6) ELSE (SELECT landmark FROM zone4) END,
  radius = CASE WHEN id = 4 THEN (SELECT radius FROM zone6) ELSE (SELECT radius FROM zone4) END,
  color = CASE WHEN id = 4 THEN (SELECT color FROM zone6) ELSE (SELECT color FROM zone4) END
WHERE id IN (4, 6);