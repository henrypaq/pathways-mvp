"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";

export function AccountBackButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      className="flex h-10 w-10 items-center justify-center rounded-full text-[#737373] hover:bg-[#F5F5F5] hover:text-[#171717] transition-colors -ml-2"
      aria-label="Go back"
    >
      <ChevronLeft size={22} strokeWidth={1.75} />
    </button>
  );
}
