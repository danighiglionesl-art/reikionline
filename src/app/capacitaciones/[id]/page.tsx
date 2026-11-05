"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  CheckCircle2,
  Clock,
  GraduationCap,
  ShieldCheck,
  Users,
  Video,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TerapiasAccessModal } from "@/components/auth/TerapiasAccessModal";
import { TerapiasAccessPanel } from "@/components/auth/TerapiasAccessPanel";
import TrainingPromotionFlyerPanel from "@/components/trainings/TrainingPromotionFlyerPanel";
import {
  enrollStudentInTraining,
  findTrainingBySlugOrId,
  loadTrainingEnrollments,
  loadTrainingsCatalog,
  TRAININGS_SYNC_EVENT,
  TrainingCourse,
} from "@/lib/trainingsData";
import { formatArs } from "@/lib/mercadoPagoSplit";

const SESSION_STORAGE_KEY = "reiki_online_session_v1";

export default function CapacitacionPromoLandingPage() {
  const params = useParams<{ id: string }>();
  const rawSlugOrId = Array.isArray(params?.id)
    ? params.id[0]
    : params?.id || "cap-reiki-usui-1";

  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [course, setCourse] = useState<TrainingCourse | null>(null);
  const [sessionUser, setSessionUser] = useState<{
    name: string;
    email: string;
  } | null>(null);
  const [alreadyEnrolled, setAlreadyEnrolled] = useState(false);
  const [enrollStatusMsg, setEnrollStatusMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);
  const [enrolling, setEnrolling] = useState(false);

  const syncData = () => {
    const catalog = loadTrainingsCatalog();
    const found =
      findTrainingBySlugOrId(rawSlugOrId, catalog) || catalog[0] || null;
    setCourse(found);

    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { name?: string; email?: string };
          if (parsed?.email) {
            setSessionUser({
              name: parsed.name || parsed.email,
              email: parsed.email,
            });
            if (found) {
              const allEnr = loadTrainingEnrollments();
              const isEnr = allEnr.some(
                (e) =>
                  e.trainingId === found.id &&
                  e.studentEmail.toLowerCase() ===
                    parsed.email!.toLowerCase() &&
                  e.status === "confirmada"
              );
              setAlreadyEnrolled(isEnr);
            }
          } else {
            setSessionUser(null);
          }
        } else {
          setSessionUser(null);
        }
      } catch {
        setSessionUser(null);
      }
    }
  };

  useEffect(() => {
    syncData();
    if (typeof window === "undefined") return;
    window.addEventListener(TRAININGS_SYNC_EVENT, syncData);
    window.addEventListener("storage", syncData);
    return () => {
      window.removeEventListener(TRAININGS_SYNC_EVENT, syncData);
      window.removeEventListener("storage", syncData);
    };
  }, [rawSlugOrId]);

  const handleDirectEnroll = () => {
    if (!course || !sessionUser) return;
    setEnrolling(true);
    setEnrollStatusMsg(null);

    const res = enrollStudentInTraining({
      training: course,
      studentEmail: sessionUser.email,
      studentName: sessionUser.name,
      studentNickname: sessionUser.email.split("@")[0] || "usuario",
      studentRole: "Consultante",
      recordingConsentAccepted: true,
    });

    setEnrolling(false);
    if (!res.ok) {
      setEnrollStatusMsg({
        type: "err",
        text: res.error || "No se pudo completar la inscripción.",
      });
      return;
    }

    syncData();
    setEnrollStatusMsg({
      type: "ok",
      text: `¡Tu inscripción en «${course.title}» quedó confirmada! Ya podés ingresar a la sala y materiales desde «Mis Capacitaciones».`,
    });
  };

  const remainingQuota = course
    ? Math.max(0, course.maxQuota - course.enrolledCount)
    : 0;

  return (
    <div className="flex min-h-dvh flex-col bg-[#FAF8FC] text-[#2B1F42]">
      <Header onOpenAccess={() => setAccessModalOpen(true)} />

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#836DAD]/30 bg-white px-4 py-2 text-xs font-semibold text-[#5E4B8B] hover:bg-[#F4F0FA] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio de Reiki Online
            </Link>

            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E4B8B]">
              <GraduationCap className="h-4 w-4 text-[#836DAD]" />
              Academia Reiki Online • Capacitación Oficial
            </span>
          </div>

          {course && (
            <>
              {/* FICHA PRINCIPAL DE LA CAPACITACIÓN PROMOCIONADA */}
              <div className="overflow-hidden rounded-3xl border-2 border-[#836DAD]/35 bg-white shadow-md">
                <div className="relative h-56 sm:h-64 w-full bg-[#2B1F42]">
                  <img
                    src={course.coverImageUrl}
                    alt={course.title}
                    className="h-full w-full object-cover opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#2B1F42]/95 via-[#2B1F42]/40 to-transparent" />
                  <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2">
                    <span className="rounded-full bg-[#836DAD] px-3.5 py-1 text-xs font-bold text-[#F3D791]">
                      {course.discipline} • Nivel {course.level}
                    </span>
                    <span className="rounded-full bg-[#F3D791] px-4 py-1 text-xs sm:text-sm font-extrabold text-[#2B1F42] shadow-xs">
                      {course.isFree || course.priceArs <= 0
                        ? "CAPACITACIÓN GRATUITA"
                        : `Arancel: ${formatArs(course.priceArs)}`}
                    </span>
                  </div>
                  <div className="absolute bottom-4 left-4 right-4 space-y-1">
                    <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-snug">
                      {course.title}
                    </h1>
                    <p className="text-xs sm:text-sm font-semibold text-[#F3D791]">
                      Dictada por {course.therapistName} (@
                      {course.therapistNickname}) •{" "}
                      {course.therapistBiometricVerified
                        ? "✓ Identidad verificada"
                        : "Terapeuta Reiki Online"}
                    </p>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                  {enrollStatusMsg && (
                    <div
                      className={`rounded-2xl border px-4 py-3 text-xs sm:text-sm font-bold ${
                        enrollStatusMsg.type === "ok"
                          ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                          : "border-rose-300 bg-rose-50 text-rose-900"
                      }`}
                    >
                      {enrollStatusMsg.text}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-3 text-xs">
                      <span className="flex items-center gap-1 font-bold text-[#836DAD]">
                        <Calendar className="h-3.5 w-3.5" />
                        Inicio
                      </span>
                      <p className="mt-1 font-extrabold text-[#2B1F42]">
                        {course.startDate} • {course.startTime} hs
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-3 text-xs">
                      <span className="flex items-center gap-1 font-bold text-[#836DAD]">
                        <Clock className="h-3.5 w-3.5" />
                        Duración
                      </span>
                      <p className="mt-1 font-extrabold text-[#2B1F42]">
                        {course.sessionsCount} encuentro(s) •{" "}
                        {course.durationHoursTotal} hs
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-3 text-xs">
                      <span className="flex items-center gap-1 font-bold text-[#836DAD]">
                        <Video className="h-3.5 w-3.5" />
                        Modalidad
                      </span>
                      <p className="mt-1 font-extrabold text-[#2B1F42]">
                        {course.modality}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-3 text-xs">
                      <span className="flex items-center gap-1 font-bold text-[#836DAD]">
                        <Users className="h-3.5 w-3.5" />
                        Cupos
                      </span>
                      <p className="mt-1 font-extrabold text-[#2B1F42]">
                        {remainingQuota} de {course.maxQuota} disponibles
                      </p>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#2B1F42]/85 leading-relaxed">
                    {course.description}
                  </p>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#836DAD]/20 bg-[#FAF8FC] p-4 text-xs space-y-1.5">
                      <h3 className="font-extrabold text-[#836DAD] uppercase tracking-wider">
                        Objetivos de aprendizaje
                      </h3>
                      <p className="text-[#2B1F42]/85 leading-relaxed">
                        {course.objectives}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-[#836DAD]/20 bg-[#FAF8FC] p-4 text-xs space-y-1.5">
                      <h3 className="font-extrabold text-[#836DAD] uppercase tracking-wider">
                        Temario y Módulos
                      </h3>
                      <p className="text-[#2B1F42]/85 whitespace-pre-line leading-relaxed">
                        {course.syllabus}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-4">
                    <div className="flex items-center gap-2 text-xs text-[#2B1F42]">
                      <Award className="h-5 w-5 text-[#836DAD] shrink-0" />
                      <span>
                        <strong>Certificación incluida:</strong>{" "}
                        {course.certificateType === "aprobacion"
                          ? "Certificado digital de aprobación verificable"
                          : course.certificateType === "participacion"
                          ? "Certificado digital de participación verificable"
                          : "Formación libre sin certificado"}
                      </span>
                    </div>

                    {sessionUser ? (
                      alreadyEnrolled ? (
                        <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white">
                          <CheckCircle2 className="h-4 w-4" />
                          Ya estás inscripto en esta capacitación
                        </span>
                      ) : (
                        <button
                          type="button"
                          disabled={enrolling || remainingQuota <= 0}
                          onClick={handleDirectEnroll}
                          className="cursor-pointer rounded-xl bg-[#836DAD] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#6D5898] disabled:opacity-50"
                        >
                          {enrolling
                            ? "Confirmando inscripción..."
                            : course.isFree || course.priceArs <= 0
                            ? "Inscribirme sin cargo ahora"
                            : `Inscribirme y abonar ${formatArs(
                                course.priceArs
                              )}`}
                        </button>
                      )
                    ) : (
                      <a
                        href="#acceso-capacitacion"
                        className="rounded-xl bg-[#836DAD] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#6D5898]"
                      >
                        Ingresar o registrarme para inscribirme
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* FLYER OFICIAL + QR DESCARGABLE DE ESTA CAPACITACIÓN */}
              <TrainingPromotionFlyerPanel
                courseId={course.id}
                promoSlug={course.promoSlug}
                title={course.title}
                discipline={course.discipline}
                level={course.level}
                modality={course.modality}
                startDate={course.startDate}
                startTime={course.startTime}
                sessionsCount={course.sessionsCount}
                durationHoursTotal={course.durationHoursTotal}
                isFree={course.isFree}
                priceArs={course.priceArs}
                certificateType={course.certificateType}
                therapistName={course.therapistName}
                therapistNickname={course.therapistNickname}
                therapistPhotoUrl={course.therapistPhotoUrl}
                therapistBiometricVerified={course.therapistBiometricVerified}
              />
            </>
          )}

          {/* PANEL DE ACCESO / MIS CAPACITACIONES */}
          <div id="acceso-capacitacion">
            <TerapiasAccessPanel
              idPrefix="capacitacion-landing"
              initialMode="login"
              preselectedContext="Mis Capacitaciones"
            />
          </div>
        </div>
      </main>

      <Footer onOpenAccess={() => setAccessModalOpen(true)} />

      <TerapiasAccessModal
        isOpen={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        initialMode="login"
      />
    </div>
  );
}
