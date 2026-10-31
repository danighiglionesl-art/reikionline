"use client";

import React from "react";
import { CheckCircle2, Globe2, HeartHandshake, TrendingUp } from "lucide-react";

export function AboutObjectivesSection() {
  return (
    <section
      id="quienes-somos"
      className="border-t border-[#836DAD]/15 bg-[#F6F3FA] py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 02. Quiénes somos + 03. Qué hacemos */}
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Fotografías cálidas (Sección 02) */}
          <div className="lg:col-span-5">
            <div className="grid grid-cols-12 items-stretch gap-4">
              <div className="col-span-5 overflow-hidden rounded-3xl border border-[#836DAD]/20 bg-white shadow-md">
                <img
                  src="/images/quienes-somos-lavanda.png"
                  alt="Manos sosteniendo flores de lavanda al sol cálido"
                  width={244}
                  height={328}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="col-span-7 flex flex-col justify-between gap-4">
                <div className="overflow-hidden rounded-3xl border border-[#836DAD]/20 bg-white shadow-md">
                  <img
                    src="/images/galeria-lavanda.png"
                    alt="Ramo de lavanda fresca sobre lino lavanda en luz natural"
                    width={332}
                    height={332}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                </div>
                <div className="rounded-2xl bg-[#836DAD] p-4 text-white shadow-md">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#F3D791]">
                    Esencia de marca
                  </p>
                  <p className="mt-1 text-xs sm:text-sm leading-relaxed text-white/95">
                    Espiritualidad y modernidad con una expresión clara, cálida y accesible.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Textos oficiales de 02. Quiénes somos y 03. Qué hacemos */}
          <div className="lg:col-span-7 space-y-8">
            {/* 02. Quiénes somos */}
            <div>
              <span className="inline-block rounded-full bg-[#836DAD]/12 px-3 py-1 text-xs font-semibold text-[#836DAD]">
                Quiénes somos
              </span>
              <h2 className="mt-3 text-2xl sm:text-4xl font-semibold text-[#2B1F42]">
                Un espacio para conectar personas y experiencias.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-[#2B1F42]/85">
                Somos una plataforma digital que reúne profesionales de terapias alternativas,
                prácticas de bienestar y disciplinas de autoconocimiento.
              </p>
              <p className="mt-3 text-base leading-relaxed text-[#2B1F42]/80">
                Nacimos con la idea de acercar estas experiencias a todas las personas, eliminando
                las barreras geográficas y facilitando el encuentro entre quienes buscan bienestar
                y quienes ofrecen acompañamiento.
              </p>
            </div>

            {/* 03. Qué hacemos */}
            <div className="rounded-3xl border border-[#836DAD]/20 bg-white p-6 sm:p-8 shadow-sm">
              <span className="inline-block rounded-full bg-[#F3D791]/45 px-3 py-1 text-xs font-semibold text-[#2B1F42]">
                Qué hacemos
              </span>
              <h3 className="mt-2.5 text-xl sm:text-2xl font-semibold text-[#2B1F42]">
                Conectamos personas con profesionales de terapias alternativas.
              </h3>
              <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#2B1F42]/80">
                Reiki Online permite explorar distintas especialidades, conocer a los terapeutas,
                consultar sus servicios, tarifas y disponibilidad, y gestionar reservas desde una
                misma plataforma.
              </p>

              <ul className="mt-5 space-y-2.5">
                {[
                  "Descubrí terapias y especialidades.",
                  "Elegí el profesional que mejor se adapte a tu búsqueda.",
                  "Reservá una experiencia y gestioná tus sesiones.",
                ].map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-center gap-3 text-sm sm:text-base font-medium text-[#2B1F42]"
                  >
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-[#836DAD]" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* 04. Qué buscamos */}
        <div className="mt-16 sm:mt-20">
          <div className="text-center max-w-3xl mx-auto">
            <span className="inline-block rounded-full bg-[#836DAD]/12 px-3.5 py-1 text-xs font-semibold text-[#836DAD]">
              Qué buscamos
            </span>
            <h2 className="mt-3 text-2xl sm:text-3xl font-semibold text-[#2B1F42]">
              Tres pilares para acercar el bienestar con respeto y calidez
            </h2>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-[#836DAD]/20 bg-white p-6 sm:p-7 shadow-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#836DAD] text-[#F3D791]">
                <Globe2 className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#2B1F42]">
                Acercar el bienestar.
              </h3>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#2B1F42]/80">
                Que cualquier persona pueda acceder a experiencias de autoconocimiento y bienestar,
                independientemente de su ubicación.
              </p>
            </div>

            <div className="rounded-3xl border border-[#836DAD]/20 bg-white p-6 sm:p-7 shadow-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#836DAD] text-[#F3D791]">
                <HeartHandshake className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#2B1F42]">
                Crear una comunidad.
              </h3>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#2B1F42]/80">
                Un espacio de encuentro entre consultantes y profesionales basado en el respeto, la
                libertad de elección y la confianza.
              </p>
            </div>

            <div className="rounded-3xl border border-[#836DAD]/20 bg-white p-6 sm:p-7 shadow-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#836DAD] text-[#F3D791]">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-[#2B1F42]">
                Acompañar el crecimiento.
              </h3>
              <p className="mt-2 text-sm sm:text-base leading-relaxed text-[#2B1F42]/80">
                Brindar herramientas digitales para que los terapeutas desarrollen su actividad y
                lleguen a nuevas personas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
