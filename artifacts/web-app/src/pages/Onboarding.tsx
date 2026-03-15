import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, MapPin, Loader2, Wallet, Mail } from "lucide-react";
import { useDebounce } from "use-debounce";
import { usePrivy } from "@privy-io/react-auth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FloatingEmojis } from "@/components/FloatingEmojis";
import { getTelegramUser } from "@/lib/telegram";
import { setSessionToken, getSessionToken, getAuthHeaders, getPrivyAccessToken, setPrivyAccessToken } from "@/lib/auth";
import { useCompleteOnboarding, useCheckUsername, useGetCurrentUser } from "@workspace/api-client-react";

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;

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
  const { login, authenticated, user: privyUser, ready: privyReady, getAccessToken } = usePrivy();
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [privyChecked, setPrivyChecked] = useState(false);

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
  const isEditMode = hasSession && !authenticated;
  const [originalUsername, setOriginalUsername] = useState<string>("");

  const currentUserQuery = { enabled: hasSession || (authenticated && !!getPrivyAccessToken()) };
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

  const handlePrivyAuthComplete = useCallback(async () => {
    if (!authenticated || !privyReady || privyChecked) return;
    setPrivyChecked(true);
    setCheckingExisting(true);

    try {
      const token = await getAccessToken();
      if (token) {
        setPrivyAccessToken(token);
      }
    } catch {}

    await new Promise(r => setTimeout(r, 500));

    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/users/me`, { headers: getAuthHeaders() });
      if (res.ok) {
        const user = await res.json();
        if (user && user.username) {
          setSessionToken(user.session_token || "");
          setLocation("/home");
          return;
        }
      }
    } catch {}

    const emailAccount = privyUser?.linkedAccounts?.find(
      (a: { type: string }) => a.type === "email"
    );
    const emailAddress = emailAccount && "address" in emailAccount ? (emailAccount as { address: string }).address : null;

    if (emailAddress) {
      const nameFromEmail = emailAddress.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
      setFormData(prev => ({
        ...prev,
        name: prev.name || nameFromEmail,
        username: prev.username || emailAddress.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, ""),
      }));
    }

    const tgUser = getTelegramUser();
    if (tgUser) {
      setFormData(prev => ({
        ...prev,
        name: prev.name || tgUser.first_name + (tgUser.last_name ? ` ${tgUser.last_name}` : ""),
        username: prev.username || tgUser.username || "",
      }));
    }

    setCheckingExisting(false);
    setDirection(1);
    setStep(2);
  }, [authenticated, privyReady, privyChecked, privyUser, setLocation]);

  useEffect(() => {
    if (authenticated && privyReady && !privyChecked && step === 1) {
      handlePrivyAuthComplete();
    }
  }, [authenticated, privyReady, privyChecked, step, handlePrivyAuthComplete]);

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
  const checkUsernameQuery = { enabled: debouncedUsername.length > 2 && step === 6 && !isOwnUsername };
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
    if (step < 7) {
      setDirection(1);
      setStep((step + 1) as Step);
    }
  };

  const prevStep = () => {
    if (step > 2) {
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

  const getPrivyWalletAddress = (): string | null => {
    if (!privyUser?.linkedAccounts) return null;
    const wallet = privyUser.linkedAccounts.find(
      (a: { type: string }) => a.type === "wallet"
    );
    return wallet && "address" in wallet ? (wallet as { address: string }).address : null;
  };

  const getPrivyId = (): string | null => {
    return privyUser?.id || null;
  };

  const handleComplete = () => {
    const privyId = getPrivyId();
    const walletAddress = getPrivyWalletAddress();
    const telegramId = getTelegramUser()?.id.toString() || null;

    completeMutation.mutate({
      data: {
        name: formData.name,
        username: formData.username,
        city: formData.city,
        country: formData.country,
        interests: formData.interests,
        role: formData.participation as "join" | "host" | "both",
        bio: formData.bio || null,
        telegram_id: telegramId,
        wallet_address: walletAddress,
      }
    }, {
      onSuccess: (res) => {
        if (res.session_token) {
          setSessionToken(res.session_token);
        }
        if (isEditMode) {
          setLocation("/home");
        } else {
          setLocation("/tutorial");
        }
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

  const totalSteps = 7;

  return (
    <div className="min-h-[100dvh] w-full bg-gradient-to-br from-pink-600 via-primary to-rose-600 flex flex-col items-center justify-end md:justify-center overflow-hidden font-sans relative">
      <FloatingEmojis step={step} />

      <div className="w-full max-w-md md:rounded-[2rem] rounded-t-[2.5rem] bg-white shadow-2xl relative z-10 flex flex-col min-h-[80dvh] max-h-[90dvh] md:h-[650px] md:min-h-0 md:max-h-none">

        <div className="absolute top-0 left-0 w-full p-4 md:p-6 z-20 flex justify-between items-center bg-white/80 backdrop-blur-md border-b border-gray-50/50">
          {step > 2 ? (
            <button
              onClick={prevStep}
              className="text-gray-400 hover:text-gray-800 transition-colors bg-gray-50 hover:bg-gray-100 rounded-full p-2 shadow-sm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          ) : <div className="w-10" />}

          <div className="flex gap-1.5 flex-1 mx-6">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((indicatorStep) => (
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
                <div className="flex flex-col h-full justify-center">
                  {checkingExisting ? (
                    <div className="text-center">
                      <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                      <h2 className="text-xl font-bold text-gray-900 mb-1">Checking your account...</h2>
                      <p className="text-gray-500 text-sm">Just a moment</p>
                    </div>
                  ) : (
                    <>
                      <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-primary/10 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-inner transform rotate-3">
                          ✨
                        </div>
                        <h1 className="text-2xl md:text-4xl font-display font-extrabold text-gray-900 mb-3 leading-tight">
                          Welcome to <span className="text-primary">experiences.fun</span>
                        </h1>
                        <p className="text-gray-500 text-base leading-relaxed px-2">
                          Join real-world experiences, connect with locals, and build your community reputation.
                        </p>
                      </div>
                      <div className="mt-auto space-y-3">
                        <Button
                          onClick={() => login()}
                          className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-2xl group shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                        >
                          <Mail className="w-5 h-5" />
                          Sign up / Log in
                        </Button>
                        <p className="text-center text-xs text-gray-400">
                          Email, wallet, or Telegram
                        </p>
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col h-full">
                  {authenticated && (
                    <div className="mb-4 bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-2">
                      <Check className="w-4 h-4 text-green-600 shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-700">Signed in</p>
                        {getPrivyWalletAddress() && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Wallet className="w-3 h-3" />
                            {getPrivyWalletAddress()?.slice(0, 6)}...{getPrivyWalletAddress()?.slice(-4)}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  <div>
                    <h2 className="text-xl md:text-2xl font-display font-bold text-gray-900 mb-1">Where are you based?</h2>
                    <p className="text-gray-500 text-sm mb-5">
                      We use your location to show nearby experiences.
                    </p>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1">City</label>
                        <Input
                          placeholder="e.g. London"
                          value={formData.city}
                          onChange={(e) => setFormData(p => ({ ...p, city: e.target.value }))}
                          className="h-12 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-primary text-base px-4 shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Country</label>
                        <Input
                          placeholder="e.g. United Kingdom"
                          value={formData.country}
                          onChange={(e) => setFormData(p => ({ ...p, country: e.target.value }))}
                          className="h-12 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-primary text-base px-4 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-4">
                    <Button
                      onClick={nextStep}
                      disabled={!formData.city.trim() || !formData.country.trim()}
                      className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col h-full">
                  <div>
                    <h2 className="text-xl md:text-2xl font-display font-bold text-gray-900 mb-1">What interests you?</h2>
                    <p className="text-gray-500 text-sm mb-4">
                      Select topics you'd love to explore or host.
                    </p>

                    <div className="grid grid-cols-2 gap-2 pb-2">
                      {INTERESTS.map((interest) => {
                        const isSelected = formData.interests.includes(interest.id);
                        return (
                          <button
                            key={interest.id}
                            onClick={() => handleInterestToggle(interest.id)}
                            className={cn(
                              "flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all duration-200 text-center relative overflow-hidden",
                              isSelected
                                ? "border-primary bg-primary/5 text-primary shadow-sm"
                                : "border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50"
                            )}
                          >
                            <span className="text-2xl mb-1 relative z-10">{interest.icon}</span>
                            <span className={cn(
                              "text-xs font-semibold leading-tight relative z-10",
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
                  <div className="mt-auto pt-3 bg-white">
                    <Button
                      onClick={nextStep}
                      disabled={formData.interests.length === 0}
                      className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
                    >
                      Continue ({formData.interests.length} selected)
                    </Button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div className="flex flex-col h-full">
                  <div>
                    <h2 className="text-xl md:text-2xl font-display font-bold text-gray-900 mb-4">How do you want to participate?</h2>

                    <div className="space-y-3">
                      {PARTICIPATION_OPTIONS.map((option) => {
                        const isSelected = formData.participation === option.id;
                        return (
                          <button
                            key={option.id}
                            onClick={() => {
                              setFormData(p => ({ ...p, participation: option.id }));
                              setTimeout(nextStep, 350);
                            }}
                            className={cn(
                              "w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group",
                              isSelected
                                ? "border-primary bg-primary/5 shadow-md scale-[1.02]"
                                : "border-gray-100 bg-white hover:border-primary/30 hover:bg-gray-50 hover:shadow-sm"
                            )}
                          >
                            <div>
                              <div className={cn(
                                "font-bold text-base mb-0.5 transition-colors",
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

              {step === 5 && (
                <div className="flex flex-col h-full">
                  <div className="text-center mb-4">
                    <div className="w-14 h-14 bg-primary/10 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                      <Wallet className="w-7 h-7 text-primary" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-display font-bold text-gray-900 mb-1">Your wallet is ready</h2>
                    <p className="text-gray-500 text-sm">
                      {getPrivyWalletAddress()
                        ? "An embedded wallet has been created for you automatically."
                        : "A wallet will be provisioned when you complete signup."
                      }
                    </p>
                  </div>

                  {getPrivyWalletAddress() && (
                    <div className="bg-gray-50 rounded-xl p-4 mb-4 border border-gray-100">
                      <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-1">Wallet Address</p>
                      <p className="text-sm font-mono text-gray-700 break-all">{getPrivyWalletAddress()}</p>
                    </div>
                  )}

                  <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
                    <p className="text-sm text-gray-600 leading-relaxed">
                      Your wallet stores <span className="font-bold text-primary">$EXP</span> tokens earned from experiences. No seed phrases needed — it's managed securely by Privy.
                    </p>
                  </div>

                  <div className="mt-auto pt-4">
                    <Button
                      onClick={nextStep}
                      className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 6 && (
                <div className="flex flex-col h-full">
                  <div>
                    <h2 className="text-xl md:text-2xl font-display font-bold text-gray-900 mb-1">Create your profile</h2>
                    <p className="text-gray-500 text-sm mb-4">
                      This is how the community will see you.
                    </p>

                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Display Name</label>
                        <Input
                          placeholder="Jane Doe"
                          value={formData.name}
                          onChange={(e) => setFormData(p => ({ ...p, name: e.target.value }))}
                          className="h-12 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-primary text-base px-4 shadow-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Username</label>
                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium text-base">@</span>
                          <Input
                            placeholder="janedoe"
                            value={formData.username}
                            onChange={(e) => setFormData(p => ({ ...p, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') }))}
                            className={cn(
                              "h-12 pl-8 bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-primary text-base pr-10 shadow-sm",
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
                      <div className="space-y-1.5">
                        <label className="text-sm font-semibold text-gray-700 ml-1">Short bio <span className="text-gray-400 font-normal">(optional)</span></label>
                        <Textarea
                          placeholder="Passionate about the environment..."
                          value={formData.bio}
                          onChange={(e) => setFormData(p => ({ ...p, bio: e.target.value }))}
                          className="min-h-[70px] resize-none bg-gray-50 border-gray-200 rounded-xl focus-visible:ring-primary p-3 shadow-sm text-sm"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="mt-auto pt-3 pb-1">
                    <Button
                      onClick={nextStep}
                      disabled={!formData.name.trim() || !formData.username.trim() || !!usernameError || isCheckingUsername}
                      className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50 disabled:shadow-none"
                    >
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {step === 7 && (
                <div className="flex flex-col h-full">
                  <div className="relative pt-6 flex-1 flex flex-col">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-3 bg-primary text-white font-bold px-3 py-1 rounded-full text-xs inline-flex items-center shadow-lg transform -rotate-3">
                      <span className="mr-1 text-sm">🌟</span> +50 XP Earned
                    </div>

                    <div className="text-center mb-4 mt-2">
                      <h2 className="text-2xl font-display font-bold text-gray-900 mb-1">You're all set!</h2>
                      <p className="text-gray-500 text-sm">
                        Experiences near {formData.city || "you"} happening soon.
                      </p>
                    </div>

                    <div className="space-y-2 flex-1 pb-2 px-1">
                      {RECOMMENDATIONS.map((rec, i) => (
                        <motion.div
                          key={rec.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 + i * 0.1 }}
                          className="p-3 rounded-xl border border-gray-100 shadow-sm bg-white hover:border-primary/20 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-gray-900 text-sm group-hover:text-primary transition-colors truncate">{rec.title}</h3>
                              <div className="flex text-xs text-gray-500 mt-1 gap-1.5 items-center">
                                <span className="flex items-center font-medium"><MapPin className="w-3 h-3 mr-0.5" /> {rec.location}</span>
                                <span className="text-gray-300">•</span>
                                <span className="font-medium">{rec.day}</span>
                              </div>
                            </div>
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0 ml-2">+{rec.xp} XP</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                  <div className="mt-auto pt-3 bg-white z-10">
                    <Button
                      onClick={handleComplete}
                      disabled={completeMutation.isPending}
                      className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 relative overflow-hidden group"
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

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
