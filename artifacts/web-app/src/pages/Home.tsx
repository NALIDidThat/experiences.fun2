import { useState } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Compass, MapPin, Users, Plus, Loader2 } from "lucide-react";
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

export default function Home() {
  const [, setLocation] = useLocation();
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");

  const meQuery = { enabled: isAuthenticated() };
  const meResult = useGetCurrentUser({
    query: meQuery as typeof meQuery & { queryKey: readonly unknown[] },
    request: { headers: getAuthHeaders() },
  });

  const userCity = meResult.data?.city;

  const listQuery = {
    enabled: true,
    refetchOnMount: true as const,
  };
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
      <div className="min-h-screen bg-gray-50 px-4 pt-6 pb-24 max-w-2xl mx-auto">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-display font-bold text-gray-900 mb-1">Discover</h1>
            {userCity && (
              <p className="text-gray-500 flex items-center gap-1">
                <MapPin className="w-4 h-4" /> {userCity}
              </p>
            )}
          </div>
          <Button
            onClick={() => setLocation("/create")}
            className="rounded-2xl bg-primary hover:bg-primary/90 h-12 px-5 shadow-lg shadow-primary/25"
          >
            <Plus className="w-5 h-5 mr-1.5" />
            Create
          </Button>
        </header>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 -mx-1 px-1">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setTypeFilter(f.id)}
              className={cn(
                "px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all",
                typeFilter === f.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-500 border border-gray-200 hover:border-primary/30"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-6 overflow-x-auto pb-1 -mx-1 px-1">
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
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 text-center py-16">
            <div className="w-20 h-20 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-6">
              <Compass className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">No experiences yet</h2>
            <p className="text-gray-500 max-w-xs mx-auto mb-6">
              Be the first to create an experience in {userCity || "your city"}!
            </p>
            <Button
              onClick={() => setLocation("/create")}
              className="rounded-xl bg-primary hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Experience
            </Button>
          </div>
        )}

        {!isLoading && experiences.length > 0 && (
          <div className="space-y-3">
            {experiences.map((exp) => (
              <button
                key={exp.id}
                onClick={() => setLocation(`/experience/${exp.id}`)}
                className="w-full text-left bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900 text-lg group-hover:text-primary transition-colors truncate">
                      {exp.title}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      by @{exp.creator_username}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ml-3",
                      exp.type === "personal"
                        ? "bg-blue-50 text-blue-600 border border-blue-100"
                        : "bg-purple-50 text-purple-600 border border-purple-100"
                    )}
                  >
                    {exp.type === "personal" ? "Personal" : "Professional"}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg font-medium text-gray-600">
                    <MapPin className="w-3.5 h-3.5" /> {exp.city}
                  </span>
                  <span className="bg-gray-50 px-2.5 py-1 rounded-lg font-medium text-gray-600">
                    {exp.date}
                  </span>
                  <span className="flex items-center gap-1 bg-gray-50 px-2.5 py-1 rounded-lg font-medium text-gray-600">
                    <Users className="w-3.5 h-3.5" /> {exp.participant_count}
                    {exp.max_participants ? `/${exp.max_participants}` : ""}
                  </span>
                  <span className="font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                    +{exp.xp_reward} XP
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
