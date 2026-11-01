"use client";

import React, { useState, useEffect } from "react";
import { Menu, X, Sparkles, Download } from "lucide-react";
import { NAV_ITEMS } from "@/lib/reiki-data";

interface HeaderProps {
  onOpenAccess: () => void;
}

export function Header({ onOpenAccess }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 16);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleInstallPwa = () => {
    const win = window as unknown as { __instalarReikiPwa?: () => void };
    if (win.__instalarReikiPwa) {
      win.__instalarReikiPwa();
    }
  };

  return (
    <header
      className={`sticky top-0 z-40 w-full bg-[#836DAD] text-white transition-shadow duration-300 ${
        scrolled
          ? "shadow-lg shadow-[#2B1F42]/20 border-b border-white/15"
          : "border-b border-white/10"
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        {/* Isologotipo oficial a la izquierda:
            En navegación compacta (móvil) usa la R con punto (1:1) y en escritorio el logo completo (2:1),
            conservando fondo #836DAD y margen libre del 10% (Manual de Marca págs. 5, 6 y 8) */}
        <a
          href="#inicio"
          className="flex shrink-0 items-center py-1 pr-2 focus:outline-none"
          aria-label="Reiki Online — Conectando bienestar (Ir al inicio)"
        >
          {/* Navegación compacta móvil: R con punto */}
          <img
            src="/brand/Reiki_Icono_Lavanda_Unificado.png"
            alt="Reiki Online"
            width={48}
            height={48}
            fetchPriority="high"
            className="h-12 w-12 object-contain sm:hidden"
          />
          {/* Zona amplia en tablet/escritorio: Logo completo (proporción 2:1, 1774x887) */}
          <img
            src="/brand/Reiki_Online_Lavanda_Unificado.png"
            alt="Reiki online — CONECTANDO BIENESTAR"
            width={168}
            height={84}
            fetchPriority="high"
            className="hidden h-14 w-auto object-contain sm:block lg:h-16"
          />
        </a>

        {/* Menú oficial: «Inicio · Quiénes somos · Terapias · Cómo funciona · Profesionales · Contacto» */}
        <nav
          aria-label="Navegación principal"
          className="hidden lg:flex items-center gap-1 xl:gap-2"
        >
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium text-white/95 transition-colors hover:bg-white/10 hover:text-[#F3D791]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        {/* Acciones derechas en escritorio: Instalar PWA + Botón destacado «Acceso a Terapias Online» */}
        <div className="hidden md:flex shrink-0 items-center gap-2.5">
          <button
            type="button"
            onClick={handleInstallPwa}
            title="Instalar aplicación PWA en tu dispositivo"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-2 text-xs font-semibold text-white transition-colors hover:border-[#F3D791] hover:text-[#F3D791]"
          >
            <Download className="h-3.5 w-3.5 text-[#F3D791]" />
            <span>Instalar App</span>
          </button>

          <button
            type="button"
            onClick={onOpenAccess}
            className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl bg-[#F3D791] py-2 pr-4 pl-2.5 text-xs xl:text-sm font-semibold text-[#2B1F42] shadow-md transition-all hover:bg-white active:scale-[0.99]"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#836DAD]/30 bg-[#836DAD] p-0.5">
              <img
                src="/brand/Reiki_Icono_Lavanda_Unificado.png"
                alt=""
                width={28}
                height={28}
                className="h-full w-full object-contain"
              />
            </span>
            <span>Acceso a Terapias Online</span>
          </button>
        </div>

        {/* Controles móviles */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={onOpenAccess}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#F3D791] py-1.5 pr-3 pl-2 text-xs font-semibold text-[#2B1F42] shadow-sm transition-colors hover:bg-white"
          >
            <span className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#836DAD]/30 bg-[#836DAD] p-0.5">
              <img
                src="/brand/Reiki_Icono_Lavanda_Unificado.png"
                alt=""
                width={24}
                height={24}
                className="h-full w-full object-contain"
              />
            </span>
            <span>Acceso a Terapias Online</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-controls="reiki-mobile-menu"
            aria-label={mobileMenuOpen ? "Cerrar menú de navegación" : "Abrir menú de navegación"}
            className="inline-flex items-center justify-center rounded-xl border border-white/25 bg-white/10 p-2.5 text-white transition-colors hover:border-[#F3D791] hover:text-[#F3D791]"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Menú móvil desplegable */}
      {mobileMenuOpen && (
        <div
          id="reiki-mobile-menu"
          className="border-t border-white/15 bg-[#836DAD] px-4 pt-3 pb-6 shadow-2xl lg:hidden"
        >
          <nav aria-label="Menú móvil" className="flex flex-col space-y-1">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-3.5 py-3 text-base font-medium text-white transition-colors hover:bg-white/10 hover:text-[#F3D791]"
              >
                <span>{item.label}</span>
                <span className="text-xs font-semibold text-[#F3D791]">→</span>
              </a>
            ))}
          </nav>

          <div className="mt-4 flex flex-col gap-2.5 border-t border-white/15 pt-4">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAccess();
              }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#F3D791] px-4 py-3 text-sm font-semibold text-[#2B1F42] transition-colors hover:bg-white"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#836DAD]/30 bg-[#836DAD] p-0.5">
                <img
                  src="/brand/Reiki_Icono_Lavanda_Unificado.png"
                  alt=""
                  width={28}
                  height={28}
                  className="h-full w-full object-contain"
                />
              </span>
              <span>Acceso a Terapias Online</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                handleInstallPwa();
              }}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:border-[#F3D791] hover:text-[#F3D791]"
            >
              <Download className="h-4 w-4 text-[#F3D791]" />
              <span>Instalar como App (PWA)</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
