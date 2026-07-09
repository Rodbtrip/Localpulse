import { HTMLAttributes } from "react";

export const Card = ({ className = "", ...props }: HTMLAttributes<HTMLDivElement>) => (
  <div
    className={`rounded-sm border border-line bg-white/60 p-6 ${className}`}
    {...props}
  />
);

// Signature element: redemption codes render with a live "pulse line"
// (like a heartbeat monitor) rather than a coffee-shop stamped ticket —
// fits the LocalPulse brand across any business vertical, not just food/drink.
export const PulseCode = ({ code }: { code: string }) => (
  <div
    className="inline-flex items-center gap-3 rounded-sm border border-l-4 border-line border-l-pulse bg-white px-4 py-3"
    aria-label={`Redemption code ${code}`}
  >
    <span className="pulse-dot" aria-hidden="true" />
    <svg width="40" height="20" viewBox="0 0 40 20" fill="none" aria-hidden="true">
      <path
        d="M0 10 H10 L14 2 L18 18 L22 10 H40"
        stroke="#22C55E"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
    <span className="font-mono text-lg font-semibold tracking-widest text-ink">{code}</span>
  </div>
);
