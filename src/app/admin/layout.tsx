import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "./LogoutButton";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || session.user.role !== "admin") {
    redirect("/login");
  }

  const navItems = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/teams", label: "Teams" },
    { href: "/admin/players", label: "Players" },
    { href: "/admin/results", label: "Results" },
    { href: "/bracket", label: "Bracket" },
    { href: "/leaderboard", label: "Leaderboard" },
  ];

  return (
    <div className="min-h-screen">
      <nav className="bg-[var(--bg-surface)] border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link href="/admin" className="font-display text-xl font-700" style={{ fontWeight: 700 }}>
            <span className="text-[var(--text-primary)]">CRAZY 8&apos;S</span>{" "}
            <span className="gold-text">ADMIN</span>
          </Link>
          <div className="flex gap-5 items-center">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors"
              >
                {item.label}
              </Link>
            ))}
            <span className="text-xs text-[var(--text-muted)] opacity-60">{session.user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </nav>
      <main className="max-w-6xl mx-auto p-6">{children}</main>
    </div>
  );
}
