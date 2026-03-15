import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FloatingEmojis } from "@/components/FloatingEmojis";
import { useCreateExperience, useGetCurrentUser } from "@workspace/api-client-react";
import { getAuthHeaders, isAuthenticated } from "@/lib/auth";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

type Step = 1 | 2 | 3 | 4 | 5 | 6;

const CATEGORIES = [
  { id: "environmental", label: "Environmental action", icon: "🌿" },
  { id: "education", label: "Education & mentoring", icon: "📚" },
  { id: "community", label: "Community volunteering", icon: "🤝" },
  { id: "creative", label: "Creative workshops", icon: "🎨" },
  { id: "entrepreneurship", label: "Entrepreneurship", icon: "🚀" },
  { id: "health", label: "Health & wellbeing", icon: "💪" },
  { id: "tech", label: "Technology", icon: "💻" },
  { id: "events", label: "Local events", icon: "🎉" },
];

const TYPE_OPTIONS = [
  {
    id: "personal",
    title: "Personal",
    description: "Beach cleanup, creative writing, local football",
    icon: "🌟",
  },
  {
    id: "professional",
    title: "Professional",
    description: "Pitch night, coding workshop, networking event",
    icon: "💼",
  },
] as const;

export default function CreateExperience() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    type: "" as "personal" | "professional" | "",
    category: "",
    date: "",
    city: "",
    country: "",
    max_participants: "",
    xp_reward: "100",
  });

  const meQuery = { enabled: isAuthenticated() };
  const meResult = useGetCurrentUser({
    query: meQuery as typeof meQuery & { queryKey: readonly unknown[] },
    request: { headers: getAuthHeaders() },
  });

  useEffect(() => {
    if (meResult.data) {
      setFormData((prev) => ({
        ...prev,
        city: prev.city || meResult.data!.city,
        country: prev.country || meResult.data!.country,
      }));
    }
  }, [meResult.data]);

  const createMutation = useCreateExperience({
    request: { headers: getAuthHeaders() },
  });

  const nextStep = () => {
    if (step < 6) {
      setDirection(1);
      setStep((step + 1) as Step);
    }
  };

  const prevStep = () => {
    if (step > 1) {
      setDirection(-1);
      setStep((step - 1) as Step);
    }
  };

  const handleSubmit = () => {
    createMutation.mutate(
      {
        data: {
          title: formData.title,
          description: formData.description,
          type: formData.type as "personal" | "professional",
          category: formData.category,
          date: formData.date,
          city: formData.city,
          country: formData.country,
          max_participants: formData.max_participants ? Number(formData.max_participants) : null,
          xp_reward: Number(formData.xp_reward) || 100,
        },
      },
      {
        onSuccess: () => setLocation("/home"),
      }
    );
  };

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? 50 : -50, opacity: 0, scale: 0.98 }),
    center: { x: 0, opacity: 1, scale: 1, transition: { duration: 0.4, type: "spring" as const, bounce: 0.2 } },
    exit: (d: number) => ({ x: d < 0 ? 50 : -50, opacity: 0, scale: 0.98, transition: { duration: 0.3 } }),
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-pink-600 via-primary to-rose-600 flex flex-col items-center justify-end md:justify-center overflow-hidden font-sans relative">
      <FloatingEmojis step={step} />

      <div className="w-full max-w-md md:rounded-[2rem] rounded-t-[2.5rem] bg-white shadow-2xl relative z-10 flex flex-col min-h-[80dvh] max-h-[90dvh] md:h-[650px] md:min-h-0 md:max-h-none">
        <div className="absolute top-0 left-0 w-full p-4 md:p-6 z-20 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-50/50">
          {step > 1 ? (
            <button
              onClick={prevStep}
              className="text-gray-400 hover:text-gray-800 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full p-2.5 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : (
            <button
              onClick={() => setLocation("/home")}
              className="text-gray-400 hover:text-gray-800 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full p-2.5 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          <div className="flex gap-1.5 flex-1 mx-8">
            {[1, 2, 3, 4, 5, 6].map((s) => (
              <div
                key={s}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-500 flex-1",
                  s === step ? "bg-primary" : s < step ? "bg-primary/30" : "bg-gray-100"
                )}
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
              className="absolute inset-0 p-4 md:p-8 flex flex-col overflow-y-auto overflow-x-hidden"
            >
              {step === 1 && (
                <div className="flex flex-col h-full">
                  <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">
                    What's the experience called?
                  </h2>
                  <p className="text-gray-500 mb-8">Give it a catchy, descriptive title.</p>
                  <Input
                    placeholder="e.g. Community Tree Planting"
                    value={formData.title}
                    onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                    className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary text-lg px-5 shadow-sm"
                  />
                  <div className="mt-auto pt-6">
                    <Button
                      onClick={nextStep}
                      disabled={!formData.title.trim()}
                      className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50"
                    >
                      Continue <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col h-full">
                  <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Describe it</h2>
                  <p className="text-gray-500 mb-6">What will participants do? What should they bring?</p>
                  <Textarea
                    placeholder="Tell people what to expect..."
                    value={formData.description}
                    onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
                    className="min-h-[180px] resize-none bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary p-4 shadow-sm flex-1"
                  />
                  <div className="mt-auto pt-6">
                    <Button
                      onClick={nextStep}
                      disabled={!formData.description.trim()}
                      className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50"
                    >
                      Continue <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col h-full">
                  <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">
                    Personal or Professional?
                  </h2>
                  <div className="space-y-4">
                    {TYPE_OPTIONS.map((opt) => {
                      const isSelected = formData.type === opt.id;
                      return (
                        <button
                          key={opt.id}
                          onClick={() => {
                            setFormData((p) => ({ ...p, type: opt.id }));
                            setTimeout(nextStep, 350);
                          }}
                          className={cn(
                            "w-full text-left p-6 rounded-2xl border-2 transition-all duration-200 flex items-center gap-4 group",
                            isSelected
                              ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                              : "border-gray-100 bg-white hover:border-primary/30 hover:bg-gray-50"
                          )}
                        >
                          <span className="text-4xl">{opt.icon}</span>
                          <div>
                            <div className={cn("font-bold text-lg", isSelected ? "text-primary" : "text-gray-900")}>
                              {opt.title}
                            </div>
                            <div className={cn("text-sm", isSelected ? "text-primary/70" : "text-gray-500")}>
                              {opt.description}
                            </div>
                          </div>
                          <div
                            className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ml-auto",
                              isSelected ? "border-primary bg-primary" : "border-gray-300"
                            )}
                          >
                            <Check className={cn("w-3.5 h-3.5 text-white", isSelected ? "opacity-100" : "opacity-0")} />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col h-full">
                  <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Which category?</h2>
                  <p className="text-gray-500 mb-6">Pick the one that fits best.</p>
                  <div className="grid grid-cols-2 gap-3 pb-4">
                    {CATEGORIES.map((cat) => {
                      const isSelected = formData.category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => {
                            setFormData((p) => ({ ...p, category: cat.id }));
                            setTimeout(nextStep, 350);
                          }}
                          className={cn(
                            "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 text-center",
                            isSelected
                              ? "border-primary bg-primary/5 text-primary shadow-sm"
                              : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                          )}
                        >
                          <span className="text-3xl mb-2">{cat.icon}</span>
                          <span className={cn("text-[13px] font-semibold leading-tight", isSelected ? "text-primary" : "")}>
                            {cat.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {step === 5 && (
                <div className="flex flex-col h-full">
                  <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">When and where?</h2>
                  <p className="text-gray-500 mb-6">Set the date and location.</p>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 ml-1">Date</label>
                      <Input
                        type="date"
                        value={formData.date}
                        onChange={(e) => setFormData((p) => ({ ...p, date: e.target.value }))}
                        className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary text-lg px-5 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 ml-1">City</label>
                      <Input
                        placeholder="e.g. London"
                        value={formData.city}
                        onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                        className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary text-lg px-5 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 ml-1">Country</label>
                      <Input
                        placeholder="e.g. United Kingdom"
                        value={formData.country}
                        onChange={(e) => setFormData((p) => ({ ...p, country: e.target.value }))}
                        className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary text-lg px-5 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-auto pt-6">
                    <Button
                      onClick={nextStep}
                      disabled={!formData.date || !formData.city.trim() || !formData.country.trim()}
                      className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50"
                    >
                      Continue <ArrowRight className="w-5 h-5 ml-2" />
                    </Button>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="flex flex-col h-full">
                  <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Final details</h2>
                  <p className="text-gray-500 mb-6">These are optional — smart defaults are applied.</p>
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 ml-1">
                        Max participants <span className="text-gray-400 font-normal">(optional)</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="Unlimited"
                        min="2"
                        value={formData.max_participants}
                        onChange={(e) => setFormData((p) => ({ ...p, max_participants: e.target.value }))}
                        className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary text-lg px-5 shadow-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold text-gray-700 ml-1">
                        XP reward <span className="text-gray-400 font-normal">(10–500)</span>
                      </label>
                      <Input
                        type="number"
                        placeholder="100"
                        min="10"
                        max="500"
                        value={formData.xp_reward}
                        onChange={(e) => setFormData((p) => ({ ...p, xp_reward: e.target.value }))}
                        className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary text-lg px-5 shadow-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-auto pt-6">
                    <Button
                      onClick={handleSubmit}
                      disabled={createMutation.isPending}
                      className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25"
                    >
                      {createMutation.isPending ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        "Create Experience"
                      )}
                    </Button>
                    {createMutation.isError && (
                      <p className="text-red-500 text-sm text-center mt-3">Failed to create. Please try again.</p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
