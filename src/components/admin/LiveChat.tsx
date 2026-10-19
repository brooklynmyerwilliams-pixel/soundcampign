import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, MessageCircle, Paperclip } from "lucide-react";
import { useAllChats, useChatRealtime, sendChatMessage, markThreadRead } from "@/lib/chat";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export function LiveChat({ initialThreadId }: { initialThreadId?: string | null }) {
  const qc = useQueryClient();
  const { data: threads = [], isLoading } = useAllChats();
  useChatRealtime([["support-chat-all"]]);
  const [activeId, setActiveId] = useState<string | null>(initialThreadId ?? null);
  const [draft, setDraft] = useState("");

  useEffect(() => {
    if (!activeId && threads.length) setActiveId(threads[0].id);
  }, [threads, activeId]);

  const active = threads.find((t) => t.id === activeId) ?? null;

  useEffect(() => {
    if (active && active.unread > 0) {
      markThreadRead(active.id, "admin").then(() =>
        qc.invalidateQueries({ queryKey: ["support-chat-all"] }),
      );
    }
  }, [active?.id, active?.unread, qc]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !active) return;
    setDraft("");
    try {
      await sendChatMessage({ userId: active.id, sender: "admin", body: text });
      qc.invalidateQueries({ queryKey: ["support-chat-all"] });
    } catch (e: any) {
      toast.error(e.message ?? "Could not send message");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Live Chat</h1>
        <p className="text-sm text-muted-foreground">Real-time support conversations with users.</p>
      </div>
      <div className="grid md:grid-cols-[280px_1fr] gap-3">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <ul className="divide-y divide-border max-h-[70vh] overflow-auto">
            {threads.length === 0 && (
              <li className="px-3 py-6 text-center text-xs text-muted-foreground">
                {isLoading ? "Loading conversations…" : "No conversations yet."}
              </li>
            )}
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => setActiveId(t.id)}
                  className={`w-full text-left px-3 py-3 flex items-center gap-3 ${t.id === activeId ? "bg-accent" : "hover:bg-accent/50"}`}
                >
                  <span className="w-9 h-9 rounded-full bg-[var(--nrc-green)] text-primary-foreground grid place-items-center text-xs font-bold shrink-0">{t.initials}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold truncate">{t.name}</span>
                    <span className="block text-[11px] text-muted-foreground truncate">{t.preview}</span>
                  </span>
                  {t.unread > 0 && <span className="text-[10px] font-bold bg-destructive text-destructive-foreground rounded-full px-1.5 py-0.5">{t.unread}</span>}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-card border border-border rounded-xl flex flex-col min-h-[60vh]">
          <div className="px-4 py-3 border-b border-border font-semibold flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[var(--nrc-gold)]" /> {active?.name ?? "No conversation"}
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-auto">
            {active?.messages.map((m) => (
              <div key={m.id} className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${m.sender === "admin" ? "ml-auto bg-[var(--nrc-green)] text-primary-foreground" : "bg-muted"}`}>
                {m.body && <div>{m.body}</div>}
                {m.attachments.map((a, i) => (
                  <div key={i} className="mt-1 inline-flex items-center gap-1 text-[11px] opacity-90">
                    <Paperclip className="w-3 h-3" /> {a.name}
                  </div>
                ))}
                <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
          <div className="p-3 border-t border-border flex gap-2">
            <Input value={draft} disabled={!active} onChange={(e) => setDraft(e.target.value)} placeholder="Type a reply…"
              onKeyDown={(e) => e.key === "Enter" && send()} />
            <Button onClick={send} disabled={!active}><Send className="w-4 h-4" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}
