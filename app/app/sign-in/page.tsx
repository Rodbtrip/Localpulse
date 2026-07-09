"use client";

import { Suspense, useActionState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "@/lib/actions/auth";
import { Button } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Input";

function SignInForm() {
  const [state, formAction, pending] = useActionState(signIn, undefined);
  const searchParams = useSearchParams();
  // Cosmetic only — the actual post-login destination is derived from the
  // real DB role in signIn()/middleware, never from this client-supplied hint.
  const isCustomerIntent = searchParams.get("as") === "customer";

  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="mb-1 font-mono text-xs uppercase tracking-widest text-coral">
          LocalPulse
        </p>
        <h1 className="mb-8 font-display text-3xl font-semibold text-ink">
          {isCustomerIntent ? "Welcome back" : "Welcome back, owner"}
        </h1>

        <form action={formAction} className="space-y-4">
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
              autoComplete="current-password"
            />
          </div>

          {state?.error && (
            <p role="alert" className="text-sm text-rose">
              {state.error}
            </p>
          )}

          <Button type="submit" disabled={pending} className="w-full">
            {pending ? "Signing in…" : "Sign in"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-ink/70">
          {isCustomerIntent ? (
            <>
              New here?{" "}
              <Link href="/join" className="font-semibold text-coral underline-offset-2 hover:underline">
                Join as a member
              </Link>
            </>
          ) : (
            <>
              New shop owner?{" "}
              <Link href="/sign-up" className="font-semibold text-coral underline-offset-2 hover:underline">
                Create an account
              </Link>
            </>
          )}
        </p>
        <p className="mt-3 text-xs text-ink/40">
          <Link href="/">← Back</Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={null}>
      <SignInForm />
    </Suspense>
  );
}
