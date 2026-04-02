"use client";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronLeft } from "lucide-react";
import { useOnboardingStore } from "@/lib/onboardingStore";
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
