import { holdValue } from "@/lib/balance";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import spotifyLogo from "@/assets/icon-spotify.png.asset.json";
import appleLogo from "@/assets/icon-apple.png.asset.json";
import youtubeLogo from "@/assets/icon-youtube.png.asset.json";
import soundcloudLogo from "@/assets/icon-soundcloud.png.asset.json";
import tidalLogo from "@/assets/icon-tidal.png.asset.json";
import deezerLogo from "@/assets/icon-deezer.png.asset.json";

export const VIEW_AS_KEY = "gt_view_as";

export function getViewAsId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(VIEW_AS_KEY);
}

export function setViewAsId(id: string | null) {
  if (typeof window === "undefined") return;
  if (id) window.localStorage.setItem(VIEW_AS_KEY, id);
  else window.localStorage.removeItem(VIEW_AS_KEY);
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const [{ data: profile }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", auth.user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", auth.user.id),
      ]);
      const isAdmin = !!roles?.some((r) => r.role === "admin");
      const viewAsId = getViewAsId();
      if (isAdmin && viewAsId && viewAsId !== auth.user.id) {
        const { data: target } = await supabase.from("profiles").select("*").eq("id", viewAsId).maybeSingle();
        if (target) {
          return {
            user: { ...auth.user, id: target.id },
            profile: target,
            isAdmin: true,
            viewingAs: target,
          };
        }
      }
      return { user: auth.user, profile, isAdmin, viewingAs: null };
    },
  });
}

export function formatNaira(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return "$" + v.toLocaleString("en-US", { maximumFractionDigits: 0 });
}

/** Exact money format with cents — used for balances, on-hold and earnings. */
export function formatMoney(n: number | null | undefined) {
  const v = Number(n ?? 0);
  return (v < 0 ? "-$" : "$") + Math.abs(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Sum of every pending transaction for a user = their on-hold balance. */
export function useOnHold(userId: string | undefined) {
  return useQuery({
    queryKey: ["on-hold", userId],
    enabled: !!userId,
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await supabase
        .from("mock_transactions")
        .select("amount,note")
        .eq("user_id", userId!)
        .eq("status", "pending");
      return (data ?? []).reduce((a, b) => a + holdValue(b), 0);
    },
  });
}

export const MUSIC_PARTNERS = [
  { key: "spotify",   name: "Spotify",        reviews: "2.1M reviews", rating: 4.9, sales: 993000, trend: "up",   color: "#1DB954", initials: "SP", logo: spotifyLogo.url },
  { key: "apple",     name: "Apple Music",    reviews: "1.8M reviews", rating: 5.0, sales: 689000, trend: "up",   color: "#FA243C", initials: "AM", logo: appleLogo.url },
  { key: "youtube",   name: "YouTube Music",  reviews: "988K reviews", rating: 4.9, sales: 838000, trend: "up",   color: "#FF0033", initials: "YT", logo: youtubeLogo.url },
  { key: "soundcloud",name: "SoundCloud",     reviews: "1.2M reviews", rating: 4.1, sales: 575000, trend: "down", color: "#FF5500", initials: "SC", logo: soundcloudLogo.url },
  { key: "tidal",     name: "Tidal",          reviews: "510K reviews", rating: 4.5, sales: 406000, trend: "down", color: "#000000", initials: "TD", logo: tidalLogo.url },
  { key: "deezer",    name: "Deezer",         reviews: "420K reviews", rating: 4.4, sales: 312000, trend: "up",   color: "#A238FF", initials: "DZ", logo: deezerLogo.url },
] as const;