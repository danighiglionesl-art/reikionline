"use client";

import React, { useEffect, useState } from "react";
import { Download, RefreshCw, Sparkles, X, Smartphone, Share } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export function PwaManager() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [updateWaiting, setUpdateWaiting] = useState<ServiceWorker | null>(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Expose custom trigger so Header or Footer can trigger PWA installation
    (window as unknown as { __instalarReikiPwa?: () => void }).__instalarReikiPwa = () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => setDeferredPrompt(null));
      } else {
        setShowIosGuide(true);
      }
    };

    if ("serviceWorker" in navigator) {
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });

      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          reg.update().catch(() => {});
          if (reg.waiting) {
            setUpdateWaiting(reg.waiting);
          }
          reg.addEventListener("updatefound", () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener("statechange", () => {
                if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                  setUpdateWaiting(newWorker);
                }
              });
            }
          });
        })
        .catch(() => {});
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    };
  }, [deferredPrompt]);

  const applyUpdate = () => {
    if (updateWaiting) {
      updateWaiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  return (
    <>
      {updateWaiting && (
        <div className="fixed top-20 left-4 right-4 z-50 mx-auto max-w-md">
          <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-[#F3D791] bg-[#836DAD] p-3.5 text-white shadow-2xl">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3D791]/20 text-[#F3D791]">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-semibold leading-tight">Nueva versión disponible</p>
                <p className="text-[11px] text-white/85">Actualizá Reiki Online al instante</p>
              </div>
            </div>
            <button
              type="button"
              onClick={applyUpdate}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#F3D791] px-3 py-1.5 text-xs font-semibold text-[#2B1F42] transition-colors hover:bg-white"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      )}

      {showIosGuide && !isStandalone && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B1F42]/75 p-4 backdrop-blur-sm"
          role="region"
          aria-label="Instrucciones para instalar la aplicación PWA"
        >
          <div className="relative w-full max-w-md rounded-3xl border border-[#836DAD]/25 bg-white p-6 text-[#2B1F42] shadow-2xl">
            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              aria-label="Cerrar guía de instalación"
              className="absolute top-4 right-4 rounded-full p-2 text-[#2B1F42]/60 transition-colors hover:bg-[#836DAD]/10 hover:text-[#836DAD]"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-3.5">
              <div className="overflow-hidden rounded-2xl border border-[#836DAD]/20 bg-[#836DAD] p-1.5">
                <img
                  src="/brand/Reiki_Icono_Lavanda_Unificado.png"
                  alt="Ícono Reiki Online"
                  width={48}
                  height={48}
                  className="h-12 w-12 object-contain"
                />
              </div>
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#836DAD]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#836DAD]">
                  <Smartphone className="h-3 w-3" />
                  Aplicación Web Progresiva (PWA)
                </span>
                <h3 className="mt-1 text-lg font-semibold text-[#2B1F42]">
                  Instalar Reiki Online
                </h3>
              </div>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-[#2B1F42]/80">
              Podés instalar <strong>Reiki Online</strong> en la pantalla de inicio de tu celular,
              tablet o computadora para ingresar directo como aplicación:
            </p>

            {deferredPrompt ? (
              <button
                type="button"
                onClick={() => {
                  deferredPrompt.prompt();
                  deferredPrompt.userChoice.then(() => {
                    setDeferredPrompt(null);
                    setShowIosGuide(false);
                  });
                }}
                className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#836DAD] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#6E5898]"
              >
                <Download className="h-4 w-4 text-[#F3D791]" />
                <span>Instalar aplicación ahora</span>
              </button>
            ) : (
              <div className="mt-4 space-y-3 rounded-2xl bg-[#F6F3FA] p-4 text-xs leading-relaxed text-[#2B1F42]/85">
                <p className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#836DAD] text-[11px] font-semibold text-white">
                    1
                  </span>
                  <span>
                    En <strong>Android / Chrome / Edge</strong>: tocá el menú del navegador (⋮) y
                    elegí <strong>«Instalar aplicación»</strong> o{" "}
                    <strong>«Agregar a la pantalla principal»</strong>.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#836DAD] text-[11px] font-semibold text-white">
                    2
                  </span>
                  <span>
                    En <strong>iPhone / iPad (Safari)</strong>: tocá el botón{" "}
                    <Share className="inline h-3.5 w-3.5 text-[#836DAD]" />{" "}
                    <strong>Compartir</strong> y seleccioná{" "}
                    <strong>«Agregar a inicio»</strong>.
                  </span>
                </p>
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="mt-4 w-full cursor-pointer rounded-xl border border-[#836DAD]/25 py-2.5 text-xs font-semibold text-[#836DAD] transition-colors hover:bg-[#836DAD]/8"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
}
