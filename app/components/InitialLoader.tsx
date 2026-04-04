"use client";

import { useEffect, useState } from "react";

const FIRST_LOAD_STORAGE_KEY = "sistema-permisos:first-load-complete";
const SHOW_MS = 1600;
const FADE_MS = 450;

export default function InitialLoader() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "fading">("hidden");

  useEffect(() => {
    try {
      const alreadyShown = window.localStorage.getItem(FIRST_LOAD_STORAGE_KEY);
      if (alreadyShown === "1") {
        return;
      }

      const showTimer = window.setTimeout(() => {
        setPhase("visible");
      }, 0);

      const fadeTimer = window.setTimeout(() => {
        setPhase("fading");
      }, SHOW_MS);

      const hideTimer = window.setTimeout(() => {
        setPhase("hidden");
        window.localStorage.setItem(FIRST_LOAD_STORAGE_KEY, "1");
      }, SHOW_MS + FADE_MS);

      return () => {
        window.clearTimeout(showTimer);
        window.clearTimeout(fadeTimer);
        window.clearTimeout(hideTimer);
      };
    } catch {
      // Si localStorage no esta disponible, evita romper la app.
      return;
    }
  }, []);

  if (phase === "hidden") {
    return null;
  }

  return (
    <div
      className={`initial-loader ${phase === "fading" ? "initial-loader--fade" : ""}`}
      role="status"
      aria-live="polite"
      aria-label="Cargando plataforma"
    >
      <div className="initial-loader__orb initial-loader__orb--one" />
      <div className="initial-loader__orb initial-loader__orb--two" />

      <div className="initial-loader__card">
        <div className="initial-loader__spinner" />
        <p className="initial-loader__title">SISTEMAS - TI</p>
        <p className="initial-loader__subtitle">Inicializando plataforma de permisos QR</p>
      </div>
    </div>
  );
}
