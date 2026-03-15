import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FloatingEmojis } from "@/components/FloatingEmojis";

const TUTORIAL_DONE_KEY = "tutorial_done";
const TUTORIAL_STEP_KEY = "tutorial_step";

const SLIDES = [
  {
    emoji: "🌍",
    title: "Discover experiences near you",
    description:
      "Browse real-world experiences happening in your city — community cleanups, creative workshops, startup meetups, and more. Filter by type or category to find what excites you.",
    preview: [
      { icon: "🌿", label: "Environmental" },
      { icon: "🎨", label: "Creative" },
      { icon: "🚀", label: "Startup" },
      { icon: "🤝", label: "Community" },
    ],
  },
  {
    emoji: "⭐",
    title: "Earn XP & level up",
    description:
      "Every experience you complete earns you XP. Climb from Explorer to Legend and build a reputation that reflects your real-world participation.",
    levels: [
      { name: "Explorer", xp: "0+", fill: 10 },
      { name: "Contributor", xp: "500+", fill: 30 },
      { name: "Champion", xp: "1500+", fill: 55 },
      { name: "Leader", xp: "2000+", fill: 75 },
      { name: "Legend", xp: "2500+", fill: 100 },
    ],
  },
  {
    emoji: "🏆",
    title: "Your community",
    description:
      "Upvote members who make a difference. Host your own experiences to earn bonus XP. Check your profile to track your progress and see your impact.",
    highlights: [
      { icon: "👍", text: "Upvote great members" },
      { icon: "📋", text: "Host your own experiences" },
      { icon: "📊", text: "Track XP on your profile" },
    ],
  },
];

export default function AppTutorial() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem(TUTORIAL_STEP_KEY);
    return saved ? Math.min(Number(saved), SLIDES.length - 1) : 0;
  });
  const [direction, setDirection] = useState(1);

  useEffect(() => {
    if (localStorage.getItem(TUTORIAL_DONE_KEY)) {
      setLocation("/home");
    }
  }, [setLocation]);

  const next = () => {
    if (step < SLIDES.length - 1) {
      const nextStep = step + 1;
      setDirection(1);
      setStep(nextStep);
      localStorage.setItem(TUTORIAL_STEP_KEY, String(nextStep));
    } else {
      localStorage.setItem(TUTORIAL_DONE_KEY, "1");
      localStorage.removeItem(TUTORIAL_STEP_KEY);
      setLocation("/home");
    }
  };

  const prev = () => {
    if (step > 0) {
      const prevStep = step - 1;
      setDirection(-1);
      setStep(prevStep);
      localStorage.setItem(TUTORIAL_STEP_KEY, String(prevStep));
    }
  };

  const variants = {
    enter: (dir: number) => ({
      x: dir > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, type: "spring" as const, bounce: 0.2 },
    },
    exit: (dir: number) => ({
      x: dir < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.3 },
    }),
  };

  const slide = SLIDES[step];

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-pink-600 via-primary to-rose-600 flex flex-col items-center justify-end md:justify-center overflow-hidden font-sans relative">
      <FloatingEmojis step={step + 7} />

      <div className="w-full max-w-md md:rounded-[2rem] rounded-t-[2.5rem] bg-white shadow-2xl relative z-10 flex flex-col min-h-[80dvh] max-h-[90dvh] md:h-[650px] md:min-h-0 md:max-h-none">
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 z-20 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-50/50">
          {step > 0 ? (
            <button
              onClick={prev}
              className="text-gray-400 hover:text-gray-800 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full p-2 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <div className="w-10" />
          )}

          <div className="flex gap-1.5 flex-1 mx-6">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 flex-1 ${
                  i === step
                    ? "bg-primary"
                    : i < step
                      ? "bg-primary/30"
                      : "bg-gray-100"
                }`}
              />
            ))}
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 relative mt-16 md:mt-20">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="absolute inset-0 p-6 md:p-8 flex flex-col overflow-y-auto overflow-x-hidden"
            >
              <div className="flex flex-col h-full justify-center">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-inner transform rotate-3">
                    {slide.emoji}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-display font-extrabold text-gray-900 mb-3 leading-tight">
                    {slide.title}
                  </h1>
                  <p className="text-gray-500 text-base leading-relaxed px-2">
                    {slide.description}
                  </p>
                </div>

                {step === 0 && slide.preview && (
                  <div className="grid grid-cols-2 gap-2 mb-4 px-4">
                    {slide.preview.map((cat) => (
                      <motion.div
                        key={cat.label}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="flex items-center gap-2 bg-gray-50 rounded-xl p-3 border border-gray-100"
                      >
                        <span className="text-xl">{cat.icon}</span>
                        <span className="text-sm font-semibold text-gray-700">
                          {cat.label}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {step === 1 && slide.levels && (
                  <div className="space-y-2 mb-4 px-4">
                    {slide.levels.map((level, i) => (
                      <motion.div
                        key={level.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                        className="flex items-center gap-3"
                      >
                        <span className="text-xs font-bold text-gray-500 w-20 text-right">
                          {level.name}
                        </span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${level.fill}%` }}
                            transition={{ delay: 0.4 + i * 0.1, duration: 0.6 }}
                            className="h-full bg-gradient-to-r from-primary to-rose-400 rounded-full"
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-10">
                          {level.xp}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                {step === 2 && slide.highlights && (
                  <div className="space-y-2 mb-4 px-4">
                    {slide.highlights.map((h, i) => (
                      <motion.div
                        key={h.text}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                        className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 border border-gray-100"
                      >
                        <span className="text-xl">{h.icon}</span>
                        <span className="text-sm font-semibold text-gray-700">
                          {h.text}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}

                <div className="mt-auto pt-4">
                  <Button
                    onClick={next}
                    className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-2xl group shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]"
                  >
                    {step < SLIDES.length - 1 ? (
                      <>
                        Next
                        <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                      </>
                    ) : (
                      "Let's go! 🎉"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
