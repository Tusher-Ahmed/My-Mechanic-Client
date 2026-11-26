import { useRef } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import "../lib/maplibre-setup";
import { Crosshair, MapPin } from "lucide-react";
import { Button } from "./ui";
import { DEFAULT_CENTER, MAP_STYLE, useGeolocation } from "../lib/map";

/** Pick a shop location: click the map, drag the pin, or use the device location. */
export default function LocationPicker({ value, onChange }) {
  const mapRef = useRef(null);
  const { status, locate } = useGeolocation();
  const has = value?.latitude != null && value?.longitude != null && value.latitude !== "" && value.longitude !== "";

  const useMine = async () => {
    const pos = await locate();
    if (!pos) return;
    onChange(pos);
    mapRef.current?.flyTo({ center: [pos.longitude, pos.latitude], zoom: 15, duration: 1200 });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={useMine} loading={status === "locating"}>
          <Crosshair className="size-4" /> Use my current location
        </Button>
        {status === "denied" && <span className="text-xs text-rose-600">Location permission denied – pick on the map instead.</span>}
      </div>

      <div className="relative h-72 overflow-hidden rounded-2xl ring-1 ring-slate-200 sm:h-80">
          <Map
            ref={mapRef}
            initialViewState={{ ...(has ? value : DEFAULT_CENTER), zoom: has ? 14 : 11 }}
            mapStyle={MAP_STYLE}
            onClick={(e) => onChange({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })}
            cursor="crosshair"
          >
            <NavigationControl position="bottom-right" showCompass={false} />
            {has && (
              <Marker
                latitude={Number(value.latitude)}
                longitude={Number(value.longitude)}
                anchor="bottom"
                draggable
                onDragEnd={(e) => onChange({ latitude: e.lngLat.lat, longitude: e.lngLat.lng })}
              >
                <MapPin className="size-10 cursor-grab fill-brand-600 text-white drop-shadow-lg" />
              </Marker>
            )}
          </Map>
          {!has && (
            <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
              <span className="rounded-full bg-ink-900/85 px-3 py-1.5 text-xs font-semibold text-white">Click on the map to place your shop</span>
            </div>
          )}
        </div>

      <div className="grid grid-cols-2 gap-3">
        {["latitude", "longitude"].map((k) => (
          <label key={k} className="text-xs font-medium text-slate-500 capitalize">
            {k}
            <input
              className="input mt-1"
              type="number"
              step="any"
              value={value?.[k] ?? ""}
              onChange={(e) => onChange({ ...value, [k]: e.target.value === "" ? "" : Number(e.target.value) })}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
