CREATE TABLE public.support_contacts (
 channel text PRIMARY KEY CHECK (channel IN ('whatsapp', 'telegram')),
 value text,
 revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CONSTRAINT support_contact_value_valid CHECK (value IS NULL OR (channel = 'whatsapp' AND value ~ '^[1-9][0-9]{6,14}$') OR (channel = 'telegram' AND value ~ '^[A-Za-z][A-Za-z0-9_]{4,31}$'))
);
GRANT SELECT ON public.support_contacts TO anon, authenticated;
GRANT ALL ON public.support_contacts TO service_role;
ALTER TABLE public.support_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "public support contact read" ON public.support_contacts FOR SELECT TO anon, authenticated USING (true);
COMMENT ON TABLE public.support_contacts IS 'Canonical public support contacts. Revisioned tombstones preserve explicit removals and prevent stale overwrites; client writes only through save_support_contact.';
CREATE OR REPLACE FUNCTION public.save_support_contact(p_channel text, p_value text, p_expected_revision integer, p_remove boolean DEFAULT false)
RETURNS SETOF public.support_contacts
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE current_contact public.support_contacts;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
  RAISE EXCEPTION 'Only administrators can change support contacts.' USING ERRCODE = '42501';
 END IF;
 IF p_channel IS NULL OR p_channel NOT IN ('whatsapp', 'telegram') OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_remove IS NULL THEN
  RAISE EXCEPTION 'Invalid contact request.' USING ERRCODE = '22023';
 END IF;
 IF p_remove THEN
  IF p_value IS NOT NULL THEN RAISE EXCEPTION 'Removal must not include a contact value.' USING ERRCODE = '22023'; END IF;
 ELSE
  IF p_value IS NULL OR btrim(p_value) = '' THEN
   RAISE EXCEPTION 'Empty contact details cannot replace saved values. Choose Remove to delete a contact.' USING ERRCODE = '22023';
  END IF;
  IF (p_channel = 'whatsapp' AND p_value !~ '^[1-9][0-9]{6,14}$') OR (p_channel = 'telegram' AND p_value !~ '^[A-Za-z][A-Za-z0-9_]{4,31}$') THEN
   RAISE EXCEPTION 'Invalid contact details.' USING ERRCODE = '22023';
  END IF;
 END IF;
 INSERT INTO public.support_contacts (channel) VALUES (p_channel) ON CONFLICT (channel) DO NOTHING;
 SELECT * INTO current_contact FROM public.support_contacts WHERE channel = p_channel FOR UPDATE;
 IF current_contact.revision <> p_expected_revision THEN
  RAISE EXCEPTION 'This contact changed in another session. Reload the saved value before trying again.' USING ERRCODE = '40001';
 END IF;
 RETURN QUERY UPDATE public.support_contacts
  SET value = CASE WHEN p_remove THEN NULL ELSE p_value END,
      revision = current_contact.revision + 1, updated_at = now()
  WHERE channel = p_channel RETURNING *;
END;
$$;
REVOKE ALL ON FUNCTION public.save_support_contact(text, text, integer, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_support_contact(text, text, integer, boolean) TO authenticated, service_role;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_contacts;