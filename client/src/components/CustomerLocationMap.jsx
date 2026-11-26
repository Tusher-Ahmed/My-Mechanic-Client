// Mechanic side of live location: a small map with the customer's live position (and the shop),
// re-fitting as the customer moves. Lazy-loaded so the map library never lands in the main bundle.
import { useEffect, useRef, useState } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import "../lib/maplibre-setup";
import { Navigation, Store, User } from "lucide-react";
import { MAP_STYLE, googleMapsUrl } from "../lib/map";
import { distanceKm, km, timeAgo } from "../lib/format";

function useTick(ms = 5000) {
  const [, set] = useState(0);
  useEffect(() => {
    const t = setInterval(() => set((x) => x + 1), ms);
    return () => clearInterval(t);
  }, [ms]);
}

/**
 * approx = true: pending order – only a ~1 km area (no pin, no navigation), so the mechanic can judge
 * the distance before accepting without learning the customer's exact spot.
 */
export default function CustomerLocationMap({ location, shop, approx = false, distance }) {
  useTick();
  const mapRef = useRef(null);
  const [ready, setReady] = useState(false);
  const hasShop = shop?.latitude != null && shop?.longitude != null;

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready) return;
    if (hasShop) {
      map.fitBounds(
        [
          [Math.min(location.longitude, shop.longitude), Math.min(location.latitude, shop.latitude)],
          [Math.max(location.longitude, shop.longitude), Math.max(location.latitude, shop.latitude)],
        ],
        { padding: { top: 64, bottom: 40, left: 56, right: 72 }, maxZoom: 15, duration: 700 }
      );
    } else {
      map.easeTo({ center: [location.longitude, location.latitude], zoom: 15, duration: 700 });
    }
  }, [location.latitude, location.longitude, ready, hasShop, shop?.latitude, shop?.longitude]);

  const dist = distance ?? (hasShop ? distanceKm(shop, location) : null);
  const fresh = !approx && Date.now() - new Date(location.updatedAt).getTime() < 60_000;

  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-slate-200" data-testid={approx ? "customer-area" : "customer-location"} data-lat={location.latitude} data-lng={location.longitude}>
      <div className="relative h-52">
        <Map
          ref={mapRef}
          initialViewState={{ latitude: location.latitude, longitude: location.longitude, zoom: 14 }}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          onLoad={() => setReady(true)}
          attributionControl={{ compact: true }}
        >
          <NavigationControl position="bottom-right" showCompass={false} />
          {hasShop && (
            <Marker latitude={shop.latitude} longitude={shop.longitude} anchor="bottom">
              <span className="grid size-8 place-items-center rounded-full bg-ink-900 text-white shadow-lg ring-2 ring-white">
                <Store className="size-4" />
              </span>
            </Marker>
          )}
          {approx ? (
            <Marker latitude={location.latitude} longitude={location.longitude}>
              <span className="block size-24 rounded-full border-2 border-dashed border-emerald-600/70 bg-emerald-400/25" aria-label="Approximate customer area" />
            </Marker>
          ) : (
          <Marker latitude={location.latitude} longitude={location.longitude}>
            <span className="relative flex size-9 items-center justify-center">
              {fresh && <span className="absolute inset-0 animate-ping-slow rounded-full bg-emerald-400/60" />}
              <span className="relative grid size-7 place-items-center rounded-full bg-emerald-500 text-white shadow-lg ring-[3px] ring-white">
                <User className="size-3.5" />
              </span>
            </span>
          </Marker>
          )}
        </Map>
        <span className={`absolute top-2 left-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow ${fresh ? "bg-emerald-500 text-white" : "bg-white text-slate-600"}`}>
          <span className={`size-1.5 rounded-full ${fresh ? "animate-pulse bg-white" : "bg-slate-400"}`} />
          {approx ? "Approximate area" : <>{fresh ? "Live" : "Last known"} · {timeAgo(location.updatedAt)}</>}
        </span>
      </div>
      <div className="flex items-center justify-between gap-3 bg-white px-3 py-2.5 text-sm">
        <span className="text-slate-600">
          {dist != null ? <>≈ <b className="text-ink-900">{km(dist)}</b> from your shop</> : "Customer location"}
          {!approx && location.accuracy ? <span className="text-xs text-slate-400"> · ±{location.accuracy} m</span> : null}
        </span>
        {approx ? (
          <span className="shrink-0 text-xs font-medium text-slate-500">Exact location after you accept</span>
        ) : (
        <a href={googleMapsUrl(location)} target="_blank" rel="noopener noreferrer" className="flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
          <Navigation className="size-3.5" /> Navigate
        </a>
        )}
      </div>
    </div>
  );
}
