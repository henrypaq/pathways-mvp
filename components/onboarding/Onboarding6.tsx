"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send } from "lucide-react";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { PathwayCard } from "@/components/ui/PathwayCard";
import { mockPathways } from "@/lib/mockData";

export function Onboarding6() {
  const { setSelectedPathway, nextStep } = useOnboardingStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerInput, setDrawerInput] = useState("");
  const [drawerMessages, setDrawerMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    { role: "ai", text: "I'm here to help! Ask me anything about these pathways or your options." },
  ]);

  const handleChoose = (id: string) => {
    setSelectedPathway(id);
    nextStep();
  };

  const handleDrawerSend = () => {
    if (!drawerInput.trim()) return;
    setDrawerMessages((m) => [...m, { role: "user", text: drawerInput }]);
    setDrawerInput("");
    setTimeout(() => {
      setDrawerMessages((m) => [
        ...m,
        { role: "ai", text: "That's a great question. Based on your profile, the Express Entry pathway would be your best bet given your IELTS score and work experience. Would you like to explore it in detail?" },
      ]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto w-full px-6 py-8">
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-semibold text-[#171717] mb-2">Your top matches</h2>
          <p className="text-[#737373] text-sm">Based on your profile and documents, here are your strongest pathways</p>
        </div>

        <div className="space-y-4 mb-10">
          {mockPathways.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <PathwayCard {...p} onChoose={() => handleChoose(p.id)} />
            </motion.div>
          ))}
        </div>

        {/* Ask anything */}
        <div className="text-center">
          <button
            onClick={() => setDrawerOpen(true)}
            className="inline-flex items-center gap-2 text-sm text-[#534AB7] hover:text-[#3C3489] transition-colors font-medium"
          >
            <MessageCircle size={16} />
            Not sure? Ask me anything
          </button>
        </div>
      </div>

      {/* Chat drawer */}
      <AnimatePresence>
        {drawerOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDrawerOpen(false)}
              className="fixed inset-0 bg-black/20 z-40"
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[20px] z-50 h-[60vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E5E5]">
                <span className="font-semibold text-[#171717]">Ask Pathways AI</span>
                <button onClick={() => setDrawerOpen(false)} className="text-[#A3A3A3] hover:text-[#171717]">
                  <X size={18} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {drawerMessages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm ${
                      m.role === "user" ? "bg-[#534AB7] text-white" : "bg-[#F5F5F5] text-[#171717]"
                    }`}>{m.text}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-[#E5E5E5] p-4">
                <div className="flex items-center gap-2 bg-[#F5F5F5] rounded-full px-4 py-2.5">
                  <input
                    type="text"
                    placeholder="Ask anything…"
                    value={drawerInput}
                    onChange={(e) => setDrawerInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleDrawerSend()}
                    className="flex-1 bg-transparent text-sm outline-none text-[#171717] placeholder-[#A3A3A3]"
                  />
                  <motion.button whileTap={{ scale: 0.9 }} onClick={handleDrawerSend}
                    className="w-7 h-7 bg-[#534AB7] text-white rounded-full flex items-center justify-center hover:bg-[#3C3489]">
                    <Send size={13} />
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
