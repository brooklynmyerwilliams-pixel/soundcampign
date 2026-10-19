import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe } from "@/lib/hooks";
import { supabase } from "@/integrations/supabase/client";
import { CRYPTO_ASSETS, type CryptoAsset } from "@/lib/crypto";
import { useDepositAddresses } from "@/lib/settings";
import { ArrowLeft, Upload, ArrowDownToLine, Copy, Check, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/deposit")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Deposit — SoundCampaign"},
      {"name": "description", "content": "Fund your SoundCampaign wallet and submit payment proof."},
      {"property": "og:title", "content": "Deposit — SoundCampaign"},
      {"property": "og:description", "content": "Fund your SoundCampaign wallet and submit payment proof."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: DepositPage,
});

function DepositPage() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [asset, setAsset] = useState<CryptoAsset | "">("");
  const [amount, setAmount] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: addresses } = useDepositAddresses();
  const base = CRYPTO_ASSETS.find((c) => c.key === asset);
  const override = asset && addresses ? addresses[asset as CryptoAsset] : undefined;
  const selected = base
    ? { ...base, address: override?.address || base.address, network: override?.network || base.network }
    : undefined;

  if (!me) return me === null ? <Navigate to="/auth" /> : null;
  const userId = me.user.id;

  const copyAddress = async () => {
    if (!selected) return;
    await navigator.clipboard.writeText(selected.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const submit = async () => {
    const value = Number(amount);
    if (!asset) return toast.error("Select a cryptocurrency.");
    if (!value || value <= 0) return toast.error("Enter a valid amount.");
    if (!file) return toast.error("Upload your payment screenshot.");
    setBusy(true);
    try {
      const path = `${userId}/${Date.now()}-${file.name.replace(/[^\w.-]/g, "_")}`;
      const { error: upErr } = await supabase.storage.from("deposit-proofs").upload(path, file);
      if (upErr) throw upErr;
      const { error } = await supabase.from("mock_transactions").insert({
        user_id: userId,
        kind: "recharge",
        amount: value,
        status: "pending",
        note: `Deposit · ${asset} · proof:${path}`,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["my-tx"] });
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      toast.success("Deposit request submitted — awaiting approval.");
      navigate({ to: "/wallet" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit deposit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Deposit" isAdmin={me.isAdmin}>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate({ to: "/wallet" })} className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-black">Deposit Crypto</h1>
      </div>

      <div className="max-w-2xl bg-card border border-border rounded-2xl p-5 space-y-5">
        <Field label="Select Cryptocurrency">
          <select
            value={asset}
            onChange={(e) => setAsset(e.target.value as CryptoAsset)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="">Choose a cryptocurrency</option>
            {CRYPTO_ASSETS.map((c) => (
              <option key={c.key} value={c.key}>{c.key} · {c.network}</option>
            ))}
          </select>
        </Field>

        {selected && (
          <div className="rounded-lg border border-[var(--nrc-green)]/30 bg-[var(--nrc-green)]/10 p-4">
            <div className="text-[11px] font-bold tracking-widest text-[var(--nrc-green)]">
              {selected.name.toUpperCase()} DEPOSIT ADDRESS · {selected.network}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <code className="flex-1 text-xs break-all font-mono">{selected.address}</code>
              <button onClick={copyAddress} className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold border border-border rounded-md px-2.5 py-1.5 bg-card">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Send only {selected.key} to this address. Sending any other asset will result in permanent loss.
            </p>
          </div>
        )}

        <Field label="Amount (USD equivalent)">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Enter amount"
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm"
          />
        </Field>

        <Field label="Proof of Payment">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="w-full border-2 border-dashed border-[var(--nrc-green)]/40 rounded-lg py-9 text-center hover:bg-[var(--nrc-green)]/5 transition-colors"
          >
            <Upload className="w-6 h-6 mx-auto text-muted-foreground" />
            <div className="mt-2 text-sm text-muted-foreground">{file ? file.name : "Click to upload screenshot"}</div>
            <div className="text-[11px] text-muted-foreground/70">PNG, JPG up to 5MB</div>
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              if (f && f.size > 5 * 1024 * 1024) return toast.error("File must be under 5MB.");
              setFile(f);
            }}
          />
        </Field>

        <button
          onClick={submit}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 bg-[var(--nrc-green)] text-primary-foreground font-bold py-3 rounded-lg disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
          {busy ? "Submitting..." : "Submit Deposit Request"}
        </button>
      </div>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm font-medium mb-1.5">{label}</div>
      {children}
    </div>
  );
}
