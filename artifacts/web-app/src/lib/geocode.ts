const STATIC_CITIES: Record<string, { lat: number; lon: number }> = {
  "london,united kingdom": { lat: 51.5074, lon: -0.1278 },
  "london,uk": { lat: 51.5074, lon: -0.1278 },
  "new york,united states": { lat: 40.7128, lon: -74.006 },
  "new york,us": { lat: 40.7128, lon: -74.006 },
  "paris,france": { lat: 48.8566, lon: 2.3522 },
  "berlin,germany": { lat: 52.52, lon: 13.405 },
  "munich,germany": { lat: 48.1351, lon: 11.582 },
  "tokyo,japan": { lat: 35.6762, lon: 139.6503 },
  "sydney,australia": { lat: -33.8688, lon: 151.2093 },
  "san francisco,united states": { lat: 37.7749, lon: -122.4194 },
  "los angeles,united states": { lat: 34.0522, lon: -118.2437 },
  "chicago,united states": { lat: 41.8781, lon: -87.6298 },
  "toronto,canada": { lat: 43.6532, lon: -79.3832 },
  "amsterdam,netherlands": { lat: 52.3676, lon: 4.9041 },
  "barcelona,spain": { lat: 41.3874, lon: 2.1686 },
  "dubai,uae": { lat: 25.2048, lon: 55.2708 },
  "singapore,singapore": { lat: 1.3521, lon: 103.8198 },
  "mumbai,india": { lat: 19.076, lon: 72.8777 },
  "são paulo,brazil": { lat: -23.5505, lon: -46.6333 },
  "lagos,nigeria": { lat: 6.5244, lon: 3.3792 },
  "nairobi,kenya": { lat: -1.2921, lon: 36.8219 },
  "cape town,south africa": { lat: -33.9249, lon: 18.4241 },
  "stockholm,sweden": { lat: 59.3293, lon: 18.0686 },
  "lisbon,portugal": { lat: 38.7223, lon: -9.1393 },
  "rome,italy": { lat: 41.9028, lon: 12.4964 },
  "vienna,austria": { lat: 48.2082, lon: 16.3738 },
  "zurich,switzerland": { lat: 47.3769, lon: 8.5417 },
  "istanbul,turkey": { lat: 41.0082, lon: 28.9784 },
  "seoul,south korea": { lat: 37.5665, lon: 126.978 },
  "beijing,china": { lat: 39.9042, lon: 116.4074 },
};

const cache: Record<string, { lat: number; lon: number } | null> = {};

function makeKey(city: string, country: string): string {
  return `${city.toLowerCase().trim()},${country.toLowerCase().trim()}`;
}

async function openMeteoGeocode(city: string, country: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const query = `${city}, ${country}`;
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
    );
    const data = await res.json();
    if (data?.results?.[0]) {
      return { lat: data.results[0].latitude, lon: data.results[0].longitude };
    }
  } catch {}
  return null;
}

export async function geocodeCity(city: string, country: string): Promise<{ lat: number; lon: number } | null> {
  const key = makeKey(city, country);

  if (key in cache) return cache[key];

  const staticResult = STATIC_CITIES[key];
  if (staticResult) {
    cache[key] = staticResult;
    return staticResult;
  }

  const result = await openMeteoGeocode(city, country);
  cache[key] = result;
  return result;
}
