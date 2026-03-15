import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { MapPin, Calendar, Users, ArrowLeft, Loader2, Trophy, User, Share2, Clock, Copy, Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetExperience, useJoinExperience, useCompleteExperience, useListExperiences } from "@workspace/api-client-react";
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

const CATEGORY_GRADIENTS: Record<string, string> = {
  environmental: "from-emerald-500 via-teal-500 to-cyan-600",
  education: "from-blue-500 via-indigo-500 to-violet-600",
  community: "from-amber-500 via-orange-500 to-red-500",
  creative: "from-fuchsia-500 via-purple-500 to-indigo-600",
  entrepreneurship: "from-orange-500 via-red-500 to-rose-600",
  health: "from-green-500 via-emerald-500 to-teal-600",
  tech: "from-cyan-500 via-blue-500 to-indigo-600",
  events: "from-pink-500 via-rose-500 to-red-600",
};

function getCountdownText(dateStr: string): { text: string; urgency: "past" | "today" | "soon" | "future" } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: "Today!", urgency: "today" };
  if (diffDays === 1) return { text: "Tomorrow", urgency: "soon" };
  if (diffDays > 1 && diffDays <= 7) return { text: `${diffDays} days away`, urgency: "soon" };
  if (diffDays > 7) return { text: `${diffDays} days away`, urgency: "future" };
  if (diffDays === -1) return { text: "Yesterday", urgency: "past" };
  return { text: `${Math.abs(diffDays)} days ago`, urgency: "past" };
}

function ShareSheet({ open, onClose, experience }: {
  open: boolean;
  onClose: () => void;
  experience: { title: string; date: string; xp_reward: number };
}) {
  const [copied, setCopied] = useState(false);
  const url = window.location.href;
  const text = `Join "${experience.title}" on experiences.fun — earn ${experience.xp_reward} XP! 🎯`;
  const fullText = `${text}\n📅 ${experience.date}\n👉 ${url}`;

  const handleTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(fullText)}`;
    window.open(telegramUrl, "_blank");
    onClose();
  };

  const handleX = () => {
    const xUrl = `https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    window.open(xUrl, "_blank");
    onClose();
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => { setCopied(false); onClose(); }, 1200);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-lg bg-white rounded-t-3xl p-5 pb-8 animate-in slide-in-from-bottom duration-300"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />
        <h3 className="text-lg font-bold text-gray-900 mb-4">Share this experience</h3>
        <div className="space-y-2">
          <button
            onClick={handleTelegram}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-[#0088cc]/5 hover:bg-[#0088cc]/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0088cc] flex items-center justify-center text-white text-lg">✈️</div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-gray-900">Share on Telegram</p>
              <p className="text-xs text-gray-500">Send to a friend or group</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={handleX}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-black/5 hover:bg-black/10 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center text-white text-sm font-bold">𝕏</div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-gray-900">Share on X</p>
              <p className="text-xs text-gray-500">Post to your followers</p>
            </div>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
          <button
            onClick={handleCopy}
            className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-gray-50 hover:bg-gray-100 transition-colors"
          >
            <div className="w-10 h-10 rounded-xl bg-gray-200 flex items-center justify-center text-gray-600">
              {copied ? <Check className="w-5 h-5 text-green-600" /> : <Copy className="w-5 h-5" />}
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold text-gray-900">{copied ? "Link copied!" : "Copy Link"}</p>
              <p className="text-xs text-gray-500">{copied ? "Ready to paste" : "Copy to clipboard"}</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function ParticipantAvatars({ participants, total }: {
  participants: { name: string; username: string }[];
  total: number;
}) {
  if (participants.length === 0) return null;
  const shown = participants.slice(0, 5);
  const remaining = total - shown.length;

  const colors = [
    "from-primary to-rose-500",
    "from-blue-500 to-cyan-500",
    "from-amber-500 to-orange-500",
    "from-green-500 to-emerald-500",
    "from-purple-500 to-indigo-500",
  ];

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-2">
        {shown.map((p, i) => (
          <div
            key={p.username}
            className={cn(
              "w-8 h-8 rounded-full bg-gradient-to-br text-white flex items-center justify-center text-xs font-bold border-2 border-white",
              colors[i % colors.length]
            )}
          >
            {p.name.charAt(0).toUpperCase()}
          </div>
        ))}
        {remaining > 0 && (
          <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-500 flex items-center justify-center text-[10px] font-bold border-2 border-white">
            +{remaining}
          </div>
        )}
      </div>
      <span className="text-xs text-gray-500 font-medium ml-1">
        {total === 1 ? "1 person joined" : `${total} people joined`}
      </span>
    </div>
  );
}

function CompactExperienceCard({ exp, onClick }: {
  exp: {
    id: number;
    title: string;
    category: string;
    date: string;
    city: string;
    xp_reward: number;
    participant_count: number;
    max_participants?: number | null;
  };
  onClick: () => void;
}) {
  const emoji = CATEGORY_EMOJIS[exp.category] || "📌";
  const gradient = CATEGORY_GRADIENTS[exp.category] || "from-primary via-pink-500 to-rose-500";

  return (
    <button
      onClick={onClick}
      className="shrink-0 w-56 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all overflow-hidden text-left"
    >
      <div className={cn("h-20 bg-gradient-to-br relative", gradient)}>
        <div className="absolute inset-0 flex items-center justify-center text-3xl">{emoji}</div>
        <span className="absolute bottom-2 right-2 text-[10px] font-bold text-white bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
          +{exp.xp_reward} XP
        </span>
      </div>
      <div className="p-3">
        <h4 className="text-sm font-bold text-gray-900 truncate mb-1">{exp.title}</h4>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <Calendar className="w-3 h-3" /> {exp.date}
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500 mt-0.5">
          <Users className="w-3 h-3" /> {exp.participant_count}{exp.max_participants ? `/${exp.max_participants}` : ""}
        </div>
      </div>
    </button>
  );
}

export default function ExperienceDetail() {
  const [, params] = useRoute("/experience/:id");
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const id = Number(params?.id);
  const [shareOpen, setShareOpen] = useState(false);
  const [showCompleteAnim, setShowCompleteAnim] = useState(false);

  const detailQuery = { enabled: !!id && !isNaN(id) };
  const { data: experience, isLoading, error } = useGetExperience(id, {
    query: detailQuery as typeof detailQuery & { queryKey: readonly unknown[] },
    request: { headers: getAuthHeaders() },
  });

  const relatedQuery = {
    enabled: !!experience,
    refetchOnMount: true as const,
  };
  const relatedResult = useListExperiences(
    experience ? { category: experience.category, city: experience.city } : {},
    {
      query: relatedQuery as typeof relatedQuery & { queryKey: readonly unknown[] },
      request: { headers: getAuthHeaders() },
    }
  );
  const relatedExperiences = (relatedResult.data?.experiences || []).filter(e => e.id !== id).slice(0, 8);

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
        setShowCompleteAnim(true);
        setTimeout(() => setShowCompleteAnim(false), 3000);
        queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
        queryClient.invalidateQueries({ queryKey: [`/api/experiences/${id}`] });
      },
    });
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
  const gradient = CATEGORY_GRADIENTS[experience.category] || "from-primary via-pink-500 to-rose-500";
  const isFull = experience.max_participants ? experience.participant_count >= experience.max_participants : false;
  const participantPct = experience.max_participants
    ? Math.min((experience.participant_count / experience.max_participants) * 100, 100)
    : null;
  const spotsLeft = experience.max_participants ? experience.max_participants - experience.participant_count : null;
  const countdown = getCountdownText(experience.date);
  const completionCount = experience.completion_count ?? 0;
  const participants = experience.participants ?? [];

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-28">
        <div className={cn("h-56 bg-gradient-to-br relative overflow-hidden", gradient)}>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_60%,rgba(255,255,255,0.15)_0%,transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.1)_0%,transparent_50%)]" />

          <button
            onClick={() => setLocation("/home")}
            className="absolute top-4 left-4 bg-black/20 backdrop-blur-md text-white rounded-full p-2.5 hover:bg-black/30 transition-colors z-10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <button
            onClick={() => setShareOpen(true)}
            className="absolute top-4 right-4 bg-black/20 backdrop-blur-md text-white rounded-full p-2.5 hover:bg-black/30 transition-colors z-10"
          >
            <Share2 className="w-5 h-5" />
          </button>

          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
            <div className="text-6xl mb-3 drop-shadow-lg">{emoji}</div>
            <h1 className="text-xl md:text-2xl font-display font-bold text-white drop-shadow-md leading-tight max-w-md">
              {experience.title}
            </h1>
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
          <div className="bg-white rounded-3xl shadow-lg border border-gray-100 mb-3 overflow-hidden">
            <div className="p-5 md:p-6">
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className={cn(
                  "text-xs font-bold px-3 py-1 rounded-full",
                  countdown.urgency === "today" ? "bg-green-100 text-green-700" :
                  countdown.urgency === "soon" ? "bg-amber-100 text-amber-700" :
                  countdown.urgency === "past" ? "bg-gray-100 text-gray-500" :
                  "bg-blue-100 text-blue-700"
                )}>
                  <Clock className="w-3 h-3 inline mr-1" />
                  {countdown.text}
                </span>
                {completionCount > 0 && (
                  <span className="text-xs font-medium text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                    {completionCount} completed · {experience.participant_count} joined
                  </span>
                )}
              </div>

              <p className="text-gray-500 text-sm leading-relaxed mb-5 whitespace-pre-wrap">
                {experience.description}
              </p>

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
                    <div className="text-xs font-bold text-gray-900">
                      {experience.city}{experience.country ? `, ${experience.country}` : ""}
                    </div>
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

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5 text-sm text-gray-600 font-medium">
                    <Users className="w-4 h-4 text-primary" />
                    {experience.participant_count} joined
                    {experience.max_participants ? ` of ${experience.max_participants}` : ""}
                  </div>
                  {isFull ? (
                    <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                      Full
                    </span>
                  ) : spotsLeft !== null ? (
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                      {spotsLeft} {spotsLeft === 1 ? "spot" : "spots"} left
                    </span>
                  ) : null}
                </div>
                {participantPct !== null && (
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-500",
                        isFull ? "bg-red-400" : participantPct > 75 ? "bg-amber-400" : "bg-primary"
                      )}
                      style={{ width: `${participantPct}%` }}
                    />
                  </div>
                )}
              </div>

              <ParticipantAvatars participants={participants} total={experience.participant_count} />
            </div>

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

          {isAuthenticated() && (
            <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-3">
              {showCompleteAnim && (
                <div className="text-center py-3 mb-3 animate-in fade-in zoom-in duration-500">
                  <div className="text-5xl mb-2">🎉</div>
                  <p className="text-primary font-bold text-lg">Amazing work!</p>
                </div>
              )}

              {!experience.joined && (
                <>
                  <div className="text-center mb-3">
                    {experience.participant_count > 0 && (
                      <p className="text-sm text-gray-500 mb-1">
                        Join {experience.participant_count} {experience.participant_count === 1 ? "other" : "others"}
                      </p>
                    )}
                    <p className="text-xs text-gray-400">
                      You'll earn +{experience.xp_reward} XP for completing this
                    </p>
                  </div>
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
                </>
              )}

              {experience.joined && experience.participation_status === "joined" && (
                <>
                  <div className="text-center mb-3">
                    <p className="text-xs text-gray-400">
                      Complete to earn +{experience.xp_reward} XP
                    </p>
                  </div>
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
                </>
              )}

              {experience.joined && experience.participation_status === "completed" && !showCompleteAnim && (
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

          {relatedExperiences.length > 0 && (
            <div className="mt-6 mb-4">
              <h3 className="text-base font-bold text-gray-900 mb-3 px-1">
                More in {experience.category.charAt(0).toUpperCase() + experience.category.slice(1)}
              </h3>
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {relatedExperiences.map(exp => (
                  <CompactExperienceCard
                    key={exp.id}
                    exp={exp}
                    onClick={() => setLocation(`/experience/${exp.id}`)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <ShareSheet
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        experience={experience}
      />
    </Layout>
  );
}
