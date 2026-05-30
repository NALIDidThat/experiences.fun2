import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { motion } from "framer-motion";
import {
  Plus, Heart, MapPin, Users, CheckCircle, Star, AlertTriangle,
  Link, ExternalLink, Loader2, School, GraduationCap, Building2,
  BookOpen, Home, Globe
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { getAuthHeaders, getSessionToken } from "@/lib/auth";

interface NodeStats {
  total_experiences: number;
  total_participants: number;
  total_completions: number;
  total_xp_distributed: number;
  experiences: Array<{
    id: number;
    title: string;
    type: string;
    category: string;
    date: string;
    status: string;
    xp_reward: number;
    participant_count: number;
    completion_count: number;
  }>;
}

const NODE_TYPE_ICONS: Record<string, React.ReactNode> = {
  school: <School className="w-4 h-4" />,
  library: <BookOpen className="w-4 h-4" />,
  university: <GraduationCap className="w-4 h-4" />,
  company: <Building2 className="w-4 h-4" />,
  community_center: <Home className="w-4 h-4" />,
  city: <Globe className="w-4 h-4" />,
};

const NODE_TYPE_LABELS: Record<string, string> = {
  school: "School",
  library: "Library",
  university: "University",
  company: "Company",
  community_center: "Community Centre",
  city: "City / Region",
};

const NODE_TYPE_COLORS: Record<string, string> = {
  school: "bg-blue-100 text-blue-700",
  library: "bg-green-100 text-green-700",
  university: "bg-purple-100 text-purple-700",
  company: "bg-orange-100 text-orange-700",
  community_center: "bg-teal-100 text-teal-700",
  city: "bg-pink-100 text-pink-700",
};

function XPBar({ xp }: { xp: number }) {
  const level = Math.floor(xp / 500) + 1;
  const progress = ((xp % 500) / 500) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Level {level}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-primary rounded-full transition-all duration-700" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-xs text-gray-400 font-medium">{xp} XP</span>
    </div>
  );
}

export default function NodeDashboard() {
  const [, setLocation] = useLocation();
  const [stats, setStats] = useState<NodeStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [groupIdInput, setGroupIdInput] = useState("");
  const [linkingGroup, setLinkingGroup] = useState(false);
  const [showLinkGroupForm, setShowLinkGroupForm] = useState(false);

  const userResult = useGetCurrentUser({
    request: { headers: getAuthHeaders() }
  });
  const user = userResult.data;

  useEffect(() => {
    if (!getSessionToken()) {
      setLocation("/");
      return;
    }
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    fetch(`${base}/api/users/me/node-stats`, { headers: getAuthHeaders() })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setStats(data); })
      .catch(() => {})
      .finally(() => setStatsLoading(false));
  }, [setLocation]);

  const handleLinkGroup = async () => {
    if (!groupIdInput.trim()) return;
    setLinkingGroup(true);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${base}/api/users/me/link-group`, {
        method: "POST",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ telegram_group_id: groupIdInput.trim() }),
      });
      if (res.ok) {
        setShowLinkGroupForm(false);
        setGroupIdInput("");
        userResult.refetch();
      }
    } catch {}
    setLinkingGroup(false);
  };

  if (userResult.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    setLocation("/");
    return null;
  }

  const nodeTypeColor = NODE_TYPE_COLORS[user.node_type || ""] || "bg-gray-100 text-gray-700";
  const completionRate = stats && stats.total_participants > 0
    ? Math.round((stats.total_completions / stats.total_participants) * 100)
    : 0;

  const pendingExperiences = stats?.experiences.filter(e => {
    if (e.status !== "active") return false;
    const expDate = new Date(e.date);
    return expDate < new Date();
  }) ?? [];

  const activeExperiences = stats?.experiences.filter(e => e.status === "active") ?? [];
  const completedExperiences = stats?.experiences.filter(e => e.status === "completed") ?? [];
  const displayExperiences = activeTab === "active" ? activeExperiences : completedExperiences;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">

      {/* Header */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-lg mx-auto px-4 pt-8 pb-5">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <h1 className="text-xl font-display font-bold text-gray-900 truncate">
                  {user.node_name || user.name}
                </h1>
                {user.node_type && (
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${nodeTypeColor}`}>
                    {NODE_TYPE_ICONS[user.node_type]}
                    {NODE_TYPE_LABELS[user.node_type] || user.node_type}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {user.city}, {user.country}
              </p>
              {user.node_name && (
                <p className="text-xs text-gray-400 mt-0.5">Run by {user.name}</p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-3 flex-shrink-0">
              <div className="flex items-center gap-1 text-sm text-gray-500">
                <Heart className="w-4 h-4 text-rose-400" />
                <span className="font-semibold">{user.upvote_count}</span>
              </div>
              <button
                onClick={() => setLocation(`/u/${user.username}`)}
                className="text-xs text-primary font-medium flex items-center gap-1 hover:underline"
              >
                Profile <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>
          <XPBar xp={user.xp} />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Pending completions alert */}
        {pendingExperiences.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-3"
          >
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                {pendingExperiences.length} experience{pendingExperiences.length > 1 ? "s need" : " needs"} to be marked complete
              </p>
              <div className="mt-1 space-y-1">
                {pendingExperiences.slice(0, 3).map(e => (
                  <button
                    key={e.id}
                    onClick={() => setLocation(`/experience/${e.id}`)}
                    className="block text-xs text-amber-700 font-medium hover:underline"
                  >
                    {e.title} →
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Stats bar */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Experiences", value: stats?.total_experiences ?? 0, icon: <Star className="w-4 h-4" />, loading: statsLoading },
            { label: "Participants", value: stats?.total_participants ?? 0, icon: <Users className="w-4 h-4" />, loading: statsLoading },
            {
              label: "Completions",
              value: stats?.total_completions ?? 0,
              icon: <CheckCircle className="w-4 h-4" />,
              loading: statsLoading,
              sub: stats && stats.total_participants > 0 ? `${completionRate}%` : null,
            },
            { label: "XP Given", value: stats?.total_xp_distributed ?? 0, icon: <span className="text-xs font-bold">XP</span>, loading: statsLoading },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl p-3 border border-gray-100 shadow-sm text-center">
              <div className="text-primary/70 flex justify-center mb-1">{stat.icon}</div>
              {stat.loading ? (
                <div className="h-5 w-8 mx-auto bg-gray-100 rounded animate-pulse" />
              ) : (
                <div className="text-lg font-bold text-gray-900 leading-none">{stat.value.toLocaleString()}</div>
              )}
              {stat.sub && !stat.loading && (
                <div className="text-xs text-primary font-semibold mt-0.5">{stat.sub}</div>
              )}
              <div className="text-xs text-gray-400 mt-0.5 leading-tight">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Telegram group link */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <Link className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Telegram Group</p>
                <p className="text-xs text-gray-400">
                  {user.telegram_group_id ? "Group linked — announcements enabled" : "Link your group to broadcast experiences"}
                </p>
              </div>
            </div>
            {user.telegram_group_id ? (
              <span className="text-xs text-green-600 font-semibold bg-green-50 px-2 py-1 rounded-full">Connected</span>
            ) : (
              <button
                onClick={() => setShowLinkGroupForm(v => !v)}
                className="text-xs text-primary font-semibold hover:underline"
              >
                {showLinkGroupForm ? "Cancel" : "Link group"}
              </button>
            )}
          </div>
          {showLinkGroupForm && (
            <div className="mt-3 space-y-2">
              <p className="text-xs text-gray-500">
                Add your bot to the group, then paste the group chat ID here. Get the ID by adding <span className="font-mono">@userinfobot</span> to your group.
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="-100123456789"
                  value={groupIdInput}
                  onChange={e => setGroupIdInput(e.target.value)}
                  className="h-9 text-sm bg-gray-50 rounded-lg"
                />
                <Button
                  onClick={handleLinkGroup}
                  disabled={!groupIdInput.trim() || linkingGroup}
                  size="sm"
                  className="h-9 px-3 bg-primary text-white rounded-lg text-sm"
                >
                  {linkingGroup ? <Loader2 className="w-4 h-4 animate-spin" /> : "Link"}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Experience list */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100">
            {(["active", "completed"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 py-3 text-sm font-semibold transition-colors",
                  activeTab === tab
                    ? "text-primary border-b-2 border-primary"
                    : "text-gray-400 hover:text-gray-600"
                )}
              >
                {tab === "active" ? `Active (${activeExperiences.length})` : `Completed (${completedExperiences.length})`}
              </button>
            ))}
          </div>

          {statsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : displayExperiences.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-400 text-sm mb-3">
                {activeTab === "active" ? "No active experiences yet" : "No completed experiences yet"}
              </p>
              {activeTab === "active" && (
                <Button
                  onClick={() => setLocation("/create")}
                  size="sm"
                  className="bg-primary text-white rounded-xl text-sm"
                >
                  Create your first experience
                </Button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {displayExperiences.map(exp => (
                <button
                  key={exp.id}
                  onClick={() => setLocation(`/experience/${exp.id}`)}
                  className="w-full text-left p-4 hover:bg-gray-50 transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 group-hover:text-primary transition-colors truncate">
                        {exp.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-gray-400">{exp.date}</span>
                        <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{exp.category}</span>
                        <span className="text-xs text-primary font-semibold">+{exp.xp_reward} XP</span>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-shrink-0 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3" /> {exp.participant_count}
                      </span>
                      <span className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-500" /> {exp.completion_count}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* FAB */}
      <button
        onClick={() => setLocation("/create")}
        className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-white rounded-full shadow-xl shadow-primary/30 flex items-center justify-center hover:scale-105 transition-transform active:scale-95 z-50"
      >
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
}

function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(" ");
}
