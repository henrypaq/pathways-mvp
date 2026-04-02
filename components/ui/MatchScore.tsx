"use client";
import { motion } from "framer-motion";

interface MatchScoreProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export function MatchScore({ score, size = "md" }: MatchScoreProps) {
  const sizes = {
    sm: { text: "text-2xl", label: "text-[10px]" },
    md: { text: "text-4xl", label: "text-xs" },
    lg: { text: "text-6xl", label: "text-sm" },
  };

  return (
    <div className="flex flex-col items-center">
      <motion.span
        className={`${sizes[size].text} font-bold text-[#534AB7] leading-none`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {score}%
      </motion.span>
      <span className={`${sizes[size].label} text-[#A3A3A3] mt-0.5`}>match</span>
    </div>
  );
}
