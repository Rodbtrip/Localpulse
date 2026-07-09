"use client";

import { useTransition } from "react";
import { updateSuggestionStatus } from "@/lib/actions/suggestions";

// "Implemented" is no longer a manually-selectable status — contests
// only resolve automatically when a business's voting deadline passes
// (see finalize_suggestion_win() in the database). It still exists as
// a status VALUE that gets set automatically on a win, just not as an
// option an owner can pick here.
const STATUS_STYLES: Record<string, string> = {
  new: "bg-coral/15 text-coral",
  reviewed: "bg-ink/10 text-ink/60",
  implemented: "bg-pulse/15 text-pulse",
  declined: "bg-rose/10 text-rose",
};

export default function SuggestionStatusButtons({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const [isPending, startTransition] = useTransition();

  // A suggestion that's already won shouldn't be reassignable — its
  // outcome is final.
  if (status === "implemented") {
    return (
      <span className={`rounded-full px-3.5 py-1.5 text-xs font-semibold ${STATUS_STYLES.implemented}`}>
        🎉 Won
      </span>
    );
  }

  return (
    <select
      disabled={isPending}
      value={status}
      onChange={(e) => startTransition(() => updateSuggestionStatus(id, e.target.value))}
      className={`focus-ring rounded-full border-0 px-3 py-1.5 text-xs font-semibold ${STATUS_STYLES[status] ?? ""}`}
    >
      <option value="new">New</option>
      <option value="reviewed">Reviewed</option>
      <option value="declined">Declined</option>
    </select>
  );
}
