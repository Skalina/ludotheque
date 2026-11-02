import React from "react";
import ReactDOM from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.jsx";

// Service worker (production seulement) : l'app s'ouvre sans réseau, et une nouvelle version déployée est récupérée automatiquement.
if (import.meta.env.PROD) {
  registerSW({
    immediate: true,
    onOfflineReady() {
      window.__ltOfflineReady = true;
      window.dispatchEvent(new Event("ludotheque:offline-ready"));
    },
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
