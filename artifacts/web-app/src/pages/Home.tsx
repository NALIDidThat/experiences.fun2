import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { Compass, MapPin, Users, Plus, Loader2, Sparkles, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useMotionValue, animate } from "framer-motion";
import { useListExperiences, useGetCurrentUser } from "@workspace/api-client-react";
import { getAuthHeaders, isAuthenticated } from "@/lib/auth";
import { geocodeCity } from "@/lib/geocode";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

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

interface MapExp {
  id: number;
  title: string;
  category: string;
  type: string;
  date: string;
  city: string;
  country: string;
  xp_reward: number;
}

interface GeoCity {
  city: string;
  lat: number;
  lon: number;
  experiences: MapExp[];
}

function useMapExperiences() {
  const [data, setData] = useState<MapExp[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const base = import.meta.env.BASE_URL.replace(/\/$/, "");
    const fetchAll = async () => {
      const allExps: MapExp[] = [];
      let page = 1;
      let hasMore = true;
      while (hasMore) {
        const res = await fetch(`${base}/api/experiences?page=${page}`, { headers: getAuthHeaders() });
        const json = await res.json();
        if (json.experiences?.length) {
          for (const e of json.experiences) {
            allExps.push({
              id: e.id, title: e.title, category: e.category,
              type: e.type, date: e.date, city: e.city,
              country: e.country || "", xp_reward: e.xp_reward,
            });
          }
          hasMore = allExps.length < json.total;
          page++;
        } else {
          hasMore = false;
        }
      }
      setData(allExps);
      setIsLoading(false);
    };
    fetchAll().catch(() => setIsLoading(false));
  }, []);

  return { data, isLoading };
}

const SNAP_PEEK = 0.72;
const SNAP_HALF = 0.50;
const SNAP_FULL = 0.04;

export default function Home() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"discover" | "for-you">("discover");
  const [typeFilter, setTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [snapState, setSnapState] = useState<"peek" | "half" | "full">("half");

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<LeafletMap | null>(null);
  const markersRef = useRef<LeafletMarker[]>([]);
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [mapReady, setMapReady] = useState(false);

  const sheetY = useMotionValue(0);
  const dragStartY = useRef(0);

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
  const { data: mapExperiences } = useMapExperiences();

  const experiences = experiencesResult.data?.experiences || [];
  const isLoading = experiencesResult.isLoading;

  const snapTo = (pos: "peek" | "half" | "full") => {
    const h = window.innerHeight;
    const targets = { peek: h * SNAP_PEEK, half: h * SNAP_HALF, full: h * SNAP_FULL };
    animate(sheetY, targets[pos], { type: "spring", damping: 32, stiffness: 320 });
    setSnapState(pos);
  };

  useEffect(() => {
    const h = window.innerHeight;
    sheetY.set(h * SNAP_HALF);
  }, [sheetY]);

  useEffect(() => {
    if (!mapExperiences?.length) return;

    const byKey: Record<string, { city: string; country: string; experiences: MapExp[] }> = {};
    for (const exp of mapExperiences) {
      const key = `${exp.city.toLowerCase()},${exp.country.toLowerCase()}`;
      if (!byKey[key]) byKey[key] = { city: exp.city, country: exp.country, experiences: [] };
      byKey[key].experiences.push(exp);
    }

    const fetchCoords = async () => {
      const results: GeoCity[] = [];
      for (const group of Object.values(byKey)) {
        const coords = await geocodeCity(group.city, group.country);
        if (coords) {
          results.push({ city: group.city, lat: coords.lat, lon: coords.lon, experiences: group.experiences });
        }
      }
      setCities(results);
    };
    fetchCoords();
  }, [mapExperiences]);

  useEffect(() => {
    if (!mapContainerRef.current || cities.length === 0) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!document.getElementById("map-pulse-style")) {
        const style = document.createElement("style");
        style.id = "map-pulse-style";
        style.textContent = `@keyframes pulse-glow { 0%,100% { transform:scale(1);opacity:1; } 50% { transform:scale(1.08);opacity:0.9; } }`;
        document.head.appendChild(style);
      }

      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }

      const map = L.map(mapContainerRef.current!, {
        center: [20, 10],
        zoom: 2,
        zoomControl: false,
        attributionControl: false,
      });
      leafletMap.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '© OpenStreetMap © CARTO',
        maxZoom: 18,
      }).addTo(map);

      markersRef.current = [];
      for (const city of cities) {
        const count = city.experiences.length;
        const size = Math.min(24 + count * 6, 52);
        const hasPro = city.experiences.some(e => e.type === "professional");
        const hasPer = city.experiences.some(e => e.type === "personal");
        const gradient = hasPro && hasPer
          ? "linear-gradient(135deg,#f20789,#6366f1)"
          : hasPro
            ? "linear-gradient(135deg,#6366f1,#818cf8)"
            : "linear-gradient(135deg,#f20789,#e11d48)";
        const shadow = hasPro && !hasPer
          ? "0 2px 12px rgba(99,102,241,0.5)"
          : "0 2px 12px rgba(242,7,137,0.4)";

        const icon = L.divIcon({
          html: `<div style="width:${size}px;height:${size}px;background:${gradient};border-radius:50%;border:2.5px solid rgba(255,255,255,0.9);box-shadow:${shadow};display:flex;align-items:center;justify-content:center;color:white;font-weight:bold;font-size:${size > 36 ? 13 : 10}px;font-family:system-ui,sans-serif;animation:pulse-glow 2.5s ease-in-out infinite;">${count}</div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([city.lat, city.lon], { icon }).addTo(map);
        markersRef.current.push(marker);
      }

      if (cities.length > 0) {
        const bounds = L.latLngBounds(cities.map(c => [c.lat, c.lon] as [number, number]));
        map.fitBounds(bounds, { padding: [60, 60], maxZoom: 8 });
      }

      setMapReady(true);
    };

    initMap();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [cities]);

  const handleDragEnd = (_: unknown, info: { offset: { y: number }; velocity: { y: number } }) => {
    const h = window.innerHeight;
    const cur = sheetY.get();
    const vy = info.velocity.y;

    if (vy < -300 || cur < h * 0.25) {
      snapTo("full");
    } else if (vy > 300 || cur > h * 0.65) {
      snapTo("peek");
    } else {
      snapTo("half");
    }
  };

  return (
    <Layout>
      <div className="fixed inset-0 overflow-hidden bg-gray-900">

        {/* Token banner overlaid on map */}
        <button
          onClick={() => setLocation("/token")}
          className="absolute top-0 left-0 right-0 z-20 w-full bg-gradient-to-r from-[#f20789] to-rose-500 px-4 py-2.5 flex items-center justify-between gap-3 text-white hover:opacity-95 transition-all"
          style={{ height: 46 }}
        >
          <div className="flex items-center gap-2">
            <span className="text-base shrink-0">🪙</span>
            <p className="text-xs font-bold">$EXP Token — Coming Soon</p>
          </div>
          <span className="text-white/70 text-[11px] font-medium">Learn More →</span>
        </button>

        {/* Floating header on map */}
        <div className="absolute left-4 right-4 z-10 flex items-center justify-between" style={{ top: 58 }}>
          <div>
            <h1 className="text-2xl font-display font-bold text-white drop-shadow-lg">Discover</h1>
            {userCity && (
              <p className="text-white/60 flex items-center gap-1 text-xs mt-0.5 drop-shadow">
                <MapPin className="w-3 h-3" /> {userCity}
              </p>
            )}
          </div>
          <Button
            onClick={() => setLocation("/create")}
            className="rounded-2xl bg-primary hover:bg-primary/90 h-9 px-4 shadow-xl shadow-primary/30 text-sm"
          >
            <Plus className="w-4 h-4 mr-1" />
            Create
          </Button>
        </div>

        {/* Map fills the background */}
        <div
          ref={mapContainerRef}
          className="absolute inset-0"
          style={{ zIndex: 0 }}
        />

        {!mapReady && cities.length === 0 && (
          <div className="absolute inset-0 flex items-end justify-center pb-[55vh] z-5 pointer-events-none">
            <div className="flex items-center gap-2 text-white/40 text-xs">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Mapping experiences…</span>
            </div>
          </div>
        )}

        {/* Bottom Sheet */}
        <motion.div
          className="absolute left-0 right-0 bottom-0 z-30"
          style={{ y: sheetY, height: "100dvh" }}
          drag="y"
          dragConstraints={{ top: 0, bottom: window.innerHeight * (SNAP_PEEK - SNAP_FULL) }}
          dragElastic={{ top: 0.05, bottom: 0.15 }}
          onDragStart={() => { dragStartY.current = sheetY.get(); }}
          onDragEnd={handleDragEnd}
        >
          <div className="flex flex-col h-full bg-white rounded-t-3xl shadow-2xl overflow-hidden">
            {/* Drag handle */}
            <div
              className="flex-shrink-0 flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
              onClick={() => snapTo(snapState === "full" ? "half" : snapState === "half" ? "peek" : "half")}
            >
              <div className="w-10 h-1 bg-gray-200 rounded-full mb-2" />
              <div className="flex items-center gap-1 text-gray-400 text-xs font-medium">
                <ChevronUp className={cn("w-3.5 h-3.5 transition-transform", snapState === "full" && "rotate-180")} />
                {snapState === "peek" ? "Pull up to browse" : snapState === "full" ? "Tap to collapse" : "Experiences"}
              </div>
            </div>

            {/* Sheet content - scrollable */}
            <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-24">

              {/* Tabs */}
              <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl sticky top-0 z-10 bg-white pt-1 border-b border-gray-50">
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

                  <div className="flex gap-2 mb-4 flex-wrap">
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
                    <div className="flex justify-center py-12">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                  )}

                  {!isLoading && experiences.length === 0 && (
                    <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 text-center">
                      <div className="w-16 h-16 bg-primary/10 rounded-full mx-auto flex items-center justify-center mb-4">
                        <Compass className="w-8 h-8 text-primary" />
                      </div>
                      <h2 className="text-xl font-bold text-gray-900 mb-2">No experiences yet</h2>
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
                    <div className="flex flex-col items-center justify-center py-12 gap-3">
                      <Loader2 className="w-8 h-8 animate-spin text-primary" />
                      <p className="text-sm text-gray-400">AI is personalizing your feed…</p>
                    </div>
                  )}

                  {forYou.error && (
                    <div className="text-center py-8 text-gray-500 text-sm">{forYou.error}</div>
                  )}

                  {!forYou.isLoading && forYou.data && forYou.data.length === 0 && (
                    <div className="bg-gray-50 rounded-3xl p-8 border border-gray-100 text-center">
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
        </motion.div>
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
      className="w-full text-left bg-white rounded-2xl p-4 border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
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
