"use client";

import { useFormState } from "react-dom";
import Link from "next/link";
import { customerSignUp } from "@/lib/actions/customerAuth";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { Input, Label } from "@/components/ui/Input";

export default function JoinPage() {
  const [state, formAction] = useFormState(customerSignUp, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-coral">
          LocalPulse
        </p>
        <h1 className="mb-8 font-display text-3xl font-semibold text-ink">
          Find local deals nearby
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
