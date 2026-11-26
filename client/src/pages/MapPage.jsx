import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import Map, { GeolocateControl, Marker, NavigationControl, Popup } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, Crosshair, MapPin, Search, Store, Wrench } from "lucide-react";
import { api, errorMessage } from "../lib/api";
import { DEFAULT_CENTER, MAP_STYLE, useGeolocation } from "../lib/map";
import { distanceKm, km, minPrice, money } from "../lib/format";
import { GearLoader } from "../components/mech";
import { Button } from "../components/ui";
import { ease, fadeUp, stagger } from "../lib/motion";

function useDebounced(value, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Pin({ selected, index }) {
  return (
    <motion.div
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1, scale: selected ? 1.25 : 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 20, delay: Math.min(index * 0.04, 0.4) }}
      className="relative cursor-pointer"
      style={{ transformOrigin: "50% 100%" }}
    >
      {selected && <span className="absolute top-[30%] left-1/2 size-10 -translate-x-1/2 -translate-y-1/2 animate-ping-slow rounded-full bg-accent-400/50" />}
      <MapPin className={`relative size-10 drop-shadow-md ${selected ? "fill-accent-400 text-ink-900" : "fill-brand-600 text-white"}`} strokeWidth={1.6} />
    </motion.div>
  );
}

function ShopRow({ shop, active, onSelect }) {
  const from = minPrice(shop.services);
  return (
    <motion.li variants={fadeUp} data-shop={shop._id}>
      <button
        onClick={onSelect}
        className={`w-full rounded-2xl border p-4 text-left transition-all duration-200 ease-brand ${active ? "border-brand-400 bg-brand-50/60 shadow-md ring-2 ring-brand-500/15" : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${active ? "bg-brand-600 text-white" : "bg-slate-100 text-slate-600"}`}>
              <Store className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate font-semibold text-ink-900">{shop.shopname}</p>
              <p className="truncate text-xs text-slate-500">{shop.address || `by ${shop.username}`}</p>
            </div>
          </div>
          {shop.distance != null && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{km(shop.distance)}</span>}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {shop.services.slice(0, 3).map((s) => (
            <span key={s._id} className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600 ring-1 ring-slate-200">
              {s.serviceName}
            </span>
          ))}
          {shop.services.length > 3 && <span className="text-xs text-slate-400">+{shop.services.length - 3} more</span>}
          {from != null && <span className="ml-auto text-xs font-semibold text-brand-700">from {money(from)}</span>}
        </div>
      </button>
    </motion.li>
  );
}

export default function MapPage() {
  const [shops, setShops] = useState(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(null);
  const q = useDebounced(query);
  const { position, status, locate, setPosition } = useGeolocation();
  const mapRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/mechanics", { params: q ? { q } : {} })
      .then(({ data }) => !cancelled && (setShops(data), setError("")))
      .catch((err) => !cancelled && setError(errorMessage(err)));
    return () => {
      cancelled = true;
    };
  }, [q]);

  const sorted = useMemo(() => {
    if (!shops) return [];
    const withDist = shops.map((s) => ({ ...s, distance: position ? distanceKm(position, s) : null }));
    return position ? withDist.sort((a, b) => a.distance - b.distance) : withDist;
  }, [shops, position]);

  const selected = sorted.find((s) => s._id === selectedId);

  // zoom the map to show every shop once they are loaded (and after each search)
  const [mapReady, setMapReady] = useState(false);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !shops?.length) return;
    if (shops.length === 1) {
      map.flyTo({ center: [shops[0].longitude, shops[0].latitude], zoom: 14, duration: 800 });
      return;
    }
    const lngs = shops.map((s) => s.longitude);
    const lats = shops.map((s) => s.latitude);
    map.fitBounds(
      [
        [Math.min(...lngs), Math.min(...lats)],
        [Math.max(...lngs), Math.max(...lats)],
      ],
      { padding: 70, maxZoom: 14, duration: 800 }
    );
  }, [shops, mapReady]);

  const select = (shop, fly = true) => {
    setSelectedId(shop._id);
    if (fly) mapRef.current?.flyTo({ center: [shop.longitude, shop.latitude], zoom: 14.5, duration: 900 });
    listRef.current?.querySelector(`[data-shop="${shop._id}"]`)?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  const nearMe = async () => {
    const pos = await locate();
    if (pos) mapRef.current?.flyTo({ center: [pos.longitude, pos.latitude], zoom: 13, duration: 1200 });
  };

  return (
    <div className="flex h-[calc(100dvh-4rem)] flex-col-reverse lg:flex-row">
      {/* list */}
      <aside className="flex min-h-0 flex-1 flex-col border-t border-slate-200 bg-slate-50 lg:w-[420px] lg:flex-none lg:border-t-0 lg:border-r">
        <div className="space-y-3 border-b border-slate-200 bg-white p-4">
          <div>
            <h1 className="text-xl font-bold">Mechanics near you</h1>
            <p className="text-sm text-slate-500">{shops ? `${sorted.length} shop${sorted.length === 1 ? "" : "s"}${position ? " · sorted by distance" : ""}` : "Loading shops…"}</p>
          </div>
          <div className="flex gap-2">
            <label className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
              <input className="input pl-9" placeholder="Search shop or service" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search mechanics" />
            </label>
            <Button variant={position ? "secondary" : "primary"} onClick={nearMe} loading={status === "locating"} title="Use my location" aria-label="Use my location">
              <Crosshair className="size-4" /> <span className="hidden sm:inline">Near me</span>
            </Button>
          </div>
          {status === "denied" && <p className="text-xs text-rose-600">Location permission was denied. Enable it in your browser to sort by distance.</p>}
        </div>

        <div ref={listRef} className="min-h-0 flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>
          ) : !shops ? (
            <div className="grid h-40 place-items-center">
              <GearLoader label="Finding mechanics" />
            </div>
          ) : sorted.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <span className="grid size-14 place-items-center rounded-2xl bg-white text-slate-400 ring-1 ring-slate-200">
                <Wrench className="size-6" />
              </span>
              <p className="mt-4 font-semibold text-ink-900">{q ? `No shops match "${q}"` : "No mechanics registered yet"}</p>
              <p className="mt-1 text-sm text-slate-500">{q ? "Try another service name." : "Are you a mechanic? Be the first on the map!"}</p>
              {!q && (
                <Button to="/mechanic/register" size="sm" className="mt-5">
                  Register your garage
                </Button>
              )}
            </div>
          ) : (
            <motion.ul key={q} className="space-y-3" initial="hidden" animate="show" variants={stagger(0.04)}>
              {sorted.map((shop) => (
                <ShopRow key={shop._id} shop={shop} active={shop._id === selectedId} onSelect={() => select(shop)} />
              ))}
            </motion.ul>
          )}
        </div>
      </aside>

      {/* map */}
      <div className="relative h-[42vh] shrink-0 lg:h-auto lg:flex-1">
        <Map
          ref={mapRef}
          initialViewState={{ ...DEFAULT_CENTER, zoom: 11.5 }}
          mapStyle={MAP_STYLE}
          style={{ width: "100%", height: "100%" }}
          onClick={() => setSelectedId(null)}
          onLoad={() => setMapReady(true)}
        >
          <NavigationControl position="bottom-right" />
          <GeolocateControl position="bottom-right" trackUserLocation onGeolocate={(e) => setPosition({ latitude: e.coords.latitude, longitude: e.coords.longitude })} />

          {sorted.map((shop, i) => (
            <Marker
              key={shop._id}
              latitude={shop.latitude}
              longitude={shop.longitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                select(shop, false);
              }}
            >
              <Pin selected={shop._id === selectedId} index={i} />
            </Marker>
          ))}

          {position && (
            <Marker latitude={position.latitude} longitude={position.longitude}>
              <span className="relative flex size-5">
                <span className="absolute inset-0 animate-ping-slow rounded-full bg-sky-400/60" />
                <span className="relative size-5 rounded-full border-[3px] border-white bg-sky-500 shadow" />
              </span>
            </Marker>
          )}

          {selected && (
            <Popup latitude={selected.latitude} longitude={selected.longitude} anchor="bottom" offset={44} closeOnClick={false} onClose={() => setSelectedId(null)} maxWidth="280px">
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25, ease }} className="w-64 p-4">
                <p className="pr-6 font-display text-base font-bold text-ink-900">{selected.shopname}</p>
                <p className="text-xs text-slate-500">by {selected.username}{selected.distance != null && ` · ${km(selected.distance)} away`}</p>
                <p className="mt-3 text-sm text-slate-600">
                  {selected.services.length} service{selected.services.length === 1 ? "" : "s"}
                  {minPrice(selected.services) != null && <> · from <b className="text-brand-700">{money(minPrice(selected.services))}</b></>}
                </p>
                <Link to={`/store/${selected._id}`} className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-brand-600 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                  View shop & book <ArrowRight className="size-4" />
                </Link>
              </motion.div>
            </Popup>
          )}
        </Map>

        <AnimatePresence>
          {shops && sorted.length > 0 && !selectedId && (
            <motion.p
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 rounded-full bg-ink-900/85 px-3 py-1.5 text-xs font-semibold whitespace-nowrap text-white shadow-lg"
            >
              Tap a pin to see the shop
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
