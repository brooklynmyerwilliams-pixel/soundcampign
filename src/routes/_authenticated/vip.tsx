import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute, Link, Navigate, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe, formatMoney, MUSIC_PARTNERS, useOnHold } from "@/lib/hooks";
import { ArrowLeft, Wallet as WalletIcon, Clock, Star, TrendingUp, TrendingDown, Play } from "lucide-react";
import { useStickyTier } from "@/lib/tier";

export const Route = createFileRoute("/_authenticated/vip")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Music Promotion — SoundCampaign"},
      {"name": "description", "content": "Explore SoundCampaign music partners and promotion memberships."},
      {"property": "og:title", "content": "Music Promotion — SoundCampaign"},
      {"property": "og:description", "content": "Explore SoundCampaign music partners and promotion memberships."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: StartingPage,
});

function StartingPage() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const userTier = useStickyTier(me?.user.id, me?.profile?.balance, me?.profile?.vip_level, (me?.profile as any)?.level_locked);
  const { data: hold = 0 } = useOnHold(me?.user.id);


  if (!me) return <Navigate to="/auth" />;
  const p = me.profile;

  return (
    <AppShell title="Earn" isAdmin={me.isAdmin}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate({ to: "/dashboard" })} className="flex items-center gap-2 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Earn
        </button>
        <span className="inline-flex items-center gap-1 bg-[var(--nrc-green)] text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">{userTier.label} Tier</span>
      </div>

      <div className="grid grid-cols-1 gap-3">
        <StatCard tone="balance" label="BALANCE" value={formatMoney(p?.balance)} icon={WalletIcon} hold={Number(p?.balance ?? 0) < 0 ? hold : null} />
      </div>

      <div className="mt-5">
        <h2 className="font-bold mb-3">Top Trending Tracks to Promote</h2>
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {MUSIC_PARTNERS.slice(0, 6).map((s, i) => (
            <Link key={s.key} to="/partner/$key" params={{ key: s.key }} className={`block bg-card border border-border rounded-xl p-3 hover:border-[var(--nrc-gold)] transition-colors ${i % 2 === 0 ? "order-2" : "order-1"} sm:order-0`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-md bg-white grid place-items-center p-1.5 border border-border shrink-0 overflow-hidden"><img src={s.logo} alt={s.name} className="max-w-full max-h-full w-full h-full object-contain" /></div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold truncate">{s.name} Boost</div>
                  <div className="text-[11px] text-muted-foreground">{s.reviews}</div>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold">
                  <Star className="w-3 h-3 fill-[var(--nrc-gold)] text-[var(--nrc-gold)]" />{s.rating}
                  {s.trend === "up" ? <TrendingUp className="w-3 h-3 text-emerald-500" /> : <TrendingDown className="w-3 h-3 text-rose-500" />}
                </div>
              </div>
              <span className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[var(--nrc-green)] text-primary-foreground text-xs font-semibold py-2 rounded-md">
                <Play className="w-3 h-3" /> Promote Track
              </span>
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-6 bg-card border border-border rounded-xl p-4">
        <div className="font-semibold mb-2">Operating Hours</div>
        <p className="text-xs text-muted-foreground">• Users may promote tracks during the daily operation hours from 10am to 22:59pm.</p>
        <div className="mt-3 bg-[var(--nrc-green)]/10 border border-[var(--nrc-green)]/20 text-xs text-foreground rounded-md px-3 py-2">
          <span className="font-semibold">Notice:</span> For further explanation, please click "Support" on the platform to contact our online customer service.
        </div>
      </div>
    </AppShell>
  );
}

function StatCard({ tone, label, value, icon: Icon, className, hold }: { tone: "balance" | "hold"; label: string; value: string; icon: React.ComponentType<{ className?: string }>; className?: string; hold?: number | null }) {
  const isBal = tone === "balance";
  return (
    <div className={`rounded-xl p-5 ${isBal ? "bg-[var(--nrc-green)]/10 border border-[var(--nrc-green)]/30" : "bg-[var(--nrc-gold)]/10 border border-[var(--nrc-gold)]/30"} ${className ?? ""}`}>
      <div className={`inline-flex items-center gap-2 text-[11px] font-bold tracking-widest ${isBal ? "text-[var(--nrc-green)]" : "text-[var(--nrc-gold)]"}`}>
        <span className={`w-7 h-7 rounded-md grid place-items-center ${isBal ? "bg-[var(--nrc-green)]/20" : "bg-[var(--nrc-gold)]/20"}`}><Icon className="w-4 h-4" /></span>
        {label}
      </div>
      <div className="mt-3 text-3xl font-black">{value}</div>
      {hold != null && hold > 0 && (
        <div className="mt-3 pt-2 border-t border-[var(--nrc-gold)]/40 flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest text-[var(--nrc-gold)]"><Clock className="w-3.5 h-3.5" /> ON HOLD</span>
          <span className="font-black text-sm text-[var(--nrc-gold)]">{formatMoney(hold)}</span>
        </div>
      )}
    </div>
  );
}