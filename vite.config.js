import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    // Service worker : l'app (HTML, JS, icônes) est gardée sur l'appareil et s'ouvre sans réseau.
    // Les appels à Supabase ne passent jamais par le cache : seules les ressources de l'app sont concernées.
    VitePWA({
      registerType: "autoUpdate", // une nouvelle version déployée est récupérée toute seule
      injectRegister: false, // l'enregistrement est fait dans src/main.jsx
      manifest: false, // pas de manifeste : le comportement du raccourci iPhone ne change pas
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
      },
    }),
  ],
});
