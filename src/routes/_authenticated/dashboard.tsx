import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe, formatNaira, MUSIC_PARTNERS } from "@/lib/hooks";
import { BarChart3, Star, TrendingUp, TrendingDown, Headphones, Activity, ShieldCheck, Info, FileText, HelpCircle, Play, Pause, Music2, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MessageCircle, Phone, Send } from "lucide-react";
import { AUDIO_URL, POSTERS, ARTISTS, WORDS } from "@/lib/warehouse";
import { useTrendingSongs } from "@/lib/settings";
import { useStickyTier } from "@/lib/tier";
import { WelcomeBonus } from "@/components/WelcomeBonus";

export const Route = createFileRoute("/_authenticated/dashboard")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Member Home \u2014 SoundCampaign"},
      {"name": "description", "content": "View your SoundCampaign account and music promotion platforms."},
      {"property": "og:title", "content": "Member Home \u2014 SoundCampaign"},
      {"property": "og:description", "content": "View your SoundCampaign account and music promotion platforms."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: Dashboard,
});

const ANNOUNCEMENTS = [
  "🎧 Maintenance scheduled for April 2nd, 2026.",
  "🚀 Submit your tracks early to get faster promotion approvals!",
  "💎 Diamond members now get priority review!",
  "🎵 New Spotify editorial pitching channel opened.",
  "📈 YouTube Music premium boost campaigns available.",
];

const PLAYLIST = Array.from({ length: 10 }, (_, i) => ({
  id: `pl-${i}`,
  title: `${WORDS[i % WORDS.length]} ${WORDS[(i * 3 + 2) % WORDS.length]}`,
  artist: ARTISTS[i % ARTISTS.length],
  poster: POSTERS[i % POSTERS.length],
  audio: AUDIO_URL,
  duration: `${3 + (i % 3)}:${((i * 17) % 60).toString().padStart(2, "0")}`,
}));

function Dashboard() {
  const { data: me, isLoading } = useMe();
  const [supportOpen, setSupportOpen] = useState(false);
  const tier = useStickyTier(me?.user.id, me?.profile?.balance, me?.profile?.vip_level, (me?.profile as any)?.level_locked);
  if (isLoading) return <div className="p-8 text-center">Loading…</div>;
  if (!me) return <Navigate to="/auth" />;
  const p = me.profile;

  return (
    <AppShell title="Dashboard" isAdmin={me.isAdmin}>
      <WelcomeBonus />
      {/* Welcome */}
      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-2xl md:text-3xl font-black">Welcome back, {p?.display_name || p?.username}!</h1>
        <span className="inline-flex items-center gap-1 bg-[var(--nrc-green-dark)] text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
          <Headphones className="w-3 h-3" /> {tier.label}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">Here's what's happening today</p>

      {/* Announcements ticker */}
      <div className="mt-4 flex items-stretch gap-0 bg-card border border-border rounded-lg overflow-hidden">
        <div className="bg-[var(--nrc-green)] text-primary-foreground text-xs font-bold tracking-wider px-3 py-2 grid place-items-center shrink-0">
          ANNOUNCEMENTS
        </div>
        <div className="flex-1 overflow-hidden relative">
          <div className="whitespace-nowrap animate-[marquee_45s_linear_infinite] py-2">
            {[...ANNOUNCEMENTS, ...ANNOUNCEMENTS].map((a, i) => (
              <span key={i} className="mx-8 text-sm text-foreground/80">{a}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Live analytics — partner platforms */}
      <section
        className="mt-4 rounded-2xl overflow-hidden p-5 md:p-8 relative"
        style={{
          background: "radial-gradient(ellipse at 20% 0%, var(--analytics-bg-from), var(--analytics-bg-via), var(--analytics-bg-to))",
        }}
      >
        <div className="flex items-center justify-between mb-5 text-analytics-text">
          <div className="flex items-center gap-2 font-bold tracking-wider text-sm">
            <BarChart3 className="w-4 h-4 text-analytics-accent" /> LIVE ANALYTICS — PARTNER PLATFORMS
          </div>
          <div className="flex items-center gap-2 text-xs bg-analytics-accent-subtle border border-analytics-accent-subtle-border px-3 py-1.5 rounded-full">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-analytics-accent opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-analytics-accent" />
            </span>
            <span className="font-semibold text-analytics-accent uppercase tracking-wider">Live Session</span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          {MUSIC_PARTNERS.map((s) => (
            <PartnerAnalyticsCard key={s.key} s={s} />
          ))}
        </div>
      </section>


      {/* Quick links */}
      <section className="mt-4 grid grid-cols-3 md:grid-cols-7 gap-2 md:gap-3">
        {[
          { icon: Headphones, label: "Services", onClick: () => setSupportOpen(true) },
          { icon: Users, label: "Community", to: "/community" as const },
          { icon: Activity, label: "Activities", to: "/activities" as const },
          { icon: ShieldCheck, label: "Certificate", to: "/certificate" as const },
          { icon: Info, label: "About", to: "/about" as const },
          { icon: FileText, label: "T&C", to: "/terms" as const },
          { icon: HelpCircle, label: "FAQ", to: "/faq" as const },
        ].map((q) => {
          const cls = "bg-card border border-border rounded-xl p-3 grid place-items-center text-center hover:border-[var(--nrc-green)] transition-colors cursor-pointer";
          const inner = (
            <>
              <q.icon className="w-5 h-5 text-[var(--nrc-green)] mb-1" />
              <div className="text-[11px] text-muted-foreground">{q.label}</div>
            </>
          );
          return q.to
            ? <Link key={q.label} to={q.to} className={cls}>{inner}</Link>
            : <button key={q.label} onClick={q.onClick} className={cls}>{inner}</button>;
        })}
      </section>

      {/* Trending playlist */}
      <section className="mt-5 bg-card border border-border rounded-xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold tracking-wide text-sm md:text-base flex items-center gap-2">
            <Music2 className="w-4 h-4 text-[var(--nrc-green)]" /> TRENDING PLAYLIST
          </h2>
          <TrackCount />
        </div>
        <Playlist />
      </section>

      <Dialog open={supportOpen} onOpenChange={setSupportOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Contact Support</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Reach our admin team on your preferred channel.</p>
          <div className="space-y-2 mt-2">
            <a href="#live-chat" onClick={(e) => { e.preventDefault(); alert("Live chat coming online — an agent will be with you shortly."); }}
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted">
              <span className="w-10 h-10 rounded-full grid place-items-center bg-[var(--nrc-green)] text-white"><MessageCircle className="w-5 h-5" /></span>
              <div><div className="font-semibold">Live Chat</div><div className="text-xs text-muted-foreground">Chat with an agent in-app</div></div>
            </a>
            <a href="https://wa.me/15551234567" target="_blank" rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted">
              <span className="w-10 h-10 rounded-full grid place-items-center bg-emerald-500 text-white"><Phone className="w-5 h-5" /></span>
              <div><div className="font-semibold">WhatsApp</div><div className="text-xs text-muted-foreground">+1 (555) 123-4567</div></div>
            </a>
            <a href="https://t.me/soundcampaign_support" target="_blank" rel="noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border border-border hover:bg-muted">
              <span className="w-10 h-10 rounded-full grid place-items-center bg-sky-500 text-white"><Send className="w-5 h-5" /></span>
              <div><div className="font-semibold">Telegram</div><div className="text-xs text-muted-foreground">@soundcampaign_support</div></div>
            </a>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer (desktop) */}
      <footer className="hidden md:block mt-8 bg-[var(--nrc-green-dark)] text-primary-foreground rounded-2xl p-8">
        <div className="grid grid-cols-4 gap-6 text-sm">
          <div>
            <div className="font-black tracking-widest mb-3">SOUNDCAMPAIGN</div>
            <p className="text-xs opacity-70">Music promotion platform connecting artists with top streaming services.</p>
          </div>
          <div>
            <div className="text-xs uppercase opacity-60 mb-2 tracking-widest">Solutions</div>
            <ul className="space-y-1.5 opacity-80">
              <li>Playlist Pitching</li><li>Editorial Submissions</li>
              <li>Influencer Campaigns</li><li>Radio Promotion</li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase opacity-60 mb-2 tracking-widest">Platforms</div>
            <ul className="space-y-1.5 opacity-80">
              <li>Spotify</li><li>Apple Music</li><li>YouTube Music</li><li>SoundCloud · Tidal · Deezer</li>
            </ul>
          </div>
          <div>
            <div className="text-xs uppercase opacity-60 mb-2 tracking-widest">Resources</div>
            <ul className="space-y-1.5 opacity-80">
              <li>Blog</li><li>Artist Tutorials</li><li>Podcast</li><li>Contact Us</li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 mt-6 pt-4 flex justify-between text-xs opacity-60">
          <span>Copyright 2026 © SoundCampaign (Demo Clone).</span>
          <span>TERMS & CONDITIONS · PRIVACY POLICY</span>
        </div>
      </footer>

      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </AppShell>
  );
}

function PartnerAnalyticsCard({ s }: { s: typeof MUSIC_PARTNERS[number] }) {
  const pct = Math.min(95, s.sales / 10000);
  return (
    <div className="bg-analytics-card border border-analytics-card-border rounded-xl p-3 md:p-4 shadow-sm transition-all hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-white grid place-items-center shrink-0 p-1.5 overflow-hidden ring-1 ring-analytics-card-border">
          <img src={s.logo} alt={s.name} className="max-w-full max-h-full w-full h-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate text-sm text-analytics-text">{s.name}</div>
          <div className="text-[10px] text-analytics-text-muted">{s.reviews}</div>
        </div>
        <div className="flex items-center gap-1 text-xs font-bold text-analytics-text">
          <Star className="w-3 h-3 fill-analytics-star text-analytics-star" />
          {s.rating}
          {s.trend === "up"
            ? <TrendingUp className="w-3 h-3 text-analytics-trend" />
            : <TrendingDown className="w-3 h-3 text-analytics-negative" />}
        </div>
      </div>
      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className="text-[10px] text-analytics-text-muted uppercase tracking-wider">Streams</div>
          <div className="text-lg md:text-xl font-black text-analytics-text">{formatNaira(s.sales)}</div>
        </div>
        <span className={"text-xs font-semibold " + (s.trend === "up" ? "text-analytics-positive" : "text-analytics-negative")}>
          {s.trend === "up" ? "▲" : "▼"} {(pct / 10).toFixed(1)}%
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-analytics-bar-bg rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
      </div>
    </div>
  );
}


function TrackCount() {
  const { data: songs = [] } = useTrendingSongs();
  return <span className="text-xs text-muted-foreground">{songs.length || PLAYLIST.length} tracks</span>;
}

function Playlist() {
  const { data: remote } = useTrendingSongs();
  const tracks = (remote && remote.length)
    ? remote.map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        poster: s.poster || POSTERS[0],
        audio: s.audio_url || AUDIO_URL,
        duration: s.duration || "",
      }))
    : PLAYLIST;
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const stop = () => setPlayingId(null);
    a.addEventListener("ended", stop);
    return () => a.removeEventListener("ended", stop);
  }, []);

  const toggle = (id: string, src: string) => {
    const a = audioRef.current;
    if (!a) return;
    if (playingId === id) {
      a.pause();
      setPlayingId(null);
    } else {
      if (a.src !== src) a.src = src;
      a.play().catch(() => {});
      setPlayingId(id);
    }
  };

  return (
    <div className="divide-y divide-border">
      <audio ref={audioRef} preload="none" />
      {tracks.map((t, i) => {
        const active = playingId === t.id;
        return (
          <div key={t.id} className="flex items-center gap-3 py-2.5">
            <div className="w-6 text-xs text-muted-foreground text-center shrink-0">{i + 1}</div>
            <img src={t.poster} alt="" className="w-10 h-10 rounded-md object-cover shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-sm truncate">{t.title}</div>
              <div className="text-xs text-muted-foreground truncate">{t.artist}</div>
            </div>
            <div className="text-xs text-muted-foreground shrink-0 hidden sm:block">{t.duration}</div>
            <button
              onClick={() => toggle(t.id, t.audio)}
              className={"shrink-0 w-9 h-9 rounded-full grid place-items-center transition-colors " + (active ? "bg-[var(--nrc-green)] text-primary-foreground" : "bg-muted hover:bg-[var(--nrc-green)]/20 text-foreground")}
              aria-label={active ? "Pause" : "Play"}
            >
              {active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>
          </div>
        );
      })}
    </div>
  );
}

function _UnusedPartnerCard({ s }: { s: typeof MUSIC_PARTNERS[number] }) {
  return (
    <div className="border border-border rounded-xl p-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-md bg-white grid place-items-center shrink-0 p-1.5 overflow-hidden border border-border">
          <img src={s.logo} alt={s.name} className="max-w-full max-h-full w-full h-full object-contain" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold truncate">{s.name}</div>
          <div className="text-[11px] text-muted-foreground">{s.reviews}</div>
        </div>
        <div className="flex items-center gap-1 text-sm font-bold">
          <Star className="w-3.5 h-3.5 fill-[var(--nrc-gold)] text-[var(--nrc-gold)]" />
          {s.rating}
          {s.trend === "up"
            ? <TrendingUp className="w-3 h-3 text-emerald-500" />
            : <TrendingDown className="w-3 h-3 text-rose-500" />}
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Streams <span className="font-semibold text-foreground">{formatNaira(s.sales)}</span></span>
        <span className={s.trend === "up" ? "text-emerald-500" : "text-rose-500"}>{s.trend === "up" ? "↑" : "↓"}</span>
      </div>
      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-[var(--nrc-green)]" style={{ width: `${Math.min(95, (s.sales / 10000))}%` }} />
      </div>
    </div>
  );
}