CREATE OR REPLACE FUNCTION public.is_restricted_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
     AND NOT public.has_role(_user_id, 'super_admin'::public.app_role)
$$;
REVOKE EXECUTE ON FUNCTION public.is_restricted_admin(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.is_restricted_admin(uuid) TO authenticated, service_role;

INSERT INTO public.user_roles (user_id, role)
SELECT u.id, 'super_admin'::public.app_role FROM auth.users u
WHERE lower(u.email) = 'admin@soundcamps.com'
  AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'super_admin');

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['announcements','mock_transactions','platform_settings','profiles','support_messages','trending_songs','user_exclusive_tasks','user_rewards','user_task_settings','user_wallets','vip_plans','support_contacts'] LOOP
    EXECUTE format('CREATE POLICY "restricted admin no insert" ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK (NOT public.is_restricted_admin(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "restricted admin no update" ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING (NOT public.is_restricted_admin(auth.uid())) WITH CHECK (NOT public.is_restricted_admin(auth.uid()))', t);
    EXECUTE format('CREATE POLICY "restricted admin no delete" ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING (NOT public.is_restricted_admin(auth.uid()))', t);
  END LOOP;
END $$;

CREATE POLICY "restricted admin no media insert" ON storage.objects AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (bucket_id <> 'trending-media' OR NOT public.is_restricted_admin(auth.uid()));
CREATE POLICY "restricted admin no media update" ON storage.objects AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (bucket_id <> 'trending-media' OR NOT public.is_restricted_admin(auth.uid()));
CREATE POLICY "restricted admin no media delete" ON storage.objects AS RESTRICTIVE FOR DELETE TO authenticated
  USING (bucket_id <> 'trending-media' OR NOT public.is_restricted_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.save_support_contact(p_channel text, p_value text, p_expected_revision integer, p_remove boolean DEFAULT false)
RETURNS SETOF public.support_contacts LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE current_contact public.support_contacts;
BEGIN
 IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'super_admin'::public.app_role) THEN RAISE EXCEPTION 'Only the super administrator can change support contacts.' USING ERRCODE = '42501'; END IF;
 IF p_channel IS NULL OR p_channel NOT IN ('whatsapp', 'telegram') OR p_expected_revision IS NULL OR p_expected_revision < 0 OR p_remove IS NULL THEN RAISE EXCEPTION 'Invalid contact request.' USING ERRCODE = '22023'; END IF;
 IF p_remove THEN
  IF NULLIF(p_value, '') IS NOT NULL THEN RAISE EXCEPTION 'Removal must not include a contact value.' USING ERRCODE = '22023'; END IF;
 ELSE
  IF p_value IS NULL OR btrim(p_value) = '' THEN RAISE EXCEPTION 'Empty contact details cannot replace saved values. Choose Remove to delete a contact.' USING ERRCODE = '22023'; END IF;
  IF (p_channel = 'whatsapp' AND p_value !~ '^[1-9][0-9]{6,14}$') OR (p_channel = 'telegram' AND p_value !~ '^[A-Za-z][A-Za-z0-9_]{4,31}$') THEN RAISE EXCEPTION 'Invalid contact details.' USING ERRCODE = '22023'; END IF;
 END IF;
 INSERT INTO public.support_contacts (channel) VALUES (p_channel) ON CONFLICT (channel) DO NOTHING;
 SELECT * INTO current_contact FROM public.support_contacts WHERE channel = p_channel FOR UPDATE;
 IF current_contact.revision <> p_expected_revision THEN RAISE EXCEPTION 'This contact changed in another session. Reload the saved value before trying again.' USING ERRCODE = 'P0001'; END IF;
 RETURN QUERY UPDATE public.support_contacts SET value = CASE WHEN p_remove THEN NULL ELSE p_value END, revision = current_contact.revision + 1, updated_at = now() WHERE channel = p_channel RETURNING *;
END;
$$;