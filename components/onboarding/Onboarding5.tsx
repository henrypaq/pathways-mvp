"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { DocumentSlot } from "@/components/ui/DocumentSlot";
import { mockDocuments } from "@/lib/mockData";

type DocStatus = "not_uploaded" | "uploaded" | "verified";

export function Onboarding5() {
  const { updateDocument, nextStep, selectedPathwayId } = useOnboardingStore();
  const [docStatuses, setDocStatuses] = useState<Record<string, DocStatus>>(
    Object.fromEntries(mockDocuments.map((d) => [d.id, "not_uploaded"]))
  );

  const uploadedCount = Object.values(docStatuses).filter((s) => s !== "not_uploaded").length;
  const progress = Math.round((uploadedCount / mockDocuments.length) * 100);

  const handleUpload = (id: string, file: File) => {
    setTimeout(() => {
      setDocStatuses((s) => ({ ...s, [id]: "uploaded" }));
      updateDocument(id, "uploaded", file);
    }, 1000);
  };

  const handleSkip = (id: string) => {
    // keep as not_uploaded but show skipped UI
  };

  const handleGenerate = (id: string) => {
    setTimeout(() => {
      setDocStatuses((s) => ({ ...s, [id]: "uploaded" }));
      updateDocument(id, "uploaded");
    }, 1200);
  };

  const pathwayName = selectedPathwayId
    ? mockDocuments ? "Express Entry" : "your pathway"
    : "Express Entry";

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto w-full px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold text-[#171717] mb-2">Let's gather your documents</h2>
          <p className="text-[#737373] text-sm">
            Based on your profile, here's what you'll need for <span className="font-medium text-[#171717]">{pathwayName}</span>
          </p>
        </div>

        {/* Progress */}
        <div className="mb-6 p-4 bg-[#FAFAFA] rounded-[12px] border border-[#E5E5E5]">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-[#171717]">{uploadedCount} of {mockDocuments.length} documents uploaded</span>
            <span className="text-xs text-[#534AB7] font-medium">{progress}%</span>
          </div>
          <div className="h-1.5 bg-[#E5E5E5] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#534AB7] rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Document slots */}
        <div className="space-y-3 mb-8">
          {mockDocuments.map((doc, i) => (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
            >
              <DocumentSlot
                {...doc}
                status={docStatuses[doc.id]}
                onUpload={handleUpload}
                onSkip={handleSkip}
                onGenerate={doc.canGenerate ? handleGenerate : undefined}
              />
            </motion.div>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={nextStep}
            className="text-sm text-[#A3A3A3] hover:text-[#737373] transition-colors"
          >
            Skip for now →
          </button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={nextStep}
            className="px-8 py-3 bg-[#534AB7] text-white text-sm font-medium rounded-full hover:bg-[#3C3489] transition-colors"
          >
            Continue →
          </motion.button>
        </div>
      </div>
    </div>
  );
}
