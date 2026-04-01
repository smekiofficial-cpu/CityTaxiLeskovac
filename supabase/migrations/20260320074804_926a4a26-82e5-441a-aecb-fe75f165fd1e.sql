
CREATE OR REPLACE FUNCTION public.rides_driver_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_dispatcher() THEN
    -- Drivers may only change status and completed_at
    IF NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id OR
       NEW.assigned_vehicle_id IS DISTINCT FROM OLD.assigned_vehicle_id OR
       NEW.pickup_address IS DISTINCT FROM OLD.pickup_address OR
       NEW.destination_address IS DISTINCT FROM OLD.destination_address OR
       NEW.fare IS DISTINCT FROM OLD.fare OR
       NEW.notes IS DISTINCT FROM OLD.notes THEN
      RAISE EXCEPTION 'Drivers cannot modify assignment, address, fare, or notes fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER rides_driver_update_guard
BEFORE UPDATE ON public.rides
FOR EACH ROW EXECUTE FUNCTION public.rides_driver_update_guard();
