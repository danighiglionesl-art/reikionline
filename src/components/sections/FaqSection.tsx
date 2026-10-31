"use client";

import React from "react";
import { FAQ_ITEMS } from "@/lib/reiki-data";
import { ChevronDown, HelpCircle, ShieldAlert } from "lucide-react";

export function FaqSection() {
  return (
    <section
      id="preguntas-frecuentes"
      className="border-t border-[#836DAD]/15 bg-white py-16 sm:py-24"
    >
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        {/* 09. Preguntas frecuentes */}
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#836DAD]/12 px-3.5 py-1 text-xs font-semibold text-[#836DAD]">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Preguntas frecuentes</span>
          </span>
          <h2 className="mt-3 text-2xl sm:text-4xl font-semibold text-[#2B1F42]">
            Respuestas claras sobre Reiki Online
          </h2>
          <p className="mt-3 text-sm sm:text-base text-[#2B1F42]/75">
            Conocé cómo explorar la plataforma, elegir un terapeuta y reservar tu sesión.
          </p>
        </div>

        {/* Acordeón exclusivo nativo con <details name="reiki-faq"> (search-hidden-content) */}
        <div className="mt-10 space-y-3.5">
          {FAQ_ITEMS.map((faq, idx) => (
            <details
              key={faq.id}
              name="reiki-faq"
              open={idx === 0}
              className="group rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] transition-colors open:border-[#836DAD] open:bg-white open:shadow-sm"
            >
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left text-base sm:text-lg font-semibold text-[#2B1F42] transition-colors hover:text-[#836DAD]">
                <span>{faq.question}</span>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-[#836DAD]/20 bg-white text-[#836DAD] transition-transform duration-200 group-open:rotate-180 group-open:bg-[#836DAD] group-open:text-white">
                  <ChevronDown className="h-4 w-4 stroke-[2.5]" />
                </span>
              </summary>

              <div className="border-t border-[#836DAD]/15 px-6 pt-4 pb-5 text-sm sm:text-base leading-relaxed text-[#2B1F42]/80">
                <p>{faq.answer}</p>
              </div>
            </details>
          ))}
        </div>

        {/* Aviso obligatorio destacado de la Sección 09 */}
        <div className="mt-8 flex items-start gap-3.5 rounded-2xl border-2 border-[#836DAD]/30 bg-[#F6F3FA] p-5 text-[#2B1F42]">
          <ShieldAlert className="h-6 w-6 shrink-0 text-[#836DAD] mt-0.5" />
          <p className="text-xs sm:text-sm font-semibold leading-relaxed text-[#2B1F42]">
            Las prácticas complementarias no sustituyen diagnósticos ni tratamientos médicos ni
            atención psicológica profesional.
          </p>
        </div>
      </div>
    </section>
  );
}
