CREATE OR REPLACE FUNCTION public.rides_driver_update_guard()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_dispatcher() THEN
    -- Allow drivers to reject/unassign themselves
    IF NEW.assigned_driver_id IS NULL AND OLD.assigned_driver_id = auth.uid() AND NEW.status = 'pending' THEN
      RETURN NEW;
    END IF;
    -- Allow drivers to set fare when completing a ride
    IF NEW.status = 'completed' AND OLD.status = 'in_progress' AND OLD.assigned_driver_id = auth.uid() THEN
      -- Only allow fare and completed_at changes, block other field changes
      IF NEW.assigned_driver_id IS DISTINCT FROM OLD.assigned_driver_id OR
         NEW.assigned_vehicle_id IS DISTINCT FROM OLD.assigned_vehicle_id OR
         NEW.pickup_address IS DISTINCT FROM OLD.pickup_address OR
         NEW.destination_address IS DISTINCT FROM OLD.destination_address OR
         NEW.notes IS DISTINCT FROM OLD.notes THEN
        RAISE EXCEPTION 'Drivers can only set fare when completing a ride';
      END IF;
      RETURN NEW;
    END IF;
    -- Otherwise drivers may only change status and completed_at
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