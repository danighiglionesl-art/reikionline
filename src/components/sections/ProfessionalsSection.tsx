"use client";

import React from "react";
import { ILLUSTRATIVE_PROFESSIONALS } from "@/lib/reiki-data";
import { Sparkles, Award, Globe2, Calendar, Info } from "lucide-react";

interface ProfessionalsSectionProps {
  onOpenAccess: (context?: string, initialMode?: "login" | "register") => void;
}

export function ProfessionalsSection({ onOpenAccess }: ProfessionalsSectionProps) {
  return (
    <section id="profesionales" className="border-t border-[#836DAD]/15 bg-white py-16 sm:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 07. Un espacio para profesionales */}
        <div className="overflow-hidden rounded-3xl bg-[#836DAD] text-white shadow-xl">
          <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:p-12">
            <div className="lg:col-span-7">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-xs font-semibold text-[#F3D791]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Un espacio para profesionales</span>
              </span>

              <h2 className="mt-4 text-2xl sm:text-4xl font-semibold text-white">
                Tu vocación puede llegar más lejos.
              </h2>

              <p className="mt-4 text-base leading-relaxed text-white/95">
                En Reiki Online queremos que cada profesional encuentre un espacio para dar a
                conocer su trabajo, organizar su agenda y conectar con personas interesadas en sus
                servicios.
              </p>

              <p className="mt-3 text-base leading-relaxed text-white/90">
                Una plataforma que te acompañe en el crecimiento de tu actividad, sin importar
                dónde estés.
              </p>

              {/* Botón oficial sección 07: «Quiero formar parte como terapeuta» */}
              <div className="mt-7">
                <button
                  type="button"
                  onClick={() =>
                    onOpenAccess("Quiero formar parte como terapeuta en Reiki Online", "register")
                  }
                  className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#F3D791] px-6 py-3.5 text-sm sm:text-base font-semibold text-[#2B1F42] shadow-lg transition-all hover:bg-white active:scale-[0.99]"
                >
                  <Sparkles className="h-4 w-4 text-[#836DAD]" />
                  <span>Quiero formar parte como terapeuta</span>
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="overflow-hidden rounded-2xl border-2 border-white/25 bg-white/10 shadow-lg">
                <img
                  src="/images/espacio-profesionales.png"
                  alt="Encuentro cálido entre terapeuta y consultante en un espacio luminoso y sereno"
                  width={420}
                  height={198}
                  loading="lazy"
                  className="aspect-[16/10] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Exploración pública de estructura de perfiles profesionales (Criterio 11:
            «Permitir explorar la propuesta y los profesionales sin registrarse; solicitar acceso cuando sea necesario realizar una reserva.»
            «No publicar estadísticas o testimonios no verificados.»
            «Identificar servicios, formación declarada y modalidad de atención de los profesionales.») */}
        <div className="mt-16">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <span className="inline-block rounded-full bg-[#836DAD]/12 px-3 py-1 text-xs font-semibold text-[#836DAD]">
                Perfiles semi-públicos (requiere estar registrado)
              </span>
              <h3 className="mt-2.5 text-xl sm:text-3xl font-semibold text-[#2B1F42]">
                Cómo se presentan los perfiles profesionales en la plataforma
              </h3>
              <p className="mt-1.5 text-sm text-[#2B1F42]/75">
                Tanto si sos consultante como terapeuta, los perfiles de la red y sus códigos QR solo se habilitan cuando estás registrado en Reiki Online.
              </p>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
            {ILLUSTRATIVE_PROFESSIONALS.map((prof) => (
              <div
                key={prof.id}
                className="flex flex-col justify-between rounded-3xl border border-[#836DAD]/20 bg-[#F6F3FA] p-6 shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-3.5">
                    <img
                      src={prof.illustrativePhoto}
                      alt={prof.roleTitle}
                      width={64}
                      height={64}
                      loading="lazy"
                      className="h-16 w-16 shrink-0 rounded-2xl object-cover border border-[#836DAD]/25"
                    />
                    <div>
                      <span className="inline-block rounded-full bg-[#836DAD]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#836DAD]">
                        {prof.categoryTitle}
                      </span>
                      <h4 className="mt-1 text-base font-semibold text-[#2B1F42]">
                        {prof.roleTitle}
                      </h4>
                      <p className="text-xs text-[#2B1F42]/65">{prof.name}</p>
                    </div>
                  </div>

                  {/* Formación declarada */}
                  <div className="mt-4 rounded-2xl bg-white p-3.5">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-[#836DAD]">
                      <Award className="h-3.5 w-3.5" />
                      <span>Formación declarada</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-[#2B1F42]/80">
                      {prof.declaredFormation}
                    </p>
                  </div>

                  {/* Servicios */}
                  <div className="mt-3.5">
                    <p className="text-xs font-semibold text-[#2B1F42]">Servicios ofrecidos:</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {prof.services.map((srv) => (
                        <span
                          key={srv}
                          className="rounded-xl border border-[#836DAD]/20 bg-white px-2.5 py-1 text-xs font-medium text-[#2B1F42]"
                        >
                          {srv}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Modalidad de atención y disponibilidad */}
                  <div className="mt-4 space-y-1.5 text-xs text-[#2B1F42]/75">
                    <p className="flex items-center gap-1.5">
                      <Globe2 className="h-3.5 w-3.5 text-[#836DAD]" />
                      <span>
                        <strong>Modalidad:</strong> {prof.modality} ({prof.location})
                      </span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-[#836DAD]" />
                      <span>
                        <strong>Disponibilidad:</strong> {prof.availability}
                      </span>
                    </p>
                  </div>
                </div>

                <div className="mt-5 border-t border-[#836DAD]/15 pt-4">
                  <button
                    type="button"
                    onClick={() => onOpenAccess(`Solicitar reserva en ${prof.roleTitle}`)}
                    className="w-full cursor-pointer rounded-xl bg-[#836DAD] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#6E5898]"
                  >
                    Reservá tu turno en la plataforma
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Nota visual oficial del documento (pág. 6) */}
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-4 text-xs text-[#2B1F42]/75">
            <Info className="h-4 w-4 shrink-0 text-[#836DAD] mt-0.5" />
            <p>
              <strong>Nota visual y transparencia:</strong> Las escenas de estilo fotográfico y
              fichas de muestra utilizadas en esta vista pública son imágenes ilustrativas; no
              representan terapeutas reales ni incluyen estadísticas o testimonios no verificados.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
