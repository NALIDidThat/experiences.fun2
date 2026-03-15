import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Compass, MapPin, Users, Plus, Loader2, Rocket, Map, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useListExperiences, useGetCurrentUser } from "@workspace/api-client-react";
import { getAuthHeaders, isAuthenticated } from "@/lib/auth";

const CATEGORIES = [
  { id: "all", label: "All", icon: "✨" },
  { id: "environmental", label: "Environmental", icon: "🌿" },
  { id: "education", label: "Education", icon: "📚" },
  { id: "community", label: "Community", icon: "🤝" },
  { id: "creative", label: "Creative", icon: "🎨" },
  { id: "entrepreneurship", label: "Startup", icon: "🚀" },
  { id: "health", label: "Health", icon: "💪" },
  { id: "tech", label: "Tech", icon: "💻" },
  { id: "events", label: "Events", icon: "🎉" },
];

const TYPE_FILTERS = [
  { id: "all", label: "All" },
  { id: "personal", label: "Personal" },
  { id: "professional", label: "Professional" },
];

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

interface ForYouExp {
  id: number;
  title: string;
  type: string;
  category: string;
  date: string;
  city: string;
  xp_reward: number;
  participant_count: number;
  max_participants: number | null | undefined;
  creator_name: string;
  creator_username: string;
  fit_score: number;
  fit_reason: string;
}

function useForYouExperiences(enabled: boolean) {
  const [data, setData] = useState<ForYouExp[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    setIsLoading(true);
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/experiences/for-you`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { setData(d.experiences || []); setError(null); })
      .catch(() => setError("Could not load recommendations"))
      .finally(() => setIsLoading(false));
  }, [enabled]);

  return { data, isLoading, error };
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"discover" | "for-you">("discover");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const auth = isAuthenticated();
  const meQuery = { enabled: auth };
  const meResult = useGetCurrentUser({
    query: meQuery as typeof meQuery & { queryKey: readonly unknown[] },
    request: { headers: getAuthHeaders() },
  });

  const userCity = meResult.data?.city;

  const listQuery = { enabled: true, refetchOnMount: true as const };
  const experiencesResult = useListExperiences(
    {
      ...(userCity ? { city: userCity } : {}),
      ...(typeFilter !== "all" ? { type: typeFilter as "personal" | "professional" } : {}),
      ...(categoryFilter !== "all" ? { category: categoryFilter } : {}),
    },
    {
      query: listQuery as typeof listQuery & { queryKey: readonly unknown[] },
      request: { headers: getAuthHeaders() },
    }
  );

  const forYou = useForYouExperiences(auth && activeTab === "for-you");

  const experiences = experiencesResult.data?.experiences || [];
  const isLoading = experiencesResult.isLoading;

  return (
    <Layout>

      <div className="min-h-screen bg-gray-50 pb-24">
        {/* Token Launch Banner */}
        <button
          onClick={() => setLocation("/token")}
          className="w-full bg-gradient-to-r from-[#f20789] to-rose-500 px-4 py-3 flex items-center justify-between gap-3 text-white hover:opacity-95 transition-all"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-xl shrink-0">🪙</span>
            <div className="text-left">
              <p className="text-xs font-bold leading-tight">$EXP Token — Coming Soon</p>
              <p className="text-white/70 text-[11px] leading-tight">Your XP converts to real tokens at launch</p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-white/80 text-xs font-semibold shrink-0">
            <Rocket className="w-3.5 h-3.5" />
            Learn More
          </div>
        </button>

        <div className="px-4 pt-5 pb-0 max-w-2xl mx-auto">
          <header className="mb-5 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Discover</h1>
              {userCity && (
                <p className="text-gray-500 flex items-center gap-1 text-sm">
                  <MapPin className="w-4 h-4" /> {userCity}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setLocation("/map")}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white border border-gray-200 text-gray-500 hover:border-primary/30 hover:text-primary transition-all"
                title="Map view"
              >
                <Map className="w-4 h-4" />
              </button>
              <Button
                onClick={() => setLocation("/create")}
                className="rounded-2xl bg-primary hover:bg-primary/90 h-10 px-4 shadow-lg shadow-primary/25 text-sm"
              >
                <Plus className="w-4 h-4 mr-1" />
                Create
              </Button>
            </div>
          </header>

          {/* Tabs */}
          <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab("discover")}
              className={cn(
                "flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all",
                activeTab === "discover" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              Explore
            </button>
            {auth && (
              <button
                onClick={() => setActiveTab("for-you")}
                className={cn(
                  "flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5",
                  activeTab === "for-you" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                For You
              </button>
            )}
          </div>

          {/* Discover tab */}
          {activeTab === "discover" && (
            <>
              <div className="flex gap-2 mb-3 flex-wrap">
                {TYPE_FILTERS.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setTypeFilter(f.id)}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                      typeFilter === f.id
                        ? "bg-primary text-white shadow-sm"
                        : "bg-white text-gray-500 border border-gray-200 hover:border-primary/30"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 mb-5 flex-wrap">
                {CATEGORIES.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCategoryFilter(c.id)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1",
                      categoryFilter === c.id
                        ? "bg-primary/10 text-primary border border-primary/20"
                        : "bg-white text-gray-500 border border-gray-100 hover:border-gray-200"
                    )}
                  >
                    <span>{c.icon}</span> {c.label}
                  </button>
                ))}
              </div>

              {isLoading && (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              {!isLoading && experiences.length === 0 && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
                  <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
                    <Compass className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">No experiences yet</h2>
                  <p className="text-gray-500 max-w-xs mx-auto mb-5 text-sm">
                    Be the first to create an experience in {userCity || "your city"}!
                  </p>
                  <Button onClick={() => setLocation("/create")} className="rounded-xl bg-primary hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Experience
                  </Button>
                </div>
              )}

              {!isLoading && experiences.length > 0 && (
                <div className="space-y-3">
                  {experiences.map((exp) => (
                    <ExperienceCard key={exp.id} exp={exp} onClick={() => setLocation(`/experience/${exp.id}`)} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* For You tab */}
          {activeTab === "for-you" && (
            <>
              <div className="flex items-center gap-2 mb-4 bg-primary/5 border border-primary/10 rounded-xl px-3 py-2.5">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs text-primary/80 font-medium">
                  Personalized picks based on your interests, city, and experience history
                </p>
              </div>

              {forYou.isLoading && (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                  <p className="text-sm text-gray-400">AI is personalizing your feed…</p>
                </div>
              )}

              {forYou.error && (
                <div className="text-center py-8 text-gray-500 text-sm">{forYou.error}</div>
              )}

              {!forYou.isLoading && forYou.data && forYou.data.length === 0 && (
                <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center">
                  <div className="text-4xl mb-3">✨</div>
                  <h2 className="text-lg font-bold text-gray-900 mb-2">You've explored everything!</h2>
                  <p className="text-gray-500 text-sm mb-4">Join or create new experiences to keep growing.</p>
                  <Button onClick={() => setLocation("/create")} className="rounded-xl bg-primary hover:bg-primary/90">
                    Create Experience
                  </Button>
                </div>
              )}

              {!forYou.isLoading && forYou.data && forYou.data.length > 0 && (
                <div className="space-y-3">
                  {forYou.data.map((exp) => (
                    <div key={exp.id} className="relative">
                      <ExperienceCard exp={exp} onClick={() => setLocation(`/experience/${exp.id}`)} />
                      {exp.fit_reason && (
                        <div className="absolute top-3 right-3 max-w-[160px]">
                          <div className="bg-primary text-white text-[10px] font-semibold px-2 py-1 rounded-lg shadow-sm">
                            ✨ {exp.fit_reason}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ExperienceCard({ exp, onClick }: {
  exp: {
    id: number;
    title: string;
    type: string;
    category: string;
    date: string;
    city: string;
    xp_reward: number;
    participant_count: number;
    max_participants?: number | null;
    creator_username: string;
  };
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0 pr-3">
          <h3 className="font-bold text-gray-900 text-base group-hover:text-primary transition-colors truncate">
            {exp.title}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">by @{exp.creator_username}</p>
        </div>
        <span
          className={cn(
            "text-xs font-bold px-2.5 py-1 rounded-full shrink-0",
            exp.type === "personal"
              ? "bg-primary/5 text-primary/70 border border-primary/15"
              : "bg-primary/10 text-primary border border-primary/20"
          )}
        >
          {exp.type === "personal" ? "Personal" : "Professional"}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm flex-wrap">
        <span className="capitalize bg-gray-50 px-2.5 py-1 rounded-lg font-medium text-gray-600 text-xs">
          {CATEGORIES.find(c => c.id === exp.category)?.icon || "📌"} {exp.category}
        </span>
        <span className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg font-medium text-gray-600 text-xs">
          <MapPin className="w-3 h-3" /> {exp.city}
        </span>
        <span className="bg-gray-50 px-2.5 py-1 rounded-lg font-medium text-gray-600 text-xs">{exp.date}</span>
        <span className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg font-medium text-gray-600 text-xs">
          <Users className="w-3 h-3" /> {exp.participant_count}{exp.max_participants ? `/${exp.max_participants}` : ""}
        </span>
        <span className="font-bold text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/15 text-xs">
          +{exp.xp_reward} XP
        </span>
      </div>
    </button>
  );
}
