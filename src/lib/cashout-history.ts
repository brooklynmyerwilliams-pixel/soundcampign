import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export const CASHOUT_TRANSACTION_KINDS = ["deposit", "withdraw"];
const PAGE_SIZE = 500;
type Transaction = Database["public"]["Tables"]["mock_transactions"]["Row"];

/** Read every cash movement, without sharing the promotion-history cache. */
export async function fetchCashoutHistory(userId: string): Promise<Transaction[]> {
  const transactions: Transaction[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("mock_transactions")
      .select("*")
      .eq("user_id", userId)
      .in("kind", CASHOUT_TRANSACTION_KINDS)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    transactions.push(...page);
    if (page.length < PAGE_SIZE) return transactions;
  }
}