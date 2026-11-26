/** Great-circle distance in km between two { latitude, longitude } points (haversine). */
export function distanceKm(a, b) {
  if (!a || !b || a.latitude == null || b.latitude == null) return null;
  const R = 6371;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.latitude - a.latitude);
  const dLon = rad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/**
 * Approximate area for a mechanic who hasn't accepted yet: coordinates snapped to a ~1 km grid
 * (2 decimals ≈ 1.1 km), so they can judge the trip without learning the exact spot.
 */
export const APPROX_RADIUS_M = 800;
export const approximate = ({ latitude, longitude }) => ({
  latitude: Math.round(latitude * 100) / 100,
  longitude: Math.round(longitude * 100) / 100,
  radiusM: APPROX_RADIUS_M,
});

/** Human distance: "under 100 m" · "340 m" (10 m steps) · "4.1 km". Keep in sync with client/src/lib/format.js */
export const formatKm = (d) => (d < 0.1 ? "under 100 m" : d < 1 ? `${Math.round(d * 100) * 10} m` : `${d.toFixed(1)} km`);
