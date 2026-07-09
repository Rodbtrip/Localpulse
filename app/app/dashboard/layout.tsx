import Link from "next/link";
import { signOut } from "@/lib/actions/auth";

const navItems = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/shop", label: "Shop profile" },
  { href: "/dashboard/promotions", label: "Promotions" },
  { href: "/dashboard/suggestions", label: "Deal Contest" },
  { href: "/dashboard/explore", label: "Explore market" },
  { href: "/dashboard/referrals", label: "Referrals" },
  { href: "/dashboard/redemptions", label: "Redeem a code" },
  { href: "/dashboard/billing", label: "Billing" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 flex-shrink-0 flex-col justify-between bg-navy-900 px-5 py-8 text-paper">
        <div>
          <p className="mb-10 flex items-center gap-2 font-display text-lg font-semibold">
            <span className="pulse-dot" aria-hidden="true" />
            LocalPulse
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="focus-ring block rounded-sm px-3 py-2 text-sm text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="focus-ring w-full rounded-sm px-3 py-2 text-left text-sm text-paper/60 transition-colors hover:bg-paper/10 hover:text-paper"
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="flex-1 px-10 py-10">{children}</main>
    </div>
  );
}
