"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { submitSuggestion } from "@/lib/actions/suggestions";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Textarea } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";

export default function SuggestDealForm({ shopId }: { shopId: string }) {
  const [state, formAction] = useFormState(submitSuggestion, undefined);

  if (state?.success) {
    return (
      <Card className="text-center">
        <p className="text-sm font-medium text-pulse">
          Thanks — your idea was sent to the shop owner.
        </p>
      </Card>
    );
  }

  return (
    <Card>
      <p className="mb-1 font-display text-base font-semibold text-ink">
        Have an idea for a deal?
      </p>
      <p className="mb-4 text-sm text-ink/60">
        Suggest a promotion you&apos;d actually use — owners see these directly.
      </p>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="shopId" value={shopId} />
        <Textarea
          name="suggestion"
          rows={3}
          maxLength={500}
          required
          placeholder="e.g. A discount for the first hour you open on weekdays"
        />

        {state?.error && state.error !== "Sign in to suggest a deal." && (
          <p role="alert" className="text-sm text-rose">
            {state.error}
          </p>
        )}

        {state?.error === "Sign in to suggest a deal." ? (
          <p className="text-sm text-ink/60">
            <Link
              href="/join"
              className="font-semibold text-coral underline-offset-2 hover:underline"
            >
              Create a free account
            </Link>{" "}
            to send this suggestion.
          </p>
        ) : (
          <SubmitButton pendingText="Sending…" variant="secondary">
            Send suggestion
          </SubmitButton>
        )}
      </form>
    </Card>
  );
}
