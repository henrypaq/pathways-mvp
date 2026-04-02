"use client";
import Link from "next/link";
import { Onboarding7 } from "@/components/onboarding/Onboarding7";
import { AuthNav } from "@/components/auth/AuthNav";

export default function DashboardPage() {
  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[#F5F5F5] gap-4">
        <Link
          href="/"
          className="text-sm font-semibold text-[#171717] hover:text-[#534AB7] transition-colors shrink-0"
        >
          Pathways
        </Link>
        <span className="text-xs text-[#A3A3A3] truncate text-center flex-1">
          Application Dashboard
        </span>
        <div className="shrink-0 text-sm">
          <AuthNav />
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <Onboarding7 />
      </div>
    </div>
  );
}
