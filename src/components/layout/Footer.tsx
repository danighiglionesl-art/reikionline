"use client";

import React, { useState } from "react";
import { NAV_ITEMS, LEGAL_DOCUMENTS, LegalDocument } from "@/lib/reiki-data";
import { Mail, Globe2, Sparkles, X, CheckCircle2, Send } from "lucide-react";

interface FooterProps {
  onOpenAccess: (context?: string) => void;
}

export function Footer({ onOpenAccess }: FooterProps) {
  const [activeLegalDoc, setActiveLegalDoc] = useState<LegalDocument | null>(null);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactMessage, setContactMessage] = useState("");

  const handleContactSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setContactSubmitted(true);
  };

  return (
    <footer id="contacto" className="bg-[#836DAD] text-white">
      {/* Franja superior de Contacto y Comunidad */}
      <div className="border-b border-white/15">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-white/20 bg-white/10 p-6 sm:p-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-[#F3D791]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Conectando bienestar</span>
              </span>
              <h2 className="mt-2.5 text-2xl sm:text-3xl font-semibold text-white">
                Buscá tu reikista · Elegí cómo recibir tu sesión · Reservá tu turno
              </h2>
              <p className="mt-2 text-sm sm:text-base text-white/90">
                ¿Tenés dudas sobre cómo sumarte como profesional o cómo reservar tu primera
                experiencia en Reiki Online? Escribinos o ingresá directo a la plataforma.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onOpenAccess()}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#F3D791] px-5 py-3.5 text-sm font-semibold text-[#2B1F42] shadow-md transition-colors hover:bg-white"
              >
                <Sparkles className="h-4 w-4 text-[#836DAD]" />
                <span>Acceso a Terapias Online</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setContactSubmitted(false);
                  setContactOpen(true);
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-white/30 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:border-[#F3D791] hover:text-[#F3D791]"
              >
                <Mail className="h-4 w-4 text-[#F3D791]" />
                <span>Enviar consulta</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 10. Pie de página oficial */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-12">
          {/* Columna 1: Isologotipo oficial sobre fondo #836DAD respetando margen libre del 10% */}
          <div className="lg:col-span-5">
            <a href="#inicio" className="inline-block py-1 pr-3 focus:outline-none">
              <img
                src="/brand/Reiki_Online_Lavanda_Unificado.png"
                alt="Reiki online — CONECTANDO BIENESTAR"
                width={220}
                height={110}
                loading="lazy"
                className="h-20 sm:h-24 w-auto object-contain"
              />
            </a>

            <p className="mt-3 text-lg font-semibold text-[#F3D791]">
              Reiki Online — Tu bienestar, sin distancias.
            </p>

            <p className="mt-2 max-w-md text-sm leading-relaxed text-white/90">
              Plataforma digital para conectar personas que ofrecen y buscan sesiones de Reiki,
              terapias alternativas, prácticas de bienestar y disciplinas de autoconocimiento,
              presenciales o a distancia.
            </p>
          </div>

          {/* Columna 2: Enlaces de navegación */}
          <div className="lg:col-span-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F3D791]">
              Enlaces de navegación
            </h3>
            <ul className="mt-4 space-y-2.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="text-sm text-white/90 transition-colors hover:text-[#F3D791]"
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="#preguntas-frecuentes"
                  className="text-sm text-white/90 transition-colors hover:text-[#F3D791]"
                >
                  Preguntas frecuentes
                </a>
              </li>
            </ul>
          </div>

          {/* Columna 3: Redes, Contacto y Documentación Legal (Sección 10) */}
          <div className="lg:col-span-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#F3D791]">
              Comunidad, contacto y normas
            </h3>

            <div className="mt-4 flex flex-wrap gap-2.5">
              <a
                href="https://www.instagram.com/reikionline.ar/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram oficial de Reiki Online (@reikionline.ar)"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:border-[#F3D791] hover:text-[#F3D791]"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                </svg>
                <span>Instagram</span>
              </a>

              <a
                href="https://www.facebook.com/ar.reikionline/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook oficial de Reiki Online (ar.reikionline)"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:border-[#F3D791] hover:text-[#F3D791]"
              >
                <svg className="h-4 w-4 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.675 0h-21.35c-.732 0-1.325.593-1.325 1.325v21.351c0 .731.593 1.324 1.325 1.324h11.495v-9.294h-3.128v-3.622h3.128v-2.671c0-3.1 1.893-4.788 4.659-4.788 1.325 0 2.463.099 2.795.143v3.24l-1.918.001c-1.504 0-1.795.715-1.795 1.763v2.313h3.587l-.467 3.622h-3.12v9.293h6.116c.73 0 1.323-.593 1.323-1.325v-21.35c0-.732-.593-1.325-1.325-1.325z" />
                </svg>
                <span>Facebook</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setContactSubmitted(false);
                  setContactOpen(true);
                }}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:border-[#F3D791] hover:text-[#F3D791]"
              >
                <Mail className="h-4 w-4 text-[#F3D791]" />
                <span>Contacto</span>
              </button>
            </div>

            {/* Enlaces normativos exigidos en la Sección 10:
                términos y condiciones, política de privacidad, consentimiento y condiciones de cancelación */}
            <ul className="mt-5 space-y-2 border-t border-white/15 pt-4 text-xs sm:text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => setActiveLegalDoc(LEGAL_DOCUMENTS.terminos)}
                  className="cursor-pointer text-white/90 underline underline-offset-4 transition-colors hover:text-[#F3D791]"
                >
                  Términos y condiciones
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveLegalDoc(LEGAL_DOCUMENTS.privacidad)}
                  className="cursor-pointer text-white/90 underline underline-offset-4 transition-colors hover:text-[#F3D791]"
                >
                  Política de privacidad
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveLegalDoc(LEGAL_DOCUMENTS.consentimiento)}
                  className="cursor-pointer text-white/90 underline underline-offset-4 transition-colors hover:text-[#F3D791]"
                >
                  Consentimiento informado
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => setActiveLegalDoc(LEGAL_DOCUMENTS.cancelacion)}
                  className="cursor-pointer text-white/90 underline underline-offset-4 transition-colors hover:text-[#F3D791]"
                >
                  Condiciones de cancelación
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Barra inferior de copyright y dominio oficial */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/15 pt-8 pb-16 sm:pb-8 text-xs text-white/85 sm:flex-row">
          <p>© {new Date().getFullYear()} Reiki Online — Conectando bienestar. Todos los derechos reservados.</p>
          <a
            href="https://www.reikionline.com.ar"
            className="inline-flex items-center gap-1.5 font-semibold text-[#F3D791] hover:underline"
          >
            <Globe2 className="h-3.5 w-3.5" />
            <span>www.reikionline.com.ar</span>
          </a>
        </div>
      </div>

      {/* Modal de documentos legales (Términos, Privacidad, Consentimiento, Cancelación) */}
      {activeLegalDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B1F42]/75 p-4 backdrop-blur-sm"
          role="region"
          aria-label={activeLegalDoc.title}
        >
          <div className="relative max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-[#836DAD]/25 bg-white p-6 sm:p-8 text-[#2B1F42] shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveLegalDoc(null)}
              aria-label="Cerrar documento legal"
              className="absolute top-4 right-4 rounded-full bg-[#F6F3FA] p-2 text-[#2B1F42] transition-colors hover:bg-[#836DAD] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <span className="inline-block rounded-full bg-[#836DAD]/12 px-3 py-1 text-xs font-semibold text-[#836DAD]">
              {activeLegalDoc.subtitle}
            </span>
            <h3 className="mt-2 text-xl sm:text-2xl font-semibold text-[#2B1F42]">
              {activeLegalDoc.title}
            </h3>

            <div className="mt-5 space-y-4">
              {activeLegalDoc.sections.map((sec) => (
                <div key={sec.heading} className="rounded-2xl bg-[#F6F3FA] p-4">
                  <h4 className="text-sm font-semibold text-[#836DAD]">{sec.heading}</h4>
                  <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#2B1F42]/80">
                    {sec.body}
                  </p>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setActiveLegalDoc(null)}
              className="mt-6 w-full cursor-pointer rounded-xl bg-[#836DAD] py-3 text-xs sm:text-sm font-semibold text-white transition-colors hover:bg-[#6E5898]"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Modal de Contacto directo */}
      {contactOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B1F42]/75 p-4 backdrop-blur-sm"
          role="region"
          aria-label="Formulario de contacto de Reiki Online"
        >
          <div className="relative w-full max-w-lg rounded-3xl border border-[#836DAD]/25 bg-white p-6 sm:p-8 text-[#2B1F42] shadow-2xl">
            <button
              type="button"
              onClick={() => setContactOpen(false)}
              aria-label="Cerrar ventana de contacto"
              className="absolute top-4 right-4 rounded-full bg-[#F6F3FA] p-2 text-[#2B1F42] transition-colors hover:bg-[#836DAD] hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-xl font-semibold text-[#2B1F42]">Contacto · Reiki Online</h3>
            <p className="mt-1 text-xs sm:text-sm text-[#2B1F42]/75">
              Dejanos tu consulta como consultante o terapeuta y te responderemos a la brevedad.
            </p>

            {!contactSubmitted ? (
              <form onSubmit={handleContactSubmit} className="mt-5 space-y-4">
                <div>
                  <label
                    htmlFor="contact-name"
                    className="block text-xs font-semibold text-[#2B1F42]"
                  >
                    Nombre
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    required
                    autoComplete="name"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    placeholder="Tu nombre"
                    className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-2.5 text-sm text-[#2B1F42] focus:border-[#836DAD] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-email"
                    className="block text-xs font-semibold text-[#2B1F42]"
                  >
                    Correo electrónico
                  </label>
                  <input
                    id="contact-email"
                    type="email"
                    required
                    autoComplete="email"
                    spellCheck={false}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="tucorreo@ejemplo.com"
                    className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-2.5 text-sm text-[#2B1F42] focus:border-[#836DAD] focus:bg-white focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="contact-msg"
                    className="block text-xs font-semibold text-[#2B1F42]"
                  >
                    Mensaje
                  </label>
                  <textarea
                    id="contact-msg"
                    rows={3}
                    required
                    value={contactMessage}
                    onChange={(e) => setContactMessage(e.target.value)}
                    placeholder="Contanos en qué podemos ayudarte..."
                    className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-2.5 text-sm text-[#2B1F42] focus:border-[#836DAD] focus:bg-white focus:outline-none"
                  />
                </div>
                <button
                  type="submit"
                  className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#836DAD] py-3 text-sm font-semibold text-white transition-colors hover:bg-[#6E5898]"
                >
                  <Send className="h-4 w-4 text-[#F3D791]" />
                  <span>Enviar mensaje</span>
                </button>
              </form>
            ) : (
              <div className="mt-6 rounded-2xl bg-[#F6F3FA] p-6 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-[#836DAD]" />
                <h4 className="mt-2 text-base font-semibold text-[#2B1F42]">
                  ¡Gracias por escribirnos, {contactName}!
                </h4>
                <p className="mt-1 text-xs sm:text-sm text-[#2B1F42]/80">
                  Recibimos tu mensaje y te responderemos al correo{" "}
                  <strong>{contactEmail}</strong>.
                </p>
                <button
                  type="button"
                  onClick={() => setContactOpen(false)}
                  className="mt-4 cursor-pointer rounded-xl bg-[#836DAD] px-5 py-2.5 text-xs font-semibold text-white"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </footer>
  );
}
