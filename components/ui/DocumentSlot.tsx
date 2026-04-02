"use client";
import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { Upload, CheckCircle2, Sparkles, X } from "lucide-react";

type DocStatus = "not_uploaded" | "uploaded" | "verified";

interface DocumentSlotProps {
  id: string;
  name: string;
  description: string;
  status: DocStatus;
  canGenerate?: boolean;
  onUpload: (id: string, file: File) => void;
  onSkip?: (id: string) => void;
  onGenerate?: (id: string) => void;
}

export function DocumentSlot({
  id, name, description, status, canGenerate, onUpload, onSkip, onGenerate,
}: DocumentSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);

  const handleFile = (file: File) => {
    setUploading(true);
    onUpload(id, file);
    setTimeout(() => setUploading(false), 1200);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const statusConfig = {
    not_uploaded: { text: "Not uploaded", className: "text-[#A3A3A3] bg-[#F5F5F5]" },
    uploaded: { text: "Uploaded", className: "text-[#1D9E75] bg-[#E1F5EE]" },
    verified: { text: "Verified", className: "text-[#534AB7] bg-[#EEEDFE]" },
  };

  const { text: statusText, className: statusCls } = statusConfig[status];

  return (
    <div className="bg-white border border-[#E5E5E5] rounded-[12px] p-4">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {status !== "not_uploaded" ? (
              <CheckCircle2 size={14} className="text-[#1D9E75] flex-shrink-0" />
            ) : (
              <div className="w-3.5 h-3.5 rounded-full border border-[#D4D4D4] flex-shrink-0" />
            )}
            <span className="text-sm font-medium text-[#171717]">{name}</span>
          </div>
          <p className="text-xs text-[#737373] leading-relaxed pl-5">{description}</p>
        </div>
        <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-medium flex-shrink-0 ${statusCls}`}>
          {statusText}
        </span>
      </div>

      {status === "not_uploaded" && (
        <div className="pl-5 space-y-2">
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-[8px] p-3 text-center cursor-pointer transition-all duration-200 ${
              isDragging
                ? "border-[#534AB7] bg-[#EEEDFE]"
                : "border-[#D4D4D4] hover:border-[#534AB7] hover:bg-[#FAFAFA]"
            }`}
          >
            {uploading ? (
              <div className="flex items-center justify-center gap-2 text-xs text-[#534AB7]">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-3.5 h-3.5 border-2 border-[#534AB7] border-t-transparent rounded-full"
                />
                Uploading…
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-xs text-[#A3A3A3]">
                <Upload size={13} />
                Drop file here or click to upload
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            {canGenerate && onGenerate && (
              <button
                onClick={() => onGenerate(id)}
                className="flex items-center gap-1.5 text-xs text-[#534AB7] hover:opacity-70 transition-opacity font-medium"
              >
                <Sparkles size={12} />
                Generate with AI
              </button>
            )}
            {onSkip && (
              <button
                onClick={() => onSkip(id)}
                className="text-xs text-[#A3A3A3] hover:text-[#737373] transition-colors"
              >
                I don&apos;t have this yet
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
