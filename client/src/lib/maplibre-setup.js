// MapLibre 6 draws the map in a Web Worker loaded from a separate file.
// Bundle that worker with Vite (including the code it shares with the main library)
// and tell MapLibre where it is – otherwise production builds can't find it and the map stays blank.
// Imported only by map pages, so the map library stays out of the main bundle.
import { setWorkerUrl } from "maplibre-gl";
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";

setWorkerUrl(workerUrl);
