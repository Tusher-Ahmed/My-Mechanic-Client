// Travel charge and arrival-time estimate for "mechanic comes to me" orders.
// Keep in sync with client/src/lib/pricing.js (the client only shows an estimate; the server decides).

export const DEFAULT_TRAVEL_PRICING = { base: 100, perKm: 30, freeWithinKm: 1, maxDistanceKm: 20 };

const roundTo10 = (n) => Math.round(n / 10) * 10;

/** ৳ travel charge for a distance in km: free nearby, otherwise base + per-km, rounded to ৳10. */
export function travelFeeFor(pricing = DEFAULT_TRAVEL_PRICING, km) {
  const p = { ...DEFAULT_TRAVEL_PRICING, ...pricing };
  if (km <= p.freeWithinKm) return 0;
  return roundTo10(p.base + p.perKm * km);
}

/** Suggested minutes to arrive: ~10 min to get ready + Dhaka traffic ≈ 20 km/h, rounded to 5 min. */
export function suggestedEtaMinutes(km = 0) {
  const minutes = 10 + (km / 20) * 60;
  return Math.min(240, Math.max(10, Math.round(minutes / 5) * 5));
}
