import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173 },
  preview: { port: 4173 },
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
