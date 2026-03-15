import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Compass, MapPin, Users, Plus, Loader2, Sparkles, Bot } from "lucide-react";
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

export default function Experiences() {
  const [, setLocation] = useLocation();
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

  const experiences = experiencesResult.data?.experiences || [];
  const isLoading = experiencesResult.isLoading;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-display font-bold text-gray-900">Experiences</h1>
              {userCity && (
                <p className="text-gray-500 flex items-center gap-1 text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5" /> {userCity}
                </p>
              )}
            </div>
            <Button
              onClick={() => setLocation("/create")}
              className="rounded-2xl bg-primary hover:bg-primary/90 h-9 px-4 shadow-md shadow-primary/20 text-sm"
            >
              <Plus className="w-4 h-4 mr-1" />
              Create
            </Button>
          </div>

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

          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide mb-4">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                  categoryFilter === cat.id
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "bg-white text-gray-500 border border-gray-200 hover:border-gray-300"
                )}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : experiences.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm text-center">
              <div className="w-14 h-14 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Compass className="w-7 h-7 text-gray-300" />
              </div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">No experiences found</h3>
              <p className="text-sm text-gray-500 mb-5">
                Try adjusting your filters or create your own experience.
              </p>
              <Button
                onClick={() => setLocation("/create")}
                className="rounded-xl bg-primary hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Experience
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {experiences.map((exp: any) => (
                <button
                  key={exp.id}
                  onClick={() => setLocation(`/experience/${exp.id}`)}
                  className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">
                        {CATEGORIES.find((c) => c.id === exp.category)?.icon || "📌"}
                      </span>
                      <h3 className="font-bold text-gray-900">{exp.title}</h3>
                    </div>
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ml-2",
                        exp.type === "personal"
                          ? "bg-primary/5 text-primary/70 border border-primary/15"
                          : "bg-primary/10 text-primary border border-primary/20"
                      )}
                    >
                      {exp.type === "personal" ? "Personal" : "Professional"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                    <span className="capitalize bg-gray-50 px-2 py-0.5 rounded text-gray-600 font-medium">
                      {exp.category}
                    </span>
                    <span className="bg-gray-50 px-2 py-0.5 rounded text-gray-600 font-medium">
                      {exp.date}
                    </span>
                    <span className="bg-gray-50 px-2 py-0.5 rounded text-gray-600 font-medium flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {exp.city}
                    </span>
                    <span className="font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded text-xs">
                      +{exp.xp_reward} XP
                    </span>
                    {exp.participant_count > 0 && (
                      <span className="bg-gray-50 px-2 py-0.5 rounded text-gray-600 font-medium flex items-center gap-1">
                        <Users className="w-3 h-3" /> {exp.participant_count}
                      </span>
                    )}
                  </div>
                  {exp.creator_name && (
                    <p className="text-xs text-gray-400 mt-2">
                      by @{exp.creator_username || exp.creator_name}
                    </p>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
