import { useState, useEffect } from "react";
import { X, ArrowRight, Star, Compass, Trophy, Users } from "lucide-react";
import { Button } from "@/components/ui/button";

const TUTORIAL_KEY = "xpf_tutorial_seen";

interface Slide {
  emoji: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
}

const SLIDES: Slide[] = [
  {
    emoji: "⭐",
    title: "Earn XP for Real Experiences",
    description: "Join local experiences — meetups, cleanups, creative sessions — and earn XP when you complete them. Your XP reflects real-world participation.",
    icon: <Star className="w-5 h-5" />,
    color: "from-[#f20789] to-rose-500",
  },
  {
    emoji: "🌍",
    title: "Discover What's Near You",
    description: "Browse experiences in your city, filtered by type or category. Personal, professional, creative — something for everyone.",
    icon: <Compass className="w-5 h-5" />,
    color: "from-pink-500 to-[#f20789]",
  },
  {
    emoji: "🏆",
    title: "Build Your Reputation",
    description: "Your XP builds your level — Explorer, Contributor, Champion, Leader, Legend. Host great experiences and get upvoted by the community.",
    icon: <Trophy className="w-5 h-5" />,
    color: "from-rose-500 to-pink-600",
  },
  {
    emoji: "🚀",
    title: "Your XP = Your $EXP",
    description: "experiences.fun is launching the $EXP token. Every XP you earn now converts to real tokens at launch. Start earning early.",
    icon: <Users className="w-5 h-5" />,
    color: "from-[#f20789] to-pink-700",
  },
];

export function TutorialOverlay() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(TUTORIAL_KEY);
    if (!seen) {
      const t = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(t);
    }
    return undefined;
  }, []);

  const dismiss = () => {
    setExiting(true);
    setTimeout(() => {
      localStorage.setItem(TUTORIAL_KEY, "1");
      setVisible(false);
    }, 300);
  };

  const next = () => {
    if (step < SLIDES.length - 1) {
      setStep(s => s + 1);
    } else {
      dismiss();
    }
  };

  if (!visible) return null;

  const slide = SLIDES[step];

  return (
    <div className={`fixed inset-0 z-[200] flex items-end justify-center transition-opacity duration-300 ${exiting ? "opacity-0" : "opacity-100"}`}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      <div className={`relative w-full max-w-md bg-white rounded-t-3xl shadow-2xl transition-transform duration-300 ${exiting ? "translate-y-full" : "translate-y-0"}`}>
        <div className={`h-2 w-full bg-gradient-to-r ${slide.color} rounded-t-3xl`} />

        <button
          onClick={dismiss}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full p-1.5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 pt-5">
          <div className="flex gap-1.5 mb-6">
            {SLIDES.map((_, i) => (
              <div
                key={i}
                className={`h-1 rounded-full flex-1 transition-all duration-300 ${i <= step ? "bg-primary" : "bg-gray-100"}`}
              />
            ))}
          </div>

          <div className="text-center mb-6">
            <div className="text-6xl mb-4">{slide.emoji}</div>
            <h2 className="text-xl font-bold text-gray-900 mb-3 leading-tight">{slide.title}</h2>
            <p className="text-gray-500 text-sm leading-relaxed">{slide.description}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={dismiss}
              className="text-gray-400 text-sm font-medium hover:text-gray-600 transition-colors px-3"
            >
              Skip
            </button>
            <Button
              onClick={next}
              className="flex-1 h-12 bg-primary hover:bg-primary/90 text-white rounded-2xl font-semibold group"
            >
              {step < SLIDES.length - 1 ? (
                <>Next <ArrowRight className="w-4 h-4 ml-1.5 group-hover:translate-x-0.5 transition-transform" /></>
              ) : (
                "Get Started 🎉"
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
