"use client";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
  label?: string;
  showValue?: boolean;
  color?: "primary" | "accent";
  height?: "thin" | "base" | "thick";
}

export function ProgressBar({ value, className, label, showValue, color = "primary", height = "base" }: ProgressBarProps) {
  const colors = {
    primary: "bg-[#534AB7]",
    accent: "bg-[#1D9E75]",
  };
  const heights = { thin: "h-0.5", base: "h-1", thick: "h-2" };

  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex justify-between items-center mb-2">
          {label && <span className="text-sm text-[#737373]">{label}</span>}
          {showValue && <span className="text-sm font-medium text-[#534AB7]">{value}%</span>}
        </div>
      )}
      <div className={cn("w-full bg-[#F5F5F5] rounded-full overflow-hidden", heights[height])}>
        <motion.div
          className={cn("h-full rounded-full", colors[color])}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        />
      </div>
    </div>
  );
}
