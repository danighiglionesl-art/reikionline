"use client";

import React from "react";
import { TerapiasAccessPanel } from "@/components/auth/TerapiasAccessPanel";
import { ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

export function InlineAccessSection() {
  return (
    <section
      id="ingreso-terapias"
      className="border-t border-[#836DAD]/15 bg-[#F6F3FA] py-16 sm:py-24"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Columna izquierda: Explicación oficial de la Sección 08 */}
          <div className="lg:col-span-5">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#836DAD]/12 px-3.5 py-1 text-xs font-semibold text-[#836DAD]">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Acceso unificado</span>
            </span>

            <h2 className="mt-3 text-2xl sm:text-4xl font-semibold text-[#2B1F42]">
              Ingreso a Terapias Online
            </h2>

            <p className="mt-4 text-base leading-relaxed text-[#2B1F42]/80">
              Esta sección conecta la página pública con las futuras ventanas internas. El acceso
              se realiza mediante Google o correo electrónico y contraseña, con recuperación
              automática de contraseña.
            </p>

            <div className="mt-6 space-y-3 rounded-3xl border border-[#836DAD]/20 bg-white p-5 sm:p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm font-semibold text-[#836DAD]">
                <ShieldCheck className="h-5 w-5" />
                <span>Regla de acceso y elección de rol</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-[#2B1F42]/80">
                Después de autenticarse, toda persona elige en cada ingreso si continúa como{" "}
                <strong>«Terapeuta»</strong> o <strong>«Consultante»</strong>; estos roles no son
                excluyentes.
              </p>
              <ul className="space-y-2 pt-2 text-xs sm:text-sm text-[#2B1F42]/85">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#836DAD]" />
                  <span>Ingreso con usuario/correo electrónico y contraseña.</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#836DAD]" />
                  <span>Opción rápida «Continuar con Google».</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[#836DAD]" />
                  <span>Recuperación automática de contraseña y registro directo.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Columna derecha: Formulario interactivo de ingreso, registro, recuperación y selección de rol */}
          <div className="lg:col-span-7">
            <TerapiasAccessPanel idPrefix="section08" />
          </div>
        </div>
      </div>
    </section>
  );
}
