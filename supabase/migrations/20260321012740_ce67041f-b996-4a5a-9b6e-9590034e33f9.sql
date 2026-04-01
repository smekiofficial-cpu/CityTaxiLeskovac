-- Allow customers to create rides (so they can call a taxi)
CREATE POLICY "Customers can insert rides"
ON public.rides
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'customer'));

-- Allow customers to view vehicle locations (to find nearest taxi)
CREATE POLICY "Customers can view vehicle locations"
ON public.vehicle_locations
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'customer'));