"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  ShieldAlert,
  CheckCircle2,
  Ban,
  Percent,
  BarChart3,
  Award,
} from "lucide-react";
import {
  clampPercentage,
  formatArs,
  loadCommissionConfig,
  MP_SYNC_EVENT,
  saveCommissionConfig,
} from "@/lib/mercadoPagoSplit";
import {
  loadTrainingCertificates,
  loadTrainingEnrollments,
  loadTrainingsCatalog,
  saveTrainingsCatalog,
  TRAININGS_SYNC_EVENT,
  TrainingCertificate,
  TrainingCourse,
  TrainingEnrollment,
} from "@/lib/trainingsData";

interface AdminTrainingsSupervisionPanelProps {
  adminUser: string;
}

export default function AdminTrainingsSupervisionPanel({
  adminUser,
}: AdminTrainingsSupervisionPanelProps) {
  const [courses, setCourses] = useState<TrainingCourse[]>(() =>
    loadTrainingsCatalog()
  );
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>(() =>
    loadTrainingEnrollments()
  );
  const [certificates, setCertificates] = useState<TrainingCertificate[]>(() =>
    loadTrainingCertificates()
  );
  const [trainingPctInput, setTrainingPctInput] = useState<string>(() => {
    const cfg = loadCommissionConfig();
    return String(
      cfg.trainingCommissionPercentage ?? cfg.defaultPercentage ?? 10
    );
  });
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  const syncAll = () => {
    setCourses(loadTrainingsCatalog());
    setEnrollments(loadTrainingEnrollments());
    setCertificates(loadTrainingCertificates());
    const cfg = loadCommissionConfig();
    setTrainingPctInput(
      String(cfg.trainingCommissionPercentage ?? cfg.defaultPercentage ?? 10)
    );
  };

  useEffect(() => {
    syncAll();
    window.addEventListener(TRAININGS_SYNC_EVENT, syncAll);
    window.addEventListener(MP_SYNC_EVENT, syncAll);
    return () => {
      window.removeEventListener(TRAININGS_SYNC_EVENT, syncAll);
      window.removeEventListener(MP_SYNC_EVENT, syncAll);
    };
  }, []);

  const handleSaveTrainingCommission = () => {
    const val = clampPercentage(Number(trainingPctInput));
    const currentCfg = loadCommissionConfig();
    const prevVal =
      currentCfg.trainingCommissionPercentage ??
      currentCfg.defaultPercentage ??
      10;
    const nowIso = new Date().toISOString();

    const updatedCfg = {
      ...currentCfg,
      trainingCommissionPercentage: val,
      auditLog: [
        {
          id: `aud-cap-${Date.now()}`,
          adminUser,
          targetKey: "trainingCommissionPercentage",
          targetLabel:
            "Comisión de Reiki Online para Capacitaciones (Academia Reiki Online)",
          previousValue: prevVal,
          newValue: val,
          changedAt: nowIso,
        },
        ...currentCfg.auditLog,
      ],
      updatedAt: nowIso,
    };

    saveCommissionConfig(updatedCfg);
    setTrainingPctInput(String(val));
    setSavedNotice(
      `Comisión de Capacitaciones actualizada al ${val}% (independiente de las sesiones terapéuticas).`
    );
  };

  const handleToggleSuspendCourse = (course: TrainingCourse) => {
    const nextStatus =
      course.status === "suspendida_admin" ? "publicada" : "suspendida_admin";
    const updated = courses.map((c) =>
      c.id === course.id
        ? {
            ...c,
            status: nextStatus as TrainingCourse["status"],
            moderationNote:
              nextStatus === "suspendida_admin"
                ? `Suspendida por moderación administrativa (${adminUser})`
                : undefined,
            updatedAt: new Date().toISOString(),
          }
        : c
    );
    saveTrainingsCatalog(updated);
    setCourses(updated);
    setSavedNotice(
      nextStatus === "suspendida_admin"
        ? `Capacitación «${course.title}» suspendida preventivamente.`
        : `Capacitación «${course.title}» rehabilitada y publicada.`
    );
  };

  const reportStats = useMemo(() => {
    const confirmed = enrollments.filter((e) => e.status === "confirmada");
    const totalBruto = confirmed.reduce((acc, e) => acc + e.pricePaidArs, 0);
    const totalFeeReiki = confirmed.reduce(
      (acc, e) => acc + e.marketplaceFeeArs,
      0
    );
    const totalTerapeutas = confirmed.reduce(
      (acc, e) => acc + e.therapistGrossShareArs,
      0
    );
    return {
      totalCursos: courses.length,
      totalInscripciones: confirmed.length,
      totalCertificados: certificates.length,
      totalBruto,
      totalFeeReiki,
      totalTerapeutas,
    };
  }, [courses, enrollments, certificates]);

  return (
    <div className="rounded-2xl border border-[#836DAD]/30 bg-white p-4 sm:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#836DAD]/15 pb-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#836DAD] text-[#F3D791]">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div>
            <h5 className="text-sm sm:text-base font-bold text-[#2B1F42]">
              Supervisión Administrativa • Módulo «Mis Capacitaciones» y Academia
            </h5>
            <p className="text-xs text-[#2B1F42]/70">
              Comisión independiente de capacitaciones, moderación de cursos,
              inscripciones, asistencia y facturación.
            </p>
          </div>
        </div>
      </div>

      {savedNotice && (
        <div className="rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-bold text-emerald-900">
          {savedNotice}
        </div>
      )}

      {/* 1. Configuración de Comisión Independiente para Capacitaciones */}
      <div className="rounded-xl border border-[#836DAD]/25 bg-[#F6F3FA] p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-bold text-[#2B1F42] flex items-center gap-1.5">
            <Percent className="h-3.5 w-3.5 text-[#836DAD]" />
            Comisión Reiki Online exclusiva para Capacitaciones (Split Mercado
            Pago)
          </p>
          <p className="text-[11px] text-[#2B1F42]/75">
            Porcentaje configurable por el administrador, independiente de la
            comisión aplicada a las sesiones terapéuticas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={100}
            step={0.5}
            value={trainingPctInput}
            onChange={(e) => setTrainingPctInput(e.target.value)}
            className="w-24 rounded-xl border border-[#836DAD]/40 bg-white px-3 py-1.5 text-xs font-bold text-[#2B1F42]"
          />
          <span className="text-xs font-bold text-[#2B1F42]">%</span>
          <button
            type="button"
            onClick={handleSaveTrainingCommission}
            className="cursor-pointer rounded-xl bg-[#836DAD] px-3.5 py-1.5 text-xs font-bold text-white hover:bg-[#6D5898]"
          >
            Guardar comisión
          </button>
        </div>
      </div>

      {/* 2. Reporte consolidado de actividad y facturación */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-6">
        <div className="rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-2.5">
          <p className="text-[10px] font-semibold text-[#2B1F42]/70">
            Capacitaciones
          </p>
          <p className="text-sm font-extrabold text-[#2B1F42]">
            {reportStats.totalCursos}
          </p>
        </div>
        <div className="rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-2.5">
          <p className="text-[10px] font-semibold text-[#2B1F42]/70">
            Inscripciones
          </p>
          <p className="text-sm font-extrabold text-[#836DAD]">
            {reportStats.totalInscripciones}
          </p>
        </div>
        <div className="rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-2.5">
          <p className="text-[10px] font-semibold text-[#2B1F42]/70">
            Certificados
          </p>
          <p className="text-sm font-extrabold text-[#2B1F42]">
            {reportStats.totalCertificados}
          </p>
        </div>
        <div className="rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-2.5">
          <p className="text-[10px] font-semibold text-[#2B1F42]/70">
            Facturación Bruta
          </p>
          <p className="text-sm font-extrabold text-[#2B1F42]">
            {formatArs(reportStats.totalBruto)}
          </p>
        </div>
        <div className="rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-2.5">
          <p className="text-[10px] font-semibold text-[#2B1F42]/70">
            Comisión Reiki
          </p>
          <p className="text-sm font-extrabold text-[#836DAD]">
            {formatArs(reportStats.totalFeeReiki)}
          </p>
        </div>
        <div className="rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-2.5">
          <p className="text-[10px] font-semibold text-[#2B1F42]/70">
            Part. Terapeutas
          </p>
          <p className="text-sm font-extrabold text-emerald-700">
            {formatArs(reportStats.totalTerapeutas)}
          </p>
        </div>
      </div>

      {/* 3. Moderación de Capacitaciones */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-[#5E4B8B]">
          Moderación y Control de Capacitaciones Publicadas
        </p>
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {courses.map((c) => (
            <div
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-2.5 text-xs"
            >
              <div>
                <p className="font-bold text-[#2B1F42]">
                  {c.title} •{" "}
                  <span className="text-[#836DAD]">
                    {c.therapistName} (@{c.therapistNickname})
                  </span>
                </p>
                <p className="text-[11px] text-[#2B1F42]/70">
                  Estado: <strong>{c.status.toUpperCase()}</strong> • Cupos:{" "}
                  {c.enrolledCount}/{c.maxQuota} • Precio:{" "}
                  {c.isFree ? "Gratuita" : formatArs(c.priceArs)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleToggleSuspendCourse(c)}
                className={`inline-flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition ${
                  c.status === "suspendida_admin"
                    ? "bg-emerald-600 text-white"
                    : "border border-rose-300 bg-rose-50 text-rose-700 hover:bg-rose-100"
                }`}
              >
                {c.status === "suspendida_admin" ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    <span>Reactivar</span>
                  </>
                ) : (
                  <>
                    <Ban className="h-3 w-3" />
                    <span>Suspender</span>
                  </>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
