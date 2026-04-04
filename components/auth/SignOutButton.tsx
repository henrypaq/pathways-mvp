"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useI18n } from "@/context/I18nContext";

export function SignOutButton() {
  const { t } = useI18n()
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
      router.push("/");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void signOut()}
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[#E5E5E5] bg-white py-3 text-sm font-medium text-[#525252] hover:border-[#D4D4D4] hover:bg-[#FAFAFA] transition-colors disabled:opacity-60"
    >
      <LogOut size={16} strokeWidth={2} />
      {pending ? t('account.signingOut') : t('account.signOut')}
    </button>
  );
}
