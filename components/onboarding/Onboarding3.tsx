"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Clock, CheckCircle2 } from "lucide-react";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { mockPathways } from "@/lib/mockData";

const PURPOSES = ["Work", "Study", "Family", "Asylum"] as const;
const COUNTRIES = ["Canada", "Germany", "Portugal", "Australia", "United Kingdom", "Netherlands", "New Zealand", "Singapore"];

const difficultyColors: Record<string, string> = {
  Easy: "bg-[#E1F5EE] text-[#1D9E75]",
  Medium: "bg-amber-50 text-amber-700",
  Complex: "bg-red-50 text-red-600",
};

export function Onboarding3() {
  const { situationChoice, setDestination, setPurpose, nextStep } = useOnboardingStore();
  const [selectedPathway, setSelectedPathway] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [selectedPurpose, setSelectedPurpose] = useState<string | null>(null);

  const filteredCountries = COUNTRIES.filter((c) =>
    c.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChoosePathway = (id: string, country: string) => {
    setSelectedPathway(id);
    setDestination(country);
    setTimeout(() => nextStep(), 300);
  };

  const canProceed = selectedCountry && selectedPurpose;

  const handleProceed = () => {
    if (!canProceed) return;
    setDestination(selectedCountry!);
    setPurpose(selectedPurpose!);
    nextStep();
  };

  if (situationChoice === "help-choose") {
    return (
      <div className="flex flex-col h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto w-full px-6 py-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-semibold text-[#171717] mb-2">Your best destinations</h2>
            <p className="text-[#737373] text-sm">Based on your profile, these pathways match you best</p>
          </div>

          <div className="space-y-4">
            {mockPathways.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                onClick={() => handleChoosePathway(p.id, p.country)}
                className={`bg-white border rounded-[12px] p-5 cursor-pointer transition-all duration-250 ${
                  selectedPathway === p.id
                    ? "border-[#534AB7] shadow-[0_0_0_1px_#534AB7]"
                    : "border-[#E5E5E5] hover:border-[#534AB7] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(83,74,183,0.08)]"
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{p.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-[#171717]">{p.country}</h3>
                      <span className="text-sm text-[#737373]">· {p.visaName}</span>
                      <span className={`ml-auto inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium ${difficultyColors[p.difficulty]}`}>
                        {p.difficulty}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-[#A3A3A3]">
                      <span className="flex items-center gap-1"><Clock size={11} />{p.processingTime}</span>
                      <span>{p.successRate} success rate</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-xl font-bold text-[#534AB7]">{p.matchScore}%</div>
                    <div className="text-[10px] text-[#A3A3A3]">match</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // "I know where I want to go"
  return (
    <div className="flex items-center justify-center h-full px-6">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold text-[#171717] mb-2">Where do you want to go?</h2>
          <p className="text-[#737373] text-sm">Choose your destination and the purpose of your move</p>
        </div>

        {/* Country search */}
        <div className="relative mb-4">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#A3A3A3]" />
          <input
            type="text"
            placeholder="Search countries…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-[#E5E5E5] rounded-[8px] text-sm text-[#171717] placeholder-[#A3A3A3] outline-none focus:border-[#534AB7] transition-colors"
          />
        </div>

        {/* Country list */}
        <div className="grid grid-cols-2 gap-2 mb-6 max-h-48 overflow-y-auto">
          {filteredCountries.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCountry(c)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-[8px] text-sm text-left transition-all ${
                selectedCountry === c
                  ? "bg-[#EEEDFE] text-[#534AB7] border border-[#534AB7]"
                  : "border border-[#E5E5E5] hover:border-[#534AB7] hover:bg-[#FAFAFA]"
              }`}
            >
              {selectedCountry === c && <CheckCircle2 size={14} className="text-[#534AB7] flex-shrink-0" />}
              {c}
            </button>
          ))}
        </div>

        {/* Purpose pills */}
        <div className="mb-8">
          <p className="text-sm font-medium text-[#171717] mb-3">Purpose of move</p>
          <div className="flex flex-wrap gap-2">
            {PURPOSES.map((p) => (
              <button
                key={p}
                onClick={() => setSelectedPurpose(p)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedPurpose === p
                    ? "bg-[#534AB7] text-white"
                    : "bg-[#F5F5F5] text-[#737373] hover:bg-[#EEEDFE] hover:text-[#534AB7]"
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={handleProceed}
          disabled={!canProceed}
          className={`w-full py-3.5 rounded-full text-sm font-medium transition-all ${
            canProceed
              ? "bg-[#534AB7] text-white hover:bg-[#3C3489]"
              : "bg-[#F5F5F5] text-[#A3A3A3] cursor-not-allowed"
          }`}
        >
          Continue →
        </motion.button>
      </div>
    </div>
  );
}
