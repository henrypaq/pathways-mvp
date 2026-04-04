"use client";
import { useEffect } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { createClient } from "@/lib/supabase/client";
import { ModeSelect } from "@/components/onboarding/ModeSelect";
import { Onboarding1 } from "@/components/onboarding/Onboarding1";
import { Onboarding2 } from "@/components/onboarding/Onboarding2";
import { Onboarding3 } from "@/components/onboarding/Onboarding3";
import { Onboarding4 } from "@/components/onboarding/Onboarding4";
import { Onboarding5 } from "@/components/onboarding/Onboarding5";
import { Onboarding6 } from "@/components/onboarding/Onboarding6";
import { Onboarding7 } from "@/components/onboarding/Onboarding7";
import { AuthNav } from "@/components/auth/AuthNav";

const TOTAL_STEPS = 7; // steps 0..7

const ONBOARDING_DONE_KEY = process.env.NEXT_PUBLIC_ONBOARDING_DONE_KEY ?? 'pathways_onboarding_complete'
const PROFILE_KEY = process.env.NEXT_PUBLIC_PROFILE_KEY ?? 'pathways_profile'
const VOICE_HISTORY_KEY = 'pathways_voice_onboarding_history'

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

  // Fix 2: Skip to /results only when BOTH Supabase AND localStorage agree onboarding is done.
  // If Supabase says the profile is not complete (reset happened), clear stale localStorage keys
  // and do a hard replace so hooks re-initialise from clean storage.
  useEffect(() => {
    const localDone = localStorage.getItem(ONBOARDING_DONE_KEY) === 'true'
    if (!localDone) return  // nothing stale — no check needed

    const supabase = createClient()
    void (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return  // unauthenticated — rely on localStorage only

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('completeness_score')
        .eq('user_id', user.id)
        .single()

      const score: number = profileRow?.completeness_score ?? 0

      if (score >= 0.5) {
        // Both Supabase and localStorage agree: already complete — skip back to results
        router.replace('/results')
      } else {
        // Supabase says not complete (was reset), but localStorage is stale — clear and reload
        try {
          localStorage.removeItem(ONBOARDING_DONE_KEY)
          localStorage.removeItem(PROFILE_KEY)
          sessionStorage.removeItem(VOICE_HISTORY_KEY)
        } catch {
          /* ignore */
        }
        // Hard replace so hooks re-initialise from the now-empty localStorage
        window.location.replace('/onboarding')
      }
    })()
  }, [router]);

  const stepComponents = [
    <ModeSelect key="0" />,
    <Onboarding1 key="1" />,
    <Onboarding2 key="2" />,
    <Onboarding3 key="3" />,
    <Onboarding4 key="4" />,
    <Onboarding5 key="5" />,
    <Onboarding6 key="6" />,
    <Onboarding7 key="7" />,
  ];

  const showBack = currentStep > 0 && currentStep < 7;

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      {/* Minimal top nav */}
      <div className="flex items-center gap-2 px-4 sm:px-6 py-4 border-b border-[#F5F5F5] flex-shrink-0">
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
          {Array.from({ length: TOTAL_STEPS + 1 }).map((_, i) => (
            <div
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === currentStep
                  ? "w-4 h-1.5 bg-[#534AB7]"
                  : i < currentStep
                  ? "w-1.5 h-1.5 bg-[#534AB7]/40"
                  : "w-1.5 h-1.5 bg-[#E5E5E5]"
              }`}
            />
          ))}
        </div>

        <div className="flex flex-1 min-w-0 justify-end items-center text-sm">
          <AuthNav />
        </div>
      </div>

      {/* Step content */}
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
            {stepComponents[currentStep]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
