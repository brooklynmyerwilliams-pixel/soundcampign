import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { updateUserAccount } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export function AccountEditDialog({ account, open, onClose, invalidateKeys = [] }: {
  account: any;
  open: boolean;
  onClose: () => void;
  invalidateKeys?: readonly unknown[][];
}) {
  const qc = useQueryClient();
  const update = useServerFn(updateUserAccount);
  const [displayName, setDisplayName] = useState(account.display_name || "");
  const [username, setUsername] = useState(account.username || "");
  const [phone, setPhone] = useState(account.phone || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [creditScore, setCreditScore] = useState(String(account.credit_score ?? 100));

  const save = useMutation({
    mutationFn: async () =>
      update({
        data: {
          userId: account.id,
          username: username || undefined,
          displayName,
          phone,
          email: email || undefined,
          password: password || undefined,
          creditScore: creditScore === "" ? undefined : Number(creditScore),
        },
      }),
    onSuccess: () => {
      invalidateKeys.forEach((k) => qc.invalidateQueries({ queryKey: k as any }));
      toast.success("Account updated");
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
          <DialogDescription>Update the login and profile details for this account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Username</Label><Input value={username} onChange={(e) => setUsername(e.target.value)} /></div>
            <div><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
          </div>
          <div><Label>Phone</Label><Input value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
          <div>
            <Label>Credit score</Label>
            <Input inputMode="numeric" value={creditScore} onChange={(e) => setCreditScore(e.target.value.replace(/[^\d]/g, ""))} />
          </div>
          <div>

            <Label>Email <span className="text-muted-foreground text-xs">(leave blank to keep)</span></Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div>
            <Label>Password <span className="text-muted-foreground text-xs">(leave blank to keep)</span></Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button disabled={save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
