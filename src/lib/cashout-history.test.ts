import { beforeEach, describe, expect, it, vi } from "vitest";

const { from } = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from } }));
import { fetchCashoutHistory } from "./cashout-history";

type Record = { id: string; user_id: string; kind: string; status: string; created_at: string; amount: number };

function mockDatabase(records: Record[], error: { message: string } | null = null) {
  let owner: string;
  let kinds: string[] = [];
  const query = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn((_column: string, value: string) => { owner = value; return query; }),
    in: vi.fn((_column: string, values: string[]) => { kinds = values; return query; }),
    order: vi.fn().mockReturnThis(),
    range: vi.fn(async (start: number, end: number) => ({
      data: records.filter((r) => r.user_id === owner && kinds.includes(r.kind)).slice(start, end + 1),
      error,
    })),
  };
  from.mockReturnValue(query);
  return query;
}

const record = (id: string, kind: string, status = "approved", user_id = "member-a"): Record => ({
  id, user_id, kind, status, created_at: "2026-10-20T10:00:00Z", amount: 12.34,
});

describe("Cashout history", () => {
  beforeEach(() => vi.clearAllMocks());

  it("shows deposits and withdrawals, excluding every other transaction type", async () => {
    const query = mockDatabase([record("r", "recharge"), record("d", "deposit"), record("w", "withdraw"),
      ...["promotion", "reward", "referral", "upgrade", "adjustment", "unknown"].map((kind) => record(kind, kind))]);
    expect((await fetchCashoutHistory("member-a")).map((r) => r.id)).toEqual(["r", "d", "w"]);
    expect(query.in).toHaveBeenCalledWith("kind", ["recharge", "deposit", "withdraw"]);
  });

  it("preserves exact deposit and withdrawal records of every status", async () => {
    const records = ["pending", "approved", "rejected"].flatMap((status) => [
      record(`r-${status}`, "recharge", status), record(`d-${status}`, "deposit", status), record(`w-${status}`, "withdraw", status),
    ]);
    mockDatabase(records);
    expect(await fetchCashoutHistory("member-a")).toEqual(records);
  });

  it("scopes the same filter to each account without mixing members' records", async () => {
    const records = [record("a", "deposit"), record("b", "withdraw", "pending", "member-b")];
    mockDatabase(records);
    expect(await fetchCashoutHistory("member-a")).toEqual([records[0]]);
    expect(await fetchCashoutHistory("member-b")).toEqual([records[1]]);
  });

  it("preserves older matching records beyond the previous 20-row limit and a database page", async () => {
    const records = Array.from({ length: 1001 }, (_, i) => record(String(i), i % 2 ? "deposit" : "withdraw"));
    const query = mockDatabase(records);
    expect(await fetchCashoutHistory("member-a")).toEqual(records);
    expect(query.range.mock.calls).toEqual([[0, 499], [500, 999], [1000, 1499]]);
  });

  it("reports database failures instead of displaying a misleading empty history", async () => {
    mockDatabase([], { message: "History could not be read" });
    await expect(fetchCashoutHistory("member-a")).rejects.toThrow("History could not be read");
  });
});