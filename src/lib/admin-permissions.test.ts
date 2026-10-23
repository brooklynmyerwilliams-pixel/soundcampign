import { describe, it, expect } from "vitest";
import { canOpenSection, canModify, canViewAsUser } from "./admin-permissions";

describe("admin permissions", () => {
  it("restricted admins only open User Management, Song Warehouse and Live Chat", () => {
    expect(canOpenSection(false, "users")).toBe(true);
    expect(canOpenSection(false, "warehouse")).toBe(true);
    expect(canOpenSection(false, "chat")).toBe(true);
    expect(canOpenSection(false, "settings")).toBe(false);
    expect(canOpenSection(false, "admins")).toBe(false);
    expect(canOpenSection(false, "payments")).toBe(false);
  });
  it("super admin opens every section", () => {
    expect(canOpenSection(true, "settings")).toBe(true);
    expect(canOpenSection(true, "admins")).toBe(true);
  });
  it("only super admin can modify", () => {
    expect(canModify(true)).toBe(true);
    expect(canModify(false)).toBe(false);
  });
  it("restricted admins can still view as user", () => {
    expect(canViewAsUser(true)).toBe(true);
  });
});
