import { describe, expect, it } from "vitest";
import { pairAccounts, matchesAccount } from "./account-pairing";

const real = (id: string) => ({ id, username: id, display_name: id, phone: null, invite_code: `CODE-${id}`, is_training: false, referred_by: null });
const training = (id: string, referred_by: string | null) => ({ ...real(id), is_training: true, referred_by });

describe("referral account pairing", () => {
  it("places each training account opposite its actual referrer, regardless of list order", () => {
    const rows = pairAccounts([training("t2", "r2"), real("r1"), training("t1", "r1"), real("r2")]);
    expect(rows.map((row) => [row.referrer?.id, row.training.map((account) => account.id)])).toEqual([["r1", ["t1"]], ["r2", ["t2"]]]);
  });
  it("groups all training accounts under the same referring real account", () => {
    const rows = pairAccounts([real("r1"), training("t1", "r1"), training("t2", "r1")]);
    expect(rows).toHaveLength(1);
    expect(rows[0].training.map((account) => account.id)).toEqual(["t1", "t2"]);
  });
  it("never pairs an unlinked training account with an unrelated real account", () => {
    const rows = pairAccounts([real("r1"), training("t1", null), training("t2", "missing")]);
    expect(rows.map((row) => row.referrer?.id ?? null)).toEqual(["r1", null, null]);
    expect(rows[0].training).toEqual([]);
  });
  it("retains the actual referrer even when they are an administrator", () => {
    expect(pairAccounts([real("admin"), training("t1", "admin")], new Set(["admin"]))[0].referrer?.id).toBe("admin");
  });
  it("finds training accounts by name or referral code for paired search", () => {
    expect(matchesAccount(training("student", "r1"), "student")).toBe(true);
    expect(matchesAccount(training("student", "r1"), "CODE-student")).toBe(true);
    expect(matchesAccount(training("student", "r1"), "unrelated")).toBe(false);
  });
});