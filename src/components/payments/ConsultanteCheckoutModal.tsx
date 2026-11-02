"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Lock,
  ExternalLink,
  Video,
  MapPin,
  Sparkles,
  CreditCard,
} from "lucide-react";
import {
  acquireTherapistLock,
  appendIntegrationError,
  ATTENTION_MODALITY_LABELS,
  AttentionModality,
  BOOKING_TIMING_LABELS,
  BookingTimingType,
  calculateSplitAmounts,
  formatArs,
  loadCommissionConfig,
  loadMpAccounts,
  loadMpTransactions,
  releaseTherapistLock,
  resolveApplicableCommission,
  resolveTherapySessionPrice,
  saveMpTransactions,
  SplitPaymentStatus,
  SplitPaymentTransaction,
} from "@/lib/mercadoPagoSplit";
import {
  loadConsultations,
  ReikiConsultationRecord,
  saveConsultations,
} from "@/lib/socialNetwork";
import { ReikiUserProfile } from "@/lib/geoData";

interface ConsultanteCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  consultanteProfile: ReikiUserProfile;
  therapistId: string;
  therapistName: string;
  therapistNickname: string;
  therapistLocalidad: string;
  therapistProvincia: string;
  availableTherapies: string[];
  initialBookingTiming: BookingTimingType;
  initialAttentionModality: AttentionModality;
  scheduledSlotLabel: string;
  slotKey: string;
  onPaymentConfirmed?: (tx: SplitPaymentTransaction) => void;
}

export default function ConsultanteCheckoutModal({
  isOpen,
  onClose,
  consultanteProfile,
  therapistId,
  therapistName,
  therapistNickname,
  therapistLocalidad,
  therapistProvincia,
  availableTherapies,
  initialBookingTiming,
  initialAttentionModality,
  scheduledSlotLabel,
  slotKey,
  onPaymentConfirmed,
}: ConsultanteCheckoutModalProps) {
  const [selectedTherapy, setSelectedTherapy] = useState<string>(
    availableTherapies[0] || "Reiki Usui"
  );
  const [attentionModality, setAttentionModality] = useState<AttentionModality>(
    initialAttentionModality
  );
  const [bookingTiming, setBookingTiming] =
    useState<BookingTimingType>(initialBookingTiming);
  const [integrationMode, setIntegrationMode] = useState<
    "checkout_pro" | "checkout_api"
  >("checkout_pro");
  const [acceptedTerms, setAcceptedTerms] = useState<boolean>(false);

  const [reservationId, setReservationId] = useState<string>("");
  const [preferenceId, setPreferenceId] = useState<string>("");
  const [initPointUrl, setInitPointUrl] = useState<string>("");
  const [reservationExpiresAt, setReservationExpiresAt] = useState<string>("");
  const [secondsRemaining, setSecondsRemaining] = useState<number>(600);
  const [lockError, setLockError] = useState<string | null>(null);

  const [step, setStep] = useState<"configure" | "checkout_ready" | "result">(
    "configure"
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedTx, setCompletedTx] =
    useState<SplitPaymentTransaction | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSelectedTherapy(availableTherapies[0] || "Reiki Usui");
    setAttentionModality(initialAttentionModality);
    setBookingTiming(initialBookingTiming);
    setAcceptedTerms(false);
    setStep("configure");
    setErrorMsg(null);
    setCompletedTx(null);
    setLockError(null);

    // Reservar temporalmente la disponibilidad del terapeuta mientras se procesa el pago (Punto 4)
    const newResId = `res-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const durationMs =
      initialBookingTiming === "inmediata" ? 10 * 60 * 1000 : 15 * 60 * 1000;
    const expIso = new Date(Date.now() + durationMs).toISOString();

    const lockResult = acquireTherapistLock({
      reservationId: newResId,
      therapistId,
      therapistNickname: therapistNickname.toLowerCase(),
      consultanteEmail: consultanteProfile.email,
      bookingTiming: initialBookingTiming,
      slotKey,
      lockedAt: new Date().toISOString(),
      expiresAt: expIso,
    });

    if (!lockResult.ok) {
      setLockError(
        lockResult.error ||
          "El terapeuta se encuentra temporalmente reservado por otra operación."
      );
    } else {
      setReservationId(newResId);
      setReservationExpiresAt(expIso);
      setSecondsRemaining(Math.floor(durationMs / 1000));
    }
  }, [
    isOpen,
    therapistId,
    therapistNickname,
    consultanteProfile.email,
    initialBookingTiming,
    initialAttentionModality,
    slotKey,
    availableTherapies,
  ]);

  useEffect(() => {
    if (!isOpen || !reservationExpiresAt || step === "result") return;
    const timer = window.setInterval(() => {
      const diff = Math.max(
        0,
        Math.floor(
          (new Date(reservationExpiresAt).getTime() - Date.now()) / 1000
        )
      );
      setSecondsRemaining(diff);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, reservationExpiresAt, step]);

  const therapistMpAccount = useMemo(() => {
    const accounts = loadMpAccounts();
    return (
      accounts[therapistId] ||
      accounts[therapistNickname.toLowerCase()] ||
      null
    );
  }, [therapistId, therapistNickname, isOpen]);

  const isTherapistLinked = Boolean(
    therapistMpAccount?.linked &&
      therapistMpAccount?.tokenStatus === "active" &&
      therapistMpAccount?.kycVerified
  );

  // El valor de la sesión depende de la terapia seleccionada (y es el mismo sea presencial, virtual con turno o virtual ahora)
  const sessionPriceArs = useMemo(
    () => resolveTherapySessionPrice(therapistMpAccount, selectedTherapy),
    [therapistMpAccount, selectedTherapy]
  );

  const commissionConfig = useMemo(() => loadCommissionConfig(), [isOpen]);
  const commissionSnapshot = useMemo(
    () =>
      resolveApplicableCommission(
        commissionConfig,
        attentionModality,
        bookingTiming,
        therapistId,
        therapistNickname
      ),
    [
      commissionConfig,
      attentionModality,
      bookingTiming,
      therapistId,
      therapistNickname,
    ]
  );

  const splitAmounts = useMemo(
    () =>
      calculateSplitAmounts(
        sessionPriceArs,
        commissionSnapshot.appliedPercentage
      ),
    [sessionPriceArs, commissionSnapshot.appliedPercentage]
  );

  if (!isOpen) return null;

  const handleCloseModal = () => {
    if (reservationId && (!completedTx || !completedTx.sessionConfirmed)) {
      releaseTherapistLock(reservationId);
    }
    onClose();
  };

  // Paso 1: Crear preferencia de pago con Split 1:1 en el Backend
  const handleCreatePreference = async () => {
    setErrorMsg(null);
    if (!isTherapistLinked) {
      setErrorMsg(
        "No se pueden habilitar sesiones pagas hasta que la cuenta de Mercado Pago del terapeuta esté correctamente vinculada."
      );
      return;
    }
    if (!acceptedTerms) {
      setErrorMsg(
        "Debés confirmar las condiciones de contratación y cancelación antes de continuar al pago."
      );
      return;
    }

    setLoading(true);
    try {
      const idempotencyKey = `idem-${reservationId}-${attentionModality}-${bookingTiming}`;
      const res = await fetch("/api/mp/preference", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          idempotencyKey,
          reservationId,
          sessionPriceArs,
          therapistId,
          therapistName,
          therapistNickname,
          therapistMpLinked: isTherapistLinked,
          attentionModality,
          bookingTiming,
          therapyName: selectedTherapy,
          scheduledSlotLabel,
          consultanteEmail: consultanteProfile.email,
          consultanteName: `${consultanteProfile.nombre} ${consultanteProfile.apellido}`.trim(),
          integrationMode,
          commissionConfig,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || "No se pudo generar la preferencia de Mercado Pago."
        );
      }

      setPreferenceId(data.preferenceId);
      setInitPointUrl(data.initPointUrl);
      setReservationExpiresAt(data.reservationExpiresAt);
      setStep("checkout_ready");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error al iniciar Checkout Pro de Mercado Pago.";
      appendIntegrationError({
        operation: "preference",
        therapistId,
        errorCode: "PREFERENCE_CREATION_ERROR",
        errorMessage: msg,
      });
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  // Paso 2: Procesar el único pago del consultante y verificar estado real mediante el Backend
  const handleCompleteAndVerifyPayment = async (
    requestedOutcome: SplitPaymentStatus,
    simulateLateApprovalAfterExpiry = false
  ) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/mp/verify-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId,
          preferenceId,
          reservationExpiresAt,
          requestedOutcome,
          simulateLateApprovalAfterExpiry,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(
          data.error || "Error al verificar el estado del pago en el backend."
        );
      }

      const nowIso = new Date().toISOString();
      const newTx: SplitPaymentTransaction = {
        id: `tx-${Date.now()}`,
        idempotencyKey: `idem-${reservationId}`,
        reservationId,
        preferenceId,
        mpPaymentId: data.mpPaymentId,
        integrationMode,
        consultanteId: consultanteProfile.id,
        consultanteName:
          `${consultanteProfile.nombre} ${consultanteProfile.apellido}`.trim() ||
          "Consultante",
        consultanteEmail: consultanteProfile.email,
        therapistId,
        therapistName,
        therapistNickname: therapistNickname.toLowerCase(),
        therapistMpUserId: therapistMpAccount?.mpUserId || "MP-USR-ACTIVE",
        therapyName: selectedTherapy,
        attentionModality,
        bookingTiming,
        scheduledSlotLabel,
        sessionPriceArs: splitAmounts.sessionPriceArs,
        marketplaceFeeArs: splitAmounts.marketplaceFeeArs,
        therapistGrossShareArs: splitAmounts.therapistGrossShareArs,
        mpProcessorFeeArs: splitAmounts.mpProcessorFeeArs,
        therapistNetShareArs: splitAmounts.therapistNetShareArs,
        commissionSnapshot,
        status: data.status,
        sessionConfirmed: data.sessionConfirmed,
        reservationExpiresAt,
        approvedAfterExpiration: data.approvedAfterExpiration,
        reconciliationRequired: data.reconciliationRequired,
        reconciliationNote: data.reconciliationNote,
        cancellationCategory: "none",
        reikiCommissionFirm: true,
        refundRequested: false,
        refundStatus: "none",
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      const existingTxs = loadMpTransactions();
      saveMpTransactions([newTx, ...existingTxs]);

      // Solo si el pago fue APROBADO y verificado dentro del plazo de reserva se confirma la sesión
      if (newTx.sessionConfirmed) {
        const consultations = loadConsultations();
        const newCons: ReikiConsultationRecord = {
          id: `cons-${newTx.id}`,
          therapistNickname: therapistNickname.toLowerCase(),
          therapistName,
          consultanteEmail: consultanteProfile.email,
          consultanteName: newTx.consultanteName,
          consultanteNickname: consultanteProfile.nickname,
          therapyName: selectedTherapy,
          modality:
            bookingTiming === "inmediata"
              ? "Online ahora"
              : attentionModality === "presencial"
              ? "Presencial con turno"
              : "Online con turno",
          scheduledAt: scheduledSlotLabel,
          status: "efectuada",
          reviewed: false,
        };
        saveConsultations([newCons, ...consultations]);
        onPaymentConfirmed?.(newTx);
      } else if (newTx.status === "rejected") {
        releaseTherapistLock(reservationId);
      }

      setCompletedTx(newTx);
      setStep("result");
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error al verificar el pago en el backend.";
      appendIntegrationError({
        operation: "verify_payment",
        therapistId,
        errorCode: "PAYMENT_VERIFY_ERROR",
        errorMessage: msg,
      });
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const minutesLeft = Math.floor(secondsRemaining / 60);
  const secsLeft = String(secondsRemaining % 60).padStart(2, "0");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2B1F42]/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Contratación y pago con Mercado Pago"
    >
      <div className="relative max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-[#836DAD] bg-white p-5 sm:p-7 text-[#2B1F42] shadow-2xl space-y-5">
        {/* Cabecera */}
        <div className="flex items-start justify-between gap-3 border-b border-[#836DAD]/15 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F3FA] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#836DAD]">
              <CreditCard className="h-3.5 w-3.5 text-[#836DAD]" />
              Mercado Pago • Pago Único con Split 1:1
            </span>
            <h3 className="mt-1 text-lg sm:text-xl font-bold text-[#2B1F42]">
              Contratación de Sesión con {therapistName}
            </h3>
            <p className="text-xs text-[#2B1F42]/70">
              {therapistLocalidad}, {therapistProvincia} • {scheduledSlotLabel}
            </p>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            aria-label="Cerrar ventana de pago"
            className="cursor-pointer rounded-full bg-[#F6F3FA] p-2 text-[#2B1F42] hover:bg-[#836DAD] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Estado de reserva temporal anti-colisión (Punto 4) */}
        {lockError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-semibold text-red-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{lockError}</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#836DAD]/25 bg-[#F6F3FA] px-3.5 py-2.5 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-[#2B1F42]">
              <Clock className="h-4 w-4 text-[#836DAD]" />
              <span>
                Disponibilidad reservada temporalmente (ID:{" "}
                <code className="font-mono text-[#836DAD]">{reservationId}</code>
                )
              </span>
            </span>
            <span className="rounded-full bg-[#836DAD] px-2.5 py-0.5 font-mono text-[11px] font-bold text-[#F3D791]">
              Vence en {minutesLeft}:{secsLeft} min
            </span>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
            {errorMsg}
          </div>
        )}

        {/* PASO 1: CONFIGURACIÓN DE LA CONTRATACIÓN Y CONDICIONES */}
        {step === "configure" && !lockError && (
          <div className="space-y-4">
            {/* Selección de Terapia, Modalidad de Atención y Tipo de Contratación */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                  1. Terapia seleccionada *
                </label>
                <select
                  value={selectedTherapy}
                  onChange={(e) => setSelectedTherapy(e.target.value)}
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2.5 text-xs sm:text-sm font-semibold text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
                >
                  {availableTherapies.map((th) => (
                    <option key={th} value={th}>
                      {th} —{" "}
                      {formatArs(
                        resolveTherapySessionPrice(therapistMpAccount, th)
                      )}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                  2. Tipo de contratación *
                </label>
                <select
                  value={bookingTiming}
                  onChange={(e) =>
                    setBookingTiming(e.target.value as BookingTimingType)
                  }
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2.5 text-xs sm:text-sm font-semibold text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
                >
                  <option value="con_turno">Con turno programado</option>
                  <option value="inmediata">
                    Contratación inmediata online
                  </option>
                </select>
              </div>
            </div>

            {/* Separación técnica de la modalidad de atención (presencial, distancia sin video, distancia con video) */}
            <div>
              <label className="block text-xs font-bold text-[#2B1F42] mb-1.5">
                3. Modalidad de atención *
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {(
                  [
                    {
                      key: "presencial" as const,
                      label: "Sesión presencial",
                    },
                    {
                      key: "distancia_sin_video" as const,
                      label: "A distancia sin videollamada",
                    },
                    {
                      key: "distancia_con_video" as const,
                      label: "A distancia con videollamada",
                    },
                  ] as const
                ).map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setAttentionModality(item.key)}
                    className={`cursor-pointer rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                      attentionModality === item.key
                        ? "border-[#836DAD] bg-[#836DAD] text-white shadow-xs"
                        : "border-[#836DAD]/25 bg-[#FAF8FC] text-[#2B1F42] hover:bg-[#F6F3FA]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Resumen económico transparente (Precio total + Split 1:1) */}
            <div className="rounded-2xl border-2 border-[#836DAD]/30 bg-[#F6F3FA] p-4 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#836DAD]">
                  Importe Total a abonar (Pago Único)
                </span>
                <span className="text-xl sm:text-2xl font-extrabold text-[#2B1F42]">
                  {formatArs(splitAmounts.sessionPriceArs)}
                </span>
              </div>

              <div className="border-t border-[#836DAD]/15 pt-2 text-[11px] text-[#2B1F42]/80 flex flex-wrap items-center justify-between gap-2">
                <span>
                  Regla aplicada: <strong>{commissionSnapshot.ruleLabel}</strong>
                </span>
                <span>
                  Split 1:1 automático: Terapeuta{" "}
                  <strong>{formatArs(splitAmounts.therapistGrossShareArs)}</strong>{" "}
                  ({commissionSnapshot.therapistSharePercentage}%) • Reiki Online{" "}
                  <strong>{formatArs(splitAmounts.marketplaceFeeArs)}</strong> (
                  {commissionSnapshot.appliedPercentage}%)
                </span>
              </div>
            </div>

            {/* Confirmación obligatoria de condiciones de contratación, reprogramación y cancelación */}
            <div className="rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] p-3.5 space-y-2.5">
              <div className="text-[11px] text-[#2B1F42]/85 space-y-1">
                <p className="font-bold text-[#836DAD] uppercase tracking-wider">
                  Política Oficial de Reserva, Reprogramación y Cancelación:
                </p>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    <strong>Confirmación de pago al reservar:</strong> Tanto en la reserva de turnos en cualquiera de las modalidades como en la contratación inmediata, el pago debe confirmarse al momento de reservar la sesión.
                  </li>
                  <li>
                    <strong>Si el consultante desiste de la sesión:</strong> El importe abonado no se reembolsa y <strong>la sesión se reprogramará en los turnos habilitados por el terapeuta</strong>.
                  </li>
                  <li>
                    <strong>Si el terapeuta cancela la reunión:</strong> El terapeuta deberá devolver el dinero al consultante, quedando firme la comisión de Reiki Online.
                  </li>
                </ul>
              </div>

              <label className="flex cursor-pointer items-start gap-2.5 border-t border-[#836DAD]/15 pt-2.5 text-xs font-semibold text-[#2B1F42]">
                <input
                  type="checkbox"
                  checked={acceptedTerms}
                  onChange={(e) => setAcceptedTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#836DAD]"
                />
                <span>
                  Acepto las condiciones de pago inmediato al reservar, reprogramación en turnos del terapeuta ante desistimiento del consultante y devolución a cargo del terapeuta si éste cancela la sesión. *
                </span>
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-semibold text-[#2B1F42]/75">
                  Modalidad técnica MP:
                </span>
                <select
                  value={integrationMode}
                  onChange={(e) =>
                    setIntegrationMode(
                      e.target.value as "checkout_pro" | "checkout_api"
                    )
                  }
                  className="rounded-lg border border-[#836DAD]/30 bg-white px-2.5 py-1 text-xs font-semibold text-[#836DAD]"
                >
                  <option value="checkout_pro">
                    Checkout Pro (marketplace_fee)
                  </option>
                  <option value="checkout_api">
                    Checkout API (application_fee)
                  </option>
                </select>
              </div>

              <button
                type="button"
                disabled={loading || !isTherapistLinked}
                onClick={handleCreatePreference}
                className="inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-[#836DAD] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:bg-[#6F599B] disabled:opacity-50"
              >
                <CreditCard className="h-4 w-4 text-[#F3D791]" />
                <span>
                  {loading
                    ? "Generando preferencia..."
                    : "Pagar con Mercado Pago"}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: CHECKOUT PRO LISTO + VERIFICACIÓN DE APROBACIÓN EN BACKEND */}
        {step === "checkout_ready" && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-[#836DAD] bg-[#F6F3FA] p-4 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#836DAD]">
                  Preferencia Mercado Pago generada con éxito
                </span>
                <span className="font-mono text-xs font-bold text-[#2B1F42]">
                  {preferenceId}
                </span>
              </div>
              <p className="text-xs text-[#2B1F42]/80">
                El backend calculó <code>marketplace_fee</code> en dinero por{" "}
                <strong>{formatArs(splitAmounts.marketplaceFeeArs)}</strong> y la
                participación del terapeuta por{" "}
                <strong>{formatArs(splitAmounts.therapistGrossShareArs)}</strong>{" "}
                sobre el pago único de{" "}
                <strong>{formatArs(splitAmounts.sessionPriceArs)}</strong>.
              </p>

              <div className="pt-1">
                <a
                  href={initPointUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#836DAD] underline hover:text-[#5E4987]"
                >
                  <span>Abrir URL de Checkout Pro ({initPointUrl.slice(0, 48)}...)</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>

            {/* Simulador y verificador oficial de estados del pago (Punto 4 y Punto 9) */}
            <div className="rounded-2xl border border-[#836DAD]/25 bg-white p-4 space-y-3">
              <h4 className="text-xs sm:text-sm font-bold text-[#2B1F42]">
                Completar pago único y verificar estado real en Backend
              </h4>
              <p className="text-xs text-[#2B1F42]/75">
                Seleccioná el resultado de Mercado Pago para verificar el
                comportamiento del sistema ante pagos aprobados, pendientes,
                rechazados o aprobados tras expirar la reserva:
              </p>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCompleteAndVerifyPayment("approved", false)}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#836DAD] px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-[#6F599B] disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4 text-[#F3D791]" />
                  <span>
                    Confirmar Pago Aprobado ({formatArs(splitAmounts.sessionPriceArs)})
                  </span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCompleteAndVerifyPayment("pending", false)}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-amber-400 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-900 hover:bg-amber-100 disabled:opacity-50"
                >
                  <Clock className="h-4 w-4 text-amber-700" />
                  <span>Simular Pago Pendiente (No confirma sesión)</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCompleteAndVerifyPayment("rejected", false)}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-bold text-red-800 hover:bg-red-100 disabled:opacity-50"
                >
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span>Simular Pago Rechazado (Libera reserva)</span>
                </button>

                <button
                  type="button"
                  disabled={loading}
                  onClick={() => handleCompleteAndVerifyPayment("approved", true)}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#836DAD]/40 bg-[#F6F3FA] px-4 py-3 text-xs font-bold text-[#2B1F42] hover:bg-[#836DAD]/15 disabled:opacity-50"
                >
                  <Lock className="h-4 w-4 text-[#836DAD]" />
                  <span>Pago Aprobado tras Expirar Reserva (Conciliación)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* PASO 3: RESULTADO VERIFICADO POR EL BACKEND Y ACCESO A LA SESIÓN (Punto 4) */}
        {step === "result" && completedTx && (
          <div className="space-y-4">
            {completedTx.sessionConfirmed ? (
              <div className="rounded-2xl border-2 border-emerald-500 bg-emerald-50/90 p-5 space-y-3 text-emerald-950">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
                  <div>
                    <h4 className="text-base font-bold">
                      ¡Pago aprobado y contratación confirmada!
                    </h4>
                    <p className="text-xs text-emerald-800">
                      ID Pago MP: <strong>{completedTx.mpPaymentId}</strong> •
                      Reserva: <strong>{completedTx.reservationId}</strong>
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-4 border border-emerald-200 space-y-2 text-xs text-[#2B1F42]">
                  <p className="font-bold text-[#836DAD] uppercase tracking-wider">
                    Acceso habilitado a los datos del encuentro
                  </p>
                  <p>
                    <strong>Terapeuta:</strong> {completedTx.therapistName} (@
                    {completedTx.therapistNickname})
                  </p>
                  <p>
                    <strong>Terapia y modalidad:</strong>{" "}
                    {completedTx.therapyName} •{" "}
                    {ATTENTION_MODALITY_LABELS[completedTx.attentionModality]} (
                    {BOOKING_TIMING_LABELS[completedTx.bookingTiming]})
                  </p>
                  <p>
                    <strong>Horario / Turno:</strong>{" "}
                    {completedTx.scheduledSlotLabel}
                  </p>
                  <p>
                    <strong>Sala / Encuentro verificado:</strong>{" "}
                    {completedTx.attentionModality === "presencial" ? (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#836DAD]">
                        <MapPin className="h-3.5 w-3.5" /> Consultorio en{" "}
                        {therapistLocalidad}, {therapistProvincia} (Coordinación
                        interna habilitada en Mis Consultas)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-semibold text-[#836DAD]">
                        <Video className="h-3.5 w-3.5" /> Sala Online Reiki
                        Online #{completedTx.reservationId.slice(-6)} habilitada
                      </span>
                    )}
                  </p>
                </div>
              </div>
            ) : completedTx.approvedAfterExpiration ? (
              <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 space-y-2 text-amber-950">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-700 shrink-0" />
                  <h4 className="text-sm sm:text-base font-bold">
                    Pago aprobado después de expirar la reserva temporal
                  </h4>
                </div>
                <p className="text-xs leading-relaxed">
                  {completedTx.reconciliationNote} La operación quedó registrada
                  en el panel de <strong>Conciliaciones Pendientes</strong> con
                  ID <code>{completedTx.mpPaymentId}</code>.
                </p>
              </div>
            ) : completedTx.status === "pending" ? (
              <div className="rounded-2xl border-2 border-amber-400 bg-amber-50 p-5 space-y-2 text-amber-950">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-700 shrink-0" />
                  <h4 className="text-sm sm:text-base font-bold">
                    Pago en estado Pendiente — Sesión aún NO confirmada
                  </h4>
                </div>
                <p className="text-xs leading-relaxed">
                  Conforme a las normas de seguridad de Reiki Online, los pagos
                  pendientes no confirman una sesión. Cuando Mercado Pago
                  notifique la acreditación vía Webhook dentro del plazo de
                  reserva, se habilitará automáticamente tu acceso.
                </p>
              </div>
            ) : (
              <div className="rounded-2xl border-2 border-red-300 bg-red-50 p-5 space-y-2 text-red-900">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                  <h4 className="text-sm sm:text-base font-bold">
                    Pago rechazado por el procesador
                  </h4>
                </div>
                <p className="text-xs leading-relaxed">
                  El pago no pudo ser procesado y la reserva temporal fue
                  liberada. Podés intentar nuevamente con otro medio de pago en
                  Mercado Pago.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleCloseModal}
                className="cursor-pointer rounded-xl bg-[#836DAD] px-5 py-2.5 text-xs font-bold text-white hover:bg-[#6F599B]"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
