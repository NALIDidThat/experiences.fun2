import React, { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useGetCurrentUser } from "@workspace/api-client-react";
import { getAuthHeaders, getSessionToken } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

const NODE_TYPES = [
  { id: "school", label: "School" },
  { id: "library", label: "Library" },
  { id: "university", label: "University" },
  { id: "company", label: "Company" },
  { id: "community_center", label: "Community Centre" },
  { id: "city", label: "City / Region" },
];

export default function Settings() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const userResult = useGetCurrentUser({ request: { headers: getAuthHeaders() } });
  const user = userResult.data;

  const [form, setForm] = useState({
    name: "", bio: "", city: "", country: "", node_name: "", node_type: "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name ?? "",
        bio: user.bio ?? "",
        city: user.city ?? "",
        country: user.country ?? "",
        node_name: user.node_name ?? "",
        node_type: user.node_type ?? "",
      });
    }
  }, [user]);

  useEffect(() => {
    if (!getSessionToken()) setLocation("/");
  }, [setLocation]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const base = import.meta.env.BASE_URL.replace(/\/$/, "");
      const body: Record<string, string | null> = {
        name: form.name,
        bio: form.bio || null,
        city: form.city,
        country: form.country,
      };
      if (user?.user_type === "educator") {
        body.node_name = form.node_name || null;
        body.node_type = form.node_type || null;
      }
      const res = await fetch(`${base}/api/users/me`, {
        method: "PATCH",
        headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save");
      }
      await queryClient.invalidateQueries();
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save changes");
    }
    setSaving(false);
  };

  if (userResult.isLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  }

  const isEducator = user?.user_type === "educator";

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center gap-3">
          <button onClick={() => setLocation(-1 as unknown as string)} className="text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-bold text-gray-900">Profile Settings</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">

        {/* Basic info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Basic Info</h2>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Display Name</label>
            <Input
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="h-11 bg-gray-50 border-gray-200 rounded-xl"
              placeholder="Jane Doe"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-700">Bio <span className="text-gray-400 font-normal">(optional)</span></label>
            <Textarea
              value={form.bio}
              onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
              placeholder={isEducator ? "What does your node focus on?" : "Passionate about the environment..."}
              className="resize-none bg-gray-50 border-gray-200 rounded-xl text-sm min-h-[80px]"
            />
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Location</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">City</label>
              <Input
                value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                placeholder="London"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Country</label>
              <Input
                value={form.country}
                onChange={e => setForm(p => ({ ...p, country: e.target.value }))}
                className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                placeholder="United Kingdom"
              />
            </div>
          </div>
        </div>

        {/* Node info (educators only) */}
        {isEducator && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Node</h2>

            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-gray-700">Node Name</label>
              <Input
                value={form.node_name}
                onChange={e => setForm(p => ({ ...p, node_name: e.target.value }))}
                className="h-11 bg-gray-50 border-gray-200 rounded-xl"
                placeholder="e.g. Greenwood Academy"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">Node Type</label>
              <div className="grid grid-cols-2 gap-2">
                {NODE_TYPES.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setForm(p => ({ ...p, node_type: t.id }))}
                    className={`p-2.5 rounded-xl border-2 text-sm font-semibold transition-all text-left ${
                      form.node_type === t.id
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-gray-100 text-gray-600 hover:border-gray-200"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Readonly account info */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Account</h2>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Username</span>
            <span className="font-semibold text-gray-900">@{user?.username}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Account type</span>
            <span className="font-semibold text-gray-900 capitalize">{user?.user_type ?? "student"}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">XP</span>
            <span className="font-semibold text-gray-900">{user?.xp ?? 0} XP</span>
          </div>
          <p className="text-xs text-gray-400 mt-1">Username cannot be changed after signup.</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{error}</div>
        )}

        <Button
          onClick={handleSave}
          disabled={saving || !form.name.trim() || !form.city.trim() || !form.country.trim()}
          className="w-full h-12 text-base bg-primary hover:bg-primary/90 text-white rounded-2xl shadow-lg shadow-primary/25 disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : saved ? (
            <span className="flex items-center gap-2"><Check className="w-4 h-4" /> Saved!</span>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
