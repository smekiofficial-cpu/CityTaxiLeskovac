
-- Create roles enum
CREATE TYPE public.app_role AS ENUM ('dispatcher', 'driver');

-- Create driver status enum
CREATE TYPE public.driver_status AS ENUM ('available', 'busy', 'offline');

-- Create ride status enum
CREATE TYPE public.ride_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  status driver_status NOT NULL DEFAULT 'offline',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration TEXT NOT NULL UNIQUE,
  model TEXT NOT NULL,
  color TEXT NOT NULL,
  current_driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rides table
CREATE TABLE public.rides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_address TEXT NOT NULL,
  destination_address TEXT,
  fare NUMERIC(10,2),
  status ride_status NOT NULL DEFAULT 'pending',
  assigned_driver_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Vehicle locations table (for real-time GPS tracking)
CREATE TABLE public.vehicle_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  heading DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create unique index so each vehicle has only one location record
CREATE UNIQUE INDEX idx_vehicle_locations_vehicle ON public.vehicle_locations(vehicle_id);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_locations ENABLE ROW LEVEL SECURITY;

-- Security definer helper: check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper: is dispatcher
CREATE OR REPLACE FUNCTION public.is_dispatcher()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'dispatcher')
$$;

-- Helper: is assigned driver for vehicle
CREATE OR REPLACE FUNCTION public.is_assigned_driver_for_vehicle(_vehicle_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vehicles
    WHERE id = _vehicle_id AND current_driver_id = auth.uid()
  )
$$;

-- Helper: is assigned driver for ride
CREATE OR REPLACE FUNCTION public.is_assigned_driver_for_ride(_ride_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rides
    WHERE id = _ride_id AND assigned_driver_id = auth.uid()
  )
$$;

-- Profiles RLS policies
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid() OR public.is_dispatcher());
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (id = auth.uid() OR public.is_dispatcher());
CREATE POLICY "Allow insert own profile" ON public.profiles FOR INSERT WITH CHECK (id = auth.uid() OR public.is_dispatcher());
CREATE POLICY "Dispatchers can delete profiles" ON public.profiles FOR DELETE USING (public.is_dispatcher());

-- User roles RLS policies
CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT USING (user_id = auth.uid() OR public.is_dispatcher());
CREATE POLICY "Dispatchers can manage roles" ON public.user_roles FOR INSERT WITH CHECK (public.is_dispatcher());
CREATE POLICY "Dispatchers can update roles" ON public.user_roles FOR UPDATE USING (public.is_dispatcher());
CREATE POLICY "Dispatchers can delete roles" ON public.user_roles FOR DELETE USING (public.is_dispatcher());

-- Vehicles RLS policies
CREATE POLICY "Dispatchers and assigned drivers can view vehicles" ON public.vehicles FOR SELECT USING (public.is_dispatcher() OR current_driver_id = auth.uid());
CREATE POLICY "Dispatchers can insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (public.is_dispatcher());
CREATE POLICY "Dispatchers can update vehicles" ON public.vehicles FOR UPDATE USING (public.is_dispatcher());
CREATE POLICY "Dispatchers can delete vehicles" ON public.vehicles FOR DELETE USING (public.is_dispatcher());

-- Rides RLS policies
CREATE POLICY "Dispatchers and assigned drivers can view rides" ON public.rides FOR SELECT USING (public.is_dispatcher() OR assigned_driver_id = auth.uid());
CREATE POLICY "Dispatchers can insert rides" ON public.rides FOR INSERT WITH CHECK (public.is_dispatcher());
CREATE POLICY "Dispatchers and assigned drivers can update rides" ON public.rides FOR UPDATE USING (public.is_dispatcher() OR assigned_driver_id = auth.uid());
CREATE POLICY "Dispatchers can delete rides" ON public.rides FOR DELETE USING (public.is_dispatcher());

-- Vehicle locations RLS policies
CREATE POLICY "Dispatchers and drivers can view locations" ON public.vehicle_locations FOR SELECT USING (public.is_dispatcher() OR driver_id = auth.uid());
CREATE POLICY "Drivers can insert own location" ON public.vehicle_locations FOR INSERT WITH CHECK (driver_id = auth.uid() OR public.is_dispatcher());
CREATE POLICY "Drivers can update own location" ON public.vehicle_locations FOR UPDATE USING (driver_id = auth.uid() OR public.is_dispatcher());
CREATE POLICY "Dispatchers can delete locations" ON public.vehicle_locations FOR DELETE USING (public.is_dispatcher());

-- Enable realtime for vehicle_locations
ALTER PUBLICATION supabase_realtime ADD TABLE public.vehicle_locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.rides;

-- Trigger for updated_at on profiles
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON public.vehicles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_vehicle_locations_updated_at BEFORE UPDATE ON public.vehicle_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
