import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { MapPin, Settings, Loader2, Calendar } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { useGetUserProfile, useGetCurrentUser } from "@workspace/api-client-react";
import { getAuthHeaders, getSessionToken } from "@/lib/auth";

export default function Profile() {
  const [match, params] = useRoute("/u/:username");
  const [, setLocation] = useLocation();
  const isMe = params?.username === "me";
  const username = params?.username || "";

  const meQuery = { enabled: isMe && !!getSessionToken() };
  const meResult = useGetCurrentUser({
    query: meQuery as typeof meQuery & { queryKey: readonly unknown[] },
    request: { headers: getAuthHeaders() }
  });

  const otherQuery = { enabled: !isMe && !!username, retry: false as const };
  const otherResult = useGetUserProfile(isMe ? "_" : username, {
    query: otherQuery as typeof otherQuery & { queryKey: readonly unknown[] },
    request: { headers: getAuthHeaders() }
  });

  const profile = isMe ? meResult.data : otherResult.data;
  const isLoading = isMe ? meResult.isLoading : otherResult.isLoading;
  const error = isMe ? meResult.error : otherResult.error;

  const [activeTab, setActiveTab] = useState<"personal" | "professional">("personal");

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!profile || error) {
    return (
      <Layout>
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            {isMe ? "Not logged in" : "User not found"}
          </h2>
          <p className="text-gray-500 mb-6">
            {isMe ? "Complete onboarding to create your profile." : `No user found with username @${username}.`}
          </p>
          <Button onClick={() => setLocation("/")} className="rounded-xl bg-primary hover:bg-primary/90">
            {isMe ? "Get Started" : "Go Home"}
          </Button>
        </div>
      </Layout>
    );
  }

  const level = Math.max(1, Math.floor(profile.xp / 500) + 1);
  const xpInCurrentLevel = profile.xp % 500;
  const progressPercent = (xpInCurrentLevel / 500) * 100;

  const initials = profile.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase();

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 pb-24">
        <div className="h-48 bg-gradient-to-r from-primary via-purple-500 to-fuchsia-500 relative">
          <div className="absolute inset-0 bg-black/10"></div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative -mt-20">
          <div className="bg-white rounded-3xl shadow-lg p-6 sm:p-8 mb-6 border border-gray-100">
            <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start text-center sm:text-left">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-primary text-white flex items-center justify-center text-4xl font-display font-bold shadow-md shrink-0">
                {initials}
              </div>
              
              <div className="flex-1 w-full">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">{profile.name}</h1>
                    <p className="text-primary font-medium text-lg">@{profile.username}</p>
                    
                    <div className="flex items-center gap-4 mt-3 text-sm text-gray-500 justify-center sm:justify-start">
                      <span className="flex items-center bg-gray-100 px-3 py-1 rounded-full text-gray-700 font-medium">
                        <MapPin className="w-4 h-4 mr-1.5" />
                        {profile.city}
                      </span>
                    </div>
                  </div>
                  
                  {isMe && (
                    <Button 
                      variant="outline" 
                      onClick={() => setLocation("/")}
                      className="rounded-xl border-gray-200 text-gray-700 hover:bg-gray-50"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Edit Profile
                    </Button>
                  )}
                </div>

                {profile.bio && (
                  <p className="mt-5 text-gray-600 leading-relaxed max-w-xl">
                    {profile.bio}
                  </p>
                )}

                <div className="mt-8 bg-gray-50 rounded-2xl p-5 border border-gray-100 flex flex-col sm:flex-row gap-6">
                  <div className="flex-1">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Current Level</span>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl font-bold text-gray-900">Level {level}</span>
                        </div>
                      </div>
                      <span className="text-sm font-medium text-primary">{profile.xp} XP total</span>
                    </div>
                    <div className="h-3 w-full bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-primary to-fuchsia-500 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${Math.max(5, progressPercent)}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-2 text-right">{500 - xpInCurrentLevel} XP to next level</p>
                  </div>
                  
                  <div className="w-px bg-gray-200 hidden sm:block"></div>
                  
                  <div className="flex gap-6 sm:justify-end justify-center pt-4 sm:pt-0 border-t sm:border-t-0 border-gray-200">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-1">
                        {profile.upvote_count} <span className="text-amber-400 text-xl">&#8593;</span>
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Upvotes</span>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-gray-900">{profile.interests.length}</div>
                      <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Interests</span>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          </div>

          <div>
            <div className="flex p-1 bg-gray-200/50 rounded-2xl w-full sm:w-auto inline-flex mb-6">
              <button
                onClick={() => setActiveTab("personal")}
                className={`flex-1 sm:px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "personal" 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Personal
              </button>
              <button
                onClick={() => setActiveTab("professional")}
                className={`flex-1 sm:px-8 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  activeTab === "professional" 
                    ? "bg-white text-gray-900 shadow-sm" 
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                Professional
              </button>
            </div>

            <div className="bg-white rounded-3xl p-10 border border-gray-100 shadow-sm text-center flex flex-col items-center justify-center min-h-[300px]">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No {activeTab} experiences yet</h3>
              <p className="text-gray-500 max-w-sm mb-6">
                When you join or host an experience tagged as {activeTab}, it will appear here.
              </p>
              <Button className="rounded-xl bg-primary hover:bg-primary/90">
                Explore experiences
              </Button>
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}
