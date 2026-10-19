type InviteLookup = (code: string) => PromiseLike<{ data: boolean | null; error: unknown }>;

/** Only a confirmed negative result means an invalid invitation. */
export async function validateRegistrationInvite(code: string, lookup: InviteLookup) {
  const { data, error } = await lookup(code.trim());
  if (error || data === null) {
    throw new Error("Invitation codes could not be checked right now. Please try again.");
  }
  return data === true;
}