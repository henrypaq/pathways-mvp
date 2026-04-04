"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { createClient } from "@/lib/supabase/client";
import { ModeSelect } from "@/components/onboarding/ModeSelect";
import { Onboarding1 } from "@/components/onboarding/Onboarding1";
import { LoginLanguageSelector } from "@/components/auth/LoginLanguageSelector";
import { AuthNav } from "@/components/auth/AuthNav";
import { PageSurface } from "@/components/ui/PageSurface";

// Flow: language select (if needed) -> ModeSelect (step 0) -> Onboarding1 (step 1) -> /results.

const ONBOARDING_DONE_KEY = process.env.NEXT_PUBLIC_ONBOARDING_DONE_KEY ?? 'pathways_onboarding_complete'
const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'
const VOICE_HISTORY_KEY = 'pathways_voice_onboarding_history'
const LANGUAGE_KEY = 'pathways_preferred_language'

const REAL_STEPS = 2;

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "60px" : "-60px",
    opacity: 0,
  }),
  center: { x: 0, opacity: 1 },
  exit: (dir: number) => ({
    x: dir > 0 ? "-60px" : "60px",
    opacity: 0,
  }),
};

export default function OnboardingPage() {
  const { currentStep, prevStep } = useOnboardingStore();
  const router = useRouter();
  // null = not yet checked (SSR), true = needs selection, false = has language
  const [needsLangSelect, setNeedsLangSelect] = useState<boolean | null>(null)

  useEffect(() => {
    queueMicrotask(() => {
      const hasLang = !!localStorage.getItem(LANGUAGE_KEY)
      setNeedsLangSelect(!hasLang)
    })
  }, [])

  // Guard: if somehow step >= 2 is reached, redirect to results
  useEffect(() => {
    if (currentStep >= 2) {
      router.replace('/results');
    }
  }, [currentStep, router]);

  // Skip to /results only when BOTH Supabase AND localStorage agree onboarding is done.
  useEffect(() => {
    const localDone = localStorage.getItem(ONBOARDING_DONE_KEY) === 'true'
    if (!localDone) return

    const supabase = createClient()
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('completeness_score')
        .eq('user_id', user.id)
        .single()

      const score: number = profileRow?.completeness_score ?? 0

      if (score >= 0.5) {
        router.replace('/results')
      } else {
        try {
          localStorage.removeItem(ONBOARDING_DONE_KEY)
          localStorage.removeItem(PROFILE_KEY)
          sessionStorage.removeItem(VOICE_HISTORY_KEY)
        } catch { /* ignore */ }
        window.location.replace('/onboarding')
      }
    })()
  }, [router]);

  const stepComponents = [
    <ModeSelect key="0" />,
    <Onboarding1 key="1" />,
  ];

  const showBack = !needsLangSelect && currentStep > 0 && currentStep <= 1;

  // Language selection screen (shown when no language has been explicitly chosen)
  if (needsLangSelect === true) {
    return (
      <PageSurface surface="flow" fixed>
        <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-[var(--ui-border)] bg-[var(--ui-panel)]/88 backdrop-blur-md flex-shrink-0">
          <Link href="/" className="text-sm font-semibold text-[#171717] hover:text-[#534AB7] transition-colors">
            Pathways
          </Link>
          <div className="flex-1" />
          <AuthNav />
        </div>
        <div className="flex-1 flex items-center justify-center px-6 py-10">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="w-full max-w-sm"
          >
            <h1 className="text-[22px] font-semibold text-[#171717] mb-1.5">Choose your language</h1>
            <p className="text-[13px] text-[#737373] mb-8 leading-relaxed">
              Select the language you would like to use throughout your journey.
            </p>
            <LoginLanguageSelector />
            <button
              onClick={() => setNeedsLangSelect(false)}
              className="w-full flex items-center justify-center gap-2 bg-[#534AB7] text-white text-[14px] font-semibold py-3.5 rounded-full hover:bg-[#3C3489] transition-colors shadow-md mt-2"
            >
              Continue <ChevronRight size={16} />
            </button>
          </motion.div>
        </div>
      </PageSurface>
    )
  }

  // Still checking localStorage — render nothing to avoid flash
  if (needsLangSelect === null) return null

  return (
    <PageSurface surface="flow" fixed>
      <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-[var(--ui-border)] bg-[var(--ui-panel)]/88 backdrop-blur-md flex-shrink-0">
        <div className="flex flex-1 min-w-0 items-center gap-3">
          {showBack && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={prevStep}
              className="flex items-center gap-1 text-sm text-[#A3A3A3] hover:text-[#171717] transition-colors shrink-0"
            >
              <ChevronLeft size={16} />
              Back
            </motion.button>
          )}
          <Link
            href="/"
            className="text-sm font-semibold text-[#171717] hover:text-[#534AB7] transition-colors truncate"
          >
            Pathways
          </Link>
        </div>

        <div className="flex flex-shrink-0 items-center gap-1.5">
          {Array.from({ length: REAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-4 h-1.5 bg-[#534AB7]"
                  : i < currentStep
                  ? "w-1.5 h-1.5 bg-[#534AB7]/40"
                  : "w-1.5 h-1.5 bg-[var(--ui-border-strong)]"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-1 min-w-0 justify-end items-center text-sm">
          <AuthNav />
        </div>
      </div>

      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentStep}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
            className="absolute inset-0"
          >
            {stepComponents[Math.min(currentStep, 1)]}
          </motion.div>
        </AnimatePresence>
      </div>
    </PageSurface>
  );
}
