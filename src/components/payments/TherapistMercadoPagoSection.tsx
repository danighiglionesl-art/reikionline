"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Unlink,
  Link2,
  ShieldCheck,
  Receipt,
  Calculator,
  ExternalLink,
  Lock,
} from "lucide-react";
import {
  appendIntegrationError,
  AttentionModality,
  BookingTimingType,
  calculateSplitAmounts,
  formatArs,
  loadCommissionConfig,
  loadMpAccounts,
  loadMpTransactions,
  MP_SYNC_EVENT,
  resolveApplicableCommission,
  resolveTherapySessionPrice,
  saveMpAccounts,
  SplitPaymentTransaction,
  TherapistMercadoPagoAccount,
} from "@/lib/mercadoPagoSplit";
import { ReikiUserProfile, sanitizeNickname } from "@/lib/geoData";

interface TherapistMercadoPagoSectionProps {
  profile: ReikiUserProfile;
  offeredTherapies?: string[];
}

const SELECTIONS_STORAGE_KEY = "reiki_online_role_selections_v1";
const CATALOG_SYNC_EVENT = "reiki-online-catalog-sync";
const DEFAULT_FALLBACK_THERAPIES = [
  "Reiki Usui",
  "Alineación de chakras",
  "Armonización energética",
];

export default function TherapistMercadoPagoSection({
  profile,
  offeredTherapies,
}: TherapistMercadoPagoSectionProps) {
  const cleanNick = useMemo(
    () =>
      sanitizeNickname(
        profile.nickname ||
          profile.username ||
          `${profile.nombre}${profile.apellido}`
      ).toLowerCase() || "terapeuta",
    [profile.nickname, profile.username, profile.nombre, profile.apellido]
  );

  const fullName =
    `${profile.nombre || ""} ${profile.apellido || ""}`.trim() ||
    "Terapeuta Reiki Online";

  const [accountsMap, setAccountsMap] = useState<
    Record<string, TherapistMercadoPagoAccount>
  >({});
  const [transactions, setTransactions] = useState<SplitPaymentTransaction[]>(
    []
  );
  const [storedTherapies, setStoredTherapies] = useState<string[]>([]);
  const [sessionPriceInput, setSessionPriceInput] = useState<string>("30000");
  const [therapyPriceInputs, setTherapyPriceInputs] = useState<
    Record<string, string>
  >({});
  const [selectedPreviewTherapy, setSelectedPreviewTherapy] =
    useState<string>("");
  const [previewModalityMode, setPreviewModalityMode] = useState<
    "presencial" | "virtual_turno" | "virtual_ahora"
  >("virtual_turno");
  const [kycConfirmed, setKycConfirmed] = useState<boolean>(true);
  const [processorFeeAccepted, setProcessorFeeAccepted] =
    useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "ok" | "warn" | "err";
    text: string;
  } | null>(null);

  const activeTherapies = useMemo(() => {
    if (offeredTherapies && offeredTherapies.length > 0) {
      return offeredTherapies;
    }
    if (storedTherapies.length > 0) {
      return storedTherapies;
    }
    return DEFAULT_FALLBACK_THERAPIES;
  }, [offeredTherapies, storedTherapies]);

  const syncData = () => {
    if (typeof window !== "undefined") {
      try {
        const rawSel = window.localStorage.getItem(SELECTIONS_STORAGE_KEY);
        if (rawSel) {
          const parsedSel = JSON.parse(rawSel) as {
            terapeuta?: string[];
          };
          if (Array.isArray(parsedSel.terapeuta)) {
            setStoredTherapies(parsedSel.terapeuta);
          }
        }
      } catch {
        // Ignore
      }
    }

    const loadedAcc = loadMpAccounts();
    setAccountsMap(loadedAcc);
    const existing = loadedAcc[profile.id] || loadedAcc[cleanNick];
    if (existing) {
      const basePrice = existing.sessionPriceArs || 30000;
      setSessionPriceInput(String(basePrice));
      const nextInputs: Record<string, string> = {};
      if (existing.therapyPricesArs) {
        for (const [thName, val] of Object.entries(existing.therapyPricesArs)) {
          if (typeof val === "number" && val > 0) {
            nextInputs[thName] = String(val);
          }
        }
      }
      setTherapyPriceInputs((prev) => ({
        ...prev,
        ...nextInputs,
      }));
      setKycConfirmed(existing.kycVerified);
      setProcessorFeeAccepted(existing.processorFeeAccepted);
    }
    setTransactions(loadMpTransactions());
  };

  useEffect(() => {
    syncData();
    if (typeof window === "undefined") return;
    const handler = () => syncData();
    window.addEventListener(MP_SYNC_EVENT, handler);
    window.addEventListener(CATALOG_SYNC_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(MP_SYNC_EVENT, handler);
      window.removeEventListener(CATALOG_SYNC_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [profile.id, cleanNick]);

  useEffect(() => {
    if (
      activeTherapies.length > 0 &&
      (!selectedPreviewTherapy ||
        !activeTherapies.includes(selectedPreviewTherapy))
    ) {
      setSelectedPreviewTherapy(activeTherapies[0]);
    }
  }, [activeTherapies, selectedPreviewTherapy]);

  const currentAccount: TherapistMercadoPagoAccount = useMemo(() => {
    const found = accountsMap[profile.id] || accountsMap[cleanNick];
    if (found) return found;
    return {
      therapistId: profile.id,
      therapistName: fullName,
      therapistNickname: cleanNick,
      therapistEmail: profile.email,
      linked: false,
      mpUserId: null,
      mpPublicKey: null,
      mpAccountAlias: null,
      kycVerified: false,
      processorFeeAccepted: false,
      sessionPriceArs: 30000,
      tokenStatus: "disconnected",
      tokenExpiresAt: null,
      linkedAt: null,
      lastRefreshedAt: null,
    };
  }, [accountsMap, profile.id, cleanNick, fullName, profile.email]);

  const myTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.therapistId === profile.id ||
        t.therapistNickname.toLowerCase() === cleanNick
    );
  }, [transactions, profile.id, cleanNick]);

  const commissionConfig = useMemo(() => loadCommissionConfig(), [accountsMap]);

  const previewAttentionModality: AttentionModality =
    previewModalityMode === "presencial"
      ? "presencial"
      : "distancia_con_video";
  const previewBookingTiming: BookingTimingType =
    previewModalityMode === "virtual_ahora" ? "inmediata" : "con_turno";

  const sampleSnapshot = useMemo(
    () =>
      resolveApplicableCommission(
        commissionConfig,
        previewAttentionModality,
        previewBookingTiming,
        profile.id,
        cleanNick
      ),
    [
      commissionConfig,
      previewAttentionModality,
      previewBookingTiming,
      profile.id,
      cleanNick,
    ]
  );

  const baseFallbackPrice = Math.max(0, Number(sessionPriceInput) || 30000);

  const resolvedTherapyPricesMap = useMemo(() => {
    const map: Record<string, number> = {
      ...(currentAccount.therapyPricesArs || {}),
    };
    for (const th of activeTherapies) {
      const rawInput = therapyPriceInputs[th];
      if (rawInput !== undefined && rawInput.trim() !== "") {
        const parsed = Math.max(0, Number(rawInput) || baseFallbackPrice);
        map[th] = parsed;
      } else if (typeof map[th] === "number" && map[th] > 0) {
        // conservar valor guardado
      } else {
        map[th] = baseFallbackPrice;
      }
    }
    return map;
  }, [
    currentAccount.therapyPricesArs,
    activeTherapies,
    therapyPriceInputs,
    baseFallbackPrice,
  ]);

  const activeTherapyForPreview =
    selectedPreviewTherapy && activeTherapies.includes(selectedPreviewTherapy)
      ? selectedPreviewTherapy
      : activeTherapies[0] || "Reiki Usui";

  const numericPrice =
    resolvedTherapyPricesMap[activeTherapyForPreview] || baseFallbackPrice;

  const splitPreview = useMemo(
    () =>
      calculateSplitAmounts(numericPrice, sampleSnapshot.appliedPercentage),
    [numericPrice, sampleSnapshot.appliedPercentage]
  );

  // 1. Conectar mi cuenta de Mercado Pago mediante OAuth
  const handleConnectOAuth = async () => {
    setStatusMessage(null);
    if (!kycConfirmed) {
      setStatusMessage({
        type: "err",
        text: "Debés confirmar que tu cuenta de Mercado Pago cumple los requisitos de identificación (KYC / CUIT-CUIL validado) exigidos por Mercado Pago.",
      });
      return;
    }
    if (!processorFeeAccepted) {
      setStatusMessage({
        type: "err",
        text: "Antes de habilitar tus servicios pagos, debés aceptar la condición de costos de procesamiento del Split 1:1 de Mercado Pago.",
      });
      return;
    }

    setLoadingAction("connect");
    try {
      const res = await fetch("/api/mp/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "connect",
          therapistId: profile.id,
          therapistName: fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Error al vincular OAuth.");
      }

      const updated: TherapistMercadoPagoAccount = {
        therapistId: profile.id,
        therapistName: fullName,
        therapistNickname: cleanNick,
        therapistEmail: profile.email,
        linked: true,
        mpUserId: data.mpUserId,
        mpPublicKey: data.mpPublicKey,
        mpAccountAlias: `${cleanNick}.mp`,
        kycVerified: true,
        processorFeeAccepted: true,
        sessionPriceArs: numericPrice,
        therapyPricesArs: resolvedTherapyPricesMap,
        tokenStatus: "active",
        tokenExpiresAt: data.tokenExpiresAt,
        linkedAt: data.linkedAt,
        lastRefreshedAt: data.linkedAt,
      };

      const nextMap = {
        ...accountsMap,
        [profile.id]: updated,
        [cleanNick]: updated,
      };
      setAccountsMap(nextMap);
      saveMpAccounts(nextMap);

      setStatusMessage({
        type: "ok",
        text:
          data.message ||
          "Cuenta de Mercado Pago vinculada mediante OAuth 2.0. Tus sesiones pagas con Split 1:1 ya están habilitadas.",
      });
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Error al iniciar la vinculación OAuth con Mercado Pago.";
      appendIntegrationError({
        operation: "oauth",
        therapistId: profile.id,
        errorCode: "OAUTH_CONNECT_FAILED",
        errorMessage: msg,
      });
      setStatusMessage({ type: "err", text: msg });
    } finally {
      setLoadingAction(null);
    }
  };

  // 2. Consultar estado de vinculación
  const handleCheckStatus = async () => {
    setLoadingAction("status");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/mp/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "status",
          therapistId: profile.id,
        }),
      });
      const data = await res.json();
      if (currentAccount.linked && currentAccount.tokenStatus === "active") {
        setStatusMessage({
          type: "ok",
          text: `Estado de vinculación verificado: Cuenta activa (${
            currentAccount.mpUserId
          }) • Requisitos KYC cumplidos • Bóveda OAuth en servidor: ${
            data.hasEncryptedServerToken
              ? "Token cifrado AES-256-GCM activo"
              : "Listo para renovar"
          } • Sesiones pagas habilitadas.`,
        });
      } else {
        setStatusMessage({
          type: "warn",
          text: "Estado de vinculación: Sin cuenta de Mercado Pago activa. Las sesiones pagas permanecen deshabilitadas hasta completar la vinculación OAuth.",
        });
      }
    } catch {
      setStatusMessage({
        type: "err",
        text: "No se pudo consultar el estado en el servidor OAuth.",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  // 3. Reconectar cuenta (Renovar token OAuth)
  const handleReconnectOAuth = async () => {
    setLoadingAction("refresh");
    setStatusMessage(null);
    try {
      const res = await fetch("/api/mp/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "refresh",
          therapistId: profile.id,
          therapistName: fullName,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "No se pudo reconectar la cuenta.");
      }

      const updated: TherapistMercadoPagoAccount = {
        ...currentAccount,
        linked: true,
        mpUserId: data.mpUserId || currentAccount.mpUserId || "MP-USR-ACTIVE",
        kycVerified: true,
        processorFeeAccepted: true,
        sessionPriceArs: numericPrice,
        therapyPricesArs: resolvedTherapyPricesMap,
        tokenStatus: "active",
        tokenExpiresAt: data.tokenExpiresAt,
        lastRefreshedAt: data.lastRefreshedAt,
      };
      const nextMap = {
        ...accountsMap,
        [profile.id]: updated,
        [cleanNick]: updated,
      };
      setAccountsMap(nextMap);
      saveMpAccounts(nextMap);

      setStatusMessage({
        type: "ok",
        text:
          data.message ||
          "Cuenta reconectada y token OAuth renovado correctamente.",
      });
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Error al reconectar la cuenta.";
      appendIntegrationError({
        operation: "oauth",
        therapistId: profile.id,
        errorCode: "OAUTH_REFRESH_FAILED",
        errorMessage: msg,
      });
      setStatusMessage({ type: "err", text: msg });
    } finally {
      setLoadingAction(null);
    }
  };

  // 4. Desvincular cuenta
  const handleDisconnectOAuth = async () => {
    setLoadingAction("disconnect");
    setStatusMessage(null);
    try {
      await fetch("/api/mp/oauth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "disconnect",
          therapistId: profile.id,
        }),
      });

      const updated: TherapistMercadoPagoAccount = {
        ...currentAccount,
        linked: false,
        tokenStatus: "disconnected",
        mpUserId: null,
        mpPublicKey: null,
      };
      const nextMap = {
        ...accountsMap,
        [profile.id]: updated,
        [cleanNick]: updated,
      };
      setAccountsMap(nextMap);
      saveMpAccounts(nextMap);

      setStatusMessage({
        type: "warn",
        text: "Cuenta de Mercado Pago desvinculada. Tus sesiones pagas quedaron pausadas hasta que vuelvas a vincular tu cuenta.",
      });
    } finally {
      setLoadingAction(null);
    }
  };

  const handleSaveSessionPrice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const firstTherapyPrice =
      resolvedTherapyPricesMap[activeTherapies[0]] || numericPrice;
    const updated: TherapistMercadoPagoAccount = {
      ...currentAccount,
      sessionPriceArs: firstTherapyPrice,
      therapyPricesArs: resolvedTherapyPricesMap,
      kycVerified: kycConfirmed,
      processorFeeAccepted,
    };
    const nextMap = {
      ...accountsMap,
      [profile.id]: updated,
      [cleanNick]: updated,
    };
    setAccountsMap(nextMap);
    saveMpAccounts(nextMap);
    setStatusMessage({
      type: "ok",
      text: `Precios por terapia actualizados (${activeTherapies.length} ${
        activeTherapies.length === 1 ? "terapia tildada" : "terapias tildadas"
      }). Recordá que el valor de cada sesión es el mismo sea presencial, virtual con turno o virtual ahora.`,
    });
  };

  const isPaidSessionsEnabled =
    currentAccount.linked &&
    currentAccount.tokenStatus === "active" &&
    currentAccount.kycVerified &&
    currentAccount.processorFeeAccepted;

  return (
    <div className="rounded-2xl border-2 border-[#836DAD]/30 bg-white p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Encabezado oficial requerido en Punto 3: Cobros y cuenta de Mercado Pago */}
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#836DAD]/15 pb-3.5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F3FA] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#836DAD]">
            <ShieldCheck className="h-3.5 w-3.5 text-[#836DAD]" />
            Split de Pagos 1:1 • Marketplace Oficial
          </span>
          <h4 className="mt-1 text-base sm:text-lg font-bold text-[#2B1F42]">
            Cobros y cuenta de Mercado Pago
          </h4>
          <p className="text-xs text-[#2B1F42]/75">
            Vinculación segura mediante OAuth 2.0 (sin pedir contraseñas ni
            credenciales privadas). Distribución automática en cada sesión.
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
            isPaidSessionsEnabled
              ? "bg-emerald-100 text-emerald-900 border border-emerald-300"
              : "bg-amber-100 text-amber-900 border border-amber-300"
          }`}
        >
          {isPaidSessionsEnabled ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-700" />
              <span>Cuenta vinculada • Sesiones pagas habilitadas</span>
            </>
          ) : (
            <>
              <AlertCircle className="h-3.5 w-3.5 text-amber-700" />
              <span>Sin vincular • Sesiones pagas deshabilitadas</span>
            </>
          )}
        </span>
      </div>

      {statusMessage && (
        <div
          role="status"
          className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold border ${
            statusMessage.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : statusMessage.type === "warn"
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Precio total de tu sesión por cada Terapia tildada + Simulación en vivo del Split 1:1 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-4">
        <form
          onSubmit={handleSaveSessionPrice}
          className="lg:col-span-6 space-y-3"
        >
          <fieldset className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <legend className="text-xs font-bold text-[#2B1F42]">
                Precio total de tu sesión (ARS) * — Según tus Terapias tildadas
              </legend>
              <span className="rounded-full bg-[#836DAD]/15 px-2.5 py-0.5 text-[10px] font-bold text-[#836DAD]">
                {activeTherapies.length}{" "}
                {activeTherapies.length === 1
                  ? "terapia tildada"
                  : "terapias tildadas"}
              </span>
            </div>

            <p
              id="ro-mp-therapy-price-help"
              className="text-[11px] leading-snug text-[#2B1F42]/75"
            >
              Podés asignar un precio distinto a cada terapia tildada en tu
              listado.{" "}
              <strong>
                El valor de la sesión de cada terapia es el mismo sea
                presencial, virtual con turno o virtual ahora
              </strong>{" "}
              (lo que cambia en cada caso son las comisiones).
            </p>

            <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
              {activeTherapies.map((therapyName, idx) => {
                const inputId = `ro-mp-price-therapy-${idx}`;
                const currentVal =
                  therapyPriceInputs[therapyName] !== undefined
                    ? therapyPriceInputs[therapyName]
                    : String(
                        resolvedTherapyPricesMap[therapyName] ||
                          baseFallbackPrice
                      );
                const isSelectedPreview =
                  activeTherapyForPreview === therapyName;

                return (
                  <div
                    key={therapyName}
                    onClick={() => setSelectedPreviewTherapy(therapyName)}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border p-2.5 transition-colors cursor-pointer ${
                      isSelectedPreview
                        ? "border-[#836DAD] bg-white shadow-2xs"
                        : "border-[#836DAD]/20 bg-white/75 hover:border-[#836DAD]/50"
                    }`}
                  >
                    <label
                      htmlFor={inputId}
                      className="flex items-center gap-2 text-xs font-bold text-[#2B1F42] cursor-pointer"
                    >
                      <span
                        className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                          isSelectedPreview
                            ? "bg-[#836DAD] text-[#F3D791]"
                            : "bg-[#F6F3FA] text-[#836DAD]"
                        }`}
                      >
                        ✓
                      </span>
                      <span className="leading-snug">{therapyName}</span>
                    </label>

                    <div className="relative w-full sm:w-40 shrink-0">
                      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-[#836DAD]">
                        $
                      </span>
                      <input
                        id={inputId}
                        name={`therapy_price_${idx}`}
                        type="number"
                        inputMode="numeric"
                        enterKeyHint="done"
                        min={1000}
                        step={500}
                        required
                        aria-describedby="ro-mp-therapy-price-help"
                        value={currentVal}
                        onFocus={() => setSelectedPreviewTherapy(therapyName)}
                        onChange={(e) => {
                          const val = e.target.value;
                          setTherapyPriceInputs((prev) => ({
                            ...prev,
                            [therapyName]: val,
                          }));
                          if (idx === 0) {
                            setSessionPriceInput(val);
                          }
                        }}
                        className="w-full rounded-xl border border-[#836DAD]/30 bg-white py-1.5 pr-3 pl-7 text-sm font-bold text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-[#2B1F42]/70">
              Tocá cualquier terapia de la lista para ver su desglose a la
              derecha.
            </span>
            <button
              type="submit"
              className="cursor-pointer rounded-xl bg-[#836DAD] px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-[#6F599B]"
            >
              Guardar precios
            </button>
          </div>
        </form>

        <div className="lg:col-span-6 rounded-xl border border-[#836DAD]/20 bg-white p-3.5 space-y-2.5 flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1 text-xs font-bold text-[#836DAD]">
              <span className="inline-flex items-center gap-1.5">
                <Calculator className="h-3.5 w-3.5" />
                Distribución automática Split 1:1 (Información interna)
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[#FAF8FC] px-2.5 py-1.5 border border-[#836DAD]/15">
              <span className="text-[11px] font-semibold text-[#2B1F42]">
                Terapia:{" "}
                <strong className="text-[#836DAD]">
                  {activeTherapyForPreview}
                </strong>
              </span>
              <div
                className="inline-flex rounded-lg border border-[#836DAD]/25 bg-white p-0.5 text-[10px] font-bold"
                role="group"
                aria-label="Simular modalidad para ver comisión"
              >
                {(
                  [
                    { key: "presencial" as const, label: "Presencial" },
                    { key: "virtual_turno" as const, label: "Virtual turno" },
                    { key: "virtual_ahora" as const, label: "Virtual ahora" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => setPreviewModalityMode(m.key)}
                    className={`cursor-pointer rounded-md px-2 py-1 transition-colors ${
                      previewModalityMode === m.key
                        ? "bg-[#836DAD] text-white"
                        : "text-[#2B1F42]/75 hover:bg-[#F6F3FA]"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-[#F6F3FA] p-2">
                <span className="block text-[10px] font-semibold uppercase text-[#2B1F42]/70">
                  Precio de sesión
                </span>
                <span className="text-sm font-bold text-[#2B1F42]">
                  {formatArs(splitPreview.sessionPriceArs)}
                </span>
              </div>
              <div className="rounded-lg bg-[#F6F3FA] p-2">
                <span className="block text-[10px] font-semibold uppercase text-[#2B1F42]/70">
                  Comisión Reiki ({sampleSnapshot.appliedPercentage}%)
                </span>
                <span className="text-sm font-bold text-[#836DAD]">
                  {formatArs(splitPreview.marketplaceFeeArs)}
                </span>
                <span className="block text-[9px] font-medium text-[#2B1F42]/60">
                  Según modalidad
                </span>
              </div>
              <div className="rounded-lg bg-[#F3D791]/35 p-2">
                <span className="block text-[10px] font-semibold uppercase text-[#2B1F42]/80">
                  Participación bruta ({sampleSnapshot.therapistSharePercentage}
                  %)
                </span>
                <span className="text-sm font-bold text-[#2B1F42]">
                  {formatArs(splitPreview.therapistGrossShareArs)}
                </span>
                <span className="block text-[9px] font-medium text-[#2B1F42]/70">
                  Tu ingreso bruto
                </span>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-[#2B1F42]/75">
            Participación bruta del terapeuta en{" "}
            <strong>{activeTherapyForPreview}</strong>:{" "}
            <strong>{formatArs(splitPreview.therapistGrossShareArs)}</strong>,
            antes de costos del procesador Mercado Pago (est.{" "}
            {formatArs(splitPreview.mpProcessorFeeArs)}) e impuestos. El valor de
            la sesión ({formatArs(splitPreview.sessionPriceArs)}) se mantiene
            fijo sea presencial, virtual con turno o virtual ahora.
          </p>
        </div>
      </div>

      {/* Requisitos de identificación de Mercado Pago y aceptación de costos del procesador (Puntos 3 y 5) */}
      <div className="space-y-2 rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-3.5">
        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#2B1F42]">
          <input
            type="checkbox"
            checked={kycConfirmed}
            onChange={(e) => setKycConfirmed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#836DAD]"
          />
          <span>
            Confirmo que mi cuenta de Mercado Pago cumple con los{" "}
            <strong>requisitos de identificación (KYC / identidad validada)</strong>{" "}
            exigidos por Mercado Pago para recibir cobros como vendedor.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#2B1F42]">
          <input
            type="checkbox"
            checked={processorFeeAccepted}
            onChange={(e) => setProcessorFeeAccepted(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-[#836DAD]"
          />
          <span>
            Acepto que, por defecto, el{" "}
            <strong>costo de procesamiento de Mercado Pago e impuestos</strong>{" "}
            aplicables son soportados por la cuenta del terapeuta conforme al
            funcionamiento documentado del Split 1:1. Asimismo, acepto que si el{" "}
            <strong>consultante desiste de la sesión</strong> se reprogramará en
            mis turnos habilitados, y que en caso de que{" "}
            <strong>yo como terapeuta cancele la reunión</strong> deberé{" "}
            <strong>
              devolver el dinero al consultante sin descontar la comisión de
              Reiki Online, la cual quedará firme
            </strong>
            .
          </span>
        </label>
      </div>

      {/* Las 5 opciones obligatorias del Punto 3:
          1. Conectar mi cuenta de Mercado Pago
          2. Consultar estado de vinculación
          3. Reconectar cuenta
          4. Desvincular cuenta
          5. Consultar historial de cobros */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={loadingAction !== null}
          onClick={handleConnectOAuth}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#6F599B] disabled:opacity-50"
        >
          <Link2 className="h-4 w-4 text-[#F3D791]" />
          <span>Conectar mi cuenta de Mercado Pago</span>
        </button>

        <button
          type="button"
          disabled={loadingAction !== null}
          onClick={handleCheckStatus}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD]/35 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#2B1F42] hover:bg-[#F6F3FA] disabled:opacity-50"
        >
          <ShieldCheck className="h-4 w-4 text-[#836DAD]" />
          <span>Consultar estado de vinculación</span>
        </button>

        <button
          type="button"
          disabled={loadingAction !== null}
          onClick={handleReconnectOAuth}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD]/35 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#2B1F42] hover:bg-[#F6F3FA] disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4 text-[#836DAD]" />
          <span>Reconectar cuenta</span>
        </button>

        <button
          type="button"
          disabled={loadingAction !== null || !currentAccount.linked}
          onClick={handleDisconnectOAuth}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3.5 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40"
        >
          <Unlink className="h-4 w-4" />
          <span>Desvincular cuenta</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD] bg-[#F3D791]/40 px-3.5 py-2.5 text-xs font-bold text-[#2B1F42] hover:bg-[#F3D791]"
        >
          <Receipt className="h-4 w-4 text-[#836DAD]" />
          <span>
            Consultar historial de cobros ({myTransactions.length})
          </span>
        </button>
      </div>

      {/* Resumen de credenciales OAuth cifradas */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F6F3FA] px-3.5 py-2 text-[11px] text-[#2B1F42]/80">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-[#836DAD]" />
          <span>
            Autorización OAuth 2.0 • ID Vendedor MP:{" "}
            <strong>{currentAccount.mpUserId || "No vinculado"}</strong>
          </span>
        </span>
        {currentAccount.linkedAt && (
          <span>
            Vinculada:{" "}
            {new Date(currentAccount.linkedAt).toLocaleDateString("es-AR")}
          </span>
        )}
      </div>

      {/* Historial de cobros del Terapeuta */}
      {showHistory && (
        <div className="rounded-2xl border border-[#836DAD]/25 bg-[#FAF8FC] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-xs sm:text-sm font-bold text-[#2B1F42]">
              Historial de cobros distribuidos (Split 1:1)
            </h5>
            <span className="text-[11px] font-semibold text-[#836DAD]">
              {myTransactions.length} operaci
              {myTransactions.length === 1 ? "ón" : "ones"}
            </span>
          </div>

          {myTransactions.length === 0 ? (
            <p className="text-xs text-[#2B1F42]/70">
              Aún no registrás cobros de sesiones. Cuando un consultante abone
              una sesión con vos, verás aquí el desglose automático de cada
              operación.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#836DAD]/20 text-[#836DAD]">
                  <tr>
                    <th className="py-2 pr-3">Fecha / ID Pago</th>
                    <th className="py-2 pr-3">Consultante / Terapia</th>
                    <th className="py-2 pr-3">Total Sesión</th>
                    <th className="py-2 pr-3">Comisión Reiki</th>
                    <th className="py-2 pr-3">Bruto Terapeuta</th>
                    <th className="py-2 pr-3">Costo MP / Neto</th>
                    <th className="py-2 pr-3">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#836DAD]/10">
                  {myTransactions.map((tx) => (
                    <tr key={tx.id}>
                      <td className="py-2 pr-3 font-mono text-[11px]">
                        <div>
                          {new Date(tx.createdAt).toLocaleDateString("es-AR")}
                        </div>
                        <div className="text-[#836DAD]">
                          {tx.mpPaymentId || tx.preferenceId}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <div className="font-semibold text-[#2B1F42]">
                          {tx.consultanteName}
                        </div>
                        <div className="text-[11px] text-[#2B1F42]/70">
                          {tx.therapyName} ({tx.scheduledSlotLabel})
                        </div>
                      </td>
                      <td className="py-2 pr-3 font-bold">
                        {formatArs(tx.sessionPriceArs)}
                      </td>
                      <td className="py-2 pr-3 text-[#836DAD] font-semibold">
                        {formatArs(tx.marketplaceFeeArs)} (
                        {tx.commissionSnapshot.appliedPercentage}%)
                      </td>
                      <td className="py-2 pr-3 font-bold text-[#2B1F42]">
                        {formatArs(tx.therapistGrossShareArs)}
                      </td>
                      <td className="py-2 pr-3 text-[11px]">
                        <div>MP: -{formatArs(tx.mpProcessorFeeArs)}</div>
                        <div className="font-bold text-emerald-800">
                          Neto: {formatArs(tx.therapistNetShareArs)}
                        </div>
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase ${
                            tx.status === "approved"
                              ? "bg-emerald-100 text-emerald-900"
                              : tx.status === "pending"
                              ? "bg-amber-100 text-amber-900"
                              : tx.status === "refunded"
                              ? "bg-[#836DAD]/15 text-[#836DAD]"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {tx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
