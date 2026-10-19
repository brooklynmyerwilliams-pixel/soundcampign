import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/lib/hooks";
import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { reconcilePendingPromotions } from "@/lib/balance";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Package, Clock, DollarSign, Inbox } from "lucide-react";
import { POSTERS, stickyTier, promoAmounts } from "@/lib/warehouse";

const TIER_NAMES: Record<string, string> = {
  basic: "NORMAL", advance: "SILVER", pro: "GOLD", elite: "PLATINUM", unlimited: "DIAMOND",
};

export const Route = createFileRoute("/_authenticated/history/$tier")({
  head: () => ({
    meta: [
      {"title": "Submission Records — SoundCampaign"},
      {"name": "description", "content": "View your SoundCampaign music promotion submissions by membership tier."},
      {"property": "og:title", "content": "Submission Records — SoundCampaign"},
      {"property": "og:description", "content": "View your SoundCampaign music promotion submissions by membership tier."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: TierRecordsPage,
});

function TierRecordsPage() {
  const { tier } = Route.useParams();
  const navigate = useNavigate();
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
        .order("created_at", { ascending: false })).data ?? [],
  });

  const qc = useQueryClient();
  const userId = me?.user.id;
  const balance = Number(me?.profile?.balance ?? 0);
  const hasPending = tx.some((t) => t.status === "pending");
  useEffect(() => {
    if (!userId || balance < 0 || !hasPending) return;
    reconcilePendingPromotions(userId, balance).then((changed) => {
      if (changed) {
        qc.invalidateQueries({ queryKey: ["my-tx"] });
        qc.invalidateQueries({ queryKey: ["today-promos", userId] });
        qc.invalidateQueries({ queryKey: ["on-hold", userId] });
      }
    });
  }, [userId, balance, hasPending, qc]);

  if (!me) return <Navigate to="/auth" />;

  const currentTier = stickyTier(me.profile?.balance, me.profile?.vip_level);
  const tierKeyOf = (note: string | null) => {
    const m = (note || "").match(/tier:([a-z]+)/i);
    return m ? m[1].toLowerCase() : currentTier.key;
  };
  const dayKeyFor = (iso: string) => new Date(iso).toDateString();
  const allKeys = Array.from(new Set([...tx].reverse().map((t) => dayKeyFor(t.created_at))));

  const items = tx.filter((t) => tierKeyOf(t.note) === tier);
  const total = items.length;
  const pending = items.filter((t) => t.status === "pending").length;
  const earned = items
    .filter((t) => t.status === "approved")
    .reduce((a, b) => a + promoAmounts(b.note, b.amount, b.status).profit, 0);

  return (
    <AppShell title="Records" isAdmin={me.isAdmin}>
      <button
        onClick={() => navigate({ to: "/team" })}
        className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <h1 className="text-2xl font-black">Submission Records</h1>
      <p className="text-sm text-muted-foreground">
        {TIER_NAMES[tier] ?? tier.toUpperCase()} tier · all your track submissions
      </p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat icon={Package} label="TOTAL SUBMITTED" value={String(total)} tone="text-[var(--nrc-green)]" />
        <Stat icon={Clock} label="PENDING" value={String(pending)} tone="text-[var(--nrc-gold)]" />
        <Stat icon={DollarSign} label="TOTAL EARNED" value={`$${earned.toFixed(2)}`} tone="text-emerald-600" />
      </div>

      <div className="mt-5 space-y-3">
        {items.map((t) => {
          const name = (t.note || "").replace(/^PENDING:\s*/, "").split("·")[0].trim() || "Untitled track";
          const { cost, profit, total: rowTotal } = promoAmounts(t.note, t.amount, t.status);
          const commission = cost ? Number(((profit / cost) * 100).toFixed(2)) : 1.5;
          const poster = POSTERS[Math.abs(hash(name)) % POSTERS.length];
          const dayNo = allKeys.indexOf(dayKeyFor(t.created_at)) + 1;
          return (
            <div key={t.id} className="bg-card border border-border rounded-lg p-2 flex items-center gap-2.5">
              <img src={poster} alt={name} loading="lazy" className="w-11 h-11 rounded-md object-cover shrink-0" />
              <div className="min-w-0 flex-1 text-xs">
                <div className="font-semibold truncate">{name}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  ${cost.toFixed(2)} · {commission}% · Day {dayNo} · {new Date(t.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-xs font-bold text-emerald-600">+${rowTotal.toFixed(2)}</div>
                <div className="text-[10px] text-muted-foreground">profit ${profit.toFixed(2)}</div>
                {t.status === "pending"
                  ? <div className="text-[10px] text-amber-500 font-semibold">Pending</div>
                  : <div className="text-[10px] text-emerald-600 font-semibold">Submitted</div>}
              </div>
            </div>
          );
        })}
        {items.length === 0 && (
          <div className="bg-card border border-border rounded-xl py-16 text-center">
            <Inbox className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <div className="text-sm text-muted-foreground">No submissions recorded on this tier yet.</div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

function Stat({ icon: Icon, label, value, tone }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-2 py-3 text-center min-w-0">
      <div className={`flex items-center justify-center gap-1 text-[9px] font-bold tracking-widest ${tone}`}>
        <Icon className="w-3 h-3 shrink-0" /> <span className="truncate">{label}</span>
      </div>
      <div className={`mt-1 text-xl font-black truncate ${tone}`}>{value}</div>
    </div>
  );
}
