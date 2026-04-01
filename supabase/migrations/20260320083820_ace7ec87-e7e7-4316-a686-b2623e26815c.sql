
-- Table to store initial dispatcher credentials (admin-only access)
CREATE TABLE public.dispatcher_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  initial_password text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.dispatcher_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only admins can view credentials"
ON public.dispatcher_credentials FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can insert credentials"
ON public.dispatcher_credentials FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete credentials"
ON public.dispatcher_credentials FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
