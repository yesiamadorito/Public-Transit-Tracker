import * as Location from "expo-location";

export async function getFreshLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== "granted") throw new Error("Location permission denied");
  const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return {
    lat: pos.coords.latitude,
    lon: pos.coords.longitude,
    accuracy: pos.coords.accuracy ?? null
  };
}

export function haversine(aLat, aLon, bLat, bLon) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLon = toRad(bLon - aLon);
  const s1 = Math.sin(dLat / 2);
  const s2 = Math.sin(dLon / 2);
  const a = s1 * s1 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * s2 * s2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function nearestStation(lat, lon, stations, maxM = 150) {
  let best = null, bestD = Infinity;
  for (const s of stations) {
    const d = haversine(lat, lon, s.lat, s.lon);
    if (d < bestD) { best = s; bestD = d; }
  }
  return bestD <= maxM ? { ...best, distM: Math.round(bestD) } : null;
}
