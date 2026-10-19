import { requireUserPanel } from "@/lib/role-guard";
import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { SpinWheel } from "@/components/SpinWheel";
import { useMe } from "@/lib/hooks";
import { useAvailableReward, useRewardHistory } from "@/lib/rewards";
import { useEventsConfig, DEFAULT_EVENTS, type CheckinMilestone, type LevelConfig } from "@/lib/events";
import { claimReward } from "@/lib/rewards.functions";
import { requestUpgrade, usePendingUpgrade } from "@/lib/upgrade";
import { WAREHOUSE_TIERS, stickyTierIndex, tierIndexForLevel } from "@/lib/warehouse";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, Trophy, Crown, Gem, Shield, Award, Gift, Lock, Check } from "lucide-react";


export const Route = createFileRoute("/_authenticated/activities")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Activities \u2014 SoundCampaign"},
      {"name": "description", "content": "View SoundCampaign account rewards and membership activities."},
      {"property": "og:title", "content": "Activities \u2014 SoundCampaign"},
      {"property": "og:description", "content": "View SoundCampaign account rewards and membership activities."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: ActivitiesPage,
});

const money = (n: number) => `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;


const LEVEL_STYLES = [
  { icon: Shield, tone: "text-slate-300",   ring: "border-slate-500/40",  btn: "from-slate-500 to-slate-700" },
  { icon: Award,  tone: "text-zinc-200",    ring: "border-zinc-400/40",   btn: "from-zinc-400 to-zinc-600" },
  { icon: Trophy, tone: "text-amber-300",   ring: "border-amber-400/50",  btn: "from-amber-400 to-orange-500" },
  { icon: Crown,  tone: "text-fuchsia-300", ring: "border-fuchsia-400/50",btn: "from-fuchsia-400 to-purple-600" },
  { icon: Gem,    tone: "text-cyan-300",    ring: "border-cyan-400/50",   btn: "from-cyan-400 to-sky-500" },
];

export function ActivitiesPage() {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data: pendingUpgrade } = usePendingUpgrade(me?.user.id);
  const { data: reward } = useAvailableReward(me?.user.id);
  const { data: history } = useRewardHistory(me?.user.id);
  const { data: events } = useEventsConfig();
  const cfg = events ?? DEFAULT_EVENTS;
  const LEVELS = cfg.levels;
  const claim = useServerFn(claimReward);

  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmTier, setConfirmTier] = useState<number | null>(null);

  const balance = Number(me?.profile?.balance ?? 0);
  const currentTierIndex = me?.profile?.level_locked
    ? tierIndexForLevel(me?.profile?.vip_level)
    : stickyTierIndex(balance, me?.profile?.vip_level);

  async function submitUpgrade(tierIndex: number) {
    if (!me?.user.id) return;
    try {
      await requestUpgrade(me.user.id, tierIndex);
      qc.invalidateQueries({ queryKey: ["pending-upgrade", me.user.id] });
      toast.success(`Upgrade to ${LEVELS[tierIndex]?.name} requested — waiting for admin approval.`);
    } catch (e: any) {
      toast.error(e.message ?? "Request failed");
    } finally {
      setConfirmTier(null);
    }
  }

  async function doClaim(delayMs = 0) {
    if (busy || !reward) return;
    setBusy(true);
    try {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs));
      const res = await claim({});
      setWon(res.amount);
      toast.success(`You won $${res.amount.toFixed(2)} — added to your balance!`);
      qc.invalidateQueries({ queryKey: ["reward", me?.user.id] });
      qc.invalidateQueries({ queryKey: ["reward-history", me?.user.id] });
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not claim this reward");
    } finally {
      setBusy(false);
      setSpinning(false);
    }
  }

  return (
    <AppShell title="Activities" isAdmin={me?.isAdmin}>
      <h1 className="text-2xl md:text-3xl font-black">{cfg.pageTitle}</h1>
      <p className="text-sm text-muted-foreground">{cfg.pageSubtitle}</p>

      {/* Reward event enabled by the admin */}
      <section className="mt-5 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
        style={{ background: "radial-gradient(circle at 70% 10%, #123a2c 0%, #05070f 70%)" }}>
        <div className="flex items-center justify-center gap-2 text-amber-300">
          <Gift className="w-5 h-5" />
          <span className="text-xs tracking-[0.4em] font-bold">{cfg.rewardTitle}</span>
        </div>

        {!reward && (
          <div className="mt-6 text-center max-w-md mx-auto">
            <Lock className="w-10 h-10 mx-auto text-white/30" />
            <div className="mt-3 font-bold text-white/90">No active event</div>
            <p className="text-xs text-white/50 mt-1">
              {won !== null
                ? `Your last reward of $${won.toFixed(2)} was credited. A new event unlocks once support enables it for your account.`
                : cfg.rewardEmptyText}
            </p>
          </div>
        )}

        {reward?.kind === "spin" && (
          <div className="mt-6 flex flex-col items-center">
            <SpinWheel
              prize={Number(reward.amount)}
              spinning={spinning}
              landed={false}
              disabled={busy}
              onSpin={() => { setSpinning(true); doClaim(4600); }}
            />
            <p className="mt-4 text-xs text-white/60 text-center max-w-sm">
              Tap SPIN to reveal your prize — the winnings are credited to your balance instantly. One spin per event.
            </p>
          </div>
        )}

        {reward?.kind === "checkin" && (
          <div className="mt-6 max-w-md mx-auto text-center">
            <div className="rounded-2xl border border-amber-400/40 bg-black/40 p-6">
              <Calendar className="w-10 h-10 mx-auto text-amber-300" />
              <div className="mt-2 text-xs tracking-[0.4em] text-amber-300/80">SALARY EARNING</div>
              <div className="text-4xl font-serif text-amber-300 mt-2">${Number(reward.amount).toFixed(2)}</div>
              {reward.note && <p className="text-xs text-white/60 mt-2">{reward.note}</p>}
              <button
                disabled={busy}
                onClick={() => doClaim()}
                className="mt-5 w-full py-3 rounded-lg bg-gradient-to-r from-amber-400 to-orange-500 text-black text-xs font-black tracking-widest disabled:opacity-60">
                {busy ? "CLAIMING..." : "CLAIM SALARY EARNING"}
              </button>
            </div>
          </div>
        )}

        {!!history?.length && (
          <div className="mt-6 max-w-md mx-auto space-y-1.5">
            <div className="text-[10px] tracking-[0.3em] text-white/40">RECENT CLAIMS</div>
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between text-xs bg-black/30 border border-white/10 rounded-lg px-3 py-2">
                <span className="text-white/70">{h.kind === "spin" ? "Spin & Win" : "Salary earning"}</span>
                <span className="font-bold text-amber-300">+${Number(h.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </section>


      {/* Salary Earning */}
      {cfg.checkinEnabled && (
      <section className="mt-5 rounded-2xl p-6 md:p-8 text-white relative overflow-hidden"
        style={{ background: "radial-gradient(circle at 30% 20%, #1a2450 0%, #05070f 70%)" }}>
        <div className="text-center">
          <div className="inline-block">
            <div className="text-3xl md:text-4xl font-serif tracking-widest text-white/90" style={{ textShadow: "0 2px 20px rgba(212,175,55,0.3)" }}>{cfg.checkinTitle}</div>
            <div className="text-xs tracking-[0.5em] text-amber-300/80 mt-1">E · A · R · N · I · N · G · S</div>
          </div>
        </div>
        <div className="mt-6 space-y-3 max-w-md mx-auto">
          {cfg.checkins.map((c: CheckinMilestone, i: number) => (
            <div key={i} className="grid grid-cols-[80px_1fr_110px] items-center border border-amber-400/30 rounded-lg overflow-hidden bg-black/40">
              <div className="text-4xl font-serif text-amber-300 text-center py-3">{String(c.day).padStart(2, "0")}</div>
              <div className="text-xs md:text-sm tracking-widest border-x border-amber-400/20 py-3 px-3 text-white/90">{c.label}</div>
              <div className="text-2xl md:text-3xl font-serif text-amber-300 text-center py-3">{money(c.amount)}</div>
            </div>
          ))}
        </div>
        <div className="text-center mt-6 text-xs tracking-[0.4em] text-amber-300/80">{cfg.checkinFooter}</div>
      </section>
      )}


      {/* Membership Level Chart */}
      {cfg.levelsEnabled && (
      <section className="mt-5">
        <h2 className="font-bold mb-3">{cfg.levelsTitle}</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {LEVELS.map((lv: LevelConfig, tierIndex: number) => {
            const isCurrent = tierIndex === currentTierIndex;
            const st = LEVEL_STYLES[tierIndex] ?? LEVEL_STYLES[0]!;
            const Icon = st.icon;
            return (
            <div key={lv.name} className={`rounded-2xl p-5 bg-gradient-to-br from-slate-900 to-black border ${isCurrent ? "border-emerald-400/70 ring-2 ring-emerald-400/40" : st.ring} text-white relative`}>
              <div className="text-[10px] tracking-widest text-white/40 absolute top-3 right-4">TIER</div>
              {isCurrent && (
                <div className="absolute top-3 left-4 inline-flex items-center gap-1 rounded-full bg-emerald-400/15 border border-emerald-400/50 px-2 py-0.5 text-[9px] font-bold tracking-widest text-emerald-300">
                  <Check className="w-3 h-3" /> CURRENT LEVEL
                </div>
              )}
              <div className="flex flex-col items-center">
                <Icon className={`w-12 h-12 ${st.tone}`} />
                <div className={`mt-2 font-black tracking-widest ${st.tone}`}>{lv.name}</div>
              </div>
              <div className="mt-4 grid grid-cols-3 border border-white/10 rounded-lg overflow-hidden text-center">
                <div className="py-2"><div className="text-[9px] tracking-widest text-white/50">DEPOSIT</div><div className="font-bold">{lv.deposit}</div></div>
                <div className="py-2 border-x border-white/10"><div className="text-[9px] tracking-widest text-white/50">TASKS</div><div className="font-bold">{lv.tasks}</div></div>
                <div className="py-2"><div className="text-[9px] tracking-widest text-white/50">PROFIT</div><div className="font-bold">{lv.commission}</div></div>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-white/70">
                {(lv.perks ?? []).map((p: string, pi: number) => (
                  <li key={pi}>◆ {p}</li>
                ))}
              </ul>
              <button
                disabled={!!pendingUpgrade || isCurrent}
                onClick={() => {
                  if (!me?.user.id) return;
                  const required = WAREHOUSE_TIERS[tierIndex]?.minBalance ?? 0;
                  if (balance < required) {
                    const shortfall = (required - balance).toFixed(2);
                    toast.error(
                      `Your balance ($${balance.toFixed(2)}) is below the $${required.toLocaleString()} required for ${lv.name}. Deposit $${shortfall} more to upgrade.`,
                    );
                    navigate({ to: "/deposit" });
                    return;
                  }
                  setConfirmTier(tierIndex);
                }}
                className={`mt-4 w-full py-2.5 rounded-lg bg-gradient-to-r ${st.btn} text-xs font-bold tracking-widest disabled:opacity-60`}>
                {isCurrent ? "CURRENT LEVEL" : pendingUpgrade ? "UPGRADE PENDING APPROVAL" : `UPGRADE TO ${lv.name}`}
              </button>

            </div>
            );
          })}
        </div>
      </section>
      )}


      <AlertDialog open={confirmTier !== null} onOpenChange={(o) => !o && setConfirmTier(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm upgrade to {confirmTier !== null ? LEVELS[confirmTier]?.name : ""}?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {confirmTier !== null && (
                <p>
                  This requires a balance of ${(WAREHOUSE_TIERS[confirmTier]?.minBalance ?? 0).toLocaleString()}. Your current balance is ${balance.toFixed(2)}.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmTier !== null && submitUpgrade(confirmTier)}>
              Confirm upgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}