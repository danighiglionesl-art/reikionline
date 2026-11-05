"use client";

import React, { useRef, useState } from "react";
import {
  ShieldCheck,
  Camera,
  CheckCircle2,
  AlertTriangle,
  Clock,
  RefreshCw,
  FileCheck2,
  ScanFace,
  UserCheck,
  HelpCircle,
  ArrowRight,
  Lock,
  Sparkles,
} from "lucide-react";
import {
  BIOMETRIC_PROVIDER_CATALOG,
  BiometricAuditEvent,
  BiometricProviderId,
  BiometricVerificationRecord,
  BiometricVerificationStatus,
  createInitialBiometricRecord,
  getBiometricStatusMeta,
  MAX_BIOMETRIC_ATTEMPTS,
} from "@/lib/biometricIdentity";
import { ReikiUserProfile } from "@/lib/geoData";

interface BiometricIdentityStepProps {
  profile: ReikiUserProfile;
  roleContext: "Terapeuta" | "Consultante";
  consultanteRiskReasons?: string[];
  onUpdateBiometric: (nextRecord: BiometricVerificationRecord) => void;
  onGoToProfile?: () => void;
  onBackToRoles?: () => void;
}

export default function BiometricIdentityStep({
  profile,
  roleContext,
  consultanteRiskReasons = [],
  onUpdateBiometric,
  onGoToProfile,
  onBackToRoles,
}: BiometricIdentityStepProps) {
  const currentRecord: BiometricVerificationRecord =
    profile.biometricVerification ||
    createInitialBiometricRecord(profile.id, Boolean(profile.isAdmin));

  const [selectedProvider, setSelectedProvider] = useState<BiometricProviderId>(
    currentRecord.provider || "sandbox"
  );
  const [consentAccepted, setConsentAccepted] = useState<boolean>(
    Boolean(currentRecord.consentAcceptedAt)
  );

  // Estado de sesión activa emitida por el servidor (/api/biometric/session)
  const [activeSession, setActiveSession] = useState<{
    externalOperationId: string;
    startedAt: string;
    sessionToken: string;
    renaperAvailable: boolean;
  } | null>(null);

  // Pasos de captura biométrica (no persisten imágenes crudas en base de datos ni localStorage)
  const [dniFrontCaptured, setDniFrontCaptured] = useState<boolean>(
    Boolean(currentRecord.technicalResult?.dniFrontCaptured)
  );
  const [dniFrontFileName, setDniFrontFileName] = useState<string>("");

  const [dniBackCaptured, setDniBackCaptured] = useState<boolean>(
    Boolean(currentRecord.technicalResult?.dniBackCaptured)
  );
  const [dniBackFileName, setDniBackFileName] = useState<string>("");

  const [selfieCaptured, setSelfieCaptured] = useState<boolean>(
    Boolean(currentRecord.technicalResult?.selfieCaptured)
  );
  const [selfieFileName, setSelfieFileName] = useState<string>("");

  const [livenessCompleted, setLivenessCompleted] = useState<boolean>(
    Boolean(currentRecord.technicalResult?.livenessPassed)
  );

  const [simulatedOutcome, setSimulatedOutcome] =
    useState<BiometricVerificationStatus>("verificada");

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const frontInputRef = useRef<HTMLInputElement | null>(null);
  const backInputRef = useRef<HTMLInputElement | null>(null);
  const selfieInputRef = useRef<HTMLInputElement | null>(null);

  const statusMeta = getBiometricStatusMeta(currentRecord.status);
  const attemptsExhausted =
    currentRecord.attemptsCount >= MAX_BIOMETRIC_ATTEMPTS;

  const appendEvent = (
    prevRecord: BiometricVerificationRecord,
    newStatus: BiometricVerificationStatus,
    actor: BiometricAuditEvent["actor"],
    summary: string
  ): BiometricAuditEvent[] => {
    const evt: BiometricAuditEvent = {
      id: `evt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      previousStatus: prevRecord.status,
      newStatus,
      actor,
      summary,
    };
    return [evt, ...(prevRecord.events || [])].slice(0, 20);
  };

  // Paso 1: Iniciar sesión en el backend seguro (/api/biometric/session)
  async function handleStartProviderSession() {
    setErrorMsg(null);
    setInfoMsg(null);

    if (!consentAccepted) {
      setErrorMsg(
        "Debés aceptar el consentimiento informado sobre tratamiento de datos biométricos para iniciar la verificación."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/biometric/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          provider: selectedProvider,
          consentAccepted,
          attemptsCount: currentRecord.attemptsCount,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data?.status === "revision_requerida") {
          const updatedReview: BiometricVerificationRecord = {
            ...currentRecord,
            status: "revision_requerida",
            rejectionOrReviewReason:
              data.error || "Límite de intentos alcanzado. Requiere revisión.",
            events: appendEvent(
              currentRecord,
              "revision_requerida",
              "provider_api",
              "Derivado a revisión requerida por límite de intentos de seguridad."
            ),
          };
          onUpdateBiometric(updatedReview);
        }
        setErrorMsg(
          data?.error || "No se pudo iniciar la sesión de verificación."
        );
        setLoading(false);
        return;
      }

      setActiveSession({
        externalOperationId: data.externalOperationId,
        startedAt: data.startedAt,
        sessionToken: data.sessionToken,
        renaperAvailable: Boolean(data.renaperAvailable),
      });

      const pendingRecord: BiometricVerificationRecord = {
        ...currentRecord,
        userId: profile.id,
        provider: data.provider || selectedProvider,
        externalOperationId: data.externalOperationId,
        startedAt: data.startedAt,
        consentAcceptedAt:
          currentRecord.consentAcceptedAt || new Date().toISOString(),
        events: appendEvent(
          currentRecord,
          currentRecord.status,
          "user",
          `Sesión biométrica iniciada (${data.externalOperationId}) con proveedor ${String(
            data.provider || selectedProvider
          ).toUpperCase()}.`
        ),
      };
      onUpdateBiometric(pendingRecord);
      setInfoMsg(
        `Sesión segura iniciada (${data.externalOperationId}). Completá las capturas de Frente de DNI, Dorso de DNI, Selfie y Prueba de vida.`
      );
    } catch {
      setErrorMsg("Error de conexión al iniciar la sesión biométrica.");
    } finally {
      setLoading(false);
    }
  }

  // Paso 2: Enviar validación al backend seguro (/api/biometric/verify)
  async function handleExecuteVerification(
    overrideOutcome?: BiometricVerificationStatus
  ) {
    setErrorMsg(null);
    setInfoMsg(null);

    if (!activeSession) {
      setErrorMsg(
        "Primero presioná «Iniciar procedimiento de verificación» para abrir la operación segura."
      );
      return;
    }

    const outcomeToSend = overrideOutcome || simulatedOutcome;

    if (
      outcomeToSend === "verificada" &&
      (!dniFrontCaptured ||
        !dniBackCaptured ||
        !selfieCaptured ||
        !livenessCompleted)
    ) {
      setErrorMsg(
        "Por favor completá los 4 controles requeridos: Frente del DNI, Dorso del DNI, Selfie y Prueba de vida."
      );
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/biometric/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: profile.id,
          provider: selectedProvider,
          externalOperationId: activeSession.externalOperationId,
          sessionToken: activeSession.sessionToken,
          startedAt: activeSession.startedAt,
          dni: profile.dni,
          attemptsCount: currentRecord.attemptsCount,
          dniFrontCaptured,
          dniBackCaptured,
          selfieCaptured,
          livenessCompleted,
          simulatedOutcome: outcomeToSend,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMsg(
          data?.error || "No se pudo completar la validación biométrica."
        );
        setLoading(false);
        return;
      }

      const nextStatus = data.status as BiometricVerificationStatus;
      const updatedRecord: BiometricVerificationRecord = {
        ...currentRecord,
        userId: profile.id,
        provider: data.provider || selectedProvider,
        externalOperationId: data.externalOperationId,
        status: nextStatus,
        startedAt: activeSession.startedAt,
        resolvedAt: data.resolvedAt,
        expiresAt: data.expiresAt,
        attemptsCount: Number(data.attemptsCount || currentRecord.attemptsCount + 1),
        technicalResult: data.technicalResult,
        rejectionOrReviewReason: data.rejectionOrReviewReason,
        consentAcceptedAt:
          currentRecord.consentAcceptedAt || new Date().toISOString(),
        riskFlags: nextStatus === "verificada" ? [] : currentRecord.riskFlags,
        events: appendEvent(
          currentRecord,
          nextStatus,
          "provider_api",
          data.eventSummary || `Estado actualizado a ${nextStatus}.`
        ),
      };

      onUpdateBiometric(updatedRecord);

      if (nextStatus === "verificada") {
        setInfoMsg(
          "¡Identidad biométrica verificada con éxito! Ya tenés habilitado el distintivo «✓ Identidad verificada» y las funciones profesionales de Terapeuta."
        );
      } else if (nextStatus === "pendiente") {
        setInfoMsg(
          "Tu verificación quedó en estado PENDIENTE de procesamiento automático. Podés editar los datos de Mi Perfil mientras finaliza la validación."
        );
      } else if (nextStatus === "revision_requerida") {
        setInfoMsg(
          "Tu solicitud quedó en estado REVISIÓN REQUERIDA para validación documental asistida."
        );
      }
    } catch {
      setErrorMsg("Error de red al validar la operación biométrica.");
    } finally {
      setLoading(false);
    }
  }

  // Solicitar vía alternativa de accesibilidad o revisión asistida
  function handleRequestAccessibilityReview() {
    const updated: BiometricVerificationRecord = {
      ...currentRecord,
      userId: profile.id,
      status: "revision_requerida",
      accessibilityAlternativeRequested: true,
      rejectionOrReviewReason:
        "El usuario solicitó vía alternativa segura por dificultades técnicas o de accesibilidad.",
      events: appendEvent(
        currentRecord,
        "revision_requerida",
        "user",
        "Solicitud de vía alternativa segura / revisión asistida por accesibilidad."
      ),
    };
    onUpdateBiometric(updated);
    setInfoMsg(
      "Se activó la vía alternativa segura (Revisión requerida). Nuestro equipo validará tu identidad mediante procedimiento asistido."
    );
  }

  return (
    <div className="rounded-3xl border border-[#836DAD]/30 bg-white p-5 sm:p-7 space-y-6 shadow-sm">
      {/* Cabecera de estado biométrico */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#836DAD]/15 pb-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#836DAD] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F3D791]">
              <ShieldCheck className="h-3.5 w-3.5" />
              {roleContext === "Terapeuta"
                ? "Requisito obligatorio para Terapeutas"
                : "Control proporcional de seguridad (Consultante)"}
            </span>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold ${statusMeta.colorClass}`}
            >
              {currentRecord.status === "verificada" ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              ) : currentRecord.status === "pendiente" ? (
                <Clock className="h-3.5 w-3.5 text-amber-700" />
              ) : (
                <AlertTriangle className="h-3.5 w-3.5" />
              )}
              Estado: {statusMeta.label} ({currentRecord.status})
            </span>
          </div>

          <h4 className="text-lg sm:text-xl font-bold text-[#2B1F42]">
            Verificación de Identidad Biométrica
          </h4>
          <p className="text-xs sm:text-sm text-[#2B1F42]/75 leading-relaxed">
            {statusMeta.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {onGoToProfile && (
            <button
              type="button"
              onClick={onGoToProfile}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD]/35 bg-[#FAF8FC] px-3.5 py-2 text-xs font-semibold text-[#836DAD] hover:bg-[#836DAD] hover:text-white transition"
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Completar datos en Mi Perfil</span>
            </button>
          )}
          {onBackToRoles && (
            <button
              type="button"
              onClick={onBackToRoles}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD]/25 bg-white px-3 py-2 text-xs font-semibold text-[#2B1F42] hover:bg-[#F6F3FA] transition"
            >
              <span>← Volver a elección de rol</span>
            </button>
          )}
        </div>
      </div>

      {/* Si es Consultante y se activó por alerta de riesgo (Sección 4), explicar motivos objetivos */}
      {roleContext === "Consultante" && consultanteRiskReasons.length > 0 && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50/90 p-4 space-y-2 text-xs text-amber-950">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              Motivos generales de seguridad por los que solicitamos confirmar tu identidad:
            </span>
          </div>
          <ul className="list-disc pl-5 space-y-1">
            {consultanteRiskReasons.map((reason, idx) => (
              <li key={idx}>{reason}</li>
            ))}
          </ul>
          <p className="text-[11px] text-amber-900/85 pt-1">
            La verificación biométrica no es obligatoria en el registro inicial de consultantes y solo se solicita ante alertas objetivas de seguridad para proteger a toda la comunidad de Reiki Online.
          </p>
        </div>
      )}

      {/* Aviso importante sobre bloqueo de publicación de servicios mientras esté pendiente/no verificada */}
      {roleContext === "Terapeuta" && currentRecord.status !== "verificada" && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-4 text-xs text-[#2B1F42]">
          <div className="flex items-start gap-2.5">
            <Lock className="h-4 w-4 text-[#836DAD] shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-[#2B1F42]">
                Publicación de servicios y disponibilidad en espera de aprobación biométrica
              </p>
              <p className="text-[#2B1F42]/75 mt-0.5">
                Podés completar libremente tus datos personales y ubicación en{" "}
                <strong>Mi Perfil</strong>, pero para ofrecer terapias, configurar horarios o aparecer en «Online ahora» como Terapeuta es requisito indispensable contar con la aprobación biométrica.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensajes de estado, rechazo o revisión */}
      {currentRecord.rejectionOrReviewReason &&
        (currentRecord.status === "rechazada" ||
          currentRecord.status === "revision_requerida") && (
          <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4 text-xs text-red-900 space-y-1.5">
            <p className="font-bold">
              Motivo general informado ({currentRecord.status}):
            </p>
            <p>{currentRecord.rejectionOrReviewReason}</p>
            <p className="text-[11px] text-red-800/80">
              Intentos utilizados: {currentRecord.attemptsCount} de{" "}
              {MAX_BIOMETRIC_ATTEMPTS}. Si tenés dificultades con la cámara de tu dispositivo, podés solicitar una revisión o vía alternativa debajo.
            </p>
          </div>
        )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700"
        >
          {errorMsg}
        </div>
      )}

      {infoMsg && (
        <div
          role="status"
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800"
        >
          {infoMsg}
        </div>
      )}

      {/* Si ya está VERIFICADA, mostrar insignia oficial y resumen auditable */}
      {currentRecord.status === "verificada" && (
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50/70 p-5 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#836DAD] px-3.5 py-1.5 text-xs font-bold text-[#F3D791] shadow-xs">
                <ShieldCheck className="h-4 w-4" />✓ Identidad verificada
              </span>
              <span className="text-xs font-semibold text-emerald-900">
                Validación biométrica y documental activa
              </span>
            </div>
            {currentRecord.expiresAt && (
              <span className="text-[11px] font-medium text-emerald-800">
                Vigente hasta:{" "}
                {new Date(currentRecord.expiresAt).toLocaleDateString("es-AR")}
              </span>
            )}
          </div>
          <p className="text-xs text-emerald-950/85">
            Tu verificación biométrica está asociada a tu identidad única en Reiki Online y se reutiliza tanto para tu rol de Terapeuta como de Consultante.
          </p>
        </div>
      )}

      {/* Formulario / Procedimiento de Verificación (cuando no está verificada o se desea actualizar en entorno de pruebas) */}
      {currentRecord.status !== "verificada" && !attemptsExhausted && (
        <div className="space-y-5">
          {/* Consentimiento e inicio de verificación con el proveedor oficial de Reiki Online */}
          <div className="rounded-2xl border border-[#836DAD]/20 bg-[#FAF8FC] p-4 space-y-3">
            <label className="flex items-start gap-2.5 text-xs text-[#2B1F42]/85 cursor-pointer">
              <input
                type="checkbox"
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-[#836DAD] text-[#836DAD]"
              />
              <span>
                <strong>Consentimiento informado y tratamiento de datos:</strong>{" "}
                Autorizo la captura del frente y dorso de mi DNI, selfie con prueba de vida (liveness detection), comparación biométrica facial y validación de identidad contra RENAPER. Reiki Online no almacena innecesariamente imágenes biométricas crudas (Ley 25.326). *
              </span>
            </label>

            {!activeSession ? (
              <button
                type="button"
                disabled={loading || !consentAccepted}
                onClick={handleStartProviderSession}
                className="inline-flex w-full sm:w-auto cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#836DAD] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#6F599B] disabled:opacity-50 transition"
              >
                <Sparkles className="h-4 w-4 text-[#F3D791]" />
                <span>
                  {loading
                    ? "Iniciando sesión segura..."
                    : "1. Iniciar procedimiento de verificación"}
                </span>
              </button>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-900">
                <span>
                  ✓ Operación activa: {activeSession.externalOperationId}
                </span>
                <span>
                  RENAPER:{" "}
                  {activeSession.renaperAvailable
                    ? "Disponible y autorizado"
                    : "Validación activa"}
                </span>
              </div>
            )}
          </div>

          {/* Captura de los 4 requisitos obligatorios (Frente DNI, Dorso DNI, Selfie, Prueba de vida) */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* 1. Frente del DNI */}
            <div
              className={`rounded-2xl border p-4 space-y-2.5 transition ${
                dniFrontCaptured
                  ? "border-emerald-400 bg-emerald-50/40"
                  : "border-[#836DAD]/25 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2B1F42] flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-[#836DAD]" />
                  1. Frente del DNI Argentino *
                </span>
                {dniFrontCaptured && (
                  <span className="text-[11px] font-bold text-emerald-700">
                    ✓ Capturado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#2B1F42]/70">
                Fotografía nítida del frente del DNI (fotografía de referencia, nombre, apellido y número de documento).
              </p>
              <input
                ref={frontInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDniFrontCaptured(true);
                    setDniFrontFileName(file.name);
                  }
                }}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => frontInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6F599B] transition"
                >
                  <Camera className="h-3.5 w-3.5 text-[#F3D791]" />
                  <span>Usar cámara / Subir frente</span>
                </button>
                {!dniFrontCaptured && (
                  <button
                    type="button"
                    onClick={() => {
                      setDniFrontCaptured(true);
                      setDniFrontFileName("dni_frente_validado_sandbox.jpg");
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs font-semibold text-[#5E4B8B] hover:bg-[#F4F0FA]"
                  >
                    <span>Capturar en modo prueba</span>
                  </button>
                )}
              </div>
              {dniFrontFileName && (
                <p className="text-[11px] text-[#5E4B8B] truncate">
                  Archivo procesado en memoria: {dniFrontFileName}
                </p>
              )}
            </div>

            {/* 2. Dorso del DNI */}
            <div
              className={`rounded-2xl border p-4 space-y-2.5 transition ${
                dniBackCaptured
                  ? "border-emerald-400 bg-emerald-50/40"
                  : "border-[#836DAD]/25 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2B1F42] flex items-center gap-1.5">
                  <FileCheck2 className="h-4 w-4 text-[#836DAD]" />
                  2. Dorso del DNI (PDF417) *
                </span>
                {dniBackCaptured && (
                  <span className="text-[11px] font-bold text-emerald-700">
                    ✓ Capturado
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#2B1F42]/70">
                Captura del dorso del DNI para lectura de código y número de trámite contra padrón RENAPER.
              </p>
              <input
                ref={backInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setDniBackCaptured(true);
                    setDniBackFileName(file.name);
                  }
                }}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => backInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6F599B] transition"
                >
                  <Camera className="h-3.5 w-3.5 text-[#F3D791]" />
                  <span>Usar cámara / Subir dorso</span>
                </button>
                {!dniBackCaptured && (
                  <button
                    type="button"
                    onClick={() => {
                      setDniBackCaptured(true);
                      setDniBackFileName("dni_dorso_pdf417_sandbox.jpg");
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs font-semibold text-[#5E4B8B] hover:bg-[#F4F0FA]"
                  >
                    <span>Capturar en modo prueba</span>
                  </button>
                )}
              </div>
              {dniBackFileName && (
                <p className="text-[11px] text-[#5E4B8B] truncate">
                  Archivo procesado en memoria: {dniBackFileName}
                </p>
              )}
            </div>

            {/* 3. Selfie mediante cámara del dispositivo */}
            <div
              className={`rounded-2xl border p-4 space-y-2.5 transition ${
                selfieCaptured
                  ? "border-emerald-400 bg-emerald-50/40"
                  : "border-[#836DAD]/25 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2B1F42] flex items-center gap-1.5">
                  <ScanFace className="h-4 w-4 text-[#836DAD]" />
                  3. Selfie con cámara frontal *
                </span>
                {selfieCaptured && (
                  <span className="text-[11px] font-bold text-emerald-700">
                    ✓ Capturada
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#2B1F42]/70">
                Selfie actual sin lentes oscuros ni gorra para comparación biométrica con la fotografía del DNI.
              </p>
              <input
                ref={selfieInputRef}
                type="file"
                accept="image/*"
                capture="user"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setSelfieCaptured(true);
                    setSelfieFileName(file.name);
                  }
                }}
                className="hidden"
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => selfieInputRef.current?.click()}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6F599B] transition"
                >
                  <Camera className="h-3.5 w-3.5 text-[#F3D791]" />
                  <span>Tomar selfie</span>
                </button>
                {!selfieCaptured && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelfieCaptured(true);
                      setSelfieFileName("selfie_biometrica_sandbox.jpg");
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs font-semibold text-[#5E4B8B] hover:bg-[#F4F0FA]"
                  >
                    <span>Capturar en modo prueba</span>
                  </button>
                )}
              </div>
              {selfieFileName && (
                <p className="text-[11px] text-[#5E4B8B] truncate">
                  Selfie en memoria: {selfieFileName}
                </p>
              )}
            </div>

            {/* 4. Prueba de vida (Liveness Detection) */}
            <div
              className={`rounded-2xl border p-4 space-y-2.5 transition ${
                livenessCompleted
                  ? "border-emerald-400 bg-emerald-50/40"
                  : "border-[#836DAD]/25 bg-white"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2B1F42] flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-[#836DAD]" />
                  4. Prueba de vida (Liveness) *
                </span>
                {livenessCompleted && (
                  <span className="text-[11px] font-bold text-emerald-700">
                    ✓ Verificada
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#2B1F42]/70">
                Validación activa de presencia real (parpadeo y giro leve de cabeza) para prevenir suplantación.
              </p>
              <button
                type="button"
                onClick={() => setLivenessCompleted(true)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-semibold transition ${
                  livenessCompleted
                    ? "bg-emerald-600 text-white"
                    : "bg-[#836DAD] text-white hover:bg-[#6F599B]"
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 text-[#F3D791]" />
                <span>
                  {livenessCompleted
                    ? "Prueba de vida completada"
                    : "Ejecutar prueba de vida ahora"}
                </span>
              </button>
            </div>
          </div>

          {/* Botón principal de validación automática */}
          <div className="rounded-2xl border border-[#836DAD]/30 bg-[#FAF8FC] p-4 space-y-3">
            <div>
              <span className="text-xs font-bold text-[#2B1F42] block">
                2. Validar identidad biométrica y contraste RENAPER
              </span>
              <span className="text-[11px] text-[#2B1F42]/70">
                La validación es firmada criptográficamente por el servidor de Reiki Online.
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <button
                type="button"
                disabled={loading || !activeSession}
                onClick={() => handleExecuteVerification()}
                className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#836DAD] px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#6F599B] disabled:opacity-50 transition"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin text-[#F3D791]" />
                ) : (
                  <ArrowRight className="h-4 w-4 text-[#F3D791]" />
                )}
                <span>
                  {loading
                    ? "Validando biometría..."
                    : "Confirmar y enviar verificación biométrica"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleRequestAccessibilityReview}
                className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#5E4B8B] underline hover:text-[#836DAD]"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>
                  ¿Dificultades técnicas o de accesibilidad? Solicitar vía alternativa segura
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Ficha técnica y registro auditable de estados (Sección 5) */}
      <details className="rounded-2xl border border-[#836DAD]/20 bg-[#FAF8FC] p-4 text-xs text-[#2B1F42]">
        <summary className="cursor-pointer font-bold text-[#5E4B8B] select-none">
          Registro técnico y trazabilidad de verificación ({currentRecord.status})
        </summary>
        <div className="mt-3 space-y-3 border-t border-[#836DAD]/15 pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-[11px]">
            <div>
              <span className="font-semibold text-[#5E4B8B] block">
                ID interno de usuario:
              </span>
              <span className="font-mono">{currentRecord.userId}</span>
            </div>
            <div>
              <span className="font-semibold text-[#5E4B8B] block">
                Proveedor / ID externo:
              </span>
              <span className="font-mono">
                {currentRecord.provider.toUpperCase()} •{" "}
                {currentRecord.externalOperationId || "Sin operación"}
              </span>
            </div>
            <div>
              <span className="font-semibold text-[#5E4B8B] block">
                Inicio / Resolución / Vencimiento:
              </span>
              <span>
                {currentRecord.startedAt
                  ? new Date(currentRecord.startedAt).toLocaleDateString("es-AR")
                  : "—"}{" "}
                /{" "}
                {currentRecord.resolvedAt
                  ? new Date(currentRecord.resolvedAt).toLocaleDateString("es-AR")
                  : "—"}{" "}
                /{" "}
                {currentRecord.expiresAt
                  ? new Date(currentRecord.expiresAt).toLocaleDateString("es-AR")
                  : "—"}
              </span>
            </div>
          </div>

          {currentRecord.technicalResult && (
            <div className="rounded-xl bg-white p-3 border border-[#836DAD]/15 text-[11px] flex flex-wrap gap-3">
              <span>
                <strong>Liveness:</strong>{" "}
                {currentRecord.technicalResult.livenessPassed ? "Aprobado" : "No"}
              </span>
              <span>
                <strong>Comparación facial:</strong>{" "}
                {currentRecord.technicalResult.facialMatchScore}%
              </span>
              <span>
                <strong>RENAPER:</strong>{" "}
                {currentRecord.technicalResult.renaperStatus}
              </span>
              <span>
                <strong>Referencia:</strong>{" "}
                <span className="font-mono">
                  {currentRecord.technicalResult.providerReference}
                </span>
              </span>
            </div>
          )}

          {currentRecord.events && currentRecord.events.length > 0 && (
            <div className="space-y-1.5">
              <span className="font-semibold text-[#5E4B8B] block text-[11px]">
                Historial de eventos y cambios de estado:
              </span>
              <ul className="space-y-1 text-[11px]">
                {currentRecord.events.slice(0, 5).map((ev) => (
                  <li
                    key={ev.id}
                    className="rounded-lg bg-white px-2.5 py-1.5 border border-[#836DAD]/10"
                  >
                    <span className="font-mono text-[#5E4B8B]">
                      {new Date(ev.timestamp).toLocaleString("es-AR")}
                    </span>{" "}
                    — <strong>[{ev.newStatus}]</strong> {ev.summary}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </details>
    </div>
  );
}
