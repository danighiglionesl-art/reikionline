"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  formatToE164,
  isValidE164,
  PAISES,
  UserConsents,
} from "@/lib/geoData";

interface WhatsAppVerificationStepProps {
  initialPrefijo?: string;
  initialTelefono?: string;
  initialConsents?: UserConsents;
  userEmail: string;
  reasonMessage?: string;
  onVerified: (result: {
    prefijoTelefono: string;
    telefono: string;
    whatsappE164: string;
    whatsappVerifiedAt: string;
    channel: "whatsapp" | "sms";
    consents: UserConsents;
  }) => void;
  onCancel?: () => void;
}

export default function WhatsAppVerificationStep({
  initialPrefijo = "+54",
  initialTelefono = "",
  initialConsents,
  userEmail,
  reasonMessage,
  onVerified,
  onCancel,
}: WhatsAppVerificationStepProps) {
  const [prefijo, setPrefijo] = useState(initialPrefijo || "+54");
  const [telefono, setTelefono] = useState(initialTelefono || "");
  const [consentTurnos, setConsentTurnos] = useState(
    initialConsents?.turnosYRecordatorios ?? true
  );
  const [consentComercial, setConsentComercial] = useState(
    initialConsents?.notificacionesComerciales ?? false
  );

  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [activeChannel, setActiveChannel] = useState<"whatsapp" | "sms">(
    "whatsapp"
  );
  const [otpCode, setOtpCode] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  const otpFormRef = useRef<HTMLFormElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const computedE164 = formatToE164(prefijo, telefono);
  const phoneIsValid = isValidE164(computedE164) && telefono.replace(/\D/g, "").length >= 6;

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // WebOTP API lifecycle managed with AbortController per modern-web-guidance (sms-otp-form)
  useEffect(() => {
    if (step !== "otp") {
      abortControllerRef.current?.abort();
      return;
    }

    if (typeof window !== "undefined" && "OTPCredential" in window) {
      abortControllerRef.current?.abort();
      const ac = new AbortController();
      abortControllerRef.current = ac;

      navigator.credentials
        .get({
          // @ts-expect-error WebOTP API transport option
          otp: { transport: ["sms"] },
          signal: ac.signal,
        })
        .then((cred) => {
          const otpCredential = cred as { code?: string } | null;
          if (otpCredential?.code) {
            setOtpCode(otpCredential.code);
            window.setTimeout(() => {
              otpFormRef.current?.requestSubmit();
            }, 50);
          }
        })
        .catch(() => {
          // Ignore AbortError or unsupported origin errors silently
        });
    }

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [step]);

  async function requestVerificationCode(channel: "whatsapp" | "sms") {
    setErrorMsg(null);
    setInfoMsg(null);

    if (!phoneIsValid) {
      setErrorMsg(
        "Ingresá un número de WhatsApp válido con código de área (sin el 0 ni el 15)."
      );
      return;
    }

    if (!consentTurnos) {
      setErrorMsg(
        "Es necesario aceptar el consentimiento de mensajes operativos de turnos y recordatorios para continuar."
      );
      return;
    }

    // Abort any pending WebOTP request before resending
    abortControllerRef.current?.abort();
    setLoading(true);

    try {
      const res = await fetch("/api/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneE164: computedE164,
          channel,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        if (data?.cooldownRemaining) {
          setCooldown(Number(data.cooldownRemaining));
        }
        setErrorMsg(
          data?.error ||
            "No pudimos enviar el código en este momento. Podés intentar la alternativa por SMS."
        );
        setLoading(false);
        return;
      }

      setActiveChannel(channel);
      setStep("otp");
      if (data.fallbackCode) {
        setOtpCode(String(data.fallbackCode));
      }
      setCooldown(Number(data.cooldownSeconds || 60));
      setInfoMsg(
        data.message ||
          `Enviamos un código de 6 dígitos a ${computedE164} vía ${
            channel === "whatsapp" ? "WhatsApp" : "SMS"
          }.`
      );
    } catch {
      setErrorMsg("Error de conexión al solicitar el código de verificación.");
    } finally {
      setLoading(false);
    }
  }

  async function handleCheckOtp(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    abortControllerRef.current?.abort();
    setErrorMsg(null);
    setInfoMsg(null);

    const cleanCode = otpCode.replace(/\D/g, "");
    if (cleanCode.length !== 6) {
      setErrorMsg("Ingresá los 6 dígitos numéricos del código recibido.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneE164: computedE164,
          code: cleanCode,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.ok || !data.verified) {
        setErrorMsg(
          data?.error || "El código ingresado no es válido o ha expirado."
        );
        setLoading(false);
        return;
      }

      onVerified({
        prefijoTelefono: prefijo,
        telefono: telefono.replace(/\D/g, ""),
        whatsappE164: data.phoneE164 || computedE164,
        whatsappVerifiedAt: data.verifiedAt || new Date().toISOString(),
        channel: activeChannel,
        consents: {
          turnosYRecordatorios: consentTurnos,
          notificacionesComerciales: consentComercial,
          updatedAt: new Date().toISOString(),
        },
      });
    } catch {
      setErrorMsg("Error de conexión al validar el código.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Estado actual de verificación */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-300/40 bg-amber-50/95 px-4 py-3 text-amber-950 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-amber-500 animate-pulse" />
          <span className="text-xs font-bold uppercase tracking-wider">
            Estado: WhatsApp sin verificar
          </span>
        </div>
        <span className="text-[11px] font-medium text-amber-800">
          Requisito obligatorio para habilitar terapias
        </span>
      </div>

      {reasonMessage && (
        <div className="rounded-xl border border-[#836DAD]/25 bg-[#F4F0FA] px-4 py-3 text-xs font-medium text-[#5E4B8B]">
          {reasonMessage}
        </div>
      )}

      <div className="rounded-2xl border border-[#E6E0F0] bg-white p-5 shadow-sm space-y-4">
        <div>
          <span className="inline-block rounded-full bg-[#F4F0FA] px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#836DAD]">
            Twilio Verify • Canal Oficial WhatsApp
          </span>
          <h4 className="mt-2 text-lg font-bold text-[#2E2344]">
            Verificación de WhatsApp
          </h4>
          <p className="mt-1 text-xs text-[#2E2344]/75 leading-relaxed">
            Cuenta asociada:{" "}
            <strong className="font-semibold text-[#2E2344]">{userEmail}</strong>.
            Para continuar hacia la elección de rol (<strong>Terapeuta</strong> o{" "}
            <strong>Consultante</strong>) y habilitar las funcionalidades de la
            plataforma, validá tu número con un código único de 6 dígitos.
          </p>
        </div>

        {errorMsg && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium text-red-700"
          >
            {errorMsg}
          </div>
        )}

        {infoMsg && (
          <div
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs font-medium text-emerald-800"
          >
            {infoMsg}
          </div>
        )}

        {step === "phone" ? (
          <div className="space-y-4">
            <div>
              <label
                htmlFor="ro-wa-number"
                className="block text-xs font-semibold uppercase tracking-wider text-[#5E4B8B] mb-1.5"
              >
                WhatsApp / Celular con prefijo internacional *
              </label>
              <div className="grid grid-cols-[135px_1fr] gap-2">
                <select
                  aria-label="Prefijo internacional"
                  value={prefijo}
                  onChange={(e) => setPrefijo(e.target.value)}
                  className="w-full rounded-xl border border-[#E6E0F0] bg-[#FAF8FC] px-3 py-2.5 text-sm font-medium text-[#2E2344] focus:border-[#836DAD] focus:bg-white focus:outline-none"
                >
                  {PAISES.map((p) => (
                    <option key={p.codigo} value={p.prefijo}>
                      {p.prefijo} ({p.nombre})
                    </option>
                  ))}
                </select>
                <input
                  id="ro-wa-number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={telefono}
                  onChange={(e) =>
                    setTelefono(e.target.value.replace(/[^\d\s-]/g, ""))
                  }
                  placeholder="Ej: 3584244165"
                  className="w-full rounded-xl border border-[#E6E0F0] bg-[#FAF8FC] px-3.5 py-2.5 text-base text-[#2E2344] focus:border-[#836DAD] focus:bg-white focus:outline-none"
                />
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[11px] text-[#2E2344]/65">
                <span>Sin 0 en código de área ni 15 en el número.</span>
                <span className="font-mono font-semibold text-[#5E4B8B]">
                  E.164: {computedE164}
                </span>
              </div>
            </div>

            {/* Consentimientos específicos */}
            <div className="space-y-2.5 rounded-xl bg-[#FAF8FC] p-3.5 border border-[#E6E0F0]">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#5E4B8B]">
                Consentimientos de comunicación por WhatsApp
              </p>
              <label className="flex items-start gap-2.5 text-xs text-[#2E2344]/85 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentTurnos}
                  onChange={(e) => setConsentTurnos(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#836DAD] text-[#836DAD] focus:ring-[#836DAD]"
                />
                <span>
                  Acepto recibir por WhatsApp el código de seguridad, avisos de{" "}
                  <strong>turnos, recordatorios de sesiones</strong> y
                  notificaciones operativas de mi cuenta. *
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-xs text-[#2E2344]/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentComercial}
                  onChange={(e) => setConsentComercial(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-[#836DAD] text-[#836DAD] focus:ring-[#836DAD]"
                />
                <span>
                  Deseo recibir novedades, talleres y{" "}
                  <strong>notificaciones comerciales</strong> de Reiki Online
                  (opcional).
                </span>
              </label>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                disabled={loading || !phoneIsValid}
                onClick={() => requestVerificationCode("whatsapp")}
                className="w-full rounded-full bg-[#836DAD] py-3.5 px-5 text-sm font-semibold text-white shadow-md hover:bg-[#5E4B8B] disabled:opacity-50 transition cursor-pointer"
              >
                {loading
                  ? "Enviando código..."
                  : "Enviar código de verificación por WhatsApp"}
              </button>

              <button
                type="button"
                disabled={loading || !phoneIsValid}
                onClick={() => requestVerificationCode("sms")}
                className="w-full rounded-full border border-[#836DAD]/35 bg-white py-2.5 px-4 text-xs font-semibold text-[#5E4B8B] hover:bg-[#F4F0FA] disabled:opacity-50 transition cursor-pointer"
              >
                ¿WhatsApp no está disponible? Enviar código por SMS
              </button>
            </div>
          </div>
        ) : (
          /* Paso 2: Formulario OTP de un único campo según modern-web-guidance (sms-otp-form) */
          <form
            ref={otpFormRef}
            method="POST"
            onSubmit={handleCheckOtp}
            className="space-y-4"
          >
            <div>
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="ro-otp-input"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#5E4B8B]"
                >
                  Código de verificación (6 dígitos) *
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setStep("phone");
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="text-xs font-semibold text-[#836DAD] underline hover:text-[#5E4B8B] cursor-pointer"
                >
                  Cambiar número ({computedE164})
                </button>
              </div>

              {/* Instrucción arriba del input vinculada por aria-describedby (para no tapar el teclado numérico móvil) */}
              <p
                id="ro-otp-hint"
                className="mb-2 text-xs text-[#2E2344]/75 leading-relaxed"
              >
                Ingresá el código OTP de 6 dígitos enviado por{" "}
                <strong>
                  {activeChannel === "whatsapp" ? "WhatsApp" : "SMS"}
                </strong>{" "}
                al número <span className="font-mono font-semibold">{computedE164}</span>.
              </p>

              <input
                id="ro-otp-input"
                name="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                aria-describedby="ro-otp-hint"
                value={otpCode}
                onChange={(e) =>
                  setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                }
                placeholder="123456"
                className="w-full rounded-xl border-2 border-[#836DAD]/50 bg-[#FAF8FC] px-4 py-3 text-center font-mono text-xl font-bold tracking-[0.35em] text-[#2E2344] focus:border-[#836DAD] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || otpCode.length !== 6}
              className="w-full rounded-full bg-[#836DAD] py-3.5 px-5 text-sm font-semibold text-white shadow-md hover:bg-[#5E4B8B] disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? "Comprobando código..." : "Comprobar código y verificar"}
            </button>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
              <button
                type="button"
                disabled={loading || cooldown > 0}
                onClick={() => requestVerificationCode("whatsapp")}
                className="font-semibold text-[#5E4B8B] hover:text-[#836DAD] disabled:opacity-50 cursor-pointer"
              >
                {cooldown > 0
                  ? `Reenviar por WhatsApp (${cooldown}s)`
                  : "Reenviar código por WhatsApp"}
              </button>

              <button
                type="button"
                disabled={loading || cooldown > 0}
                onClick={() => requestVerificationCode("sms")}
                className="font-semibold text-[#5E4B8B] underline hover:text-[#836DAD] disabled:opacity-50 cursor-pointer"
              >
                {cooldown > 0
                  ? `Alternativa SMS (${cooldown}s)`
                  : "Probar envío por SMS"}
              </button>
            </div>
          </form>
        )}

        {onCancel && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={onCancel}
              className="text-xs font-semibold text-[#2E2344]/65 hover:text-[#2E2344] cursor-pointer"
            >
              Volver
            </button>
          </div>
        )}
      </div>

      {/* Nota institucional obligatoria */}
      <div className="rounded-xl border border-[#F3D791]/60 bg-[#FAF8FC] px-4 py-3 text-[11px] leading-relaxed text-[#2E2344]/80 space-y-1.5">
        <p>
          <strong className="font-semibold text-[#5E4B8B]">Confidencialidad absoluta:</strong>{" "}
          El número de WhatsApp, tanto de consultantes como de terapeutas a todos los fines, <strong>no será publicable bajo ningún concepto</strong>. Sirve a los fines de brindar seriedad, transparencia y tranquilidad de sus datos personales.
        </p>
        <p>
          <strong className="font-semibold text-[#5E4B8B]">Importante:</strong> La
          verificación de WhatsApp demuestra el control del número telefónico,
          pero no acredita por sí sola la identidad ni las competencias
          profesionales de un terapeuta.
        </p>
      </div>
    </div>
  );
}
