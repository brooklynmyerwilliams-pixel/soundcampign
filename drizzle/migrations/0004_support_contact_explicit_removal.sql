CREATE OR REPLACE FUNCTION public.save_support_contact(p_channel text, p_value text, p_expected_revision integer, p_remove boolean DEFAULT false)
RETURNS SETOF public.support_contacts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_contact public.support_contacts;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN RAISE EXCEPTION 'Only administrators can change support contacts.' USING ERRCODE = '42501'; END IF;
 IF p_channel IS NULL OR p_channel NOT IN ('whatsapp', 'telegram') OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_remove IS NULL THEN RAISE EXCEPTION 'Invalid contact request.' USING ERRCODE = '22023'; END IF;
 IF p_remove THEN
  IF NULLIF(p_value, '') IS NOT NULL THEN RAISE EXCEPTION 'Removal must not include a contact value.' USING ERRCODE = '22023'; END IF;
 ELSE
  IF p_value IS NULL OR btrim(p_value) = '' THEN RAISE EXCEPTION 'Empty contact details cannot replace saved values. Choose Remove to delete a contact.' USING ERRCODE = '22023'; END IF;
  IF (p_channel = 'whatsapp' AND p_value !~ '^[1-9][0-9]{6,14}$') OR (p_channel = 'telegram' AND p_value !~ '^[A-Za-z][A-Za-z0-9_]{4,31}$') THEN RAISE EXCEPTION 'Invalid contact details.' USING ERRCODE = '22023'; END IF;
 END IF;
 INSERT INTO public.support_contacts (channel) VALUES (p_channel) ON CONFLICT (channel) DO NOTHING;
 SELECT * INTO current_contact FROM public.support_contacts WHERE channel = p_channel FOR UPDATE;
 IF current_contact.revision <> p_expected_revision THEN RAISE EXCEPTION 'This contact changed in another session. Reload the saved value before trying again.' USING ERRCODE = '40001'; END IF;
 RETURN QUERY UPDATE public.support_contacts SET value = CASE WHEN p_remove THEN NULL ELSE p_value END, revision = current_contact.revision + 1, updated_at = now() WHERE channel = p_channel RETURNING *;
END;
$$;