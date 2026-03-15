import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Rocket, Bell, BellOff, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAuthHeaders, isAuthenticated } from "@/lib/auth";

function useCountdown(targetDate: string | null) {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    if (!targetDate) return;
    const target = new Date(targetDate).getTime();
    const tick = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  return timeLeft;
}

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 md:w-20 md:h-20 bg-white/15 backdrop-blur-sm rounded-2xl flex items-center justify-center border border-white/20 mb-1.5">
        <span className="text-2xl md:text-3xl font-bold text-white tabular-nums">
          {String(value).padStart(2, "0")}
        </span>
      </div>
      <span className="text-white/60 text-[10px] font-semibold uppercase tracking-widest">{label}</span>
    </div>
  );
}

export default function Token() {
  const [, setLocation] = useLocation();
  const [tokenInterest, setTokenInterest] = useState(false);
  const [launchDate, setLaunchDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notifying, setNotifying] = useState(false);
  const timeLeft = useCountdown(launchDate);

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/token/status`, {
      headers: getAuthHeaders(),
    })
      .then(r => r.json())
      .then(data => {
        setLaunchDate(data.launch_date);
        setTokenInterest(data.token_interest);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleNotifyMe = async () => {
    if (!isAuthenticated()) { setLocation("/"); return; }
    setNotifying(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      await fetch(`${base}/api/token/notify-me`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      });
      setTokenInterest(true);
    } catch {}
    setNotifying(false);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-b from-[#f20789] via-pink-600 to-rose-700 relative overflow-hidden pb-24">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.07)_0%,transparent_70%)] pointer-events-none" />
        <div className="absolute top-1/4 -left-24 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 -right-16 w-72 h-72 bg-rose-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-lg mx-auto px-5 pt-12 pb-8 relative z-10">
          <button
            onClick={() => setLocation("/home")}
            className="mb-8 bg-white/15 backdrop-blur-sm text-white rounded-full p-2.5 hover:bg-white/25 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-white/15 backdrop-blur-sm rounded-3xl flex items-center justify-center mx-auto mb-5 border border-white/20 text-4xl">
              🪙
            </div>
            <div className="text-white/50 text-xs font-semibold tracking-widest uppercase mb-2">Coming Soon</div>
            <h1 className="text-4xl font-extrabold text-white leading-tight mb-3">
              $EXP Token
            </h1>
            <p className="text-white/65 text-base leading-relaxed max-w-sm mx-auto">
              Every XP point you've earned on experiences.fun will convert to real $EXP tokens at launch. Your reputation becomes your stake.
            </p>
          </div>

          {!loading && (
            <div className="mb-10">
              {launchDate && timeLeft ? (
                <div>
                  <p className="text-white/50 text-xs font-semibold tracking-widest uppercase text-center mb-4">Launching in</p>
                  <div className="flex justify-center gap-3">
                    <CountdownUnit value={timeLeft.days} label="Days" />
                    <CountdownUnit value={timeLeft.hours} label="Hours" />
                    <CountdownUnit value={timeLeft.minutes} label="Mins" />
                    <CountdownUnit value={timeLeft.seconds} label="Secs" />
                  </div>
                </div>
              ) : (
                <div className="text-center">
                  <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 text-white/80 text-sm font-medium px-5 py-2.5 rounded-full">
                    <Rocket className="w-4 h-4" />
                    Launching Soon
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">⭐</span>
              <div>
                <p className="text-white font-semibold text-sm mb-0.5">Your XP = Your Tokens</p>
                <p className="text-white/55 text-xs leading-relaxed">Every XP you've earned by completing experiences converts 1:1 into $EXP at launch.</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">🌍</span>
              <div>
                <p className="text-white font-semibold text-sm mb-0.5">Community-Owned</p>
                <p className="text-white/55 text-xs leading-relaxed">$EXP will govern the platform — vote on new categories, featured experiences, and network growth.</p>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4 flex items-start gap-3">
              <span className="text-xl shrink-0">🚀</span>
              <div>
                <p className="text-white font-semibold text-sm mb-0.5">Early Access Bonus</p>
                <p className="text-white/55 text-xs leading-relaxed">Users who opt in early get a 10% allocation bonus applied to their final token count.</p>
              </div>
            </div>
          </div>

          <div className="mt-8 space-y-3">
            {isAuthenticated() && (
              <Button
                onClick={handleNotifyMe}
                disabled={tokenInterest || notifying}
                className="w-full h-14 text-base font-bold bg-white hover:bg-white/95 text-[#f20789] rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] transition-all"
              >
                {notifying ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : tokenInterest ? (
                  <><BellOff className="w-5 h-5 mr-2" /> You're on the list!</>
                ) : (
                  <><Bell className="w-5 h-5 mr-2" /> Notify Me at Launch</>
                )}
              </Button>
            )}
            <a
              href="https://x.com/experiencesfun"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full h-12 text-sm font-semibold text-white bg-white/10 hover:bg-white/15 border border-white/20 rounded-2xl transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Follow on X for Updates
            </a>
          </div>
        </div>
      </div>
    </Layout>
  );
}
