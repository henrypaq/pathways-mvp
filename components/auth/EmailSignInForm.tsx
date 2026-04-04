"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  nextPath: string;
};

export function EmailSignInForm({ nextPath }: Props) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setMessage("Enter a valid email address.");
      setStatus("error");
      return;
    }

    setStatus("sending");
    setMessage(null);

    try {
      const supabase = createClient();
      const next = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
      const origin = window.location.origin;
      const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo,
        },
      });

      if (error) {
        setMessage(error.message);
        setStatus("error");
        return;
      }

      setStatus("sent");
      setMessage(
        "Check your inbox for a sign-in link. It may take a minute to arrive.",
      );
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  }

  if (status === "sent") {
    return (
      <div className="rounded-[12px] border border-[#E5E5E5] bg-[#FAFAFA] px-4 py-4 text-center">
        <p className="text-sm font-medium text-[#171717] mb-1">Email sent</p>
        <p className="text-xs text-[#737373] leading-relaxed">{message}</p>
        <button
          type="button"
          onClick={() => {
            setStatus("idle");
            setMessage(null);
            setEmail("");
          }}
          className="mt-3 text-xs font-medium text-[#534AB7] hover:underline"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-2.5">
      <div>
        <label
          htmlFor="email-input"
          className="block text-[12px] font-medium text-[#525252] mb-1"
        >
          Email address
        </label>
        <input
          id="email-input"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={status === "sending"}
          className="w-full rounded-[10px] border border-[#E5E5E5] bg-white px-3.5 py-2.5 text-sm text-[#171717] placeholder:text-[#A3A3A3] outline-none transition-shadow focus:border-[#534AB7]/40 focus:ring-2 focus:ring-[#534AB7]/15 disabled:opacity-60"
        />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="w-full rounded-full bg-[#534AB7] py-3 text-sm font-medium text-white shadow-lg shadow-[#534AB7]/20 hover:bg-[#3C3489] transition-colors disabled:opacity-60"
      >
        {status === "sending" ? "Sending link…" : "Continue with email"}
      </button>
      {status === "error" && message && (
        <p className="text-center text-xs text-red-600" role="alert">
          {message}
        </p>
      )}
    </form>
  );
}
