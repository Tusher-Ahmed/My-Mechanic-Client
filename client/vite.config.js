import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  // maplibre-gl 6 loads its worker from a sibling file; pre-bundling would break that path
  optimizeDeps: { exclude: ["maplibre-gl"] },
  preview: { port: 4173 },
  worker: { format: "es" }, // MapLibre starts its worker as an ES module
  build: {
    chunkSizeWarningLimit: 1100, // maplibre (map pages only, lazy-loaded)
    rollupOptions: {
      output: {
        // keep the heavy map library in its own chunk (only loaded on map pages)
        manualChunks: (id) => (id.includes("maplibre-gl") ? "maplibre" : undefined),
      },
    },
  },
});
