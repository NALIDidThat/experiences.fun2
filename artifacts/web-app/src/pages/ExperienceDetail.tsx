import { useRoute, useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { MapPin, Calendar, Users, ArrowLeft, Loader2, Trophy, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetExperience, useJoinExperience, useCompleteExperience } from "@workspace/api-client-react";
import { getAuthHeaders, isAuthenticated } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
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

  const joinMutation = useJoinExperience({
    request: { headers: getAuthHeaders() },
  });

  const completeMutation = useCompleteExperience({
    request: { headers: getAuthHeaders() },
  });

  const handleJoin = () => {
    joinMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
        },
      }
    );
  };

  const handleComplete = () => {
    completeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["/api/experiences"] });
        },
      }
    );
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
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Experience not found</h2>
          <Button onClick={() => setLocation("/home")} className="rounded-xl bg-primary hover:bg-primary/90">
            Go Home
          </Button>
        </div>
      </Layout>
    );
  }

  const isFull = experience.max_participants
    ? experience.participant_count >= experience.max_participants
    : false;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="h-40 bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500 relative">
          <button
            onClick={() => setLocation("/home")}
            className="absolute top-4 left-4 bg-white/20 backdrop-blur-md text-white rounded-full p-2.5 hover:bg-white/30 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        <div className="max-w-2xl mx-auto px-4 -mt-12 relative z-10">
          <div className="bg-white rounded-3xl shadow-lg p-6 border border-gray-100 mb-6">
            <div className="flex items-start justify-between mb-4">
              <span
                className={cn(
                  "text-xs font-bold px-3 py-1.5 rounded-full",
                  experience.type === "personal"
                    ? "bg-blue-50 text-blue-600 border border-blue-100"
                    : "bg-purple-50 text-purple-600 border border-purple-100"
                )}
              >
                {experience.type === "personal" ? "Personal" : "Professional"}
              </span>
              <span className="text-sm font-bold text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full border border-amber-100">
                +{experience.xp_reward} XP
              </span>
            </div>

            <h1 className="text-2xl font-display font-bold text-gray-900 mb-3">
              {experience.title}
            </h1>

            <p className="text-gray-600 leading-relaxed mb-6 whitespace-pre-wrap">
              {experience.description}
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
                <Calendar className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Date</div>
                  <div className="text-sm font-bold text-gray-900">{experience.date}</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Location</div>
                  <div className="text-sm font-bold text-gray-900">{experience.city}</div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
                <Users className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Participants</div>
                  <div className="text-sm font-bold text-gray-900">
                    {experience.participant_count}
                    {experience.max_participants ? ` / ${experience.max_participants}` : ""}
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <div className="text-xs text-gray-400 font-semibold uppercase">Category</div>
                  <div className="text-sm font-bold text-gray-900 capitalize">{experience.category}</div>
                </div>
              </div>
            </div>

            <button
              onClick={() => setLocation(`/u/${experience.creator.username}`)}
              className="w-full bg-gray-50 rounded-xl p-4 flex items-center gap-3 hover:bg-gray-100 transition-colors"
            >
              <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                {experience.creator.name.charAt(0).toUpperCase()}
              </div>
              <div className="text-left">
                <div className="text-sm font-bold text-gray-900">{experience.creator.name}</div>
                <div className="text-xs text-primary font-medium">@{experience.creator.username}</div>
              </div>
              <User className="w-4 h-4 text-gray-400 ml-auto" />
            </button>
          </div>

          {isAuthenticated() && (
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              {!experience.joined && (
                <Button
                  onClick={handleJoin}
                  disabled={joinMutation.isPending || isFull}
                  className="w-full h-14 text-lg bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25"
                >
                  {joinMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isFull ? (
                    "Experience is full"
                  ) : (
                    "Join Experience"
                  )}
                </Button>
              )}

              {experience.joined && experience.participation_status === "joined" && (
                <Button
                  onClick={handleComplete}
                  disabled={completeMutation.isPending}
                  className="w-full h-14 text-lg bg-green-600 hover:bg-green-700 text-white rounded-2xl shadow-lg shadow-green-500/25"
                >
                  {completeMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Trophy className="w-5 h-5 mr-2" />
                      Mark as Complete (+{experience.xp_reward} XP)
                    </>
                  )}
                </Button>
              )}

              {experience.joined && experience.participation_status === "completed" && (
                <div className="text-center py-3">
                  <span className="text-green-600 font-bold text-lg flex items-center justify-center gap-2">
                    <Trophy className="w-5 h-5" /> Completed! +{experience.xp_reward} XP earned
                  </span>
                </div>
              )}

              {joinMutation.isError && (
                <p className="text-red-500 text-sm text-center mt-3">
                  Failed to join. You may have already joined.
                </p>
              )}

              {completeMutation.isSuccess && (
                <p className="text-green-600 text-sm text-center mt-3 font-semibold">
                  +{completeMutation.data.xp_earned} XP earned! Total: {completeMutation.data.total_xp} XP
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
