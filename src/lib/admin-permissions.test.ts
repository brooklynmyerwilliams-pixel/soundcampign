import { describe, it, expect } from "vitest";
import { canOpenSection, canModify, canViewAsUser, canManageAccount } from "./admin-permissions";

describe("admin permissions", () => {
  it("restricted admins open only their permitted sections", () => {
    expect(canOpenSection(false, "users")).toBe(true);
    expect(canOpenSection(false, "warehouse")).toBe(true);
    expect(canOpenSection(false, "chat")).toBe(true);
    expect(canOpenSection(false, "settings")).toBe(false);
    expect(canOpenSection(false, "admins")).toBe(false);
    expect(canOpenSection(false, "payments")).toBe(true);
    expect(canOpenSection(false, "overview")).toBe(true);
    expect(canOpenSection(false, "training")).toBe(true);
    expect(canOpenSection(false, "upgrades")).toBe(true);
    expect(canOpenSection(false, "announcements")).toBe(false);
  });
  it("super admin opens every section", () => {
    expect(canOpenSection(true, "settings")).toBe(true);
    expect(canOpenSection(true, "admins")).toBe(true);
  });
  it("only super admin can modify", () => {
    expect(canModify(true)).toBe(true);
    expect(canModify(false)).toBe(false);
  });
  it("restricted admins manage only training accounts they created", () => {
    expect(canManageAccount(false, "a1", { is_training: true, created_by: "a1" })).toBe(true);
    expect(canManageAccount(false, "a1", { is_training: true, created_by: "a2" })).toBe(false);
    expect(canManageAccount(false, "a1", { is_training: false, created_by: "a1" })).toBe(false);
    expect(canManageAccount(true, "s", { is_training: false, created_by: null })).toBe(true);
  });
  it("restricted admins can still view as user", () => {
    expect(canViewAsUser(true)).toBe(true);
  });
});
