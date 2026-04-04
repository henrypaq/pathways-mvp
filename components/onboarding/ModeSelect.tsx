"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Mic, MessageSquare } from "lucide-react";
import { useOnboardingStore } from "@/lib/onboardingStore";
import type { OnboardingMode } from "@/lib/onboardingStore";

export function ModeSelect() {
  const { setMode, nextStep } = useOnboardingStore();
  const [hovered, setHovered] = useState<"voice" | "chat" | null>(null);

  const handleSelect = (mode: OnboardingMode) => {
    setMode(mode);
    nextStep();
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-col md:flex-row flex-1">
        {/* Voice side */}
        <motion.div
          onClick={() => handleSelect("voice")}
          onHoverStart={() => setHovered("voice")}
          onHoverEnd={() => setHovered(null)}
          onKeyDown={(e) => e.key === "Enter" && handleSelect("voice")}
          tabIndex={0}
          role="button"
          aria-label="Start with voice"
          animate={{
            flexGrow: hovered === "voice" ? 1.08 : hovered === "chat" ? 0.92 : 1,
            opacity: hovered === "chat" ? 0.6 : 1,
          }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center justify-center cursor-pointer px-8 md:px-16 py-12 md:py-0 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] focus-visible:ring-inset min-h-[200px] md:min-h-0"
        >
          <motion.div
            animate={{ scale: hovered === "voice" ? 1.05 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 rounded-[18px] bg-[#EEEDFE] flex items-center justify-center">
              <Mic size={28} className="text-[#534AB7]" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-[#171717] mb-3">Speak freely</h2>
              <p className="text-sm text-[#737373] max-w-[220px] leading-relaxed">
                Tell us your story out loud — our AI will listen and understand.
              </p>
            </div>
            <div className="flex gap-1.5 mt-2">
              {[1,2,3,4,5].map((i) => (
                <motion.div
                  key={i}
                  className="w-1 bg-[#534AB7] rounded-full"
                  animate={{ height: hovered === "voice" ? [8, 24, 8] : 4 }}
                  transition={hovered === "voice" ? {
                    duration: 1.2, delay: i * 0.1, repeat: Infinity, ease: "easeInOut"
                  } : { duration: 0.2 }}
                  style={{ opacity: hovered === "voice" ? 1 : 0.3 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>

        {/* Divider */}
        <div className="w-full h-px md:w-px md:h-auto bg-[var(--ui-border-strong)] flex-shrink-0 md:self-stretch md:my-12" />

        {/* Chat side */}
        <motion.div
          onClick={() => handleSelect("chat")}
          onHoverStart={() => setHovered("chat")}
          onHoverEnd={() => setHovered(null)}
          onKeyDown={(e) => e.key === "Enter" && handleSelect("chat")}
          tabIndex={0}
          role="button"
          aria-label="Start with chat"
          animate={{
            flexGrow: hovered === "chat" ? 1.08 : hovered === "voice" ? 0.92 : 1,
            opacity: hovered === "voice" ? 0.6 : 1,
          }}
          transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
          className="flex flex-col items-center justify-center cursor-pointer px-8 md:px-16 py-12 md:py-0 select-none outline-none focus-visible:ring-2 focus-visible:ring-[#534AB7] focus-visible:ring-inset min-h-[200px] md:min-h-0"
        >
          <motion.div
            animate={{ scale: hovered === "chat" ? 1.05 : 1 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="w-16 h-16 rounded-[18px] bg-[#EEEDFE] flex items-center justify-center">
              <MessageSquare size={28} className="text-[#534AB7]" />
            </div>
            <div className="text-center">
              <h2 className="text-2xl md:text-3xl font-semibold text-[#171717] mb-3">Type instead</h2>
              <p className="text-sm text-[#737373] max-w-[220px] leading-relaxed">
                Prefer to type? Have a conversation at your own pace.
              </p>
            </div>
            {/* Mock chat bubbles */}
            <div className="flex flex-col gap-2 opacity-30 w-36">
              <div className="self-start bg-[#F5F5F5] rounded-2xl rounded-bl-sm px-3 py-1.5 text-[10px] text-[#737373]">Where are you from?</div>
              <div className="self-end bg-[#534AB7] rounded-2xl rounded-br-sm px-3 py-1.5 text-[10px] text-white">India</div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Manual entry — subtle secondary option */}
      <motion.div
        className="flex justify-center pb-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.5 }}
      >
        <button
          onClick={() => handleSelect("manual")}
          className="text-sm text-[#737373] hover:text-[#525252] hover:underline underline-offset-4 transition-colors"
        >
          Prefer to fill in your details manually →
        </button>
      </motion.div>
    </div>
  );
}
