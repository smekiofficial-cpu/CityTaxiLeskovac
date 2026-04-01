
-- Enable leaked password protection via Auth config
-- This is handled via auth config, not SQL. Using a no-op migration placeholder.
-- The actual fix is done via configure_auth or platform settings.
SELECT 1;
