"use client";
import { motion } from "framer-motion";

interface VoiceWaveformProps {
  active?: boolean;
  size?: "sm" | "md" | "lg";
}

const delays = [0, 0.1, 0.2, 0.1, 0.0];
const maxHeights = [24, 36, 48, 36, 24];

export function VoiceWaveform({ active = true, size = "md" }: VoiceWaveformProps) {
  const heights: Record<string, number> = { sm: 0.5, md: 1, lg: 1.5 };
  const scale = heights[size];
  const barWidth = size === "sm" ? 3 : size === "lg" ? 5 : 4;
  const gap = size === "sm" ? 3 : 5;

  return (
    <div
      className="flex items-center"
      style={{ gap: `${gap}px`, height: `${maxHeights[2] * scale + 8}px` }}
    >
      {maxHeights.map((maxH, i) => (
        <motion.div
          key={i}
          style={{ width: barWidth, borderRadius: 999, background: "#534AB7" }}
          animate={
            active
              ? {
                  height: [4, maxH * scale, 4],
                  opacity: [0.6, 1, 0.6],
                }
              : { height: 4, opacity: 0.4 }
          }
          transition={
            active
              ? {
                  duration: 1.2,
                  delay: delays[i],
                  repeat: Infinity,
                  ease: "easeInOut",
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}
