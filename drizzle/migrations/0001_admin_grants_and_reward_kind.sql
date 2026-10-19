GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT SELECT ON public.announcements, public.platform_settings, public.trending_songs, public.vip_plans TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, anon;
ALTER TABLE public.mock_transactions DROP CONSTRAINT mock_transactions_kind_check;
ALTER TABLE public.mock_transactions ADD CONSTRAINT mock_transactions_kind_check CHECK (kind = ANY (ARRAY['recharge','withdraw','promotion','referral','reward','bonus','deduction','adjustment']));