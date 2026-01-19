import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/pwa-192.png", "icons/pwa-512.png"],
      manifest: {
        name: "Newhaven Gig Status",
        short_name: "Gig Status",
        description: "Newhaven wind, tide, and wave decision helper for gig rowing.",
        theme_color: "#0b1b2b",
        background_color: "#0b1b2b",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icons/pwa-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/pwa-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ]
});
