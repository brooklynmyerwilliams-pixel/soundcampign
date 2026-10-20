CREATE OR REPLACE FUNCTION public.is_registration_invite_valid(code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE lower(p.invite_code) = lower(btrim(code))
      AND NOT coalesce(p.suspended, false)
      AND length(btrim(code)) BETWEEN 1 AND 20
      AND btrim(code) ~ '^[A-Za-z0-9]+$'
  );
$function$;
REVOKE ALL ON FUNCTION public.is_registration_invite_valid(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_registration_invite_valid(text) TO anon, authenticated, service_role;