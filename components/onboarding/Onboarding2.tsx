"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Compass, MapPin } from "lucide-react";
import { useOnboardingStore } from "@/lib/onboardingStore";

const CARDS = [
  {
    id: "help-choose" as const,
    icon: Compass,
    title: "Help me choose a destination",
    body: "Answer a few questions and we'll surface your best legal pathways worldwide",
  },
  {
    id: "know-destination" as const,
    icon: MapPin,
    title: "I know where I want to go",
    body: "Tell us your destination and we'll map out every step to get there",
  },
];

export function Onboarding2() {
  const { setSituationChoice, nextStep } = useOnboardingStore();
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (id: "help-choose" | "know-destination") => {
    setSelected(id);
    setSituationChoice(id);
    setTimeout(() => nextStep(), 300);
  };

  return (
    <div className="flex items-center justify-center h-full px-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-semibold text-[#171717] mb-3">What brings you here?</h2>
          <p className="text-[#737373] text-sm">We'll tailor your experience based on where you are in your journey.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {CARDS.map((card) => (
            <motion.button
              key={card.id}
              onClick={() => handleSelect(card.id)}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.98 }}
              animate={selected === card.id ? { borderColor: "#534AB7", y: -4 } : {}}
              className={`flex flex-col items-start gap-5 p-7 border rounded-[12px] text-left transition-all duration-250 cursor-pointer ${
                selected === card.id
                  ? "border-[#534AB7] bg-[#FAFAFA] shadow-[0_0_0_1px_#534AB7]"
                  : "border-[#E5E5E5] bg-white hover:border-[#534AB7] hover:shadow-[0_4px_12px_rgba(83,74,183,0.08)]"
              }`}
            >
              <div className="w-12 h-12 rounded-[12px] bg-[#EEEDFE] flex items-center justify-center flex-shrink-0">
                <card.icon size={22} className="text-[#534AB7]" />
              </div>
              <div>
                <h3 className="font-semibold text-[#171717] text-base mb-2">{card.title}</h3>
                <p className="text-sm text-[#737373] leading-relaxed">{card.body}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
