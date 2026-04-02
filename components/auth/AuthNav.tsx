"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function AuthNav() {
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data }) => {
      setUser(data.user ?? null);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (user === undefined) {
    return (
      <span
        className="inline-block h-5 w-14 rounded bg-[#F5F5F5] animate-pulse"
        aria-hidden
      />
    );
  }

  if (user) {
    return (
      <Link
        href="/account"
        className="text-sm text-[#737373] hover:text-[#171717] transition-colors duration-200"
      >
        Account
      </Link>
    );
  }

  return (
    <Link
      href="/login"
      className="text-sm text-[#737373] hover:text-[#171717] transition-colors duration-200"
    >
      Sign in
    </Link>
  );
}
