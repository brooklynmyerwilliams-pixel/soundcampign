import { createContext, useContext } from "react";

export type AdminSection =
  | "overview" | "users" | "warehouse" | "training"
  | "payments" | "upgrades" | "admins" | "settings" | "chat" | "announcements";

/** Sections a restricted (non-super) admin may open — all strictly read-only. */
export const RESTRICTED_ADMIN_SECTIONS: readonly AdminSection[] = ["overview", "users", "warehouse", "chat", "payments", "training", "upgrades"];

export function canOpenSection(isSuperAdmin: boolean, section: AdminSection): boolean {
  return isSuperAdmin || RESTRICTED_ADMIN_SECTIONS.includes(section);
}

/** Only the Super Admin may add, edit or delete anything in the Admin Panel. */
export function canModify(isSuperAdmin: boolean): boolean {
  return isSuperAdmin;
}

/** Restricted admins may fully manage only training accounts they created. */
export function canManageAccount(isSuperAdmin: boolean, myId: string | null | undefined, account: { is_training?: boolean | null; created_by?: string | null }): boolean {
  return isSuperAdmin || (!!myId && !!account.is_training && account.created_by === myId);
}

/** Restricted admins may still use "View as User". */
export function canViewAsUser(isAdmin: boolean): boolean {
  return isAdmin;
}

export const AdminReadOnlyContext = createContext(false);
export const useAdminReadOnly = () => useContext(AdminReadOnlyContext);
