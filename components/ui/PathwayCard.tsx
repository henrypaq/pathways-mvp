"use client";
import { motion } from "framer-motion";
import { ArrowRight, Clock, TrendingUp } from "lucide-react";

interface PathwayCardProps {
  country: string;
  flag: string;
  visaName: string;
  processingTime: string;
  difficulty: "Easy" | "Medium" | "Complex";
  matchScore: number;
  reasons: string[];
  successRate: string;
  onChoose: () => void;
}

const difficultyColors = {
  Easy: "bg-[#E1F5EE] text-[#1D9E75]",
  Medium: "bg-amber-50 text-amber-700",
  Complex: "bg-red-50 text-red-600",
};

export function PathwayCard({
  country, flag, visaName, processingTime, difficulty, matchScore, reasons, successRate, onChoose,
}: PathwayCardProps) {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white border border-[#E5E5E5] rounded-[12px] p-6 hover:border-[#534AB7] hover:shadow-[0_4px_16px_rgba(83,74,183,0.1)] transition-all duration-250"
    >
      <div className="flex items-start gap-4">
        {/* Left: country info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-3xl">{flag}</span>
            <div>
              <h3 className="font-semibold text-[#171717] text-[15px]">{country}</h3>
              <p className="text-sm text-[#737373]">{visaName}</p>
            </div>
            <span className={`ml-auto inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${difficultyColors[difficulty]}`}>
              {difficulty}
            </span>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs text-[#A3A3A3] mb-4">
            <span className="flex items-center gap-1">
              <Clock size={11} /> {processingTime}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp size={11} /> {successRate} success rate
            </span>
          </div>

          {/* Reasons */}
          <ul className="space-y-1.5">
            {reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-[#525252]">
                <span className="text-[#1D9E75] mt-0.5 flex-shrink-0">✓</span>
                {r}
              </li>
            ))}
          </ul>
        </div>

        {/* Right: match score + CTA */}
        <div className="flex flex-col items-center gap-3 flex-shrink-0">
          <div className="flex flex-col items-center">
            <span className="text-3xl font-bold text-[#534AB7] leading-none">{matchScore}%</span>
            <span className="text-[10px] text-[#A3A3A3] mt-0.5">match</span>
          </div>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={onChoose}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#534AB7] text-white text-xs font-medium rounded-full hover:bg-[#3C3489] transition-colors whitespace-nowrap"
          >
            Choose this <ArrowRight size={12} />
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
