CREATE TYPE public.app_role AS ENUM ('admin', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "users see own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text,
  phone text,
  invite_code text UNIQUE NOT NULL DEFAULT upper(substr(md5(random()::text), 1, 8)),
  vip_level int NOT NULL DEFAULT 0,
  balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  team_size int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own profile or admin" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "update own profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "admin update any profile" ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.vip_plans (
  id int PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL,
  daily_income numeric NOT NULL,
  cycle_days int NOT NULL,
  total_return numeric NOT NULL,
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vip_plans TO anon, authenticated;
GRANT ALL ON public.vip_plans TO service_role;
ALTER TABLE public.vip_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vip plans public read" ON public.vip_plans FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage vip plans" ON public.vip_plans FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.vip_plans (id, name, price, daily_income, cycle_days, total_return) VALUES
  (1, 'VIP1', 4500, 630, 90, 56700),
  (2, 'VIP2', 13000, 1800, 90, 162000),
  (3, 'VIP3', 43000, 6000, 90, 540000),
  (4, 'VIP4', 112000, 16000, 90, 1440000),
  (5, 'VIP5', 230000, 33000, 90, 2970000),
  (6, 'VIP6', 800000, 128000, 90, 11520000),
  (7, 'VIP7', 1600000, 280000, 90, 25200000);

CREATE TABLE public.mock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('recharge','withdraw')),
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mock_transactions TO authenticated;
GRANT ALL ON public.mock_transactions TO service_role;
ALTER TABLE public.mock_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own tx or admin" ON public.mock_transactions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "insert own tx" ON public.mock_transactions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin update tx" ON public.mock_transactions FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.announcements TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "announcements public read" ON public.announcements FOR SELECT TO anon, authenticated USING (active);
CREATE POLICY "admin manage announcements" ON public.announcements FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.announcements (message) VALUES
  ('Congratulations to ****98713: Successfully recruited VIP6 and received demo ₦332,800 referral reward'),
  ('Congratulations to ****12972: Successfully recruited VIP4 and received demo ₦44,800 referral reward'),
  ('Congratulations to new demo employee ****48864 for joining VIP2, with a daily income of demo ₦1,800'),
  ('Welcome to the NRC demo clone — all numbers shown are mock data for UI demonstration only.'),
  ('Congratulations to ****33580: Upgraded from VIP4 to VIP7 in the demo simulation');

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
ALTER TABLE public.mock_transactions DROP CONSTRAINT mock_transactions_kind_check;
ALTER TABLE public.mock_transactions ADD CONSTRAINT mock_transactions_kind_check CHECK (kind = ANY (ARRAY['recharge'::text, 'withdraw'::text, 'promotion'::text]));
CREATE POLICY "admin insert tx" ON public.mock_transactions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "admin delete tx" ON public.mock_transactions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS suspended boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS level_locked boolean NOT NULL DEFAULT false;
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TABLE public.user_task_settings (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  group_seed integer NOT NULL DEFAULT 0,
  upgrade_position integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_task_settings TO authenticated;
GRANT ALL ON public.user_task_settings TO service_role;
ALTER TABLE public.user_task_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own task settings or admin" ON public.user_task_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage task settings" ON public.user_task_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "update own task settings" ON public.user_task_settings FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.user_exclusive_tasks (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position integer NOT NULL,
  name text NOT NULL,
  amount numeric NOT NULL,
  commission numeric NOT NULL DEFAULT 5,
  poster text,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_exclusive_tasks TO authenticated;
GRANT ALL ON public.user_exclusive_tasks TO service_role;
ALTER TABLE public.user_exclusive_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own exclusive tasks or admin" ON public.user_exclusive_tasks FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage exclusive tasks" ON public.user_exclusive_tasks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "update own exclusive tasks" ON public.user_exclusive_tasks FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_user_task_settings_updated_at BEFORE UPDATE ON public.user_task_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_user_exclusive_tasks_updated_at BEFORE UPDATE ON public.user_exclusive_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, balance)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    10
  )
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$function$;
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_training boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS profiles_referred_by_idx ON public.profiles(referred_by);
CREATE INDEX IF NOT EXISTS profiles_invite_code_idx ON public.profiles(invite_code);
ALTER TABLE public.mock_transactions DROP CONSTRAINT IF EXISTS mock_transactions_kind_check;
ALTER TABLE public.mock_transactions ADD CONSTRAINT mock_transactions_kind_check
  CHECK (kind = ANY (ARRAY['recharge','withdraw','promotion','referral']));
CREATE TABLE public.user_wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  asset text not null check (asset in ('USDT-TRC20','ETH','BTC')),
  address text not null,
  label text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_wallets TO authenticated;
GRANT ALL ON public.user_wallets TO service_role;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wallets" ON public.user_wallets FOR ALL TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "deposit proof upload" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'deposit-proofs' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "deposit proof read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'deposit-proofs' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(),'admin')));

CREATE TABLE public.platform_settings (
  key text PRIMARY KEY,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "settings public read" ON public.platform_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage settings" ON public.platform_settings FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.trending_songs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL,
  artist text NOT NULL,
  poster text,
  audio_url text,
  duration text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.trending_songs TO anon;
GRANT SELECT ON public.trending_songs TO authenticated;
GRANT ALL ON public.trending_songs TO service_role;
ALTER TABLE public.trending_songs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "trending public read" ON public.trending_songs FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin manage trending" ON public.trending_songs FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
GRANT INSERT, UPDATE, DELETE ON public.trending_songs TO authenticated;
CREATE TRIGGER update_trending_songs_updated_at BEFORE UPDATE ON public.trending_songs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.platform_settings (key, value) VALUES
('deposit_addresses', '{"USDT-TRC20":{"address":"TQn9Y2khES4rGqLh2Xb7pV1yLm8Fa5dK3c","network":"TRC-20 (Tron)"},"ETH":{"address":"0x7A3fD2e9C41b58aE0c6D5b1F84ea2C9b7D31F0aE","network":"ERC-20"},"BTC":{"address":"bc1qk8f3m2v9xr7t4jw5s6q0hlz2ap8ycd3nue4rg9","network":"Bitcoin Network"}}'::jsonb);

INSERT INTO public.trending_songs (position, title, artist, poster, audio_url, duration) VALUES
(1,'Midnight Silver','Nova Rains','https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3','3:24'),
(2,'Golden Velvet','Echo Vale','https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3','4:02'),
(3,'Neon Ocean','Kairo Sky','https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=400','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3','3:51'),
(4,'Silver Sunset','Lumen West','https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3','3:15'),
(5,'Velvet Wildfire','Sable Moon','https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=400','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3','4:20'),
(6,'Paper Diamond','Rio Vega','https://images.unsplash.com/photo-1501612780327-45045538702b?w=400','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3','3:38'),
(7,'Electric Crimson','Astra Belle','https://images.unsplash.com/photo-1514320291840-2e0a9bf2a9ae?w=400','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3','3:05'),
(8,'Ocean Midnight','Odessa Grey','https://images.unsplash.com/photo-1506157786151-b8491531f063?w=400','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3','4:11'),
(9,'Crimson Golden','Milo Frost','https://images.unsplash.com/photo-1520166012956-add9ba0835cb?w=400','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3','3:47'),
(10,'Sunset Neon','Juno Lark','https://images.unsplash.com/photo-1445375011782-2384686778a0?w=400','https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3','3:29');

CREATE POLICY "trending media read" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'trending-media');
CREATE POLICY "trending media admin write" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trending-media' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "trending media admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'trending-media' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "trending media admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'trending-media' AND has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user','admin')),
  body text NOT NULL DEFAULT '',
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_by_admin boolean NOT NULL DEFAULT false,
  read_by_user boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "view own chat or admin" ON public.support_messages
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "user sends own chat" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND sender = 'user');
CREATE POLICY "admin sends chat" ON public.support_messages
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') AND sender = 'admin');
CREATE POLICY "update own chat or admin" ON public.support_messages
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX support_messages_user_created_idx ON public.support_messages (user_id, created_at);
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

ALTER TABLE public.user_task_settings ADD COLUMN IF NOT EXISTS group_assigned boolean NOT NULL DEFAULT false;
CREATE POLICY "update own tx" ON public.mock_transactions
FOR UPDATE TO authenticated
USING (user_id = auth.uid() AND kind = 'promotion')
WITH CHECK (user_id = auth.uid() AND kind = 'promotion');
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credit_score integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS avatar_url text;
CREATE POLICY "avatar upload own" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatar update own" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatar delete own" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatar read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars');

CREATE TABLE public.user_rewards (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('spin','checkin')),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'available' CHECK (status IN ('available','claimed')),
  note text,
  claimed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_rewards TO authenticated;
GRANT ALL ON public.user_rewards TO service_role;
ALTER TABLE public.user_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage rewards" ON public.user_rewards FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "view own rewards or admin" ON public.user_rewards FOR SELECT TO authenticated
USING (user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
CREATE TRIGGER update_user_rewards_updated_at BEFORE UPDATE ON public.user_rewards
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_user_rewards_user_status ON public.user_rewards(user_id, status);