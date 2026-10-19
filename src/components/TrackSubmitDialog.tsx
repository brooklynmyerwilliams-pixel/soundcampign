import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Play, Star, Volume2, Music2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { MUSIC_PARTNERS } from "@/lib/hooks";
import { adjustBalance } from "@/lib/balance";
import { payReferralBonus } from "@/lib/admin.functions";
import { useServerFn } from "@tanstack/react-start";
import type { Song } from "@/lib/warehouse";

const PENDING_KEY = (uid: string) => `gotrends:pending:${uid}`;

type Props = {
  userId: string;
  song: Song | null;
  partnerKey: string;
  pendingTxId?: string | null;
  tierKey?: string;
  onClose: () => void;
  onSubmitted?: () => void;
  onStashed?: () => void;
};

export function TrackSubmitDialog({ userId, song, partnerKey, pendingTxId, tierKey, onClose, onSubmitted, onStashed }: Props) {
  const qc = useQueryClient();
  const payReferral = useServerFn(payReferralBonus);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const partner = MUSIC_PARTNERS.find((m) => m.key === partnerKey) ?? MUSIC_PARTNERS[0];

  useEffect(() => {
    setRating(0); setReview(""); setProgress(0); setDuration(0);
  }, [song?.id]);

  const togglePlay = () => {
    const a = audioRef.current; if (!a) return;
    if (a.paused) a.play(); else a.pause();
  };

  const fmt = (s: number) => {
    if (!isFinite(s)) return "0:00";
    const m = Math.floor(s / 60); const r = Math.floor(s % 60);
    return `${m}:${r.toString().padStart(2, "0")}`;
  };

  const submit = async () => {
    if (!song) return;
    setBusy(true);
    try {
      // Reject only when the wallet cannot cover the full cost (balance already
      // reflects the held cost, so a negative balance = insufficient funds).
      const { data: prof } = await supabase
        .from("profiles").select("balance").eq("id", userId).maybeSingle();
      if (Number(prof?.balance ?? 0) < 0) {
        toast.error(`Insufficient balance — deposit $${Math.abs(Number(prof?.balance ?? 0)).toFixed(2)} to complete this submission.`);
        return;
      }
      const earn = Number((song.amount * song.commission / 100).toFixed(2));
      const note = `${song.name} · ${partner.name}${rating ? ` · ${rating}★` : ""}${review ? ` · "${review.slice(0, 60)}"` : ""}${tierKey ? ` · tier:${tierKey}` : ""} · c:${song.amount.toFixed(2)} · p:${earn.toFixed(2)}`;
      let error = null;
      if (pendingTxId) {
        ({ error } = await supabase.from("mock_transactions")
          .update({ amount: earn, status: "approved", note })
          .eq("id", pendingTxId));
      } else {
        ({ error } = await supabase.from("mock_transactions").insert({
          user_id: userId, kind: "promotion", amount: earn,
          status: "approved", note,
        }));
      }
      if (error) { toast.error(error.message); return; }
      // release the held cost back to the balance, plus the profit
      await adjustBalance(userId, song.amount + earn, earn);
      // Clear every remaining hold so On Hold returns to zero after a successful submit
      await supabase
        .from("mock_transactions")
        .update({ status: "approved", reviewed_at: new Date().toISOString() })
        .eq("user_id", userId)
        .eq("kind", "promotion")
        .eq("status", "pending");
      // Referrer earns an extra 20% of the profit — minted on top, nothing deducted here.
      try { await payReferral({ data: { profit: earn } }); } catch { /* non-blocking */ }
      await qc.invalidateQueries({ queryKey: ["me"] });
      localStorage.removeItem(PENDING_KEY(userId));
      audioRef.current?.pause();
      await qc.invalidateQueries({ queryKey: ["my-tx"] });
      await qc.invalidateQueries({ queryKey: ["today-promos", userId] });
      await qc.invalidateQueries({ queryKey: ["on-hold", userId] });
      await qc.invalidateQueries({ queryKey: ["admin-tx"] });
      await qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Submission approved", {
        description: `${song.name} · $${(song.amount + earn).toFixed(2)} returned to your balance (profit $${earn.toFixed(2)}) · On Hold $0.00`,
      });
      onSubmitted?.();
      onClose();

    } finally {
      setBusy(false);
    }
  };

  const stashAndClose = async () => {
    audioRef.current?.pause();
    if (song && !pendingTxId) {
      const earn = Number((song.amount * song.commission / 100).toFixed(2));
      const { data } = await supabase.from("mock_transactions").insert({
        user_id: userId, kind: "promotion", amount: earn,
        status: "pending", note: `PENDING: ${song.name} · ${partner.name}${tierKey ? ` · tier:${tierKey}` : ""} · c:${song.amount.toFixed(2)} · p:${earn.toFixed(2)}`,
      }).select("id").single();
      if (data) {
        localStorage.setItem(PENDING_KEY(userId), JSON.stringify({ song, txId: data.id, partnerKey }));
        qc.invalidateQueries({ queryKey: ["my-tx"] });
        qc.invalidateQueries({ queryKey: ["today-promos", userId] });
        onStashed?.();
      }
    }
    onClose();
  };

  return (
    <Dialog open={!!song} onOpenChange={(o) => { if (!o) stashAndClose(); }}>
      <DialogContent className="max-w-sm p-0 overflow-hidden w-[calc(100vw-2rem)] max-h-[90dvh] flex flex-col">
        {song && (
          <div className="p-6 pb-0 overflow-y-auto flex-1 min-h-0">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-center gap-2 text-base">
                <Music2 className="w-4 h-4 text-[var(--nrc-gold)]" />
                {song.name}
              </DialogTitle>
              <div className="mt-1 flex justify-center">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full text-white" style={{ background: partner.color }}>
                  {partner.initials} · {partner.name}
                </span>
              </div>
            </DialogHeader>

            <div className="mt-4 relative aspect-square rounded-xl overflow-hidden bg-muted">
              <img src={song.poster} alt={song.name} className="w-full h-full object-cover" />
              <button onClick={togglePlay} className="absolute inset-0 grid place-items-center bg-black/20 hover:bg-black/30 transition-colors">
                <span className="w-16 h-16 rounded-full bg-white/90 grid place-items-center shadow-lg">
                  <Play className="w-7 h-7 text-black" fill="currentColor" />
                </span>
              </button>
            </div>

            <div className="mt-4 flex items-center gap-3 bg-muted rounded-full px-3 py-2">
              <button onClick={togglePlay} className="w-8 h-8 rounded-full bg-[var(--nrc-gold)] grid place-items-center shrink-0">
                <Play className="w-4 h-4 text-black" fill="currentColor" />
              </button>
              <span className="text-xs tabular-nums">{fmt(progress)}</span>
              <div className="flex-1 h-1 bg-border rounded-full overflow-hidden">
                <div className="h-full bg-[var(--nrc-gold)]" style={{ width: `${duration ? (progress / duration) * 100 : 0}%` }} />
              </div>
              <span className="text-xs tabular-nums">{fmt(duration)}</span>
              <Volume2 className="w-4 h-4 text-muted-foreground" />
            </div>

            <audio
              ref={audioRef}
              src={song.audio}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onTimeUpdate={(e) => setProgress(e.currentTarget.currentTime)}
              className="hidden"
            />

            <div className="mt-4 text-center text-sm space-y-1">
              <div>Cost: <span className="font-bold">${song.amount.toFixed(2)}</span></div>
              <div>Profit: <span className="font-bold text-emerald-600">${(song.amount * song.commission / 100).toFixed(2)}</span></div>
              <div>Commission: <span className="font-bold">{song.commission}%</span></div>
            </div>

            <div className="mt-4 border-t pt-4">
              <div className="text-center text-sm text-muted-foreground mb-1">Rating (optional):</div>
              <div className="flex justify-center gap-1">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setRating(n)} type="button">
                    <Star className={`w-6 h-6 ${n <= rating ? "fill-[var(--nrc-gold)] text-[var(--nrc-gold)]" : "text-muted-foreground"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <div className="text-center text-sm text-muted-foreground mb-1">Review (optional):</div>
              <Textarea value={review} onChange={(e) => setReview(e.target.value)} placeholder="Share your thoughts..." rows={3} />
            </div>

            <div className="h-4" />
          </div>
        )}
        {song && (
          <div className="shrink-0 border-t bg-background p-4 pt-3">
            <button
              onClick={submit}
              disabled={busy}
              className="w-full bg-[var(--nrc-gold)] text-black font-bold py-3 rounded-md disabled:opacity-60"
            >
              {busy ? "Submitting..." : "Submit Task"}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}