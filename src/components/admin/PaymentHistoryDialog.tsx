import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adjustBalance } from "@/lib/balance";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { noteText, walletFromNote, withWalletNote } from "@/lib/crypto";

type Tx = {
  id: string;
  user_id: string;
  kind: string;
  amount: number | string;
  status: string;
  note: string | null;
  created_at: string;
};

function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PaymentHistoryDialog({
  open, onOpenChange, tx, defaultUserId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  tx?: Tx | null;
  defaultUserId?: string | null;
}) {
  const qc = useQueryClient();
  const editing = !!tx;

  const [userId, setUserId] = useState("");
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"approved" | "pending" | "rejected">("approved");
  const [note, setNote] = useState("");
  const [wallet, setWallet] = useState("");
  const [when, setWhen] = useState(() => toLocalInput(new Date().toISOString()));
  const [applyBalance, setApplyBalance] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setApplyBalance(false);
    if (tx) {
      setUserId(tx.user_id);
      setKind(tx.kind === "withdraw" ? "withdraw" : "deposit");
      setAmount(String(Number(tx.amount) || 0));
      setStatus((tx.status as any) || "approved");
      setNote(noteText(tx.note));
      setWallet(walletFromNote(tx.note) ?? "");
      setWhen(toLocalInput(tx.created_at));
    } else {
      setUserId(defaultUserId ?? "");
      setKind("deposit");
      setAmount("");
      setStatus("approved");
      setNote("");
      setWallet("");
      setWhen(toLocalInput(new Date().toISOString()));
    }
  }, [open, tx, defaultUserId]);

  const { data: users = [] } = useQuery({
    queryKey: ["history-profiles"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, display_name")
        .order("username");
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = users as any[];
    if (!q) return list.slice(0, 40);
    return list
      .filter((u) => `${u.username} ${u.display_name ?? ""}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [users, search]);

  const selected = (users as any[]).find((u) => u.id === userId);

  const save = useMutation({
    mutationFn: async () => {
      const amt = Number(amount);
      if (!userId) throw new Error("Select a user");
      if (!Number.isFinite(amt) || amt <= 0) throw new Error("Enter a valid amount");
      const created = new Date(when);
      if (Number.isNaN(created.getTime())) throw new Error("Enter a valid date and time");

      const payload = {
        user_id: userId,
        kind,
        amount: amt,
        status,
        note: withWalletNote(note, wallet),
        created_at: created.toISOString(),
        reviewed_at: status === "pending" ? null : created.toISOString(),
      };

      if (editing && tx) {
        const { error } = await supabase.from("mock_transactions").update(payload).eq("id", tx.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("mock_transactions").insert(payload);
        if (error) throw error;
      }

      if (applyBalance && status === "approved") {
        await adjustBalance(userId, kind === "deposit" ? amt : -amt);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-tx"] });
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["me"] });
      toast.success(editing ? "History updated" : "History generated");
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit record" : "Generate history"}</DialogTitle>
          <DialogDescription>
            {editing
              ? "Update the amount, status, note or date of this record."
              : "Create a deposit or withdrawal record for a selected user."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[65vh] overflow-y-auto pr-1">
          {!editing && (
            <div className="space-y-1.5">
              <Label>User</Label>
              {selected ? (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <span className="font-medium truncate">{selected.display_name || selected.username}</span>
                  <Button size="sm" variant="ghost" onClick={() => setUserId("")}>Change</Button>
                </div>
              ) : (
                <>
                  <Input placeholder="Search username…" value={search} onChange={(e) => setSearch(e.target.value)} />
                  <div className="max-h-40 overflow-y-auto rounded-lg border border-border divide-y divide-border">
                    {filtered.length === 0 && (
                      <div className="p-3 text-xs text-muted-foreground text-center">No users found.</div>
                    )}
                    {filtered.map((u: any) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => setUserId(u.id)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                      >
                        {u.display_name || u.username}
                        <span className="text-xs text-muted-foreground"> · {u.username}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <div className="flex gap-2">
                {(["deposit", "withdraw"] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setKind(k)}
                    className={`flex-1 text-xs font-semibold px-2 py-2 rounded-lg border capitalize ${
                      kind === k ? "bg-[var(--nrc-green)] text-primary-foreground border-transparent" : "border-border bg-card"
                    }`}
                  >
                    {k}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hist-amount">Amount</Label>
              <Input id="hist-amount" type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <div className="flex gap-2">
              {(["approved", "pending", "rejected"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setStatus(s)}
                  className={`flex-1 text-xs font-semibold px-2 py-2 rounded-lg border capitalize ${
                    status === s ? "bg-[var(--nrc-green)] text-primary-foreground border-transparent" : "border-border bg-card"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hist-when">Date &amp; time</Label>
            <Input id="hist-when" type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hist-wallet">Wallet address</Label>
            <Input id="hist-wallet" placeholder="e.g. 1Jt2UpX4…dUAMFh3DiCbJw" value={wallet} onChange={(e) => setWallet(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="hist-note">Note</Label>
            <Input id="hist-note" placeholder="e.g. USDT-TRC20" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {status === "approved" && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={applyBalance} onChange={(e) => setApplyBalance(e.target.checked)} />
              Also {kind === "deposit" ? "add to" : "deduct from"} the user's balance
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : editing ? "Save changes" : "Generate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
