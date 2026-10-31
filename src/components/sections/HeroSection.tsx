"use client";

import React from "react";
import { Sparkles, Compass, Users } from "lucide-react";

interface HeroSectionProps {
  onOpenAccess: (context?: string) => void;
}

export function HeroSection({ onOpenAccess }: HeroSectionProps) {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-white pt-8 pb-16 sm:pt-12 sm:pb-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Columna izquierda: Presentación principal */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#836DAD]/25 bg-[#F6F3FA] px-3.5 py-1.5 text-xs font-semibold text-[#836DAD]">
              <Sparkles className="h-3.5 w-3.5 text-[#836DAD]" />
              <span>Conectando bienestar</span>
            </div>

            <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[#2B1F42] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]">
              Tu bienestar,{" "}
              <span className="text-[#836DAD]">sin distancias.</span>
            </h1>

            <p className="mt-5 text-base sm:text-lg leading-relaxed text-[#2B1F42]/80">
              Descubrí un espacio de conexión, equilibrio y crecimiento personal. Reiki,
              meditación, tarot, constelaciones familiares y muchas otras experiencias,
              acompañadas por profesionales desde donde estés.
            </p>

            {/* Accesos sugeridos oficiales: «Encontrá tu terapia» y «Conocé a los profesionales» */}
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <a
                href="#terapias"
                className="inline-flex items-center gap-2 rounded-2xl bg-[#836DAD] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#836DAD]/25 transition-all hover:bg-[#6E5898]"
              >
                <Compass className="h-4 w-4 text-[#F3D791]" />
                <span>Encontrá tu terapia</span>
              </a>

              <a
                href="#profesionales"
                className="inline-flex items-center gap-2 rounded-2xl border-2 border-[#836DAD] bg-white px-6 py-3.5 text-sm font-semibold text-[#836DAD] transition-all hover:bg-[#F6F3FA]"
              >
                <Users className="h-4 w-4" />
                <span>Conocé a los profesionales</span>
              </a>
            </div>

            {/* Nota rápida de exploración libre (Criterio 11) */}
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-[#2B1F42]/70">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#836DAD]" />
                Exploración libre sin registro previo
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#F3D791]" />
                Sesiones online a distancia y presenciales
              </span>
              <button
                type="button"
                onClick={() => onOpenAccess()}
                className="cursor-pointer font-semibold text-[#836DAD] underline underline-offset-4 hover:text-[#5E4987]"
              >
                Ingreso directo a Terapias Online →
              </button>
            </div>
          </div>

          {/* Columna derecha: Fotografía cálida principal + Bloque institucional con logo oficial */}
          <div className="lg:col-span-6">
            <div className="relative mx-auto max-w-xl lg:max-w-none">
              <div className="overflow-hidden rounded-3xl border border-[#836DAD]/20 bg-[#F6F3FA] shadow-xl shadow-[#836DAD]/12">
                <img
                  src="/images/hero-espacio.png"
                  alt="Espacio sereno de meditación y bienestar con flores de lavanda y velas cálidas"
                  width={840}
                  height={404}
                  fetchPriority="high"
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>

              {/* Bloque institucional con el PNG maestro oficial sobre lavanda #836DAD y margen libre >=10% */}
              <div className="mt-4 flex flex-col items-center justify-between gap-4 rounded-3xl bg-[#836DAD] p-5 sm:flex-row sm:px-7 sm:py-5 text-white shadow-lg">
                <div className="shrink-0 px-2 py-1">
                  <img
                    src="/brand/Reiki_Online_Lavanda_Unificado.png"
                    alt="Reiki online — CONECTANDO BIENESTAR"
                    width={180}
                    height={90}
                    className="h-14 sm:h-16 w-auto object-contain"
                  />
                </div>
                <p className="text-center sm:text-left text-xs sm:text-sm leading-relaxed text-white/95">
                  Una identidad simple, cercana y reconocible para conectar{" "}
                  <strong className="font-semibold text-[#F3D791]">reikistas</strong>,{" "}
                  <strong className="font-semibold text-[#F3D791]">terapeutas</strong> y{" "}
                  <strong className="font-semibold text-[#F3D791]">consultantes</strong>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
