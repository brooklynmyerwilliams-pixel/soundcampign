import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { validateContactChange, type ContactChange, type SupportContact } from "./support-contact";

export const saveSupportContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ContactChange) => validateContactChange(input))
  .handler(async ({ data, context }): Promise<SupportContact> => {
    // The RPC checks the administrator role and revision atomically inside the database.
    const { data: rows, error } = await context.supabase.rpc("save_support_contact", {
      p_channel: data.channel,
      p_value: data.value ?? "",
      p_expected_revision: data.expectedRevision,
      p_remove: data.remove,
    });
    if (error) {
      if (error.code === "P0001") throw new Error("This contact changed in another session. Reload the saved value before trying again.");
      if (error.code === "42501") throw new Error("Only administrators can change support contacts.");
      if (error.code === "22023") throw new Error("Invalid contact details. Saved contacts have not changed.");
      throw new Error("Could not save contact details. Please try again.");
    }
    const row = rows?.[0];
    if (!row) throw new Error("Saving was not confirmed. Please reload and check the saved contact.");
    return { ...row, channel: data.channel };
  });