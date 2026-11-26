export const money = (n) => `৳${Math.round(Number(n) || 0).toLocaleString("en-US")}`;

export const date = (d) =>
  new Date(d).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

export const initials = (name = "") =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join("") || "?";

/** Distance in km between two {latitude, longitude} points (haversine). */
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const km = (d) => (d == null ? "" : d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`);

export const minPrice = (services = []) => (services.length ? Math.min(...services.map((s) => s.price)) : null);

/** "just now", "5 min ago", "3 h ago", "2 d ago", then a date. */
export function timeAgo(d) {
  const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000);
  if (s < 45) return "just now";
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.round(s / 86400)} d ago`;
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
