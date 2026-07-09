"use client";

import { useState, useTransition } from "react";
import { toggleFeatured } from "@/lib/actions/suggestions";

export default function FeatureToggle({
  id,
  shopId,
  featured,
}: {
  id: string;
  shopId: string;
  featured: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await toggleFeatured(id, shopId, !featured);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      <button
        type="button"
        disabled={isPending}
        onClick={handleClick}
        className={`focus-ring rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
          featured
            ? "bg-coral text-paper"
            : "border border-ink/20 text-ink/60 hover:border-coral hover:text-coral"
        }`}
      >
        {featured ? "★ Featured" : "Feature this"}
      </button>
      {error && <p className="mt-1 max-w-[160px] text-right text-xs text-rose">{error}</p>}
    </div>
  );
}
