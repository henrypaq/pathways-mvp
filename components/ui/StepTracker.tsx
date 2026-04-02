"use client";
import { motion } from "framer-motion";
import { CheckCircle2, Circle, AlertCircle, Loader2 } from "lucide-react";

type StepStatus = "not_started" | "in_progress" | "complete" | "blocked";

interface TrackerStep {
  id: string;
  title: string;
  status: StepStatus;
}

interface StepTrackerProps {
  steps: TrackerStep[];
  activeStepId?: string;
  onStepClick?: (id: string) => void;
}

const StatusIcon = ({ status, active }: { status: StepStatus; active: boolean }) => {
  if (status === "complete")
    return <CheckCircle2 size={16} className="text-[#1D9E75] flex-shrink-0" />;
  if (status === "in_progress")
    return <Loader2 size={16} className="text-[#534AB7] animate-spin flex-shrink-0" />;
  if (status === "blocked")
    return <AlertCircle size={16} className="text-amber-500 flex-shrink-0" />;
  return (
    <Circle
      size={16}
      className={`flex-shrink-0 ${active ? "text-[#534AB7]" : "text-[#D4D4D4]"}`}
    />
  );
};

export function StepTracker({ steps, activeStepId, onStepClick }: StepTrackerProps) {
  return (
    <div className="space-y-1">
      {steps.map((step, i) => {
        const isActive = step.id === activeStepId;
        return (
          <div key={step.id} className="relative">
            {/* Connector line */}
            {i < steps.length - 1 && (
              <div className="absolute left-[23px] top-8 bottom-0 w-px bg-[#E5E5E5]" />
            )}
            <motion.button
              onClick={() => onStepClick?.(step.id)}
              whileTap={{ scale: 0.98 }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-[8px] text-left transition-colors duration-200 ${
                isActive
                  ? "bg-[#EEEDFE]"
                  : "hover:bg-[#F5F5F5]"
              }`}
            >
              <div className="relative z-10 flex-shrink-0">
                <StatusIcon status={step.status} active={isActive} />
              </div>
              <span
                className={`text-xs font-medium leading-tight ${
                  isActive
                    ? "text-[#534AB7]"
                    : step.status === "complete"
                    ? "text-[#525252]"
                    : "text-[#A3A3A3]"
                }`}
              >
                {step.title}
              </span>
            </motion.button>
          </div>
        );
      })}
    </div>
  );
}
