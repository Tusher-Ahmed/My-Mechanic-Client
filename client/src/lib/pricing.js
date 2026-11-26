// Estimate only – the server recalculates the travel charge from the real distance.
// Keep in sync with server/src/utils/pricing.js
export const DEFAULT_TRAVEL_PRICING = { base: 100, perKm: 30, freeWithinKm: 1, maxDistanceKm: 20 };

const roundTo10 = (n) => Math.round(n / 10) * 10;

export function travelFeeFor(pricing, km) {
  const p = { ...DEFAULT_TRAVEL_PRICING, ...(pricing || {}) };
  if (km <= p.freeWithinKm) return 0;
  return roundTo10(p.base + p.perKm * km);
}

export function suggestedEtaMinutes(km = 0) {
  const minutes = 10 + (km / 20) * 60;
  return Math.min(240, Math.max(10, Math.round(minutes / 5) * 5));
}

export const orderNo = (o) => (o?.number ? `MM-${o.number}` : `#${String(o?._id ?? "").slice(-6).toUpperCase()}`);

export const clockTime = (d) => new Date(d).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
