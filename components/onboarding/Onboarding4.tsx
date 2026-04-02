"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { ChatInterface, ChatMessage } from "@/components/chat/ChatInterface";
import { mockOnboardingQuestions } from "@/lib/mockData";

function makeId() {
  return Math.random().toString(36).slice(2);
}

export function Onboarding4() {
  const { updateProfile, nextStep } = useOnboardingStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: makeId(), role: "ai", text: mockOnboardingQuestions[0].question },
  ]);
  const [loading, setLoading] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [progress, setProgress] = useState(40);

  const handleSend = (text: string) => {
    setMessages((m) => [...m, { id: makeId(), role: "user", text }]);
    setLoading(true);

    const current = mockOnboardingQuestions[questionIndex];
    if (current) updateProfile(current.id, text);

    const nextIdx = questionIndex + 1;
    const nextProgress = Math.min(40 + ((nextIdx / mockOnboardingQuestions.length) * 60), 95);

    setTimeout(() => {
      setLoading(false);
      setProgress(Math.round(nextProgress));

      if (nextIdx >= mockOnboardingQuestions.length) {
        setMessages((m) => [
          ...m,
          {
            id: makeId(),
            role: "ai",
            text: "Perfect! I have everything I need to find your best pathways. Let me put together your personalized recommendations.",
          },
        ]);
        setTimeout(() => nextStep(), 1200);
      } else {
        setMessages((m) => [
          ...m,
          { id: makeId(), role: "ai", text: mockOnboardingQuestions[nextIdx].question },
        ]);
        setQuestionIndex(nextIdx);
      }
    }, 900);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress bar */}
      <div className="px-6 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[#737373]">Building your profile</span>
          <span className="text-xs font-medium text-[#534AB7]">{progress}%</span>
        </div>
        <div className="h-0.5 bg-[#F5F5F5] rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-[#534AB7] rounded-full"
            initial={{ width: "40%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          />
        </div>
      </div>

      <div className="flex-1 overflow-hidden max-w-2xl mx-auto w-full">
        <ChatInterface
          messages={messages}
          onSend={handleSend}
          loading={loading}
          placeholder="Your answer…"
        />
      </div>
    </div>
  );
}
