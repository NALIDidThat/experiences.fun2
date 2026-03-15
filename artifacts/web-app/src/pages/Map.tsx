import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { useListExperiences } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";

interface MapExp {
  id: number;
  title: string;
  category: string;
  type: string;
  date: string;
  xp_reward: number;
}

interface GeoCity {
  city: string;
  lat: number;
  lon: number;
  experiences: MapExp[];
}

const CATEGORY_EMOJIS: Record<string, string> = {
  environmental: "🌿", education: "📚", community: "🤝", creative: "🎨",
  entrepreneurship: "🚀", health: "💪", tech: "💻", events: "🎉",
};

const geocodeCache: Record<string, { lat: number; lon: number } | null> = {};

async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  if (city in geocodeCache) return geocodeCache[city];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { "User-Agent": "experiences.fun/1.0" } }
    );
    const data = await res.json();
    if (data?.[0]) {
      const result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
      geocodeCache[city] = result;
      return result;
    }
  } catch {}
  geocodeCache[city] = null;
  return null;
}

export default function Map() {
  const [, setLocation] = useLocation();
  const [cities, setCities] = useState<GeoCity[]>([]);
  const [geocoding, setGeocoding] = useState(false);
  const [selectedCity, setSelectedCity] = useState<GeoCity | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  const listQuery = { enabled: true, refetchOnMount: true as const };
  const { data, isLoading } = useListExperiences(
    {},
    {
      query: listQuery as typeof listQuery & { queryKey: readonly unknown[] },
      request: { headers: getAuthHeaders() },
    }
  );

  useEffect(() => {
    if (!data?.experiences?.length) return;

    const byCity: Record<string, MapExp[]> = {};
    for (const exp of data.experiences) {
      if (!byCity[exp.city]) byCity[exp.city] = [];
      byCity[exp.city].push({ id: exp.id, title: exp.title, category: exp.category, type: exp.type, date: exp.date, xp_reward: exp.xp_reward });
    }

    const fetchCoords = async () => {
      setGeocoding(true);
      const results: GeoCity[] = [];
      for (const city of Object.keys(byCity)) {
        const coords = await geocodeCity(city);
        if (coords) {
          results.push({ city, lat: coords.lat, lon: coords.lon, experiences: byCity[city] });
        }
        await new Promise(r => setTimeout(r, 200));
      }
      setCities(results);
      setGeocoding(false);
    };

    fetchCoords();
  }, [data]);

  useEffect(() => {
    if (!mapRef.current || cities.length === 0) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!document.getElementById("map-pulse-style")) {
        const style = document.createElement("style");
        style.id = "map-pulse-style";
        style.textContent = `@keyframes pulse-glow { 0%,100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.08); opacity: 0.9; } }`;
        document.head.appendChild(style);
      }

      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }

      const map = L.map(mapRef.current!, {
        center: [20, 0],
        zoom: 2,
        zoomControl: true,
      });
      leafletMap.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a> © <a href="https://carto.com">CARTO</a>',
        maxZoom: 18,
      }).addTo(map);

      markersRef.current = [];
      for (const city of cities) {
        const count = city.experiences.length;
        const size = Math.min(24 + count * 6, 56);
        const hasProfessional = city.experiences.some(e => e.type === "professional");
        const hasPersonal = city.experiences.some(e => e.type === "personal");
        const gradient = hasProfessional && hasPersonal
          ? "linear-gradient(135deg,#f20789,#6366f1)"
          : hasProfessional
            ? "linear-gradient(135deg,#6366f1,#818cf8)"
            : "linear-gradient(135deg,#f20789,#e11d48)";
        const shadow = hasProfessional && !hasPersonal
          ? "0 2px 12px rgba(99,102,241,0.5), 0 0 20px rgba(99,102,241,0.2)"
          : "0 2px 12px rgba(242,7,137,0.4), 0 0 20px rgba(242,7,137,0.2)";
        const icon = L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:${gradient};
            border-radius:50%;border:3px solid white;
            box-shadow:${shadow};
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:bold;font-size:${size > 36 ? 14 : 11}px;
            font-family:system-ui,sans-serif;
            animation:pulse-glow 2s ease-in-out infinite;
          ">${count}</div>`,
          className: "",
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });

        const marker = L.marker([city.lat, city.lon], { icon }).addTo(map);
        marker.on("click", () => setSelectedCity(city));
        markersRef.current.push(marker);
      }

      if (cities.length > 0) {
        const bounds = L.latLngBounds(cities.map(c => [c.lat, c.lon]));
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 10 });
      }
    };

    initMap();

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [cities]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-900 flex flex-col">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 z-[1000] flex items-center gap-3 p-4">
          <button
            onClick={() => setLocation("/home")}
            className="bg-white/90 backdrop-blur-md rounded-full p-2.5 shadow-lg hover:bg-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-800" />
          </button>
          <div className="bg-white/90 backdrop-blur-md rounded-full px-4 py-2 shadow-lg">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-gray-900">Experience Map</span>
              {data?.experiences && (
                <span className="text-xs text-gray-400 font-medium">
                  {data.experiences.length} experiences
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Legend */}
        {!isLoading && !geocoding && cities.length > 0 && (
          <div className="absolute top-16 right-4 z-[1000] bg-white/90 backdrop-blur-md rounded-xl px-3 py-2 shadow-lg">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#f20789] to-[#e11d48]" />
                <span className="text-[10px] font-medium text-gray-600">Personal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#6366f1] to-[#818cf8]" />
                <span className="text-[10px] font-medium text-gray-600">Professional</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-gradient-to-br from-[#f20789] to-[#6366f1]" />
                <span className="text-[10px] font-medium text-gray-600">Mixed</span>
              </div>
            </div>
          </div>
        )}

        {/* Loading state */}
        {(isLoading || geocoding) && (
          <div className="absolute inset-0 flex items-center justify-center z-[500] bg-gray-900/80 backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-3" />
              <p className="text-white/80 text-sm font-medium">
                {isLoading ? "Loading experiences..." : "Mapping locations..."}
              </p>
            </div>
          </div>
        )}

        {/* Map container */}
        <div ref={mapRef} className="flex-1 w-full" style={{ minHeight: "100dvh" }} />

        {/* Selected city panel */}
        {selectedCity && (
          <div className="absolute bottom-24 md:bottom-6 left-4 right-4 z-[1000] max-w-md mx-auto">
            <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-primary to-rose-500 px-4 py-3 flex items-center justify-between">
                <div>
                  <h3 className="text-white font-bold text-base">{selectedCity.city}</h3>
                  <p className="text-white/70 text-xs">{selectedCity.experiences.length} experience{selectedCity.experiences.length !== 1 ? "s" : ""}</p>
                </div>
                <button
                  onClick={() => setSelectedCity(null)}
                  className="text-white/70 hover:text-white text-xl leading-none"
                >
                  ×
                </button>
              </div>
              <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                {selectedCity.experiences.map(exp => (
                  <div
                    key={exp.id}
                    className="px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-xl shrink-0 mt-0.5">{CATEGORY_EMOJIS[exp.category] || "📌"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{exp.title}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-gray-500">{exp.date}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${exp.type === "professional" ? "bg-indigo-100 text-indigo-600" : "bg-primary/10 text-primary"}`}>
                            {exp.type === "professional" ? "Pro" : "Personal"}
                          </span>
                          <span className="text-xs font-bold text-primary">+{exp.xp_reward} XP</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setLocation(`/experience/${exp.id}`)}
                        className="text-xs font-bold text-white bg-primary hover:bg-primary/90 px-3 py-1.5 rounded-lg shrink-0 transition-colors"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {!isLoading && !geocoding && cities.length === 0 && data?.experiences?.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-[500]">
            <div className="text-center text-white/80">
              <div className="text-5xl mb-3">🗺️</div>
              <p className="font-semibold">No experiences on the map yet</p>
              <p className="text-sm text-white/50 mt-1">Create the first one!</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
