import { useCallback, useState } from "react";

// OpenStreetMap data rendered by MapLibre with free OpenFreeMap tiles – no API key needed.
export const MAP_STYLE = import.meta.env.VITE_MAP_STYLE || "https://tiles.openfreemap.org/styles/liberty";
/** Default view: Dhaka (same as the original project). */
export const DEFAULT_CENTER = { latitude: 23.7808875, longitude: 90.2792371 };

export const googleMapsUrl = ({ latitude, longitude }) => `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

/** Current position once (resolves null if denied / unavailable / too slow). */
export const getPositionOnce = (timeout = 8000) =>
  new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: Math.round(p.coords.accuracy) }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: 30_000 }
    );
  });

/** Browser geolocation with a simple status. */
export function useGeolocation() {
  const [position, setPosition] = useState(null);
  const [status, setStatus] = useState("idle"); // idle | locating | ok | denied | unavailable

  const locate = useCallback(
    () =>
      new Promise((resolve) => {
        if (!navigator.geolocation) {
          setStatus("unavailable");
          return resolve(null);
        }
        setStatus("locating");
        navigator.geolocation.getCurrentPosition(
          (p) => {
            const pos = { latitude: p.coords.latitude, longitude: p.coords.longitude };
            setPosition(pos);
            setStatus("ok");
            resolve(pos);
          },
          () => {
            setStatus("denied");
            resolve(null);
          },
          { enableHighAccuracy: true, timeout: 12_000 }
        );
      }),
    []
  );

  return { position, status, locate, setPosition };
}
