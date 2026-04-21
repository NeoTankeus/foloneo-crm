import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
  build: {
    // Code-splitting : vendor chunks pour reduire le bundle initial.
    // React reste chemin critique ; recharts / supabase / icons sortent en chunks
    // separes, caches longtemps, ne se re-telechargent qu'en cas d'update.
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("react/") || id.includes("scheduler")) return "vendor-react";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("recharts") || id.includes("d3-")) return "vendor-charts";
            if (id.includes("lucide-react")) return "vendor-icons";
            if (id.includes("maplibre-gl")) return "vendor-map";
            if (id.includes("xlsx")) return "vendor-xlsx";
          }
        },
      },
    },
    chunkSizeWarningLimit: 600,
    sourcemap: false,
  },
});
