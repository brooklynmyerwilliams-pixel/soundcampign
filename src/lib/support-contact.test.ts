import { describe, expect, it } from "vitest";
import { contactUrl, hasContactConflict, validateContactChange, type SupportContact } from "./support-contact";

const whatsapp: SupportContact = { channel: "whatsapp", value: "447700900123", revision: 4, updated_at: null };
describe("support contact saving rules", () => {
  it("rejects an empty save instead of removing stored details", () => {
    expect(() => validateContactChange({ channel: "whatsapp", value: "   ", expectedRevision: 4, remove: false })).toThrow();
  });
  it("allows removal only through the explicit remove operation", () => {
    expect(validateContactChange({ channel: "telegram", value: null, expectedRevision: 2, remove: true }).remove).toBe(true);
    expect(() => validateContactChange({ channel: "telegram", value: null, expectedRevision: 2, remove: false })).toThrow();
  });
  it("identifies outdated drafts even when the contact has returned to the same value", () => {
    expect(hasContactConflict(2, whatsapp)).toBe(true);
    expect(hasContactConflict(4, whatsapp)).toBe(false);
  });
  it("normalizes WhatsApp numbers and builds the matching public link", () => {
    const change = validateContactChange({ channel: "whatsapp", value: "+44 (7700) 900-123", expectedRevision: 4, remove: false });
    expect(change.value).toBe("447700900123");
    expect(contactUrl({ ...whatsapp, value: change.value })).toBe("https://wa.me/447700900123");
  });
  it("normalizes Telegram links and builds the matching public link", () => {
    const change = validateContactChange({ channel: "telegram", value: "https://t.me/SoundCampaignHelp", expectedRevision: 0, remove: false });
    expect(change.value).toBe("SoundCampaignHelp");
    expect(contactUrl({ ...whatsapp, channel: "telegram", value: change.value })).toBe("https://t.me/SoundCampaignHelp");
  });
  it("keeps explicitly removed contacts hidden without substituting defaults", () => {
    expect(contactUrl({ ...whatsapp, value: null })).toBeNull();
  });
  it("rejects invalid or unsafe contact links", () => {
    expect(() => validateContactChange({ channel: "telegram", value: "javascript:alert(1)", expectedRevision: 0, remove: false })).toThrow();
    expect(() => validateContactChange({ channel: "whatsapp", value: "123", expectedRevision: 0, remove: false })).toThrow();
  });
});