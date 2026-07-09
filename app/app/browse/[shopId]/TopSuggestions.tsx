"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getTopSuggestions, castVote, type TopSuggestion } from "@/lib/actions/suggestions";
import { Card } from "@/components/ui/Card";

// This is a blind poll: no vote counts, no ranking, and votes cannot
// be changed once cast. Results only become visible once the business
// owner's deadline passes and the winner is published as a real
// promotion — see finalize_suggestion_win() in the database.
export default function TopSuggestions({ shopId }: { shopId: string }) {
  const [suggestions, setSuggestions] = useState<TopSuggestion[] | null>(null);
  const [signInPrompt, setSignInPrompt] = useState(false);
  const [voteError, setVoteError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getTopSuggestions(shopId).then(setSuggestions);
  }, [shopId]);

  function handleVote(id: string) {
    setVoteError(null);
    startTransition(async () => {
      const res = await castVote(id);
      if (res.error) {
        if (res.error === "Sign in to vote.") {
          setSignInPrompt(true);
        } else {
          setVoteError(res.error);
        }
        return;
      }
      // Refresh to reflect the now-locked vote state
      getTopSuggestions(shopId).then(setSuggestions);
    });
  }

  if (!suggestions || suggestions.length === 0) return null;

  const alreadyVoted = suggestions.some((s) => s.already_voted_this_contest);

  return (
    <Card className="mb-4">
      <p className="mb-1 font-display text-base font-semibold text-ink">
        Vote on the next deal
      </p>
      <p className="mb-4 text-sm text-ink/60">
        Pick the one you'd actually come in for. One vote per contest — once cast, it's
        locked in. Results stay hidden until the business picks a winner.
      </p>

      <div className="space-y-2">
        {suggestions.map((s) => {
          const showAsChosen = s.is_my_vote;
          return (
            <button
              key={s.id}
              type="button"
              disabled={isPending || alreadyVoted}
              onClick={() => handleVote(s.id)}
              className={`focus-ring flex w-full items-center justify-between rounded-sm border px-4 py-3 text-left transition-colors ${
                showAsChosen
                  ? "border-coral bg-coral/5"
                  : "border-line bg-white/50"
              } ${alreadyVoted ? "cursor-default" : "hover:border-coral/50"}`}
            >
              <p className="text-sm text-ink">{s.suggestion}</p>
              {showAsChosen && (
                <span className="flex-shrink-0 rounded-full bg-coral px-3 py-1 text-xs font-semibold text-paper">
                  Your vote
                </span>
              )}
            </button>
          );
        })}
      </div>

      {alreadyVoted && (
        <p className="mt-3 text-xs text-ink/50">
          You've voted in this contest. Check back once it ends to see if you picked the winner.
        </p>
      )}

      {voteError && <p className="mt-3 text-sm text-rose">{voteError}</p>}

      {signInPrompt && (
        <p className="mt-3 text-sm text-ink/60">
          <Link href="/join" className="font-semibold text-coral underline-offset-2 hover:underline">
            Create a free account
          </Link>{" "}
          to vote.
        </p>
      )}
    </Card>
  );
}
