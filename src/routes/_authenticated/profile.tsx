import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe, formatMoney } from "@/lib/hooks";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { User as UserIcon, Copy, Calendar, ChevronRight, ArrowDownToLine, ArrowUpFromLine, Activity, Award, HelpCircle, FileText, Pencil, Mail, Lock, KeyRound, Star, CreditCard, LogOut, Camera, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useStickyTier } from "@/lib/tier";

export const Route = createFileRoute("/_authenticated/profile")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Profile \u2014 SoundCampaign"},
      {"name": "description", "content": "Manage your SoundCampaign profile and account information."},
      {"property": "og:title", "content": "Profile \u2014 SoundCampaign"},
      {"property": "og:description", "content": "Manage your SoundCampaign profile and account information."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);
  const [openAccount, setOpenAccount] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const tier = useStickyTier(me?.user.id, me?.profile?.balance, me?.profile?.vip_level, (me?.profile as any)?.level_locked);
  if (!me) return me === null ? <Navigate to="/auth" /> : null;
  const p = me.profile;

  async function signOut() {
    await qc.cancelQueries(); qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  async function uploadAvatar(file: File) {
    if (!me) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Image must be under 5MB.");
    setUploading(true);
    try {
      const path = `${me.user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      if (error) throw error;
      const { data, error: sErr } = await supabase.storage
        .from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
      if (sErr) throw sErr;
      const { error: pErr } = await supabase.from("profiles")
        .update({ avatar_url: data.signedUrl }).eq("id", me.user.id);
      if (pErr) throw pErr;
      await qc.invalidateQueries({ queryKey: ["me"] });
      toast.success("Profile photo updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not upload photo");
    } finally {
      setUploading(false);
    }
  }

  const copy = () => {
    if (p?.invite_code) {
      navigator.clipboard.writeText(p.invite_code);
      setCopied(true); setTimeout(() => setCopied(false), 1500);
    }
  };

  const avatarUrl = (p as any)?.avatar_url as string | null | undefined;
  const creditScore = String((p as any)?.credit_score ?? 100);

  return (
    <AppShell title="Profile" isAdmin={me.isAdmin}>
      <div className="max-w-2xl mx-auto space-y-3">
        {/* Header card */}
        <div className="bg-gradient-to-br from-[var(--nrc-green)]/15 to-[var(--nrc-gold)]/10 border border-border rounded-xl p-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="relative w-14 h-14 rounded-full bg-card border border-border grid place-items-center overflow-hidden shrink-0"
              aria-label="Change profile photo"
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="Profile photo" className="w-full h-full object-cover" />
                : <UserIcon className="w-7 h-7 text-[var(--nrc-green)]" />}
              <span className="absolute inset-x-0 bottom-0 bg-black/55 text-white text-[9px] py-0.5 inline-flex items-center justify-center gap-0.5">
                {uploading ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Camera className="w-2.5 h-2.5" />}
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAvatar(f); e.target.value = ""; }}
            />
            <div className="min-w-0">
              <div className="font-bold text-lg">{p?.display_name || p?.username}</div>
              <div className="mt-0.5 flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 bg-[var(--nrc-green)] text-primary-foreground px-2 py-0.5 rounded-full font-semibold">{tier.label} Tier</span>
                <span className="text-muted-foreground">@{p?.username}</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4">
            <Mini label="Balance" value={formatMoney(p?.balance)} accent="green" />
            <Mini label="Total Earned" value={formatMoney(p?.total_earned)} accent="green" />
            <Mini label="Member Since" value={p?.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : "—"} accent="muted" />
          </div>
        </div>

        <Row icon={Star} label="Referral Code" value={p?.invite_code || "—"} action={<button onClick={copy} className="text-[var(--nrc-green)]"><Copy className="w-4 h-4" /></button>} hint={copied ? "Copied" : undefined} />
        <Row icon={CreditCard} label="Credit Score" value={creditScore} />


        <button onClick={() => navigate({ to: "/activities" })} className="w-full bg-card border border-border rounded-xl px-4 py-3 flex items-center justify-between text-sm">
          <span className="inline-flex items-center gap-2"><Calendar className="w-4 h-4 text-[var(--nrc-green)]" /> Daily Events</span>
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <button onClick={() => setOpenAccount((s) => !s)} className="w-full flex items-center justify-between px-4 py-3 font-semibold text-sm">
            Account Details <ChevronRight className={`w-4 h-4 transition ${openAccount ? "rotate-90" : ""}`} />
          </button>
          {openAccount && (
            <div className="border-t border-border divide-y divide-border">
              <Detail icon={UserIcon} color="text-[var(--nrc-green)]" label="FULL NAME"            value={p?.display_name || "—"} editable />
              <Detail icon={UserIcon} color="text-violet-500"        label="USERNAME"             value={p?.username || "—"} editable />
              <Detail icon={Mail}      color="text-emerald-500"      label="EMAIL"                value={me.user.email || "—"} editable />
              <Detail icon={Lock}      color="text-rose-500"         label="PASSWORD"             value="••••••••" editable />
              <Detail icon={KeyRound}  color="text-amber-500"        label="TRANSACTION PASSWORD" value="••••••••" editable />
              <Detail icon={Calendar}  color="text-sky-500"          label="DATE JOINED"          value={p?.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : "—"} />
              <Detail icon={Star}      color="text-[var(--nrc-gold)]" label="MEMBERSHIP LEVEL"    value="Trial" />
              <Detail icon={CreditCard} color="text-violet-500"      label="CREDIT SCORE"         value={creditScore} />
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden divide-y divide-border">
          <Action icon={ArrowDownToLine} color="text-emerald-500" label="Deposit" to="/wallet" />
          <Action icon={ArrowUpFromLine} color="text-amber-500"   label="Withdraw" to="/wallet" />
          <Action icon={Activity}        color="text-violet-500"  label="Activities" to="/activities" />
          <Action icon={Award}           color="text-[var(--nrc-gold)]" label="Certification" />
          <Action icon={HelpCircle}      color="text-[var(--nrc-green)]" label="FAQ" />
          <Action icon={FileText}        color="text-sky-500"     label="About Us" />
        </div>

        <button onClick={signOut} className="w-full bg-card border border-rose-300/40 text-rose-600 font-semibold rounded-xl py-3 inline-flex items-center justify-center gap-2">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </AppShell>
  );
}

function Mini({ label, value, accent }: { label: string; value: string; accent: "green" | "muted" }) {
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${accent === "green" ? "bg-[var(--nrc-green)]/15" : "bg-muted/50"}`}>
      <div className={`text-[10px] uppercase tracking-wider ${accent === "green" ? "text-[var(--nrc-green)] font-bold" : "text-muted-foreground"}`}>{label}</div>
      <div className="font-black text-sm mt-0.5">{value}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value, action, hint }: { icon: React.ComponentType<{ className?: string }>; label: string; value: string; action?: React.ReactNode; hint?: string }) {
  return (
    <div className="bg-card border border-border rounded-xl px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5"><Icon className="w-3 h-3" />{label}</div>
      <div className="flex items-center justify-between mt-1">
        <span className="font-semibold">{value}</span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">{hint}{action}</div>
      </div>
    </div>
  );
}

function Detail({ icon: Icon, color, label, value, editable }: { icon: React.ComponentType<{ className?: string }>; color: string; label: string; value: string; editable?: boolean }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Icon className={`w-4 h-4 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="font-medium text-sm truncate">{value}</div>
      </div>
      {editable && <Pencil className="w-3.5 h-3.5 text-muted-foreground" />}
    </div>
  );
}

function Action({ icon: Icon, color, label, to }: { icon: React.ComponentType<{ className?: string }>; color: string; label: string; to?: "/wallet" | "/activities" }) {
  const navigate = useNavigate();
  return (
    <button onClick={() => to && navigate({ to })} className="w-full flex items-center gap-3 px-4 py-3 text-sm hover:bg-muted/30">
      <Icon className={`w-4 h-4 ${color}`} /> <span className="flex-1 text-left">{label}</span>
      <ChevronRight className="w-4 h-4 text-muted-foreground" />
    </button>
  );
}