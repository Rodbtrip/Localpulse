"use client";

import { useTransition } from "react";
import { togglePromotionActive } from "@/lib/actions/promotions";

export default function PromotionToggle({ id, isActive }: { id: string; isActive: boolean }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => togglePromotionActive(id, !isActive))}
      className={`focus-ring rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
        isActive
          ? "bg-pulse/15 text-pulse hover:bg-pulse/25"
          : "bg-ink/10 text-ink/60 hover:bg-ink/15"
      }`}
    >
      {isActive ? "Active" : "Paused"}
    </button>
  );
}
