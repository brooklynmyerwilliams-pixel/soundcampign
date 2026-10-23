import { createContext, useContext } from "react";

export type AdminSection =
  | "overview" | "users" | "warehouse" | "training"
  | "payments" | "upgrades" | "admins" | "settings" | "chat" | "announcements";

/** Sections a restricted (non-super) admin may open — all strictly read-only. */
export const RESTRICTED_ADMIN_SECTIONS: readonly AdminSection[] = ["users", "warehouse", "chat"];

export function canOpenSection(isSuperAdmin: boolean, section: AdminSection): boolean {
  return isSuperAdmin || RESTRICTED_ADMIN_SECTIONS.includes(section);
}

/** Only the Super Admin may add, edit or delete anything in the Admin Panel. */
export function canModify(isSuperAdmin: boolean): boolean {
  return isSuperAdmin;
}

/** Restricted admins may still use "View as User". */
export function canViewAsUser(isAdmin: boolean): boolean {
  return isAdmin;
}

export const AdminReadOnlyContext = createContext(false);
export const useAdminReadOnly = () => useContext(AdminReadOnlyContext);
