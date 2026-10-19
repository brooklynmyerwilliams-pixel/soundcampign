import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ChatAttachment = { name: string; type: string; url?: string };

export type SupportMessage = {
  id: string;
  user_id: string;
  sender: "user" | "admin";
  body: string;
  attachments: ChatAttachment[];
  read_by_admin: boolean;
  read_by_user: boolean;
  created_at: string;
};

const asMessages = (rows: any[] | null | undefined): SupportMessage[] =>
  (rows ?? []).map((r) => ({ ...r, attachments: Array.isArray(r.attachments) ? r.attachments : [] }));

/** Live subscription that refreshes chat queries whenever a message changes. */
export function useChatRealtime(keys: unknown[][]) {
  const qc = useQueryClient();
  const flat = JSON.stringify(keys);
  useEffect(() => {
    const channel = supabase
      .channel(`support-messages-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "support_messages" }, () => {
        JSON.parse(flat).forEach((k: unknown[]) => qc.invalidateQueries({ queryKey: k }));
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [flat, qc]);
}

/** Messages for one user's support thread. */
export function useMyChat(userId?: string) {
  return useQuery({
    queryKey: ["support-chat", userId],
    enabled: !!userId,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return asMessages(data);
    },
  });
}

/** All support messages (admin view), grouped into threads by user. */
export function useAllChats(enabled = true) {
  return useQuery({
    queryKey: ["support-chat-all"],
    enabled,
    refetchInterval: 5000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_messages")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      const msgs = asMessages(data);
      const ids = Array.from(new Set(msgs.map((m) => m.user_id)));
      let names: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id,username,display_name")
          .in("id", ids);
        names = Object.fromEntries(
          (profs ?? []).map((p: any) => [p.id, p.display_name || p.username || "User"]),
        );
      }
      return ids.map((id) => {
        const list = msgs.filter((m) => m.user_id === id);
        const last = list[list.length - 1];
        return {
          id,
          name: names[id] ?? "User",
          initials: (names[id] ?? "U")
            .split(" ")
            .map((w) => w[0])
            .join("")
            .slice(0, 2)
            .toUpperCase(),
          unread: list.filter((m) => m.sender === "user" && !m.read_by_admin).length,
          lastAt: last?.created_at ?? new Date().toISOString(),
          preview: last?.body || (last?.attachments.length ? "Attachment" : ""),
          messages: list,
        };
      }).sort((a, b) => b.lastAt.localeCompare(a.lastAt));
    },
  });
}

export async function sendChatMessage(opts: {
  userId: string;
  sender: "user" | "admin";
  body: string;
  attachments?: ChatAttachment[];
}) {
  const { error } = await supabase.from("support_messages").insert({
    user_id: opts.userId,
    sender: opts.sender,
    body: opts.body,
    attachments: (opts.attachments ?? []) as any,
    read_by_admin: opts.sender === "admin",
    read_by_user: opts.sender === "user",
  });
  if (error) throw error;
}

export async function markThreadRead(userId: string, side: "admin" | "user") {
  const patch = side === "admin" ? { read_by_admin: true } : { read_by_user: true };
  await supabase
    .from("support_messages")
    .update(patch)
    .eq("user_id", userId)
    .eq("sender", side === "admin" ? "user" : "admin");
}
