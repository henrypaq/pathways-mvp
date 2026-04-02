"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, ChevronDown, AlertTriangle } from "lucide-react";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { searchPathways } from "@/lib/api";
import type { SearchResult } from "@/lib/types";

export interface ChatMessage {
  id: string;
  role: "user" | "ai";
  text: string;
  sources?: SearchResult[];
  timestamp?: Date;
}

interface ChatInterfaceProps {
  messages?: ChatMessage[];
  onSend?: (text: string) => void;
  placeholder?: string;
  loading?: boolean;
  showVoiceButton?: boolean;
  className?: string;
  /** When true the component manages its own state and calls the /search API */
  searchMode?: boolean;
}

function makeId() {
  return Math.random().toString(36).slice(2);
}

function Sources({ sources }: { sources: SearchResult[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-[#737373] hover:text-[#534AB7] transition-colors"
      >
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
        {sources.length} source{sources.length !== 1 ? "s" : ""}
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-1.5 space-y-1 overflow-hidden"
          >
            {sources.map((s, i) => (
              <li key={i} className="flex items-center gap-1.5">
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#534AB7] underline underline-offset-2 hover:opacity-70 transition-opacity truncate max-w-[220px]"
                >
                  {s.display_name}
                </a>
                {s.is_stale && (
                  <span title="This source may be outdated">
                    <AlertTriangle size={10} className="text-amber-500 flex-shrink-0" />
                  </span>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ChatInterface({
  messages: externalMessages,
  onSend: externalOnSend,
  placeholder = "Type your answer…",
  loading: externalLoading = false,
  showVoiceButton = false,
  className,
  searchMode = false,
}: ChatInterfaceProps) {
  const [input, setInput] = useState("");
  const [internalMessages, setInternalMessages] = useState<ChatMessage[]>([]);
  const [internalLoading, setInternalLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const store = useOnboardingStore();

  const messages = searchMode ? internalMessages : (externalMessages ?? []);
  const loading = searchMode ? internalLoading : externalLoading;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSearchSend = async (text: string) => {
    setInternalMessages((m) => [...m, { id: makeId(), role: "user", text }]);
    setInternalLoading(true);

    const profile = {
      nationality: store.profile["nationality"],
      destination_country: store.selectedDestination ?? undefined,
      purpose: store.selectedPurpose ?? undefined,
      visa_type: store.selectedPathwayId ?? undefined,
      occupation: store.profile["occupation"],
      language_score: store.profile["language_score"],
      preferred_language: store.profile["preferred_language"],
    };

    try {
      const data = await searchPathways(text, profile);
      setInternalMessages((m) => [
        ...m,
        { id: makeId(), role: "ai", text: data.answer, sources: data.results },
      ]);
    } catch {
      setInternalMessages((m) => [
        ...m,
        { id: makeId(), role: "ai", text: "Something went wrong. Please try again." },
      ]);
    } finally {
      setInternalLoading(false);
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    if (searchMode) {
      handleSearchSend(text);
    } else {
      externalOnSend?.(text);
    }
    setInput("");
  };

  return (
    <div className={`flex flex-col h-full ${className ?? ""}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "ai" && (
                <div className="w-7 h-7 rounded-full bg-[#EEEDFE] flex items-center justify-center mr-2.5 flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold text-[#534AB7]">P</span>
                </div>
              )}
              <div className="max-w-[75%]">
                <div
                  className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#534AB7] text-white rounded-br-sm"
                      : "bg-[#F5F5F5] text-[#171717] rounded-bl-sm"
                  }`}
                >
                  {msg.text}
                </div>
                {msg.role === "ai" && msg.sources && msg.sources.length > 0 && (
                  <div className="px-1">
                    <Sources sources={msg.sources} />
                  </div>
                )}
              </div>
            </motion.div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <motion.div
              key="typing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-[#EEEDFE] flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-[#534AB7]">P</span>
              </div>
              <div className="bg-[#F5F5F5] rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 pb-4 flex-shrink-0">
        <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-full px-4 py-3 border border-transparent focus-within:border-[#534AB7] focus-within:bg-white transition-all duration-200">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={placeholder}
            className="flex-1 bg-transparent text-sm text-[#171717] placeholder-[#A3A3A3] outline-none"
          />
          {showVoiceButton && (
            <button className="w-8 h-8 flex items-center justify-center text-[#A3A3A3] hover:text-[#534AB7] transition-colors">
              <Mic size={16} />
            </button>
          )}
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={handleSend}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 flex-shrink-0 ${
              input.trim() ? "bg-[#534AB7] text-white hover:bg-[#3C3489]" : "bg-[#E5E5E5] text-[#A3A3A3]"
            }`}
          >
            <Send size={14} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}
