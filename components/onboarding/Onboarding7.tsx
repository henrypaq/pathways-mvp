"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Upload } from "lucide-react";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { StepTracker } from "@/components/ui/StepTracker";
import { mockApplicationSteps, mockDocuments } from "@/lib/mockData";

export function Onboarding7() {
  const { applicationStrength } = useOnboardingStore();
  const [activeStepId, setActiveStepId] = useState("credential-assessment");

  const activeStep = mockApplicationSteps.find((s) => s.id === activeStepId);
  const stepDocs = activeStep?.documents
    .map((docId) => mockDocuments.find((d) => d.id === docId))
    .filter(Boolean) ?? [];

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="border-b border-[#E5E5E5] px-6 py-3 flex items-center justify-between gap-4">
        <div>
          <span className="text-sm font-semibold text-[#171717]">Express Entry Application</span>
          <span className="text-xs text-[#737373] ml-2">Canada · PR via Skilled Worker</span>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-xs text-[#A3A3A3]">Application strength</span>
          <div className="w-28 h-1.5 bg-[#F5F5F5] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#534AB7] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${applicationStrength}%` }}
              transition={{ duration: 0.8, delay: 0.3 }}
            />
          </div>
          <span className="text-xs font-semibold text-[#534AB7]">{applicationStrength}%</span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left: step list */}
        <div className="w-64 border-r border-[#E5E5E5] overflow-y-auto py-4 px-3 flex-shrink-0">
          <StepTracker
            steps={mockApplicationSteps.map((s) => ({ id: s.id, title: s.title, status: s.status as any }))}
            activeStepId={activeStepId}
            onStepClick={setActiveStepId}
          />
        </div>

        {/* Right: step detail */}
        <div className="flex-1 overflow-y-auto">
          {activeStep && (
            <motion.div
              key={activeStepId}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="p-8 max-w-2xl"
            >
              <div className="mb-6">
                <h3 className="text-xl font-semibold text-[#171717] mb-2">{activeStep.title}</h3>
                <p className="text-sm text-[#737373] leading-relaxed">{activeStep.description}</p>
              </div>

              {/* Explanation box */}
              <div className="bg-[#FAFAFA] border border-[#E5E5E5] rounded-[12px] p-5 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-xs font-bold text-[#534AB7]">P</span>
                  </div>
                  <p className="text-sm text-[#525252] leading-relaxed">{activeStep.explanation}</p>
                </div>
              </div>

              {/* Documents for this step */}
              {stepDocs.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-semibold text-[#171717] mb-3">What you need</h4>
                  <div className="space-y-2">
                    {stepDocs.map((doc) => doc && (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 border border-[#E5E5E5] rounded-[8px] bg-white"
                      >
                        <span className="text-sm text-[#525252]">{doc.name}</span>
                        <button className="flex items-center gap-1.5 text-xs text-[#534AB7] hover:opacity-70 transition-opacity">
                          <Upload size={12} />
                          Upload
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generate with AI */}
              {activeStep.canGenerate && (
                <button className="flex items-center gap-2 px-5 py-2.5 bg-[#534AB7] text-white text-sm font-medium rounded-[8px] hover:bg-[#3C3489] transition-colors mb-6">
                  <Sparkles size={15} />
                  Generate with AI
                </button>
              )}

              {/* Step strength assessment */}
              <div className="bg-[#E1F5EE] border border-[#1D9E75]/20 rounded-[12px] p-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-[#1D9E75]">Step strength: Strong</span>
                </div>
                <p className="text-xs text-[#525252] leading-relaxed">
                  Your profile looks great for this step. All required information is in order.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
