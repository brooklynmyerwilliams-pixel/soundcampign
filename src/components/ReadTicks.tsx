import { Check, CheckCheck } from "lucide-react";

/** One tick = delivered, not seen. Two ticks = seen by the other side. */
export function ReadTicks({ seen }: { seen: boolean }) {
  const Icon = seen ? CheckCheck : Check;
  return (
    <span
      className="inline-flex items-center"
      aria-label={seen ? "Seen" : "Not seen yet"}
      title={seen ? "Seen" : "Not seen yet"}
    >
      <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
    </span>
  );
}
