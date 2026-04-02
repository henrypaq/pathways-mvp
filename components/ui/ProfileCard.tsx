"use client";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2 } from "lucide-react";

export interface ProfileField {
  key: string;
  label: string;
  value: string | null;
  icon?: string;
}

const DEFAULT_FIELDS: ProfileField[] = [
  { key: "nationality", label: "Nationality", value: null },
  { key: "destination", label: "Destination", value: null },
  { key: "purpose", label: "Purpose", value: null },
  { key: "occupation", label: "Occupation", value: null },
  { key: "family", label: "Family", value: null },
  { key: "timeline", label: "Timeline", value: null },
];

interface ProfileCardProps {
  profile: Record<string, string>;
  visible?: boolean;
}

export function ProfileCard({ profile, visible = true }: ProfileCardProps) {
  const fields = DEFAULT_FIELDS.map((f) => ({ ...f, value: profile[f.key] || null }));
  const filledCount = fields.filter((f) => f.value).length;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
          className="w-52 bg-white border border-[#E5E5E5] rounded-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-4 flex-shrink-0"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold text-[#171717]">Your Profile</span>
            <span className="text-[10px] text-[#A3A3A3]">{filledCount}/{fields.length}</span>
          </div>
          <div className="space-y-3">
            {fields.map((field) => (
              <div key={field.key} className="flex items-start gap-2">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 transition-colors duration-300 ${
                  field.value ? "bg-[#1D9E75]" : "bg-[#E5E5E5]"
                }`} />
                <div className="min-w-0">
                  <div className="text-[10px] text-[#A3A3A3] uppercase tracking-wide">{field.label}</div>
                  <AnimatePresence mode="wait">
                    {field.value ? (
                      <motion.div
                        key="value"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-xs font-medium text-[#171717] truncate"
                      >
                        {field.value}
                      </motion.div>
                    ) : (
                      <div key="empty" className="h-3 w-16 bg-[#F5F5F5] rounded mt-0.5" />
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
