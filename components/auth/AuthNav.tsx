"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseBrowserConfigured } from "@/lib/supabase/config";
import type { User } from "@supabase/supabase-js";

export function AuthNav() {
  const [user, setUser] = useState<User | null | undefined>(() =>
    isSupabaseBrowserConfigured() ? undefined : null,
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isSupabaseBrowserConfigured()) {
      setUser(null);
      return;
    }

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

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  async function handleSignOut() {
    setOpen(false);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  }

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
      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="text-sm text-[#737373] hover:text-[#171717] transition-colors duration-200"
        >
          Account
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-40 bg-white border border-[#E5E5E5] rounded-[8px] shadow-sm py-1 z-50">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="block px-4 py-2 text-sm text-[#171717] hover:bg-[#FAFAFA] transition-colors"
            >
              Dashboard
            </Link>
            <button
              onClick={handleSignOut}
              className="block w-full text-left px-4 py-2 text-sm text-[#737373] hover:bg-[#FAFAFA] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
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
