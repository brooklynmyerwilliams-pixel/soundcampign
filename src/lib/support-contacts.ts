import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { type ContactChannel, type SupportContact } from "./support-contact";

export const SUPPORT_CONTACTS_KEY = ["support-contacts"] as const;
export type SupportContacts = Record<ContactChannel, SupportContact>;

export async function fetchSupportContacts(): Promise<SupportContacts> {
  const { data, error } = await supabase.from("support_contacts").select("channel,value,revision,updated_at");
  if (error) throw new Error("Could not load support contacts. Please try again.");
  const contacts: SupportContacts = {
    whatsapp: { channel: "whatsapp", value: null, revision: 0, updated_at: null },
    telegram: { channel: "telegram", value: null, revision: 0, updated_at: null },
  };
  for (const row of data ?? []) {
    if (row.channel === "whatsapp" || row.channel === "telegram") contacts[row.channel] = { ...row, channel: row.channel };
  }
  return contacts;
}

export function useSupportContacts() {
  return useQuery({
    queryKey: SUPPORT_CONTACTS_KEY,
    queryFn: fetchSupportContacts,
    staleTime: 0,
    refetchInterval: 15000,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
  });
}

/** Mounted once at the shared support widget; never write defaults during hydration. */
export function useSupportContactsRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const refresh = () => { void qc.invalidateQueries({ queryKey: SUPPORT_CONTACTS_KEY }); };
    const channel = supabase.channel("website-support-contacts")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_contacts" }, refresh)
      .subscribe((status) => { if (status === "SUBSCRIBED") refresh(); });
    window.addEventListener("online", refresh);
    return () => {
      window.removeEventListener("online", refresh);
      void supabase.removeChannel(channel);
    };
  }, [qc]);
}