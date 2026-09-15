import "./index.css";
import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./App";
import { initSentry } from "./lib/sentry";

// Monitoreo de errores en producción (no-op si no hay VITE_SENTRY_DSN).
initSentry();

// Si al navegar falla la carga de un módulo (típico tras un despliegue nuevo:
// el "pedazo" viejo ya no existe), recargamos una sola vez para traer la
// versión actual y evitar la pantalla en blanco.
function recargarUnaVez() {
  try {
    const k = "lastChunkReload";
    const last = Number(sessionStorage.getItem(k) || 0);
    if (Date.now() - last < 10000) return; // recargamos hace poco: evita bucles
    sessionStorage.setItem(k, String(Date.now()));
  } catch { /* sin storage: recarga igual */ }
  window.location.reload();
}
window.addEventListener("vite:preloadError", (e) => { e.preventDefault(); recargarUnaVez(); });
window.addEventListener("error", (e) => {
  const msg = String((e && (e as ErrorEvent).message) || "");
  if (/dynamically imported module|Importing a module script failed|Failed to fetch dynamically/i.test(msg)) recargarUnaVez();
});

const rootEl = document.getElementById("root");
if (rootEl) {
  ReactDOM.createRoot(rootEl).render(<App />);
}

// Registra el service worker: habilita instalar la app en el PC/celular (PWA).
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
