import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute, Navigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe, formatNaira } from "@/lib/hooks";
import { Users, TrendingUp, Trophy, Sparkles, ArrowDownToLine, ArrowUpFromLine, CheckCircle2, Award, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export const Route = createFileRoute("/_authenticated/community")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Community \u2014 SoundCampaign"},
      {"name": "description", "content": "View the latest SoundCampaign community activity."},
      {"property": "og:title", "content": "Community \u2014 SoundCampaign"},
      {"property": "og:description", "content": "View the latest SoundCampaign community activity."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: CommunityPage,
});

type Kind = "task" | "withdraw" | "deposit" | "vip" | "streak" | "badge";
type FeedItem = {
  id: string;
  name: string;
  tier: "Silver" | "Gold" | "Platinum" | "Diamond";
  country: string;
  kind: Kind;
  amount?: number;
  meta?: string;
  minutesAgo: number;
};

const NAMES = ["Adaeze", "Kunle", "Miguel", "Chen Wei", "Priya", "Jamal", "Nadia", "Emeka", "Sofia", "Yusuf", "Ivy", "Diego", "Amara", "Ravi", "Zara", "Tunde", "Lila", "Marco", "Sade", "Hassan"];
const COUNTRIES = ["🇳🇬 NG", "🇬🇭 GH", "🇰🇪 KE", "🇿🇦 ZA", "🇺🇸 US", "🇬🇧 GB", "🇮🇳 IN", "🇧🇷 BR", "🇵🇭 PH", "🇮🇩 ID"];
const TIERS = ["Silver", "Gold", "Platinum", "Diamond"] as const;

function seedFeed(): FeedItem[] {
  const items: FeedItem[] = [];
  for (let i = 0; i < 40; i++) {
    const kinds: Kind[] = ["task", "task", "task", "withdraw", "deposit", "vip", "streak", "badge"];
    const kind = kinds[i % kinds.length];
    const amt = kind === "task" ? 1500 + ((i * 373) % 4500)
      : kind === "withdraw" ? 3000 + ((i * 811) % 25000)
      : kind === "deposit" ? 2000 + ((i * 511) % 15000)
      : undefined;
    items.push({
      id: `f-${i}`,
      name: NAMES[(i * 3) % NAMES.length],
      tier: TIERS[i % TIERS.length],
      country: COUNTRIES[(i * 7) % COUNTRIES.length],
      kind,
      amount: amt,
      minutesAgo: 1 + i * 3 + ((i * 17) % 11),
      meta: kind === "task" ? `${(i % 30) + 1} tracks` : kind === "vip" ? TIERS[(i + 1) % TIERS.length] : kind === "streak" ? `${3 + (i % 20)}-day streak` : kind === "badge" ? "Top Curator" : undefined,
    });
  }
  return items;
}

function timeAgo(min: number) {
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function CommunityPage() {
  const { data: me } = useMe();
  const [tab, setTab] = useState<"all" | Kind>("all");
  const [items, setItems] = useState<FeedItem[]>(() => seedFeed());

  // Live drip: prepend a new random event every 8s
  useEffect(() => {
    const t = setInterval(() => {
      setItems((prev) => {
        const kinds: Kind[] = ["task", "withdraw", "deposit", "vip", "streak"];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        const amt = kind === "task" ? 1500 + Math.floor(Math.random() * 4500)
          : kind === "withdraw" ? 3000 + Math.floor(Math.random() * 25000)
          : kind === "deposit" ? 2000 + Math.floor(Math.random() * 15000)
          : undefined;
        const n: FeedItem = {
          id: `f-${Date.now()}`,
          name: NAMES[Math.floor(Math.random() * NAMES.length)],
          tier: TIERS[Math.floor(Math.random() * TIERS.length)],
          country: COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)],
          kind,
          amount: amt,
          minutesAgo: 0,
          meta: kind === "task" ? `${1 + Math.floor(Math.random() * 30)} tracks` : kind === "vip" ? TIERS[Math.floor(Math.random() * TIERS.length)] : kind === "streak" ? `${3 + Math.floor(Math.random() * 20)}-day streak` : undefined,
        };
        return [n, ...prev].slice(0, 80);
      });
    }, 8000);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => tab === "all" ? items : items.filter((i) => i.kind === tab), [tab, items]);

  const stats = useMemo(() => {
    const earned = items.filter((i) => i.kind === "task").reduce((a, b) => a + (b.amount || 0), 0);
    const withdrawn = items.filter((i) => i.kind === "withdraw").reduce((a, b) => a + (b.amount || 0), 0);
    const tasks = items.filter((i) => i.kind === "task").length;
    return { earned, withdrawn, tasks, active: 1240 + Math.floor(Math.random() * 60) };
  }, [items]);

  const topEarners = useMemo(() => {
    const map = new Map<string, { name: string; tier: string; total: number }>();
    items.forEach((i) => {
      if (i.kind !== "task" || !i.amount) return;
      const cur = map.get(i.name) || { name: i.name, tier: i.tier, total: 0 };
      cur.total += i.amount;
      map.set(i.name, cur);
    });
    return [...map.values()].sort((a, b) => b.total - a.total).slice(0, 5);
  }, [items]);

  if (!me) return me === null ? <Navigate to="/auth" /> : null;

  return (
    <AppShell title="Community" isAdmin={me.isAdmin}>
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-black flex items-center gap-2"><Users className="w-6 h-6 text-[var(--nrc-green)]" /> Community</h1>
          <p className="text-sm text-muted-foreground">Live activity from SoundCampaign members around the world</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/30 rounded-full px-3 py-1">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> LIVE FEED
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
        <StatCard icon={Users} tone="green" label="ACTIVE MEMBERS" value={stats.active.toLocaleString()} />
        <StatCard icon={CheckCircle2} tone="blue" label="TASKS TODAY" value={stats.tasks.toLocaleString()} />
        <StatCard icon={TrendingUp} tone="gold" label="EARNED TODAY" value={formatNaira(stats.earned)} />
        <StatCard icon={ArrowUpFromLine} tone="rose" label="WITHDRAWN" value={formatNaira(stats.withdrawn)} />
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-4">
        {/* Feed */}
        <section className="md:col-span-2 bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-1 overflow-x-auto pb-2 -mb-2">
            {(["all", "task", "withdraw", "deposit", "vip", "streak", "badge"] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full capitalize whitespace-nowrap ${tab === t ? "bg-[var(--nrc-green)] text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {t === "all" ? "All activity" : t}
              </button>
            ))}
          </div>
          <ul className="mt-3 divide-y divide-border">
            {filtered.map((it) => <FeedRow key={it.id} it={it} />)}
            {filtered.length === 0 && <li className="py-10 text-center text-sm text-muted-foreground">No activity yet.</li>}
          </ul>
        </section>

        {/* Top earners */}
        <aside className="bg-card border border-border rounded-xl p-4 h-fit">
          <div className="flex items-center gap-2 font-bold text-sm mb-3">
            <Trophy className="w-4 h-4 text-[var(--nrc-gold)]" /> TOP EARNERS TODAY
          </div>
          <ul className="space-y-2">
            {topEarners.map((u, i) => (
              <li key={u.name} className="flex items-center gap-3">
                <span className={`w-6 h-6 rounded-full grid place-items-center text-[11px] font-black ${i === 0 ? "bg-[var(--nrc-gold)] text-[var(--nrc-green-dark)]" : i === 1 ? "bg-slate-300 text-slate-800" : i === 2 ? "bg-amber-700 text-white" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                <div className="w-8 h-8 rounded-full grid place-items-center bg-[var(--nrc-green)]/15 text-[var(--nrc-green)] font-bold text-xs">{u.name.slice(0, 2).toUpperCase()}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{u.name}</div>
                  <div className="text-[10px] text-muted-foreground">{u.tier}</div>
                </div>
                <div className="text-sm font-black text-[var(--nrc-green)]">{formatNaira(u.total)}</div>
              </li>
            ))}
          </ul>
          <div className="mt-4 rounded-lg bg-[var(--nrc-green)]/10 border border-[var(--nrc-green)]/30 p-3 text-xs">
            <div className="flex items-center gap-1.5 font-bold text-[var(--nrc-green)] mb-1"><Sparkles className="w-3.5 h-3.5" /> Community tip</div>
            Submit consistently every day to climb the leaderboard and unlock higher payouts.
          </div>
        </aside>
      </div>
    </AppShell>
  );
}

function StatCard({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: "green" | "blue" | "gold" | "rose" }) {
  const t = tone === "green" ? "text-[var(--nrc-green)] bg-[var(--nrc-green)]/10"
    : tone === "blue" ? "text-sky-600 bg-sky-500/10"
    : tone === "gold" ? "text-[var(--nrc-gold)] bg-[var(--nrc-gold)]/10"
    : "text-rose-600 bg-rose-500/10";
  return (
    <div className="bg-card border border-border rounded-xl p-3">
      <div className={`inline-flex items-center gap-1.5 text-[10px] font-bold tracking-widest px-2 py-1 rounded-md ${t}`}>
        <Icon className="w-3 h-3" /> {label}
      </div>
      <div className="mt-2 text-xl font-black">{value}</div>
    </div>
  );
}

function FeedRow({ it }: { it: FeedItem }) {
  const cfg = kindConfig(it);
  return (
    <li className="flex items-start gap-3 py-3">
      <div className="w-9 h-9 rounded-full grid place-items-center bg-[var(--nrc-green)]/15 text-[var(--nrc-green)] font-bold text-xs shrink-0">
        {it.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm">
          <span className="font-semibold">{it.name}</span>
          <span className="text-muted-foreground"> · {it.country} · </span>
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[var(--nrc-green-dark)] text-primary-foreground">{it.tier}</span>
        </div>
        <div className="text-sm text-foreground/80 mt-0.5 flex items-center gap-1.5 flex-wrap">
          <cfg.icon className={`w-3.5 h-3.5 ${cfg.color}`} />
          {cfg.text}
        </div>
        <div className="text-[10px] text-muted-foreground mt-0.5">{timeAgo(it.minutesAgo)}</div>
      </div>
      {it.amount != null && (
        <div className={`text-sm font-black shrink-0 ${cfg.color}`}>{cfg.sign}{formatNaira(it.amount)}</div>
      )}
    </li>
  );
}

function kindConfig(it: FeedItem) {
  switch (it.kind) {
    case "task": return { icon: CheckCircle2, color: "text-[var(--nrc-green)]", sign: "+", text: <>completed today's task {it.meta && <span className="text-muted-foreground">({it.meta})</span>}</> };
    case "withdraw": return { icon: ArrowUpFromLine, color: "text-rose-600", sign: "-", text: <>withdrew to wallet</> };
    case "deposit": return { icon: ArrowDownToLine, color: "text-sky-600", sign: "+", text: <>deposited to balance</> };
    case "vip": return { icon: Zap, color: "text-[var(--nrc-gold)]", sign: "", text: <>upgraded to <span className="font-semibold">{it.meta}</span></> };
    case "streak": return { icon: TrendingUp, color: "text-emerald-600", sign: "", text: <>hit a <span className="font-semibold">{it.meta}</span></> };
    case "badge": return { icon: Award, color: "text-purple-600", sign: "", text: <>earned <span className="font-semibold">{it.meta}</span> badge</> };
  }
}