import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe, formatNaira } from "@/lib/hooks";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Package, Clock, DollarSign, Inbox, CheckCircle2, Loader2, Music2, Shield, Award, Trophy, Crown, Gem } from "lucide-react";
import { stickyTier } from "@/lib/warehouse";
import { useState } from "react";
import { ChevronRight } from "lucide-react";

const TIER_GROUPS = [
  { key: "basic",     name: "NORMAL",   icon: Shield, color: "text-slate-400",   ring: "border-slate-500/40",   bg: "from-slate-800 to-black" },
  { key: "advance",   name: "SILVER",   icon: Award,  color: "text-zinc-300",    ring: "border-zinc-400/40",    bg: "from-zinc-700 to-black" },
  { key: "pro",       name: "GOLD",     icon: Trophy, color: "text-amber-400",   ring: "border-amber-400/50",   bg: "from-amber-700 to-black" },
  { key: "elite",     name: "PLATINUM", icon: Crown,  color: "text-fuchsia-300", ring: "border-fuchsia-400/50", bg: "from-fuchsia-800 to-black" },
  { key: "unlimited", name: "DIAMOND",  icon: Gem,    color: "text-cyan-300",    ring: "border-cyan-400/50",    bg: "from-cyan-800 to-black" },
] as const;

export const Route = createFileRoute("/_authenticated/team")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Team History \u2014 SoundCampaign"},
      {"name": "description", "content": "Review your SoundCampaign team and account history."},
      {"property": "og:title", "content": "Team History \u2014 SoundCampaign"},
      {"property": "og:description", "content": "Review your SoundCampaign team and account history."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: RecordsPage,
});

function RecordsPage() {
  const { data: me } = useMe();
  const { data: tx = [] } = useQuery({
    queryKey: ["my-tx", me?.user.id],
    enabled: !!me?.user.id,
    queryFn: async () =>
      (await supabase
        .from("mock_transactions")
        .select("*")
        .eq("user_id", me!.user.id)
        .eq("kind", "promotion")
        .order("created_at", { ascending: true })).data ?? [],
  });
  if (!me) return <Navigate to="/auth" />;

  const currentTier = stickyTier(me.profile?.balance, me.profile?.vip_level);
  const currentGroup = TIER_GROUPS.find((g) => g.key === currentTier.key) ?? TIER_GROUPS[0];

  // Tier the submission was made under, recorded in the note as "tier:<key>"
  const tierKeyOf = (note: string | null) => {
    const m = (note || "").match(/tier:([a-z]+)/i);
    return m ? m[1].toLowerCase() : currentTier.key;
  };

  // Bucket txs by calendar day, then map day-index (Day 1 = earliest date the user submitted)
  const dayKeyFor = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, "0")}-${d.getDate().toString().padStart(2, "0")}`;
  };
  const dayKeys = Array.from(new Set(tx.map((t) => dayKeyFor(t.created_at))));
  const dayIndex = new Map(dayKeys.map((k, i) => [k, i + 1]));

  return (
    <AppShell title="Records" isAdmin={me.isAdmin}>
      <h1 className="text-2xl font-black">Submission History</h1>
      <p className="text-sm text-muted-foreground">Songs you've submitted, organised by membership tier and day.</p>

      <div className="mt-6 space-y-4">
        {TIER_GROUPS.map((grp) => {
          const groupTx = tx.filter((t) => tierKeyOf(t.note) === grp.key);
          const isActive = grp.key === currentGroup.key || groupTx.length > 0;
          const dayBuckets = new Map<number, typeof tx>();
          for (const t of groupTx) {
            const idx = dayIndex.get(dayKeyFor(t.created_at)) ?? 1;
            if (!dayBuckets.has(idx)) dayBuckets.set(idx, [] as typeof tx);
            dayBuckets.get(idx)!.push(t);
          }
          return (
            <TierSection key={grp.key} group={grp} isActive={isActive} dayBuckets={dayBuckets} />
          );
        })}
        {tx.length === 0 && (
          <div className="bg-card border border-border rounded-xl py-16 text-center">
            <Inbox className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <div className="text-sm text-muted-foreground">No submissions yet. Head to Earn and promote a track.</div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

type Tx = { id: string; note: string | null; amount: number; status: string; created_at: string };

function TierSection({
  group,
  isActive,
  dayBuckets,
}: {
  group: (typeof TIER_GROUPS)[number];
  isActive: boolean;
  dayBuckets: Map<number, Tx[]>;
}) {
  const [open, setOpen] = useState(true);
  const navigate = useNavigate();
  const Icon = group.icon;
  const days = Array.from(dayBuckets.keys()).sort((a, b) => b - a);
  const totalSongs = Array.from(dayBuckets.values()).reduce((a, b) => a + b.length, 0);
  const allItems = Array.from(dayBuckets.values()).flat();
  const pendingCount = allItems.filter((t) => t.status === "pending").length;
  const earnedTotal = allItems.filter((t) => t.status === "approved").reduce((a, b) => a + Number(b.amount), 0);
  return (
    <section className={`rounded-2xl border ${group.ring} bg-gradient-to-br ${group.bg} text-white overflow-hidden`}>
      <button
        type="button"
        onClick={() => navigate({ to: "/history/$tier", params: { tier: group.key } })}
        className="w-full flex items-center justify-between px-5 py-3 border-b border-white/10 text-left"
      >
        <div className="flex items-center gap-3">
          <Icon className={`w-6 h-6 ${group.color}`} />
          <div>
            <div className={`font-black tracking-widest ${group.color}`}>{group.name}</div>
            <div className="text-[10px] uppercase tracking-widest text-white/60">Membership tier</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-white/60">Songs</div>
            <div className="text-lg font-black">{totalSongs}</div>
          </div>
          <ChevronRight className="w-5 h-5 text-white/50" />
        </div>
      </button>
      <div className="grid grid-cols-3 gap-2 px-4 py-3 border-b border-white/10">
        <TierStat icon={Package} label="TOTAL" value={String(totalSongs)} tone="text-[var(--nrc-green)]" />
        <TierStat icon={Clock} label="PENDING" value={String(pendingCount)} tone="text-[var(--nrc-gold)]" />
        <TierStat icon={DollarSign} label="EARNED" value={formatNaira(earnedTotal)} tone="text-emerald-400" />
      </div>
      {open && (
        <>
          {!isActive ? (
            <div className="px-5 py-6 text-xs text-white/50 text-center">
              Upgrade to {group.name.charAt(0) + group.name.slice(1).toLowerCase()} to log tracks under this tier.
            </div>
          ) : days.length === 0 ? (
            <div className="px-5 py-6 text-xs text-white/50 text-center">
              No tracks submitted yet on this tier. Your first submission will open <span className="font-bold text-white">Day 1</span>.
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {days.map((d) => (
                <DayFolder key={d} day={d} items={dayBuckets.get(d)!} />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function DayFolder({ day, items }: { day: number; items: Tx[] }) {
  const [open, setOpen] = useState(false);

  const earned = items.filter((t) => t.status === "approved").reduce((a, b) => a + Number(b.amount), 0);
  return (
    <div className="bg-black/30 rounded-xl border border-white/10">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-[var(--nrc-gold)] text-black grid place-items-center font-black text-sm">
            {String(day).padStart(2, "0")}
          </span>
          <div>
            <div className="font-bold text-sm">Day {day}</div>
            <div className="text-[11px] text-white/60">{items.length} track{items.length === 1 ? "" : "s"} · ${earned.toFixed(2)} earned</div>
          </div>
        </div>
        <span className="text-xs text-white/50">{open ? "Hide" : "Show"}</span>
      </button>
      {open && (
        <ul className="divide-y divide-white/10 border-t border-white/10">
          {items.map((t) => {
            const label = (t.note || "").replace(/^PENDING:\s*/, "").split("·")[0].trim() || "Untitled track";
            const platform = (t.note || "").split("·")[1]?.trim() ?? "";
            return (
              <li key={t.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-8 h-8 rounded-md bg-white/10 grid place-items-center shrink-0">
                    <Music2 className="w-4 h-4 text-[var(--nrc-gold)]" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{label}</div>
                    <div className="text-[11px] text-white/60 truncate">{platform || new Date(t.created_at).toLocaleTimeString()}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-sm font-bold text-emerald-400">${Number(t.amount).toFixed(2)}</span>
                  <StatusBadge status={t.status} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function TierStat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: string }) {
  return (
    <div className="bg-black/30 border border-white/10 rounded-lg px-2 py-2 text-center min-w-0">
      <div className={`flex items-center justify-center gap-1 text-[9px] font-bold tracking-widest ${tone}`}>
        <Icon className="w-3 h-3 shrink-0" /> <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-base font-black truncate">{value}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "approved") return <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400 font-semibold"><CheckCircle2 className="w-3 h-3" />Done</span>;
  return <span className="inline-flex items-center gap-1 text-[11px] text-amber-300 font-semibold"><Loader2 className="w-3 h-3" />Pending</span>;
}