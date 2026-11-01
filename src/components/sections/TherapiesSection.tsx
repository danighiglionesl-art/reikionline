"use client";

import React, { useState, useEffect, useMemo } from "react";
import { THERAPY_CATEGORIES, TherapyCategory, TherapySpecialty } from "@/lib/reiki-data";
import { Sparkles, ChevronRight, Clock, Globe2, CalendarCheck, X } from "lucide-react";

const CUSTOM_OPTIONS_STORAGE_KEY = "reiki_online_custom_therapy_options_v1";
const SYNC_EVENT_NAME = "reiki-online-catalog-sync";

interface TherapiesSectionProps {
  onRequestBooking: (specialtyLabel: string) => void;
}

export function TherapiesSection({ onRequestBooking }: TherapiesSectionProps) {
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [showAllExplorer, setShowAllExplorer] = useState(false);
  const [approvedCustomOptions, setApprovedCustomOptions] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;

    const loadCustomOptions = () => {
      try {
        const saved = window.localStorage.getItem(CUSTOM_OPTIONS_STORAGE_KEY);
        if (saved) {
          setApprovedCustomOptions(JSON.parse(saved) as Record<string, string[]>);
        }
      } catch {
        // Ignore storage read errors
      }
    };

    loadCustomOptions();
    window.addEventListener(SYNC_EVENT_NAME, loadCustomOptions);
    window.addEventListener("storage", loadCustomOptions);

    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, loadCustomOptions);
      window.removeEventListener("storage", loadCustomOptions);
    };
  }, []);

  const categoriesWithCustom: TherapyCategory[] = useMemo(() => {
    return THERAPY_CATEGORIES.map((cat) => {
      const extraNames = approvedCustomOptions[cat.id] ?? [];
      if (extraNames.length === 0) return cat;

      const existingSet = new Set(cat.specialties.map((s) => s.name));
      const extraSpecialties: TherapySpecialty[] = extraNames
        .filter((name) => !existingSet.has(name))
        .map((name) => ({
          name,
          modality: "Presencial y Online",
          duration: "45 a 60 min",
          summary: `Sesión personalizada de ${name} disponible en modalidad online a distancia o presencial.`,
        }));

      return {
        ...cat,
        specialties: [...cat.specialties, ...extraSpecialties],
      };
    });
  }, [approvedCustomOptions]);

  const activeCategory = useMemo(
    () => categoriesWithCustom.find((c) => c.id === activeCategoryId) ?? null,
    [categoriesWithCustom, activeCategoryId]
  );

  return (
    <section id="terapias" className="border-t border-[#836DAD]/15 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Encabezado 05. Nuestras terapias */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#836DAD]/12 px-3.5 py-1 text-xs font-semibold text-[#836DAD]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Nuestras terapias</span>
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-semibold text-[#2B1F42]">
            Seis grandes categorías para descubrir tu experiencia
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#2B1F42]/80">
            Vinculadas con el catálogo oficial de Consultante y Terapeuta. Explorá todas las especialidades y hacé clic en cualquiera para ingresar o seleccionarla directamente.
          </p>
        </div>

        {/* Grilla de las 6 categorías oficiales vinculadas con el panel de usuario */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {categoriesWithCustom.map((cat) => (
            <article
              key={cat.id}
              className="group flex flex-col overflow-hidden rounded-3xl border border-[#836DAD]/20 bg-[#F6F3FA] shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-[#836DAD]/45 hover:shadow-lg"
            >
              <div className="relative aspect-[5/4] w-full overflow-hidden bg-[#EAE3F5]">
                <img
                  src={cat.image}
                  alt={cat.title}
                  width={396}
                  height={320}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between p-6">
                <div>
                  <h3 className="text-xl font-semibold text-[#2B1F42]">{cat.title}</h3>
                  <p className="mt-1.5 text-sm font-medium text-[#836DAD]">{cat.shortSubtitle}</p>
                  <p className="mt-3 text-xs sm:text-sm leading-relaxed text-[#2B1F42]/75">
                    {cat.description}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-[#836DAD]/15 pt-4">
                  <button
                    type="button"
                    onClick={() => setActiveCategoryId(cat.id)}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#836DAD] transition-colors hover:text-[#5E4987]"
                  >
                    <span>Descubrir especialidades</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>

                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-[#2B1F42]/75">
                    {cat.specialties.length} especialidades
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Botón oficial de la sección 05: «Explorar todas las terapias» */}
        <div className="mt-10 text-center">
          <button
            type="button"
            onClick={() => setShowAllExplorer((prev) => !prev)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#836DAD] px-7 py-4 text-sm sm:text-base font-semibold text-white shadow-lg shadow-[#836DAD]/25 transition-all hover:bg-[#6E5898]"
          >
            <Sparkles className="h-4 w-4 text-[#F3D791]" />
            <span>
              {showAllExplorer ? "Ocultar catálogo detallado" : "Explorar todas las terapias"}
            </span>
          </button>
        </div>

        {/* Catálogo desplegable con todas las especialidades por categoría */}
        {showAllExplorer && (
          <div className="mt-10 rounded-3xl border border-[#836DAD]/25 bg-[#F6F3FA] p-6 sm:p-8 shadow-md">
            <div className="flex items-center justify-between gap-4 border-b border-[#836DAD]/15 pb-4">
              <div>
                <h3 className="text-lg sm:text-xl font-semibold text-[#2B1F42]">
                  Explorador completo de las 6 categorías y especialidades
                </h3>
                <p className="text-xs sm:text-sm text-[#2B1F42]/75">
                  Seleccioná cualquier especialidad para abrir tu acceso con esa terapia ya marcada.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAllExplorer(false)}
                aria-label="Cerrar explorador de terapias"
                className="rounded-full p-2 text-[#2B1F42]/70 hover:bg-white hover:text-[#836DAD]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-6 space-y-8">
              {categoriesWithCustom.map((cat) => (
                <div key={cat.id} className="rounded-2xl bg-white p-5 sm:p-6 shadow-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#836DAD]/12 pb-3">
                    <div>
                      <h4 className="text-base sm:text-lg font-semibold text-[#836DAD]">
                        {cat.title}
                      </h4>
                      <p className="text-xs text-[#2B1F42]/70">{cat.shortSubtitle}</p>
                    </div>
                    <span className="rounded-full bg-[#F6F3FA] px-3 py-1 text-xs font-semibold text-[#836DAD]">
                      {cat.specialties.length} opciones
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {cat.specialties.map((spec) => (
                      <div
                        key={spec.name}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-[#836DAD]/15 bg-[#FAF8FC] p-3.5"
                      >
                        <div className="min-w-0">
                          <h5 className="truncate text-sm font-semibold text-[#2B1F42]">
                            {spec.name}
                          </h5>
                          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-[#2B1F42]/65">
                            <Globe2 className="h-3 w-3 text-[#836DAD]" />
                            {spec.modality} · {spec.duration}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRequestBooking(spec.name)}
                          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#6E5898]"
                        >
                          <CalendarCheck className="h-3.5 w-3.5 text-[#F3D791]" />
                          <span>Elegir</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Modal ligero de especialidades al tocar una categoría */}
        {activeCategory && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B1F42]/75 p-4 backdrop-blur-sm"
            role="region"
            aria-label={`Especialidades de ${activeCategory.title}`}
          >
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#836DAD]/25 bg-white p-6 sm:p-8 text-[#2B1F42] shadow-2xl">
              <button
                type="button"
                onClick={() => setActiveCategoryId(null)}
                aria-label="Cerrar detalle de categoría"
                className="absolute top-4 right-4 rounded-full bg-[#F6F3FA] p-2 text-[#2B1F42] transition-colors hover:bg-[#836DAD] hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4 border-b border-[#836DAD]/15 pb-5">
                <img
                  src={activeCategory.image}
                  alt={activeCategory.title}
                  width={96}
                  height={80}
                  className="h-20 w-24 shrink-0 rounded-2xl object-cover"
                />
                <div>
                  <span className="inline-block rounded-full bg-[#836DAD]/12 px-2.5 py-0.5 text-xs font-semibold text-[#836DAD]">
                    {activeCategory.specialties.length} especialidades disponibles
                  </span>
                  <h3 className="mt-1 text-xl sm:text-2xl font-semibold text-[#2B1F42]">
                    {activeCategory.title}
                  </h3>
                  <p className="text-xs sm:text-sm font-medium text-[#836DAD]">
                    {activeCategory.shortSubtitle}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-relaxed text-[#2B1F42]/80">
                {activeCategory.description}
              </p>

              <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {activeCategory.specialties.map((spec) => (
                  <div
                    key={spec.name}
                    className="flex items-center justify-between gap-2.5 rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-3.5"
                  >
                    <div className="min-w-0">
                      <h4 className="text-xs sm:text-sm font-semibold text-[#2B1F42]">
                        {spec.name}
                      </h4>
                      <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-[#836DAD]">
                        <Clock className="h-3 w-3" />
                        {spec.modality}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setActiveCategoryId(null);
                        onRequestBooking(spec.name);
                      }}
                      className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1 rounded-xl bg-[#836DAD] px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6E5898]"
                    >
                      <CalendarCheck className="h-3.5 w-3.5 text-[#F3D791]" />
                      <span>Elegir</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
