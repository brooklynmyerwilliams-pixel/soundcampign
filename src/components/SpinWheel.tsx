import { useState } from "react";

const SEGMENTS = 12;
/** Decorative labels; the winning slot (index 0) is replaced by the admin-set prize. */
const FILLER = ["ZERO", "$2", "$50", "$1", "$5", "$20", "JACKPOT", "$15", "$100", "$7", "$5", "$10"];

export function SpinWheel({
  prize,
  spinning,
  landed,
  onSpin,
  disabled,
}: {
  prize: number;
  spinning: boolean;
  landed: boolean;
  onSpin: () => void;
  disabled?: boolean;
}) {
  const [angle, setAngle] = useState(0);
  const seg = 360 / SEGMENTS;

  const labels = FILLER.map((f, i) => (i === 0 ? `$${prize.toFixed(2)}` : f));

  function spin() {
    if (spinning || disabled) return;
    // land the pointer (top) on segment 0's centre after several full turns
    setAngle((a) => a + 360 * 6 - (a % 360) + seg / 2);
    onSpin();
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-[280px] h-[280px] md:w-[340px] md:h-[340px]">
        {/* pointer */}
        <div className="absolute left-1/2 -translate-x-1/2 -top-1 z-20 w-0 h-0"
          style={{ borderLeft: "12px solid transparent", borderRight: "12px solid transparent", borderTop: "22px solid #d4af37" }} />
        {/* rim */}
        <div className="absolute inset-0 rounded-full"
          style={{ background: "conic-gradient(#f4e3a1,#d4af37,#8a6b1d,#f4e3a1,#d4af37,#8a6b1d,#f4e3a1)", padding: 10 }}>
          <div
            className="relative w-full h-full rounded-full overflow-hidden"
            style={{
              transform: `rotate(${angle}deg)`,
              transition: "transform 4.5s cubic-bezier(0.15, 0.9, 0.2, 1)",
              background: `conic-gradient(${Array.from({ length: SEGMENTS })
                .map((_, i) => `${i % 2 === 0 ? "#c1123c" : "#f0dfa4"} ${i * seg}deg ${(i + 1) * seg}deg`)
                .join(",")})`,
            }}
          >
            {labels.map((label, i) => (
              <div key={i}
                className="absolute left-1/2 top-1/2 origin-top text-[11px] md:text-xs font-black tracking-wide"
                style={{
                  transform: `rotate(${i * seg + seg / 2}deg) translate(-50%, 8px)`,
                  color: i % 2 === 0 ? "#f7e6ae" : "#8a1128",
                }}>
                <span className="block" style={{ writingMode: "vertical-rl" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
        {/* hub */}
        <button
          onClick={spin}
          disabled={spinning || disabled}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-[84px] h-[84px] md:w-24 md:h-24 rounded-full font-black tracking-widest text-sm md:text-base text-[#f7e6ae] shadow-lg disabled:opacity-70"
          style={{ background: "radial-gradient(circle at 35% 30%, #e0164a, #a30f33)", border: "6px solid #d4af37" }}>
          {spinning ? "..." : landed ? "DONE" : "SPIN"}
        </button>
      </div>
    </div>
  );
}
