ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE OR REPLACE FUNCTION public.admin_owns_training(_admin uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = _user AND p.is_training AND p.created_by = _admin)
$$;
REVOKE EXECUTE ON FUNCTION public.admin_owns_training(uuid, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.admin_owns_training(uuid, uuid) TO authenticated, service_role;

ALTER POLICY "restricted admin no update" ON public.profiles
  USING (NOT public.is_restricted_admin(auth.uid()) OR public.admin_owns_training(auth.uid(), id))
  WITH CHECK (NOT public.is_restricted_admin(auth.uid()) OR (is_training AND created_by = auth.uid()));

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['mock_transactions','user_exclusive_tasks','user_rewards','user_task_settings'] LOOP
    EXECUTE format('ALTER POLICY "restricted admin no insert" ON public.%I WITH CHECK (NOT public.is_restricted_admin(auth.uid()) OR public.admin_owns_training(auth.uid(), user_id))', t);
    EXECUTE format('ALTER POLICY "restricted admin no update" ON public.%I USING (NOT public.is_restricted_admin(auth.uid()) OR public.admin_owns_training(auth.uid(), user_id)) WITH CHECK (NOT public.is_restricted_admin(auth.uid()) OR public.admin_owns_training(auth.uid(), user_id))', t);
    EXECUTE format('ALTER POLICY "restricted admin no delete" ON public.%I USING (NOT public.is_restricted_admin(auth.uid()) OR public.admin_owns_training(auth.uid(), user_id))', t);
  END LOOP;
END $$;