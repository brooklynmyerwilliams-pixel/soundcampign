import { MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSupportContacts } from "@/lib/support-contacts";
import { contactUrl } from "@/lib/support-contact";

export function SupportContactLinks() {
  const query = useSupportContacts();
  return <>
    {query.data && (["whatsapp", "telegram"] as const).map((channel) => {
      const contact = query.data[channel];
      const href = contactUrl(contact);
      if (!href) return null;
      const Icon = channel === "whatsapp" ? MessageCircle : Send;
      return <Button key={channel} asChild variant="outline" className="h-auto w-full justify-start gap-3 p-3 text-left whitespace-normal">
        <a href={href} target="_blank" rel="noopener noreferrer">
          <span className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"><Icon /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{channel === "whatsapp" ? "WhatsApp" : "Telegram"}</span>
            <span className="block text-xs text-muted-foreground break-all">{channel === "whatsapp" ? `+${contact.value}` : `@${contact.value}`}</span>
          </span>
        </a>
      </Button>;
    })}
    {query.isPending && <p className="px-1 text-xs text-muted-foreground">Loading contacts…</p>}
    {query.isError && <div className="space-y-1 px-1">
      <p role="alert" className="text-xs text-muted-foreground">Could not refresh support contacts.</p>
      <Button size="sm" variant="ghost" onClick={() => void query.refetch()}>Try again</Button>
    </div>}
  </>;
}