CREATE OR REPLACE FUNCTION public.is_registration_invite_valid(code text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE lower(p.invite_code) = lower(btrim(code)) AND NOT coalesce(p.suspended, false)); $$;
REVOKE ALL ON FUNCTION public.is_registration_invite_valid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_registration_invite_valid(text) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.is_registration_invite_valid(text) IS 'Boolean-only registration check accepting active administrator and member invitation codes.';