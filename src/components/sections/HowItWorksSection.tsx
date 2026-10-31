"use client";

import React from "react";
import { CONSULTANTE_STEPS, PROFESIONAL_STEPS } from "@/lib/reiki-data";
import { HeartHandshake, UserCheck, ArrowRight } from "lucide-react";

interface HowItWorksSectionProps {
  onOpenAccess: (context?: string, initialMode?: "login" | "register") => void;
}

export function HowItWorksSection({ onOpenAccess }: HowItWorksSectionProps) {
  return (
    <section
      id="como-funciona"
      className="border-t border-[#836DAD]/15 bg-[#F6F3FA] py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 06. Cómo funciona Reiki Online */}
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-block rounded-full bg-[#836DAD]/12 px-3.5 py-1 text-xs font-semibold text-[#836DAD]">
            Cómo funciona Reiki Online
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-semibold text-[#2B1F42]">
            Dos recorridos públicos claros y simples
          </h2>
          <p className="mt-3 text-sm sm:text-base leading-relaxed text-[#2B1F42]/80">
            Uno orientado a consultantes que buscan una experiencia de bienestar y otro a
            profesionales que desean compartir su acompañamiento.
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-2">
          {/* Recorrido 1: Para quienes buscan una terapia */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#836DAD]/25 bg-white p-6 sm:p-8 shadow-sm">
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#836DAD] text-[#F3D791]">
                  <HeartHandshake className="h-6 w-6" />
                </span>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#836DAD]">
                    Recorrido Consultantes
                  </span>
                  <h3 className="text-xl sm:text-2xl font-semibold text-[#2B1F42]">
                    Para quienes buscan una terapia
                  </h3>
                </div>
              </div>

              <ol className="mt-6 space-y-4">
                {CONSULTANTE_STEPS.map((item) => (
                  <li
                    key={item.step}
                    className="flex items-start gap-4 rounded-2xl bg-[#F6F3FA] p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#836DAD] text-xs font-semibold text-white">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm sm:text-base font-semibold text-[#2B1F42]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#2B1F42]/75">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-6 border-t border-[#836DAD]/15 pt-5">
              <a
                href="#terapias"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[#836DAD] transition-colors hover:text-[#5E4987]"
              >
                <span>Buscá tu reikista · Elegí cómo recibir tu sesión</span>
                <ArrowRight className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Recorrido 2: Para profesionales */}
          <div className="flex flex-col justify-between rounded-3xl border border-[#836DAD]/25 bg-white p-6 sm:p-8 shadow-sm">
            <div>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3D791] text-[#2B1F42]">
                  <UserCheck className="h-6 w-6 text-[#836DAD]" />
                </span>
                <div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#836DAD]">
                    Recorrido Terapeutas
                  </span>
                  <h3 className="text-xl sm:text-2xl font-semibold text-[#2B1F42]">
                    Para profesionales
                  </h3>
                </div>
              </div>

              <ol className="mt-6 space-y-4">
                {PROFESIONAL_STEPS.map((item) => (
                  <li
                    key={item.step}
                    className="flex items-start gap-4 rounded-2xl bg-[#F6F3FA] p-4"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#F3D791] text-xs font-semibold text-[#2B1F42]">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm sm:text-base font-semibold text-[#2B1F42]">
                        {item.title}
                      </p>
                      <p className="mt-1 text-xs sm:text-sm leading-relaxed text-[#2B1F42]/75">
                        {item.detail}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-6 border-t border-[#836DAD]/15 pt-5">
              <button
                type="button"
                onClick={() =>
                  onOpenAccess("Registro e ingreso para Terapeutas y Profesionales", "register")
                }
                className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-[#836DAD] transition-colors hover:text-[#5E4987]"
              >
                <span>Registrate como terapeuta y configurá tu agenda</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
