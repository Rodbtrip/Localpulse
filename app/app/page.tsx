import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Only hit the database for a role lookup if a session actually exists —
  // logged-out visitors (the common case for this screen) never trigger it.
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    redirect(profile?.role === "customer" ? "/browse" : "/dashboard");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-6 text-center">
      <p className="mb-2 flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-coral">
        <span className="pulse-dot" aria-hidden="true" />
        LocalPulse
      </p>
      <h1 className="mb-3 font-display text-3xl font-semibold text-ink">
        Who&apos;s joining today?
      </h1>
      <p className="mb-10 max-w-sm text-sm text-ink/60">
        Pick the option that fits you — you can always switch later.
      </p>

      <div className="flex w-full max-w-sm flex-col gap-4">
        <Link
          href="/sign-in"
          className="focus-ring rounded-sm bg-coral px-6 py-4 text-center font-semibold text-paper transition-opacity hover:opacity-90"
        >
          I&apos;m a Business Owner
        </Link>
        <Link
          href="/sign-in?as=customer"
          className="focus-ring rounded-sm border border-ink/20 px-6 py-4 text-center font-semibold text-ink transition-colors hover:border-coral hover:text-coral"
        >
          I&apos;m a Local Member
        </Link>
      </div>

      <p className="mt-8 text-xs text-ink/50">
        New business?{" "}
        <Link href="/sign-up" className="font-semibold text-coral underline-offset-2 hover:underline">
          Create a business account
        </Link>
        {" · "}
        New here?{" "}
        <Link href="/join" className="font-semibold text-coral underline-offset-2 hover:underline">
          Join as a member
        </Link>
      </p>
    </div>
  );
}
