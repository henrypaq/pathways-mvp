"use client";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { useOnboardingStore } from "@/lib/onboardingStore";
import { PathwaysOrb } from "@/components/voice/PathwaysOrb";
import { ProfilePanel } from "@/components/voice/ProfilePanel";
import { useVoiceOnboarding } from "@/hooks/useVoiceOnboarding";
import { ChatOnboarding } from "@/components/onboarding/ChatOnboarding";
import { ManualProfileForm } from "@/components/onboarding/ManualProfileForm";
import { getSpeechRecognitionCtor } from "@/lib/speechRecognition";


function VoiceMode() {
  const {
    orbState,
    profile,
    isComplete,
    errorMessage,
    startListening,
    stopListening,
    triggerWelcome,
    requiredFieldsRemaining,
  } = useVoiceOnboarding();
  const router = useRouter();

  // Fire welcome once when voice mode becomes active
  useEffect(() => {
    triggerWelcome();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isSpeechSupported =
    typeof window !== "undefined" && !!getSpeechRecognitionCtor();

  const handleOrbTap = () => {
    if (orbState === "idle") {
      startListening();
    } else if (orbState === "listening") {
      stopListening();
    }
    // no-op during thinking/speaking
  };

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        gap: "48px",
        padding: "24px 48px",
        flexWrap: "wrap",
      }}
    >
      {/* Orb column */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          flex: 1,
          minHeight: "40%",
          gap: "24px",
        }}
      >
        {/* Responsive orb size */}
        <div className="block sm:hidden">
          <PathwaysOrb state={orbState} onTap={handleOrbTap} size="160px" />
        </div>
        <div className="hidden sm:block">
          <PathwaysOrb state={orbState} onTap={handleOrbTap} size="220px" />
        </div>

        {/* Error message */}
        <AnimatePresence>
          {errorMessage && (
            <motion.p
              key={errorMessage}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              style={{
                fontSize: "13px",
                color: "#F87171",
                textAlign: "center",
                maxWidth: "320px",
              }}
            >
              {errorMessage}
            </motion.p>
          )}
        </AnimatePresence>

        {/* Continue button when complete */}
        <AnimatePresence>
          {isComplete && (
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/results')}
              style={{
                padding: "12px 32px",
                background: "#534AB7",
                color: "#fff",
                fontSize: "14px",
                fontWeight: 500,
                borderRadius: "999px",
                border: "none",
                cursor: "pointer",
              }}
            >
              See my pathways →
            </motion.button>
          )}
        </AnimatePresence>

        {/* Unsupported browser warning */}
        {!isSpeechSupported && (
          <p className="text-sm text-amber-600 text-center mt-2">
            Voice mode requires Chrome or Edge. Please switch browsers.
          </p>
        )}

        {isSpeechSupported &&
          requiredFieldsRemaining.length === 6 &&
          orbState === "idle" &&
          !errorMessage &&
          !isComplete && (
          <p
            style={{
              fontSize: "12px",
              color: "#525252",
              textAlign: "center",
              maxWidth: "320px",
            }}
          >
            Tap the orb to speak after Pathways finishes each message.
          </p>
        )}
      </div>

      {/* Profile panel — hidden on mobile, shown beside orb on desktop */}
      <div className="hidden md:block">
        <ProfilePanel profile={profile} isComplete={isComplete} />
      </div>

      {/* Mobile profile panel — below orb */}
      <div className="block md:hidden" style={{ width: "100%" }}>
        <ProfilePanel profile={profile} isComplete={isComplete} />
      </div>

      {/* Dev-only state label + test button */}
      {process.env.NODE_ENV === "development" && (
        <>
          <div
            style={{
              position: "fixed",
              bottom: "16px",
              right: "16px",
              padding: "4px 10px",
              background: "#F5F5F5",
              border: "1px solid #E5E5E5",
              borderRadius: "999px",
              fontSize: "11px",
              color: "#737373",
              fontFamily: "monospace",
            }}
          >
            {orbState}
          </div>
          <button
            onClick={async () => {
              console.log('[test] firing test request')
              const res = await fetch('/api/voice/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transcript: '__INIT__', history: [], profile: {} }),
              })
              console.log('[test] response status:', res.status)
              console.log('[test] response ok:', res.ok)
              const reader = res.body!.getReader()
              const decoder = new TextDecoder()
              let full = ''
              while (true) {
                const { done, value } = await reader.read()
                if (done) break
                const chunk = decoder.decode(value, { stream: true })
                full += chunk
                console.log('[test] chunk:', chunk)
              }
              console.log('[test] complete:', full)
            }}
            style={{
              position: 'fixed', bottom: 48, right: 16, zIndex: 9999,
              padding: '8px 16px', background: 'red', color: 'white', borderRadius: 8,
              fontSize: 12, fontFamily: 'monospace', cursor: 'pointer',
            }}
          >
            Test Chat API
          </button>
        </>
      )}
    </div>
  );
}

export function Onboarding1() {
  const { mode } = useOnboardingStore();

  if (mode === "voice") return <VoiceMode />;
  if (mode === "manual") return <ManualProfileForm />;
  return <ChatOnboarding />;
}
