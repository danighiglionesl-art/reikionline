"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { ILLUSTRATIVE_PROFESSIONALS } from "@/lib/reiki-data";
import {
  Sparkles,
  Award,
  Globe2,
  Calendar,
  Info,
  UserCheck,
  ShieldCheck,
  MapPin,
  UserPlus,
  CalendarCheck,
  QrCode,
} from "lucide-react";

interface ProfessionalsSectionProps {
  onOpenAccess: (context?: string, initialMode?: "login" | "register") => void;
}

export function ProfessionalsSection({ onOpenAccess }: ProfessionalsSectionProps) {
  const [qrMap, setQrMap] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    async function generateAllQrs() {
      const nextMap: Record<string, string> = {};
      for (const prof of ILLUSTRATIVE_PROFESSIONALS) {
        try {
          const url = `https://www.reikionline.com.ar/${prof.nickname}`;
          const dataUrl = await QRCode.toDataURL(url, {
            width: 180,
            margin: 1,
            color: {
              dark: "#2B1F42",
              light: "#FFFFFF",
            },
          });
          nextMap[prof.nickname] = dataUrl;
        } catch {
          // ignore
        }
      }
      if (active) setQrMap(nextMap);
    }
    generateAllQrs();
    return () => {
      active = false;
    };
  }, []);

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

        {/* Exploración pública de estructura de perfiles profesionales con estética de Credencial Oficial */}
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
            {ILLUSTRATIVE_PROFESSIONALS.map((prof) => {
              const qrUrl = qrMap[prof.nickname];
              return (
                <div
                  key={prof.id}
                  className="relative flex flex-col justify-between overflow-hidden rounded-3xl border-2 border-[#F3D791] bg-[#836DAD] p-6 text-white shadow-xl"
                >
                  <div>
                    {/* 1. Cabecera Credencial Oficial con Isologotipo agrandado */}
                    <div className="flex items-center justify-between gap-2 border-b border-white/15 pb-3">
                      <img
                        src="/brand/Reiki_Online_Lavanda_Unificado.png"
                        alt="Reiki online — CONECTANDO BIENESTAR"
                        className="h-14 sm:h-16 w-auto object-contain"
                      />
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#F3D791]">
                          Credencial Oficial
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full border border-[#F3D791]/60 bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                          <ShieldCheck className="h-3 w-3 text-[#F3D791]" />
                          ✓ Identidad verificada
                        </span>
                      </div>
                    </div>

                    {/* 2. Fotografía circular + Rol + Nombre + @nickname + Seguidores */}
                    <div className="mt-4 flex items-center gap-3.5">
                      <div className="h-18 w-18 shrink-0 overflow-hidden rounded-full border-2 border-[#F3D791] bg-[#F6F3FA] shadow-md">
                        <img
                          src={prof.illustrativePhoto}
                          alt={prof.name}
                          width={72}
                          height={72}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3D791] px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#2B1F42]">
                            <UserCheck className="h-3 w-3" />
                            Terapeuta
                          </span>
                          <span className="inline-block rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#F3D791]">
                            {prof.categoryTitle}
                          </span>
                        </div>

                        <h4 className="mt-1.5 text-lg font-bold text-white leading-snug">
                          {prof.name}
                        </h4>
                        <p className="text-xs font-semibold text-[#F3D791]">
                          @{prof.nickname}
                        </p>
                        <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-white/90">
                          <MapPin className="h-3 w-3 text-[#F3D791]" />
                          {prof.city}
                        </p>
                      </div>
                    </div>

                    {/* Especialidad principal + Contadores de Red Social */}
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2 text-xs">
                      <span className="font-semibold text-white">{prof.roleTitle}</span>
                      <span className="text-[11px] font-semibold text-white/90">
                        <strong className="text-[#F3D791]">{prof.followersCount}</strong> seguidores ·{" "}
                        <strong className="text-[#F3D791]">{prof.followingCount}</strong> siguiendo
                      </span>
                    </div>

                    {/* 3. Formación declarada */}
                    <div className="mt-3.5 rounded-2xl border border-[#F3D791]/35 bg-white/10 p-3.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#F3D791]">
                        <Award className="h-3.5 w-3.5" />
                        <span>Formación declarada</span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed text-white/95">
                        {prof.declaredFormation}
                      </p>
                    </div>

                    {/* 4. Terapias y servicios ofrecidos */}
                    <div className="mt-3.5">
                      <p className="text-xs font-bold text-[#F3D791]">Terapias y servicios ofrecidos:</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {prof.services.map((srv) => (
                          <span
                            key={srv}
                            className="rounded-full border border-[#F3D791]/50 bg-white/15 px-2.5 py-1 text-[11px] font-medium text-white"
                          >
                            {srv}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* 5. Modalidad de atención y disponibilidad */}
                    <div className="mt-3.5 space-y-1.5 text-xs text-white/90">
                      <p className="flex items-center gap-1.5">
                        <Globe2 className="h-3.5 w-3.5 text-[#F3D791] shrink-0" />
                        <span>
                          <strong className="text-[#F3D791]">Modalidad:</strong> {prof.modality} ({prof.location})
                        </span>
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-[#F3D791] shrink-0" />
                        <span>
                          <strong className="text-[#F3D791]">Disponibilidad:</strong> {prof.availability}
                        </span>
                      </p>
                    </div>
                  </div>

                  {/* 6. Código QR Oficial + Enlace + Acciones de Red Social y Turno */}
                  <div className="mt-5 border-t border-white/15 pt-4 space-y-3">
                    <div className="flex items-center justify-between gap-3 rounded-2xl bg-black/20 p-2.5">
                      <div className="min-w-0">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-[#F3D791]">
                          Red Social y Credencial QR
                        </span>
                        <span className="block truncate text-xs font-semibold text-white">
                          reikionline.com.ar/{prof.nickname}
                        </span>
                        <span className="block text-[10px] text-white/80">
                          Exclusivo para usuarios registrados
                        </span>
                      </div>
                      <div className="shrink-0 rounded-xl border-2 border-[#F3D791] bg-white p-1 shadow-sm">
                        {qrUrl ? (
                          <img
                            src={qrUrl}
                            alt={`QR ${prof.nickname}`}
                            width={56}
                            height={56}
                            className="h-14 w-14 object-contain"
                          />
                        ) : (
                          <div className="flex h-14 w-14 items-center justify-center">
                            <QrCode className="h-6 w-6 text-[#836DAD]" />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          onOpenAccess(`Seguir a @${prof.nickname} (${prof.name}) en la Red Social`)
                        }
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#F3D791] bg-white/15 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-white hover:text-[#836DAD]"
                      >
                        <UserPlus className="h-3.5 w-3.5 text-[#F3D791]" />
                        <span>Seguir</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          onOpenAccess(`Solicitar reserva con ${prof.name} (${prof.roleTitle})`)
                        }
                        className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#F3D791] px-3 py-2.5 text-xs font-bold text-[#2B1F42] transition-colors hover:bg-white"
                      >
                        <CalendarCheck className="h-3.5 w-3.5 text-[#836DAD]" />
                        <span>Reservar turno</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Nota visual oficial del documento (pág. 6) */}
          <div className="mt-6 flex items-start gap-2.5 rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-4 text-xs text-[#2B1F42]/75">
            <Info className="h-4 w-4 shrink-0 text-[#836DAD] mt-0.5" />
            <p>
              <strong>Nota visual y transparencia:</strong> Las credenciales y perfiles de muestra
              utilizados en esta vista pública ilustran el formato oficial de la red social de Reiki Online;
              el acceso completo a perfiles, seguidores y códigos QR requiere estar registrado en la plataforma.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
