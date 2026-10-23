/** Includes Super Admin even when it does not have a second admin role row. */
export function hasAdminAccess(roles: readonly { role: string }[]): boolean {
  return roles.some(({ role }) => role === "admin" || role === "super_admin");
}