"use client";

import { signOut } from "next-auth/react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/" })}
      className="text-xs text-[var(--text-muted)] hover:text-[var(--accent-gold)] transition-colors"
    >
      Log out
    </button>
  );
}
