"use client";

import { useState, useEffect } from "react";
import {
  AnimatePresence,
  motion,
  useSpring,
  useMotionValueEvent,
} from "framer-motion";
import SiriOrb from "@/components/smoothui/siri-orb";

export type OrbState = "idle" | "listening" | "thinking" | "speaking";

export const ORB_ANIMATION_DURATION: Record<OrbState, number> = {
  idle: 18,
  listening: 6,
  thinking: 12,
  speaking: 8,
};

// Per-state glow filter — explicit rgba values, no color-mix dependency
const ORB_GLOW_FILTER: Record<OrbState, string> = {
  idle:      "drop-shadow(0 0 48px rgba(83, 74, 183, 0.25))",
  listening: "drop-shadow(0 0 48px rgba(83, 74, 183, 0.75))",
  thinking:  "drop-shadow(0 0 48px rgba(83, 74, 183, 0.45))",
  speaking:  "drop-shadow(0 0 48px rgba(83, 74, 183, 0.65))",
};

const ORB_STATUS_LABEL: Record<OrbState, string> = {
  idle:      "Tap to speak",
  listening: "Listening...",
  thinking:  "Thinking...",
  speaking:  "Pathways",
};

// Pathways brand palette mapped to SiriOrb color slots
const ORB_COLORS = {
  bg: "#0F0D1E",  // deep dark navy — orb interior dark base
  c1: "#534AB7",  // primary violet — main brand accent
  c2: "#1D9E75",  // accent teal — secondary accent
  c3: "#8B7CF8",  // lighter purple — tertiary complement
};

interface PathwaysOrbProps {
  state: OrbState;
  onTap?: () => void;
  /** CSS size string, e.g. "220px" */
  size?: string;
}

export function PathwaysOrb({ state, onTap, size = "220px" }: PathwaysOrbProps) {
  const targetDuration = ORB_ANIMATION_DURATION[state];

  // Fix 1 — Spring-interpolated animationDuration so speed ramps, never snaps
  const springDuration = useSpring(targetDuration, {
    stiffness: 30,
    damping: 20,
    mass: 1.5,
  });
  const [smoothDuration, setSmoothDuration] = useState(targetDuration);

  useMotionValueEvent(springDuration, "change", (v) => {
    setSmoothDuration(v);
  });

  useEffect(() => {
    springDuration.set(targetDuration);
  }, [targetDuration, springDuration]);

  // Fix 2 & 3 — Glow animate: smooth crossfade for all states, slow pulse for thinking
  const glowAnimate =
    state === "thinking"
      ? {
          opacity: [0.4, 0.6, 0.4] as number[],
          scale:   [1, 1.015, 1]   as number[],
          filter:  ORB_GLOW_FILTER.thinking,
        }
      : {
          opacity: 1,
          scale:   state === "listening" ? 1.04 : 1,
          filter:  ORB_GLOW_FILTER[state],
        };

  const glowTransition =
    state === "thinking"
      ? ({
          duration:   2.8,
          ease:       "easeInOut",
          repeat:     Infinity,
          repeatType: "loop",
        } as const)
      : ({
          duration: 0.9,
          ease:     [0.25, 0.1, 0.25, 1],
        } as const);

  // Fix 5 — Idle breath: separate inner layer so it composes with the glow wrapper
  const breathAnimate =
    state === "idle"
      ? { scale: [1, 1.018, 1] as number[] }
      : { scale: 1 };

  const breathTransition =
    state === "idle"
      ? ({
          duration:   4,
          ease:       "easeInOut",
          repeat:     Infinity,
          repeatType: "loop",
        } as const)
      : ({
          duration: 0.6,
          ease:     "easeOut",
        } as const);

  return (
    <div className="flex flex-col items-center" style={{ gap: "20px" }}>
      {/* Pre-reserved container — prevents layout shift */}
      <div
        className="flex items-center justify-center"
        style={{ width: size, height: size, flexShrink: 0 }}
      >
        {/* Fix 2 & 3 — Glow + scale wrapper */}
        <motion.div
          whileTap={{ scale: 0.96 }}
          animate={glowAnimate}
          transition={glowTransition}
          onClick={onTap}
          className="cursor-pointer"
          style={{ width: size, height: size }}
        >
          {/* Fix 5 — Idle breath wrapper */}
          <motion.div
            animate={breathAnimate}
            transition={breathTransition}
            style={{ width: size, height: size }}
          >
            <SiriOrb
              size={size}
              colors={ORB_COLORS}
              animationDuration={smoothDuration}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Fix 4 — Label dissolves in/out with blur, not a hard cut */}
      <div style={{ height: "20px" }} className="flex items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.p
            key={state}
            initial={{ opacity: 0, y: 6,  filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
            exit={{    opacity: 0, y: -6, filter: "blur(4px)" }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            className="text-xs font-semibold tracking-widest uppercase text-center"
            style={{ color: "#A3A3A3", letterSpacing: "0.15em" }}
          >
            {ORB_STATUS_LABEL[state]}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
