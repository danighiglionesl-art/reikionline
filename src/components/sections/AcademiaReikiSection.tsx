"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Search,
  Users,
  Video,
  Award,
  Calendar,
  Sparkles,
} from "lucide-react";
import {
  loadTrainingsCatalog,
  TRAININGS_SYNC_EVENT,
  TrainingCourse,
} from "@/lib/trainingsData";
import { formatArs } from "@/lib/mercadoPagoSplit";

interface AcademiaReikiSectionProps {
  onOpenCapacitaciones: (courseTitle?: string) => void;
}

export function AcademiaReikiSection({
  onOpenCapacitaciones,
}: AcademiaReikiSectionProps) {
  const [courses, setCourses] = useState<TrainingCourse[]>(() =>
    loadTrainingsCatalog()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState("TODOS");

  useEffect(() => {
    const sync = () => setCourses(loadTrainingsCatalog());
    sync();
    window.addEventListener(TRAININGS_SYNC_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(TRAININGS_SYNC_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const visibleCourses = useMemo(() => {
    return courses.filter((c) => {
      if (c.status !== "publicada" && c.status !== "en_curso") return false;
      if (levelFilter !== "TODOS" && c.level !== levelFilter) return false;
      if (
        searchQuery.trim() &&
        !c.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) &&
        !c.discipline
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase()) &&
        !c.therapistName
          .toLowerCase()
          .includes(searchQuery.trim().toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [courses, searchQuery, levelFilter]);

  return (
    <section
      id="academia"
      aria-labelledby="academia-heading"
      className="bg-[#FAF8FC] py-16 sm:py-20 border-t border-[#836DAD]/15"
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-10">
        {/* Encabezado institucional de Academia Reiki Online */}
        <div className="mx-auto max-w-3xl text-center space-y-3">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#836DAD] px-4 py-1 text-xs font-extrabold uppercase tracking-wider text-[#F3D791] shadow-xs">
            <GraduationCap className="h-4 w-4" />
            Academia Reiki Online • Formación Continua
          </span>
          <h2
            id="academia-heading"
            className="text-2xl sm:text-4xl font-bold tracking-tight text-[#2B1F42]"
          >
            Capacitaciones Online en Vivo con Terapeutas Verificados
          </h2>
          <p className="text-sm sm:text-base text-[#2B1F42]/80 leading-relaxed">
            Explorá cursos, talleres y formaciones dictadas por terapeutas de
            nuestra comunidad. Clases en vivo dentro de Reiki Online mediante
            Daily.co, materiales descargables y certificados digitales con
            código único de verificación.
          </p>
        </div>

        {/* Buscador rápido del catálogo público */}
        <div className="mx-auto flex max-w-3xl flex-col sm:flex-row items-center gap-3 rounded-2xl border border-[#836DAD]/25 bg-white p-3 shadow-xs">
          <div className="relative w-full flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#836DAD]" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por disciplina, curso o terapeuta..."
              className="w-full rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] py-2.5 pr-3 pl-10 text-xs sm:text-sm text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
            />
          </div>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            aria-label="Filtrar por nivel"
            className="w-full sm:w-44 rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] px-3 py-2.5 text-xs sm:text-sm font-semibold text-[#2B1F42]"
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="Inicial">Nivel Inicial</option>
            <option value="Intermedio">Nivel Intermedio</option>
            <option value="Avanzado">Nivel Avanzado</option>
          </select>
          <button
            type="button"
            onClick={() => onOpenCapacitaciones("Mis Capacitaciones")}
            className="w-full sm:w-auto shrink-0 cursor-pointer rounded-xl bg-[#836DAD] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#6D5898] transition"
          >
            Ir a Mis Capacitaciones
          </button>
        </div>

        {/* Grilla del catálogo de Academia Reiki Online */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {visibleCourses.map((course) => {
            const remainingQuota = Math.max(
              0,
              course.maxQuota - course.enrolledCount
            );
            return (
              <article
                key={course.id}
                className="flex flex-col justify-between overflow-hidden rounded-3xl border border-[#836DAD]/25 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div>
                  <div className="relative h-48 w-full overflow-hidden bg-[#2B1F42]">
                    <img
                      src={course.coverImageUrl}
                      alt={course.title}
                      className="h-full w-full object-cover opacity-90"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#2B1F42]/90 via-[#2B1F42]/20 to-transparent" />
                    <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                      <span className="rounded-full bg-[#836DAD] px-3 py-1 text-[11px] font-bold text-[#F3D791]">
                        {course.discipline} • {course.level}
                      </span>
                      <span className="rounded-full bg-[#F3D791] px-3 py-1 text-xs font-extrabold text-[#2B1F42]">
                        {course.isFree || course.priceArs === 0
                          ? "GRATUITA"
                          : formatArs(course.priceArs)}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-base font-bold text-white leading-snug">
                        {course.title}
                      </h3>
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <p className="text-xs font-bold text-[#836DAD]">
                      Dictada por {course.therapistName} (@
                      {course.therapistNickname})
                    </p>
                    <p className="text-xs text-[#2B1F42]/80 line-clamp-3 leading-relaxed">
                      {course.description}
                    </p>
                    <div className="space-y-1.5 rounded-2xl bg-[#F6F3FA] p-3 text-xs text-[#2B1F42]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-[#836DAD]" />
                        <span>
                          Inicio: <strong>{course.startDate}</strong> a las{" "}
                          {course.startTime} hs ({course.sessionsCount}{" "}
                          {course.sessionsCount === 1
                            ? "encuentro"
                            : "encuentros"}
                          )
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Video className="h-3.5 w-3.5 text-[#836DAD]" />
                        <span>{course.modality}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3.5 w-3.5 text-[#836DAD]" />
                        <span>
                          Cupos disponibles:{" "}
                          <strong>
                            {remainingQuota} de {course.maxQuota}
                          </strong>
                        </span>
                      </div>
                      {course.certificateType !== "sin_certificado" && (
                        <div className="flex items-center gap-2">
                          <Award className="h-3.5 w-3.5 text-[#836DAD]" />
                          <span>
                            Incluye certificado digital de{" "}
                            {course.certificateType === "aprobacion"
                              ? "aprobación"
                              : "participación"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#836DAD]/15 bg-[#FAF8FC] p-4">
                  <button
                    type="button"
                    onClick={() => onOpenCapacitaciones("Mis Capacitaciones")}
                    className="w-full cursor-pointer inline-flex items-center justify-center gap-2 rounded-xl bg-[#836DAD] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#6D5898] transition"
                  >
                    <Sparkles className="h-4 w-4 text-[#F3D791]" />
                    <span>Ver Programa e Inscribirme</span>
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
