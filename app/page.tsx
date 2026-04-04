"use client";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Shield, BookOpen, FileSearch, ChevronRight } from "lucide-react";
import { AuthNav } from "@/components/auth/AuthNav";
import { createClient } from "@/lib/supabase/client";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] },
};

const features = [
  {
    icon: Shield,
    title: "Profile-aware guidance",
    description: "Every answer tailored to your nationality, profession, and situation.",
  },
  {
    icon: BookOpen,
    title: "Cited official sources",
    description: "Every claim grounded in official government websites, with timestamps.",
  },
  {
    icon: FileSearch,
    title: "Document AI",
    description: "Upload your documents and get instant gap analysis and feedback.",
  },
];

export default function LandingPage() {
  const router = useRouter();
  const [isNavigating, setIsNavigating] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleBeginClick = async () => {
    if (isNavigating) return;
    setIsNavigating(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("completeness_score")
        .eq("user_id", user.id)
        .single();
      if (!profile || profile.completeness_score < 0.5) {
        router.push("/onboarding");
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/onboarding");
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 transition-all duration-300 ${
          scrolled ? "bg-white/90 backdrop-blur-sm shadow-sm" : ""
        }`}
      >
        <Link
          href="/"
          className="text-[15px] font-semibold tracking-tight text-[#171717] hover:text-[#534AB7] transition-colors duration-200"
        >
          Pathways
        </Link>
        <AuthNav />
      </nav>

      {/* Hero */}
      <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
        {/* Radial background glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 50% at 50% 40%, #EEEDFE 0%, transparent 70%)",
          }}
        />

        <motion.div
          className="relative z-10 max-w-3xl mx-auto"
          initial="initial"
          animate="animate"
          variants={{
            animate: { transition: { staggerChildren: 0.12 } },
          }}
        >
          <motion.div
            variants={fadeUp}
            className="inline-flex items-center gap-2 bg-white border border-[#E5E5E5] rounded-full px-4 py-1.5 text-xs text-[#737373] mb-8 shadow-sm"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] animate-pulse" />
            AI-powered immigration guidance
          </motion.div>

          <motion.h1
            variants={fadeUp}
            className="text-5xl sm:text-6xl lg:text-7xl font-semibold tracking-tight leading-[1.08] text-[#171717] mb-6"
          >
            Your immigration
            <br />
            <span className="text-[#534AB7]">journey, guided by AI.</span>
          </motion.h1>

          <motion.p
            variants={fadeUp}
            className="text-lg sm:text-xl text-[#737373] leading-relaxed mb-10 max-w-xl mx-auto"
          >
            Personalized guidance, official sources, your language.
          </motion.p>

          <motion.div variants={fadeUp}>
            <motion.button
              onClick={handleBeginClick}
              disabled={isNavigating}
              aria-busy={isNavigating}
              aria-live="polite"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="inline-flex items-center gap-2 bg-[#534AB7] text-white text-base font-medium px-8 py-4 rounded-full shadow-lg shadow-[#534AB7]/20 hover:bg-[#3C3489] transition-colors duration-200 cursor-pointer disabled:opacity-75"
            >
              {isNavigating ? (
                <>
                  Loading...
                  <Loader2 size={18} className="animate-spin" />
                </>
              ) : (
                "Begin your journey →"
              )}
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 0.6 }}
        >
          <span className="text-xs text-[#A3A3A3]">Scroll to learn more</span>
          <div className="w-px h-8 bg-gradient-to-b from-[#A3A3A3] to-transparent" />
        </motion.div>
      </section>

      {/* Feature cards */}
      <section className="px-6 pb-32 max-w-5xl mx-auto">
        <motion.div
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1], staggerChildren: 0.1 }}
        >
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: [0.25, 0.1, 0.25, 1] }}
              className="group bg-white border border-[#E5E5E5] rounded-[12px] p-8 hover:border-[#534AB7] hover:-translate-y-1 hover:shadow-[0_4px_12px_rgba(83,74,183,0.08)] transition-all duration-250 cursor-default"
            >
              <div className="w-10 h-10 rounded-[10px] bg-[#EEEDFE] flex items-center justify-center mb-5 group-hover:bg-[#534AB7] transition-colors duration-200">
                <f.icon size={18} className="text-[#534AB7] group-hover:text-white transition-colors duration-200" />
              </div>
              <h3 className="font-semibold text-[#171717] mb-2 text-[15px]">{f.title}</h3>
              <p className="text-sm text-[#737373] leading-relaxed">{f.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Bottom CTA */}
        <motion.div
          className="text-center mt-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <p className="text-sm text-[#A3A3A3] mb-4">Ready to find your pathway?</p>
          <motion.button
            onClick={handleBeginClick}
            disabled={isNavigating}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="inline-flex items-center gap-2 border border-[#534AB7] text-[#534AB7] hover:bg-[#534AB7] hover:text-white text-sm font-medium px-6 py-2.5 rounded-full transition-colors cursor-pointer disabled:opacity-60"
          >
            Get started for free
            <ChevronRight size={16} />
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
}
