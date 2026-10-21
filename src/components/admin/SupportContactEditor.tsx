import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel } from "@/components/ui/alert-dialog";
import { hasContactConflict, type ContactChannel, type ContactChange } from "@/lib/support-contact";
import { useSupportContacts, SUPPORT_CONTACTS_KEY, type SupportContacts } from "@/lib/support-contacts";
import { saveSupportContact } from "@/lib/support-contacts.functions";

export function SupportContactEditor({ channel }: { channel: ContactChannel }) {
  const query = useSupportContacts();
  const qc = useQueryClient();
  const saveContact = useServerFn(saveSupportContact);
  const [draft, setDraft] = useState<{ value: string; revision: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [removalRevision, setRemovalRevision] = useState<number | null>(null);
  const contact = query.data?.[channel];
  const label = channel === "whatsapp" ? "WhatsApp number" : "Telegram contact";
  const value = draft?.value ?? contact?.value ?? "";
  const conflict = !!(draft && contact && hasContactConflict(draft.revision, contact));
  const removalConflict = !!(contact && removalRevision !== null && hasContactConflict(removalRevision, contact));

  const submit = async (remove: boolean) => {
    if (!contact || busy) return;
    setBusy(true);
    setError(null);
    try {
      const change: ContactChange = { channel, value: remove ? null : value, expectedRevision: remove ? (removalRevision ?? contact.revision) : (draft?.revision ?? contact.revision), remove };
      const saved = await saveContact({ data: change });
      await qc.cancelQueries({ queryKey: SUPPORT_CONTACTS_KEY });
      qc.setQueryData<SupportContacts>(SUPPORT_CONTACTS_KEY, (previous) => previous ? { ...previous, [channel]: saved } : undefined);
      setDraft(null);
      setRemovalRevision(null);
      toast.success(remove ? `${label} removed` : `${label} saved`);
      void qc.invalidateQueries({ queryKey: SUPPORT_CONTACTS_KEY });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not save contact details. Please try again.";
      setError(message);
      toast.error(message);
      void qc.invalidateQueries({ queryKey: SUPPORT_CONTACTS_KEY });
    } finally {
      setBusy(false);
    }
  };

  if (!contact) return <div className="space-y-2 text-sm text-muted-foreground">
    {query.isError ? <><p role="alert">Could not load saved contacts.</p><Button size="sm" variant="outline" onClick={() => void query.refetch()}>Try again</Button></> : "Loading saved contact…"}
  </div>;

  return <div className="space-y-3">
    <label className="block space-y-1 text-sm font-medium">
      <span>{label}</span>
      <Input aria-label={label} value={value} disabled={busy}
        placeholder={channel === "whatsapp" ? "Number with country code" : "@username or https://t.me/username"}
        onChange={(e) => { setDraft({ value: e.target.value, revision: draft?.revision ?? contact.revision }); setError(null); }} />
    </label>
    {!contact.value && <p className="text-xs text-muted-foreground">No contact saved.</p>}
    {query.isError && <p role="alert" className="text-sm text-destructive">Could not refresh contacts. Your saved details have not been cleared.</p>}
    {conflict && <div role="alert" className="space-y-2 text-sm text-destructive">
      <p>This contact changed in another session. Your draft has not been saved.</p>
      <Button size="sm" variant="outline" disabled={busy} onClick={() => { setDraft(null); setError(null); }}>Reload saved value</Button>
    </div>}
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <div className="flex flex-wrap gap-2">
      <Button size="sm" disabled={busy || conflict || !draft || query.isError} onClick={() => void submit(false)}>
        {busy ? <Loader2 className="animate-spin" /> : <Save />} Save
      </Button>
      {draft && <Button size="sm" variant="outline" disabled={busy} onClick={() => { setDraft(null); setError(null); }}>Cancel</Button>}
      <Button size="sm" variant="outline" className="text-destructive" disabled={busy || conflict || !contact.value || query.isError} onClick={() => setRemovalRevision(contact.revision)}>
        <Trash2 /> Remove
      </Button>
    </div>
    <AlertDialog open={removalRevision !== null} onOpenChange={(open) => { if (!busy && !open) setRemovalRevision(null); }}>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>Remove {label}?</AlertDialogTitle>
          <AlertDialogDescription>This will remove the saved contact and its link throughout SoundCampaign.</AlertDialogDescription>
        </AlertDialogHeader>
        {removalConflict && <p role="alert" className="text-sm text-destructive">This contact changed in another session. Cancel and review the updated contact before removing it.</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <Button variant="destructive" disabled={busy || conflict || removalConflict} onClick={() => void submit(true)}>
            {busy && <Loader2 className="animate-spin" />} Remove contact
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>;
}