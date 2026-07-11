"use client";

import { Suspense } from "react";
import { useFormState } from "react-dom";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signUp } from "@/lib/actions/auth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label } from "@/components/ui/Input";

function SignUpForm() {
  const [state, formAction] = useFormState(signUp, undefined);
  const searchParams = useSearchParams();
  const referralFromLink = searchParams.get("ref") ?? "";

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-coral">
          LocalPulse
        </p>
        <h1 className="mb-8 font-display text-3xl font-semibold text-ink">
          Set up your shop
        </h1>

        <form action={formAction} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Your name</Label>
            <Input id="fullName" name="fullName" type="text" required autoComplete="name" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>
          <div>
            <Label htmlFor="referralCode">Referral code (optional)</Label>
            <Input
              id="referralCode"
              name="referralCode"
              type="text"
              defaultValue={referralFromLink}
              placeholder="e.g. 3F9A2B"
              className="uppercase"
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-sm text-rose">
              {state.error}
            </p>
          )}

          <SubmitButton pendingText="Creating account…" className="w-full">
            Create account
          </SubmitButton>
        </form>

        <p className="mt-6 text-sm text-ink/70">
          Already have an account?{" "}
          <Link href="/sign-in" className="font-semibold text-coral underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpForm />
    </Suspense>
  );
}
