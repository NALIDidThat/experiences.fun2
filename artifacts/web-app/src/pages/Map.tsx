import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Layout } from "@/components/Layout";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { useListExperiences } from "@workspace/api-client-react";
import { getAuthHeaders } from "@/lib/auth";

interface GeoCity {
  city: string;
  lat: number;
  lon: number;
  experiences: Array<{ id: number; title: string; category: string; xp_reward: number }>;
}

const CATEGORY_EMOJIS: Record<string, string> = {
  environmental: "🌿", education: "📚", community: "🤝", creative: "🎨",
  entrepreneurship: "🚀", health: "💪", tech: "💻", events: "🎉",
};

async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(city)}&format=json&limit=1`,
      { headers: { "User-Agent": "experiences.fun/1.0" } }
    );
    const data = await res.json();
    if (data?.[0]) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch {}
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

    const byCity: Record<string, Array<{ id: number; title: string; category: string; xp_reward: number }>> = {};
    for (const exp of data.experiences) {
      if (!byCity[exp.city]) byCity[exp.city] = [];
      byCity[exp.city].push({ id: exp.id, title: exp.title, category: exp.category, xp_reward: exp.xp_reward });
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

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://openstreetmap.org">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      markersRef.current = [];
      for (const city of cities) {
        const count = city.experiences.length;
        const size = Math.min(24 + count * 6, 56);
        const icon = L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:linear-gradient(135deg,#f20789,#e11d48);
            border-radius:50%;border:3px solid white;
            box-shadow:0 2px 12px rgba(242,7,137,0.4);
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:bold;font-size:${size > 36 ? 14 : 11}px;
            font-family:system-ui,sans-serif;
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
              <div className="divide-y divide-gray-50 max-h-48 overflow-y-auto">
                {selectedCity.experiences.map(exp => (
                  <button
                    key={exp.id}
                    onClick={() => setLocation(`/experience/${exp.id}`)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                  >
                    <span className="text-xl shrink-0">{CATEGORY_EMOJIS[exp.category] || "📌"}</span>
                    <span className="text-sm font-medium text-gray-900 flex-1 truncate">{exp.title}</span>
                    <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                      +{exp.xp_reward} XP
                    </span>
                  </button>
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
