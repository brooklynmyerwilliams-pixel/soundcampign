export type ContactChannel = "whatsapp" | "telegram";
export type SupportContact = {
  channel: ContactChannel;
  value: string | null;
  revision: number;
  updated_at: string | null;
};
export type ContactChange = {
  channel: ContactChannel;
  value: string | null;
  expectedRevision: number;
  remove: boolean;
};

export function validateContactChange(input: ContactChange): ContactChange {
  if (!input || !["whatsapp", "telegram"].includes(input.channel) ||
      !Number.isSafeInteger(input.expectedRevision) || input.expectedRevision < 0 ||
      typeof input.remove !== "boolean") throw new Error("Invalid contact request.");
  if (input.remove) {
    if (input.value !== null) throw new Error("Removal must not include a contact value.");
    return input;
  }
  if (typeof input.value !== "string" || !input.value.trim()) {
    throw new Error("Enter contact details to save. Use Remove to delete a saved contact.");
  }
  let value = input.value.trim();
  if (input.channel === "whatsapp") {
    value = value.replace(/^https:\/\/(?:wa\.me|api\.whatsapp\.com\/send\?phone=)\/?/i, "");
    if (!/^\+?[\d\s().-]+$/.test(value)) throw new Error("Enter a valid WhatsApp number with country code.");
    value = value.replace(/[^\d]/g, "");
    if (!/^[1-9][0-9]{6,14}$/.test(value)) throw new Error("Enter a valid WhatsApp number with country code.");
  } else {
    value = value.replace(/^https:\/\/(?:t\.me|telegram\.me)\//i, "").replace(/^@/, "").replace(/\/$/, "");
    if (!/^[A-Za-z][A-Za-z0-9_]{4,31}$/.test(value)) throw new Error("Enter a valid Telegram username or t.me link.");
  }
  return { ...input, value };
}

export function contactUrl(contact: SupportContact): string | null {
  if (!contact.value) return null;
  return contact.channel === "whatsapp"
    ? `https://wa.me/${contact.value}`
    : `https://t.me/${contact.value}`;
}

export function hasContactConflict(draftRevision: number, saved: SupportContact): boolean {
  return draftRevision !== saved.revision;
}