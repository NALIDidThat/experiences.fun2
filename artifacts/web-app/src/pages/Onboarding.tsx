import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, MapPin, Loader2 } from "lucide-react";
import { useDebounce } from "use-debounce";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FloatingEmojis } from "@/components/FloatingEmojis";
import { getTelegramUser } from "@/lib/telegram";
import { setSessionToken, getSessionToken, getAuthHeaders } from "@/lib/auth";
import { useCompleteOnboarding, useCheckUsername, useGetCurrentUser } from "@workspace/api-client-react";

type Step = 1 | 2 | 3 | 4 | 5 | 6;

interface FormData {
  city: string;
  country: string;
  interests: string[];
  participation: "join" | "host" | "both" | "";
  name: string;
  username: string;
  bio: string;
}

const INTERESTS = [
  { id: "environmental", label: "Environmental action", icon: "🌿" },
  { id: "education", label: "Education & mentoring", icon: "📚" },
  { id: "community", label: "Community volunteering", icon: "🤝" },
  { id: "creative", label: "Creative workshops", icon: "🎨" },
  { id: "entrepreneurship", label: "Entrepreneurship", icon: "🚀" },
  { id: "health", label: "Health & wellbeing", icon: "💪" },
  { id: "tech", label: "Technology", icon: "💻" },
  { id: "events", label: "Local events", icon: "🎉" },
];

const PARTICIPATION_OPTIONS = [
  { id: "join", title: "Join experiences", description: "Participate in activities" },
  { id: "host", title: "Host experiences", description: "Organize experiences for others" },
  { id: "both", title: "Both", description: "Join and host" },
] as const;

const RECOMMENDATIONS = [
  { id: 1, title: "Community Tree Planting", location: "City Park", day: "Saturday", xp: 100 },
  { id: 2, title: "Tech Mentoring Drop-in", location: "Downtown Library", day: "Tuesday", xp: 150 },
  { id: 3, title: "Beach Cleanup Initiative", location: "South Shore", day: "Sunday", xp: 75 },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>(1);
  const [direction, setDirection] = useState(1);
  
  const [formData, setFormData] = useState<FormData>({
    city: "",
    country: "",
    interests: [],
    participation: "",
    name: "",
    username: "",
    bio: "",
  });

  const hasSession = !!getSessionToken();
  const isEditMode = hasSession;
  const [originalUsername, setOriginalUsername] = useState<string>("");

  const currentUserQuery = { enabled: hasSession };
  const currentUserResult = useGetCurrentUser({
    query: currentUserQuery as typeof currentUserQuery & { queryKey: readonly unknown[] },
    request: { headers: getAuthHeaders() }
  });

  const completeMutation = useCompleteOnboarding({
    request: { headers: getAuthHeaders() }
  });

  useEffect(() => {
    if (currentUserResult.data && isEditMode) {
      const u = currentUserResult.data;
      setOriginalUsername(u.username);
      setFormData(prev => ({
        ...prev,
        name: u.name,
        username: u.username,
        city: u.city,
        country: u.country,
        interests: u.interests,
        participation: u.role as "join" | "host" | "both",
        bio: u.bio || "",
      }));
    }
  }, [currentUserResult.data, isEditMode]);

  useEffect(() => {
    const tgUser = getTelegramUser();
    if (tgUser && step === 1 && !isEditMode) {
      setFormData(prev => ({
        ...prev,
        name: tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : ""),
        username: tgUser.username || "",
      }));
    }
  }, [step, isEditMode]);

  const [debouncedUsername] = useDebounce(formData.username, 500);
  const isOwnUsername = isEditMode && debouncedUsername === originalUsername;
  const checkUsernameQuery = { enabled: debouncedUsername.length > 2 && step === 5 && !isOwnUsername };
  const checkUsernameResult = useCheckUsername(debouncedUsername, {
    query: checkUsernameQuery as typeof checkUsernameQuery & { queryKey: readonly unknown[] },
    request: { headers: getAuthHeaders() }
  });
  const usernameData = checkUsernameResult.data;
  const isCheckingUsername = checkUsernameResult.isLoading;

  const usernameError = debouncedUsername.length > 0 && debouncedUsername.length < 3 
    ? "Username must be at least 3 characters" 
    : (usernameData && !usernameData.available && !isOwnUsername ? "Username is already taken" : null);

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

  const handleInterestToggle = (id: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(id)
        ? prev.interests.filter((i) => i !== id)
        : [...prev.interests, id],
    }));
  };

  const handleComplete = () => {
    completeMutation.mutate({
      data: {
        name: formData.name,
        username: formData.username,
        city: formData.city,
        country: formData.country,
        interests: formData.interests,
        role: formData.participation as "join" | "host" | "both",
        bio: formData.bio || null,
        telegram_id: getTelegramUser()?.id.toString() || null,
      }
    }, {
      onSuccess: (res) => {
        if (res.session_token) {
          setSessionToken(res.session_token);
        }
        setLocation("/home");
      }
    });
  };

  const variants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { duration: 0.4, type: "spring" as const, bounce: 0.2 }
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 50 : -50,
      opacity: 0,
      scale: 0.98,
      transition: { duration: 0.3 }
    })
  };

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-indigo-600 via-purple-600 to-fuchsia-600 flex flex-col items-center justify-end md:justify-center overflow-hidden font-sans relative">
      <FloatingEmojis step={step} />

      <div className="w-full max-w-md md:rounded-[2rem] rounded-t-[2.5rem] bg-white shadow-2xl relative z-10 flex flex-col h-[75dvh] md:h-[650px] overflow-hidden">
        
        {/* Header & Navigation */}
        <div className="absolute top-0 left-0 w-full p-6 z-20 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-50/50">
          {step > 1 ? (
            <button 
              onClick={prevStep}
              className="text-gray-400 hover:text-gray-800 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full p-2.5 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : <div className="w-10" />}
          
          <div className="flex gap-1.5 flex-1 mx-8">
            {[1, 2, 3, 4, 5, 6].map((indicatorStep) => (
              <div
                key={indicatorStep}
                className={`h-1.5 rounded-full transition-all duration-500 flex-1 ${
                  indicatorStep === step
                    ? "bg-primary"
                    : indicatorStep < step
                    ? "bg-primary/30"
                    : "bg-gray-100"
                }`}
              />
            ))}
          </div>
          <div className="w-10" />
        </div>

        {/* Dynamic Content Area */}
        <div className="flex-1 relative mt-20">
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
              
              {/* Step 1: Welcome */}
              {step === 1 && (
                <div className="flex flex-col h-full justify-center">
                  <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-primary/10 rounded-3xl mx-auto mb-6 flex items-center justify-center text-4xl shadow-inner transform rotate-3">
                      ✨
                    </div>
                    <h1 className="text-3xl md:text-4xl font-display font-extrabold text-gray-900 mb-4 leading-tight">
                      Welcome to <span className="text-primary">experiences.fun</span>
                    </h1>
                    <p className="text-gray-500 text-lg leading-relaxed px-4">
                      Join real-world experiences, connect with locals, and build your community reputation.
                    </p>
                  </div>
                  <div className="mt-auto">
                    <Button 
                      onClick={nextStep} 
                      className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl group shadow-lg shadow-primary/25 transition-all hover:scale-[1.02]"
                    >
                      Start
                      <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 2: Location */}
              {step === 2 && (
                <div className="flex flex-col h-full">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Where are you based?</h2>
                    <p className="text-gray-500 mb-8">
                      We use your location to show nearby experiences and community initiatives.
                    </p>
                    
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">City</label>
                        <Input 
                          placeholder="e.g. London" 
                          value={formData.city}
                          onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                          className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary text-lg px-5 shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Country</label>
                        <Input 
                          placeholder="e.g. United Kingdom" 
                          value={formData.country}
                          onChange={(e) => setFormData(p => ({ ...p, country: e.target.value }))}
                          className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary text-lg px-5 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-6">
                    <Button 
                      onClick={nextStep}
                      disabled={!formData.city.trim() || !formData.country.trim()}
                      className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Interests */}
              {step === 3 && (
                <div className="flex flex-col h-full">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">What interests you?</h2>
                    <p className="text-gray-500 mb-6">
                      Select all the topics you'd love to explore or host.
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 pb-4">
                      {INTERESTS.map((interest) => {
                        const isSelected = formData.interests.includes(interest.id);
                        return (
                          <button
                            key={interest.id}
                            onClick={() => handleInterestToggle(interest.id)}
                            className={cn(
                              "flex flex-col items-center justify-center p-4 rounded-2xl border-2 transition-all duration-200 text-center relative overflow-hidden",
                              isSelected 
                                ? "border-primary bg-primary/5 text-primary shadow-sm" 
                                : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                            )}
                          >
                            <span className="text-3xl mb-2 relative z-10">{interest.icon}</span>
                            <span className={cn(
                              "text-[13px] font-semibold leading-tight relative z-10",
                              isSelected ? "text-primary" : ""
                            )}>
                              {interest.label}
                            </span>
                            {isSelected && (
                              <div className="absolute inset-0 bg-primary/5 z-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div className="mt-auto pt-4 bg-white">
                    <Button 
                      onClick={nextStep}
                      disabled={formData.interests.length === 0}
                      className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
                    >
                      Continue ({formData.interests.length} selected)
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 4: Contribution Type */}
              {step === 4 && (
                <div className="flex flex-col h-full">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-gray-900 mb-6">How do you want to participate?</h2>
                    
                    <div className="space-y-4">
                      {PARTICIPATION_OPTIONS.map((option) => {
                        const isSelected = formData.participation === option.id;
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              setFormData(p => ({ ...p, participation: option.id }));
                              setTimeout(nextStep, 350); // Auto-advance
                            }}
                            className={cn(
                              "w-full text-left p-5 rounded-2xl border-2 transition-all duration-200 flex items-center justify-between group",
                              isSelected 
                                ? "border-primary bg-primary/5 shadow-md scale-[1.02]" 
                                : "border-gray-100 bg-white hover:border-primary/30 hover:bg-gray-50 hover:shadow-sm"
                            )}
                          >
                            <div>
                              <div className={cn(
                                "font-bold text-lg mb-1 transition-colors",
                                isSelected ? "text-primary" : "text-gray-900 group-hover:text-gray-900"
                              )}>
                                {option.title}
                              </div>
                              <div className={cn(
                                "text-sm transition-colors",
                                isSelected ? "text-primary/70" : "text-gray-500"
                              )}>
                                {option.description}
                              </div>
                            </div>
                            <div className={cn(
                              "w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all",
                              isSelected ? "border-primary bg-primary" : "border-gray-300 group-hover:border-primary/50"
                            )}>
                              <Check className={cn(
                                "w-3.5 h-3.5 text-white transition-opacity",
                                isSelected ? "opacity-100" : "opacity-0"
                              )} />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 5: Profile Creation */}
              {step === 5 && (
                <div className="flex flex-col h-full">
                  <div>
                    <h2 className="text-2xl font-display font-bold text-gray-900 mb-2">Create your profile</h2>
                    <p className="text-gray-500 mb-6">
                      This is how the community will see you.
                    </p>
                    
                    <div className="space-y-5">
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Display Name</label>
                        <Input 
                          placeholder="Jane Doe" 
                          value={formData.name}
                          onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                          className="h-14 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary text-lg px-5 shadow-sm"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Username</label>
                        <div className="relative">
                          <span className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-lg">@</span>
                          <Input 
                            placeholder="janedoe" 
                            value={formData.username}
                            onChange={(e) => setFormData(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                            className={cn(
                              "h-14 pl-9 bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary text-lg pr-12 shadow-sm",
                              usernameError ? "border-red-400 focus-visible:ring-red-400" : "",
                              usernameData?.available ? "border-green-400 focus-visible:ring-green-400" : ""
                            )}
                          />
                          {isCheckingUsername && (
                            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-gray-400" />
                          )}
                        </div>
                        {usernameError && (
                          <p className="text-sm text-red-500 ml-1">{usernameError}</p>
                        )}
                        {usernameData?.available && !usernameError && (
                          <p className="text-sm text-green-600 ml-1">Username is available!</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Short bio <span className="text-gray-400 font-normal">(optional)</span></label>
                        <Textarea 
                          placeholder="Passionate about the environment and building local communities..." 
                          value={formData.bio}
                          onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
                          className="min-h-[100px] resize-none bg-gray-50 border-gray-200 rounded-2xl focus-visible:ring-primary p-4 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-6 pb-2">
                    <Button 
                      onClick={nextStep}
                      disabled={!formData.name.trim() || !formData.username.trim() || !!usernameError || isCheckingUsername}
                      className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 6: Completion */}
              {step === 6 && (
                <div className="flex flex-col h-full">
                  <div className="relative pt-8 flex-1 flex flex-col">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-4 bg-amber-400 text-amber-900 font-bold px-4 py-1.5 rounded-full text-sm inline-flex items-center shadow-lg transform -rotate-3 border border-amber-300">
                      <span className="mr-1.5 text-base">🌟</span> +50 XP Earned
                    </div>
                    
                    <div className="text-center mb-8 mt-4">
                      <h2 className="text-3xl font-display font-bold text-gray-900 mb-2">You're all set!</h2>
                      <p className="text-gray-500">
                        Here are some experiences near {formData.city || "you"} happening soon.
                      </p>
                    </div>
                    
                    <div className="space-y-3 flex-1 overflow-y-auto pb-4 px-1">
                      {RECOMMENDATIONS.map((rec, i) => (
                        <motion.div 
                          key={rec.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className="p-4 rounded-2xl border border-gray-100 shadow-sm bg-white hover:border-primary/20 hover:shadow-md transition-all group"
                        >
                          <div>
                            <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">{rec.title}</h3>
                            <div className="flex text-sm text-gray-500 mt-1.5 gap-2 items-center">
                              <span className="flex items-center font-medium bg-gray-50 px-2 py-0.5 rounded text-gray-600"><MapPin className="w-3 h-3 mr-1" /> {rec.location}</span>
                              <span className="text-gray-300">•</span>
                              <span className="font-medium">{rec.day}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-50">
                            <span className="text-sm font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">+{rec.xp} XP</span>
                            <Button variant="outline" size="sm" className="h-8 rounded-xl border-primary/20 text-primary hover:bg-primary hover:text-white transition-colors">
                              View
                            </Button>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto pt-4 bg-white z-10">
                    <Button 
                      onClick={handleComplete}
                      disabled={completeMutation.isPending}
                      className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 relative overflow-hidden group"
                    >
                      {completeMutation.isPending ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <>
                          <span className="relative z-10 font-bold">Explore Experiences</span>
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                        </>
                      )}
                    </Button>
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

// Simple utility for classes
function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
