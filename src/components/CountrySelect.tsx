import { useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { COUNTRIES, flagEmoji } from "@/lib/countries";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (dial: string, code: string) => void;
  countryCode?: string;
};

export function CountrySelect({ value, onChange, countryCode }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selected =
    COUNTRIES.find((c) => c.code === countryCode) ??
    COUNTRIES.find((c) => c.dial === value) ??
    COUNTRIES[0]!;

  const q = query.trim().toLowerCase();
  const list = q
    ? COUNTRIES.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.code.toLowerCase().includes(q) ||
          c.dial.replace("+", "").includes(q.replace("+", "")),
      )
    : COUNTRIES;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select country calling code"
          className="w-28 shrink-0 flex items-center justify-between gap-1 bg-background border border-input rounded-lg px-2 py-2.5 text-sm outline-none focus:border-[var(--nrc-green)]"
        >
          <span className="flex items-center gap-1.5 truncate">
            <span className="text-base leading-none">{flagEmoji(selected.code)}</span>
            <span className="truncate">{selected.dial}</span>
          </span>
          <ChevronDown className="w-4 h-4 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0 w-[280px]">
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="w-4 h-4 opacity-60" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search or type code (e.g. +44)"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </div>
        <div className="max-h-64 overflow-y-auto py-1">
          {list.length === 0 && (
            <p className="px-3 py-4 text-sm text-muted-foreground">No country found.</p>
          )}
          {list.map((c) => (
            <button
              key={c.code}
              type="button"
              onClick={() => {
                onChange(c.dial, c.code);
                setOpen(false);
                setQuery("");
              }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-accent",
                c.code === selected.code && "bg-accent/60",
              )}
            >
              <span className="text-base leading-none">{flagEmoji(c.code)}</span>
              <span className="flex-1 truncate">{c.name}</span>
              <span className="text-muted-foreground">{c.dial}</span>
              {c.code === selected.code && <Check className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
