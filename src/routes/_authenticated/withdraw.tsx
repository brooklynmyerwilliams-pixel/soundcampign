import { requireUserPanel } from "@/lib/role-guard";
import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useMe, formatMoney } from "@/lib/hooks";
import { supabase } from "@/integrations/supabase/client";
import { CRYPTO_ASSETS, MIN_WITHDRAWAL, type CryptoAsset } from "@/lib/crypto";
import { ArrowLeft, ArrowUpFromLine, Plus, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/withdraw")({
  beforeLoad: () => requireUserPanel(),
  head: () => ({
    meta: [
      {"title": "Withdraw — SoundCampaign"},
      {"name": "description", "content": "Request a withdrawal from your SoundCampaign wallet."},
      {"property": "og:title", "content": "Withdraw — SoundCampaign"},
      {"property": "og:description", "content": "Request a withdrawal from your SoundCampaign wallet."},
      {"property": "og:type", "content": "website"},
      {"name": "twitter:card", "content": "summary"},
    ],
  }),
  component: WithdrawPage,
});

function WithdrawPage() {
  const { data: me } = useMe();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const userId = me?.user.id;

  const [asset, setAsset] = useState<CryptoAsset | "">("");
  const [walletId, setWalletId] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newAddress, setNewAddress] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const { data: wallets = [] } = useQuery({
    queryKey: ["wallets", userId],
    enabled: !!userId,
    queryFn: async () =>
      (await supabase.from("user_wallets").select("*").eq("user_id", userId!).order("created_at", { ascending: false })).data ?? [],
  });

  if (!me) return me === null ? <Navigate to="/auth" /> : null;
  const balance = Number(me.profile?.balance ?? 0);
  const assetWallets = wallets.filter((w) => !asset || w.asset === asset);

  const addWallet = async () => {
    if (!asset) return toast.error("Select a cryptocurrency first.");
    if (newAddress.trim().length < 12) return toast.error("Enter a valid wallet address.");
    const { data, error } = await supabase.from("user_wallets")
      .insert({ user_id: userId!, asset, address: newAddress.trim(), label: newLabel.trim() || null })
      .select("id").single();
    if (error) return toast.error(error.message);
    setNewAddress(""); setNewLabel(""); setAdding(false);
    setWalletId(data.id);
    qc.invalidateQueries({ queryKey: ["wallets", userId] });
    toast.success("Wallet saved.");
  };

  const removeWallet = async (id: string) => {
    await supabase.from("user_wallets").delete().eq("id", id);
    if (walletId === id) setWalletId("");
    qc.invalidateQueries({ queryKey: ["wallets", userId] });
  };

  const submit = async () => {
    const value = Number(amount);
    if (!asset) return toast.error("Select a cryptocurrency.");
    if (!walletId) return toast.error("Select a saved wallet.");
    if (!value || value < MIN_WITHDRAWAL) return toast.error(`Minimum withdrawal is $${MIN_WITHDRAWAL.toFixed(2)}.`);
    if (value > balance) return toast.error("Amount exceeds your available balance.");
    setBusy(true);
    try {
      const wallet = wallets.find((w) => w.id === walletId);
      const { error } = await supabase.from("mock_transactions").insert({
        user_id: userId!,
        kind: "withdraw",
        amount: value,
        status: "pending",
        note: `Withdrawal · ${asset} · ${wallet?.address ?? ""}`,
      });
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["my-tx"] });
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      toast.success("Withdrawal request submitted — balance is deducted once approved.");
      navigate({ to: "/wallet" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not submit withdrawal");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell title="Withdraw" isAdmin={me.isAdmin}>
      <div className="flex items-center gap-3 mb-5">
        <button onClick={() => navigate({ to: "/wallet" })} className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-2xl font-black">Withdraw Crypto</h1>
      </div>

      <div className="max-w-2xl bg-card border border-border rounded-2xl p-5 space-y-5">
        <Field label="Select Cryptocurrency">
          <select
            value={asset}
            onChange={(e) => { setAsset(e.target.value as CryptoAsset); setWalletId(""); }}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="">Choose a cryptocurrency</option>
            {CRYPTO_ASSETS.map((c) => (
              <option key={c.key} value={c.key}>{c.key} · {c.network}</option>
            ))}
          </select>
        </Field>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <div className="text-sm font-medium">Select Saved Wallet</div>
            <button onClick={() => setAdding((v) => !v)} className="text-xs font-semibold inline-flex items-center gap-1 border border-border rounded-md px-2 py-1">
              <Plus className="w-3 h-3" /> Add Wallet
            </button>
          </div>
          <select
            value={walletId}
            onChange={(e) => setWalletId(e.target.value)}
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm"
          >
            <option value="">{assetWallets.length ? "Choose a saved wallet" : "No saved wallets yet"}</option>
            {assetWallets.map((w) => (
              <option key={w.id} value={w.id}>{w.label ? `${w.label} · ` : ""}{w.address.slice(0, 10)}…{w.address.slice(-6)}</option>
            ))}
          </select>

          {adding && (
            <div className="mt-3 rounded-lg border border-border p-3 space-y-2">
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Label (optional)"
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm" />
              <input value={newAddress} onChange={(e) => setNewAddress(e.target.value)} placeholder={`${asset || "Crypto"} wallet address`}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-sm" />
              <button onClick={addWallet} className="w-full bg-[var(--nrc-green)] text-primary-foreground text-sm font-semibold py-2 rounded-md">
                Save Wallet
              </button>
            </div>
          )}

          {assetWallets.length > 0 && (
            <ul className="mt-2 space-y-1">
              {assetWallets.map((w) => (
                <li key={w.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span className="truncate">{w.asset} · {w.address}</span>
                  <button onClick={() => removeWallet(w.id)} className="p-1 hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <Field label="Amount (USD)">
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            inputMode="decimal"
            placeholder="Enter amount"
            className="w-full bg-background border border-border rounded-lg px-3 py-2.5 text-sm"
          />
          <div className="mt-1.5 text-[11px] text-muted-foreground">
            Available: <span className="font-semibold text-foreground">{formatMoney(balance)}</span> — Min: ${MIN_WITHDRAWAL.toFixed(2)}
          </div>
        </Field>

        <button
          onClick={submit}
          disabled={busy}
          className="w-full inline-flex items-center justify-center gap-2 bg-[var(--nrc-green)] text-primary-foreground font-bold py-3 rounded-lg disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpFromLine className="w-4 h-4" />}
          {busy ? "Submitting..." : "Submit Withdrawal Request"}
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
