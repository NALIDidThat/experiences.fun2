import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { MapPin, Calendar, Users, ArrowLeft, Loader2, Trophy, User, Share2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetExperience, useJoinExperience, useCompleteExperience } from "@workspace/api-client-react";
import { getAuthHeaders, isAuthenticated } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}

const CATEGORY_EMOJIS: Record<string, string> = {
  environmental: "🌿",
  education: "📚",
  community: "🤝",
  creative: "🎨",
  entrepreneurship: "🚀",
  health: "💪",
  tech: "💻",
  events: "🎉",
};

function XPLevelBadge({ xp }: { xp: number }) {
  const levels = [
    { min: 2500, label: "Legend", color: "text-amber-600 bg-amber-50 border-amber-200" },
    { min: 2000, label: "Leader", color: "text-purple-600 bg-purple-50 border-purple-200" },
    { min: 1500, label: "Champion", color: "text-blue-600 bg-blue-50 border-blue-200" },
    { min: 500, label: "Contributor", color: "text-primary bg-primary/5 border-primary/20" },
    { min: 0, label: "Explorer", color: "text-gray-500 bg-gray-50 border-gray-200" },
  ];
  const level = levels.find(l => xp >= l.min) || levels[levels.length - 1];
  return (
    <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", level.color)}>
      {level.label}
    </span>
  );
}

export default function ExperienceDetail() {
  const [, params] = useRoute("/experience/:id");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const id = Number(params?.id);

  const detailQuery = { enabled: !!id && !isNaN(id) };
  const { data: experience, isLoading, error } = useGetExperience(id, {
    query: detailQuery as typeof detailQuery & { queryKey: readonly unknown[] },
    request: { headers: getAuthHeaders() },
  });

  const joinMutation = useJoinExperience({ request: { headers: getAuthHeaders() } });
  const completeMutation = useCompleteExperience({ request: { headers: getAuthHeaders() } });

  const handleJoin = () => {
    joinMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
        queryClient.invalidateQueries({ queryKey: [`/api/experiences/${id}`] });
      },
    });
  };

  const handleComplete = () => {
    completeMutation.mutate({ id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
        queryClient.invalidateQueries({ queryKey: [`/api/experiences/${id}`] });
      },
    });
  };

  const handleShare = async () => {
    if (!experience) return;
    const shareData = {
      title: experience.title,
      text: `Join "${experience.title}" on experiences.fun — earn ${experience.xp_reward} XP!`,
      url: window.location.href,
    };
    if (navigator.share) {
      try { await navigator.share(shareData); } catch {}
    } else {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!experience || error) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
          <div className="text-5xl">🔍</div>
          <h2 className="text-xl font-bold text-gray-900">Experience not found</h2>
          <Button onClick={() => setLocation("/home")} className="rounded-xl bg-primary hover:bg-primary/90">
            Go Home
          </Button>
        </div>
      </Layout>
    );
  }

  const emoji = CATEGORY_EMOJIS[experience.category] || "📌";
  const isFull = experience.max_participants ? experience.participant_count >= experience.max_participants : false;
  const participantPct = experience.max_participants
    ? Math.min((experience.participant_count / experience.max_participants) * 100, 100)
    : null;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-28">
        {/* Hero */}
        <div className="h-64 bg-gradient-to-br from-primary via-pink-500 to-rose-500 relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,rgba(255,255,255,0.1)_0%,transparent_60%)]" />

          <button
            onClick={() => setLocation("/home")}
            className="absolute top-4 left-4 bg-black/20 backdrop-blur-md text-white rounded-full p-2.5 hover:bg-black/30 transition-colors z-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={handleShare}
            className="absolute top-4 right-4 bg-black/20 backdrop-blur-md text-white rounded-full p-2.5 hover:bg-black/30 transition-colors z-10"
          >
            <Share2 className="w-5 h-5" />
          </button>

          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-7xl mb-3 drop-shadow-lg">{emoji}</div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 px-4 pb-4 flex items-end justify-between">
            <span className={cn(
              "text-xs font-bold px-3 py-1 rounded-full backdrop-blur-sm border",
              experience.type === "personal"
                ? "bg-white/20 text-white border-white/30"
                : "bg-white/30 text-white border-white/40"
            )}>
              {experience.type === "personal" ? "Personal" : "Professional"}
            </span>
            <span className="text-sm font-bold text-white bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full border border-white/30">
              +{experience.xp_reward} XP
            </span>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-4 relative z-10">
          {/* Main Card */}
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 mb-3 overflow-hidden">
            <div className="p-5 md:p-6">
              <h1 className="text-xl md:text-2xl font-display font-bold text-gray-900 mb-2 leading-tight">
                {experience.title}
              </h1>
              <p className="text-gray-500 text-sm leading-relaxed mb-5 whitespace-pre-wrap">
                {experience.description}
              </p>

              {/* Info grid */}
              <div className="grid grid-cols-2 gap-2 mb-5">
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Calendar className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Date</div>
                    <div className="text-xs font-bold text-gray-900">{experience.date}</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Location</div>
                    <div className="text-xs font-bold text-gray-900">{experience.city}</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Category</div>
                    <div className="text-xs font-bold text-gray-900 capitalize">{experience.category}</div>
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">Reward</div>
                    <div className="text-xs font-bold text-primary">+{experience.xp_reward} XP</div>
                  </div>
                </div>
              </div>

              {/* Participants */}
              <div className="mb-1">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                    <Users className="w-4 h-4 text-primary" />
                    {experience.participant_count} joined
                    {experience.max_participants ? ` of ${experience.max_participants}` : ""}
                  </div>
                  {isFull && (
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      Full
                    </span>
                  )}
                </div>
                {participantPct !== null && (
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", isFull ? "bg-red-400" : "bg-primary")}
                      style={{ width: `${participantPct}%` }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Creator card */}
            <button
              onClick={() => setLocation(`/u/${experience.creator.username}`)}
              className="w-full border-t border-gray-50 px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50 transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-rose-500 text-white flex items-center justify-center font-bold text-sm shrink-0">
                {experience.creator.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left flex-1 min-w-0">
                <div className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  {experience.creator.name}
                  <span className="text-[10px] font-semibold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-md">Host</span>
                </div>
                <div className="text-xs text-primary font-medium">@{experience.creator.username}</div>
              </div>
              <User className="w-4 h-4 text-gray-300 shrink-0" />
            </button>
          </div>

          {/* Action card */}
          {isAuthenticated() && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              {!experience.joined && (
                <Button
                  onClick={handleJoin}
                  disabled={joinMutation.isPending || isFull}
                  className="w-full h-14 text-base bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 font-semibold"
                >
                  {joinMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isFull ? (
                    "Experience is full"
                  ) : (
                    <>Join Experience — +{experience.xp_reward} XP</>
                  )}
                </Button>
              )}

              {experience.joined && experience.participation_status === "joined" && (
                <Button
                  onClick={handleComplete}
                  disabled={completeMutation.isPending}
                  className="w-full h-14 text-base bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 font-semibold"
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Trophy className="w-5 h-5 mr-2" />
                      Mark Complete — +{experience.xp_reward} XP
                    </>
                  )}
                </Button>
              )}

              {experience.joined && experience.participation_status === "completed" && (
                <div className="text-center py-2">
                  <div className="text-3xl mb-2">🎉</div>
                  <p className="text-primary font-bold text-lg">Completed!</p>
                  <p className="text-gray-500 text-sm">+{experience.xp_reward} XP earned</p>
                </div>
              )}

              {completeMutation.isSuccess && (
                <p className="text-primary text-sm text-center mt-3 font-semibold">
                  +{completeMutation.data.xp_earned} XP earned — Total: {completeMutation.data.total_xp} XP
                </p>
              )}
              {joinMutation.isError && (
                <p className="text-red-500 text-sm text-center mt-3">
                  Could not join. You may have already joined.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
