"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
  Wallet,
  CreditCard,
  UserCheck,
  HeartHandshake,
  CalendarClock,
} from "lucide-react";
import {
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
  MP_SYNC_EVENT,
  resolveApplicableCommission,
  resolveTherapySessionPrice,
  saveMpAccounts,
  saveMpTransactions,
  SplitPaymentTransaction,
  TherapistMercadoPagoAccount,
} from "@/lib/mercadoPagoSplit";
import { ReikiUserProfile, sanitizeNickname } from "@/lib/geoData";

export type WalletSectionTab =
  | "split_pagos"
  | "sesiones_cobradas"
  | "sesiones_abonadas";

interface TherapistMercadoPagoSectionProps {
  profile: ReikiUserProfile;
  activeRole?: "Consultante" | "Terapeuta";
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
  activeRole = "Terapeuta",
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

  const [walletTab, setWalletTab] = useState<WalletSectionTab>(() =>
    activeRole === "Consultante" ? "sesiones_abonadas" : "split_pagos"
  );
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
  const [modalNotice, setModalNotice] = useState<{
    type: "ok" | "warn" | "err";
    text: string;
  } | null>(null);
  const noticeDialogRef = useRef<HTMLDialogElement | null>(null);

  useEffect(() => {
    if (statusMessage) {
      setModalNotice(statusMessage);
    }
  }, [statusMessage]);

  useEffect(() => {
    const dialog = noticeDialogRef.current;
    if (!dialog) return;
    if (modalNotice) {
      if (!dialog.open) {
        try {
          dialog.showModal();
        } catch {
          // Fallback if already open
        }
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [modalNotice]);

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

  // Sesiones Cobradas (como Terapeuta)
  const myTransactions = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.therapistId === profile.id ||
        t.therapistNickname.toLowerCase() === cleanNick
    );
  }, [transactions, profile.id, cleanNick]);

  // Sesiones Abonadas (como Consultante)
  const myPaidTransactions = useMemo(() => {
    const cleanEmail = (profile.email || "").trim().toLowerCase();
    return transactions.filter(
      (t) =>
        t.consultanteId === profile.id ||
        (cleanEmail && t.consultanteEmail.toLowerCase() === cleanEmail)
    );
  }, [transactions, profile.id, profile.email]);

  const cobradasTotals = useMemo(() => {
    const approved = myTransactions.filter((t) => t.status === "approved");
    return {
      count: approved.length,
      totalSessionArs: approved.reduce((acc, t) => acc + t.sessionPriceArs, 0),
      totalFeeArs: approved.reduce((acc, t) => acc + t.marketplaceFeeArs, 0),
      totalGrossArs: approved.reduce(
        (acc, t) => acc + t.therapistGrossShareArs,
        0
      ),
      totalNetArs: approved.reduce((acc, t) => acc + t.therapistNetShareArs, 0),
    };
  }, [myTransactions]);

  const abonadasTotals = useMemo(() => {
    const valid = myPaidTransactions.filter(
      (t) => t.status === "approved" || t.status === "refunded"
    );
    const activeConfirmed = myPaidTransactions.filter(
      (t) => t.status === "approved" && t.sessionConfirmed
    );
    return {
      count: valid.length,
      activeCount: activeConfirmed.length,
      totalPaidArs: activeConfirmed.reduce(
        (acc, t) => acc + t.sessionPriceArs,
        0
      ),
    };
  }, [myPaidTransactions]);

  const handleRescheduleConsultanteSession = (txId: string) => {
    const nextList = transactions.map((tx) => {
      if (tx.id !== txId) return tx;
      return {
        ...tx,
        scheduledSlotLabel: "Reprogramada en turnos habilitados del terapeuta",
        reconciliationNote:
          "El consultante desistió del horario original; sesión reprogramada en los turnos habilitados del terapeuta conservando el pago abonado.",
        updatedAt: new Date().toISOString(),
      };
    });
    setTransactions(nextList);
    saveMpTransactions(nextList);
    setStatusMessage({
      type: "ok",
      text: "Sesión reprogramada en los turnos habilitados del terapeuta conservando tu pago abonado.",
    });
  };

  const handleTherapistCancelAndRefund = (txId: string) => {
    const nextList = transactions.map((tx) => {
      if (tx.id !== txId) return tx;
      return {
        ...tx,
        status: "refunded" as const,
        sessionConfirmed: false,
        cancellationCategory: "cancelacion_terapeuta" as const,
        cancellationReason:
          "Cancelación informada por el terapeuta: devolución del 100% al consultante sin descontar la comisión de Reiki Online (la cual queda firme).",
        refundRequested: true,
        refundStatus: "completed" as const,
        updatedAt: new Date().toISOString(),
      };
    });
    setTransactions(nextList);
    saveMpTransactions(nextList);
    setStatusMessage({
      type: "warn",
      text: `Se registró la devolución del 100% al consultante por cancelación del terapeuta. Conforme a la política aceptada, la comisión de Reiki Online queda firme.`,
    });
  };

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
      {/* Barra de opciones de Mi Billetera:
          1. Split de Pagos 1:1
          2. Sesiones Cobradas (Terapeuta)
          3. Sesiones Abonadas (Consultante) */}
      <div
        className="grid grid-cols-1 gap-2 sm:grid-cols-3 rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-1.5"
        role="tablist"
        aria-label="Opciones de Mi Billetera"
      >
        <button
          type="button"
          role="tab"
          aria-selected={walletTab === "split_pagos"}
          onClick={() => setWalletTab("split_pagos")}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            walletTab === "split_pagos"
              ? "bg-[#836DAD] text-white shadow-sm"
              : "text-[#2B1F42] hover:bg-white/80"
          }`}
        >
          <ShieldCheck
            className={`h-4 w-4 shrink-0 ${
              walletTab === "split_pagos" ? "text-[#F3D791]" : "text-[#836DAD]"
            }`}
          />
          <span>Split de Pagos 1:1</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={walletTab === "sesiones_cobradas"}
          onClick={() => setWalletTab("sesiones_cobradas")}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            walletTab === "sesiones_cobradas"
              ? "bg-[#836DAD] text-white shadow-sm"
              : "text-[#2B1F42] hover:bg-white/80"
          }`}
        >
          <UserCheck
            className={`h-4 w-4 shrink-0 ${
              walletTab === "sesiones_cobradas"
                ? "text-[#F3D791]"
                : "text-[#836DAD]"
            }`}
          />
          <span>Sesiones Cobradas (Terapeuta)</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              walletTab === "sesiones_cobradas"
                ? "bg-[#F3D791] text-[#2B1F42]"
                : "bg-[#836DAD]/15 text-[#836DAD]"
            }`}
          >
            {myTransactions.length}
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={walletTab === "sesiones_abonadas"}
          onClick={() => setWalletTab("sesiones_abonadas")}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            walletTab === "sesiones_abonadas"
              ? "bg-[#836DAD] text-white shadow-sm"
              : "text-[#2B1F42] hover:bg-white/80"
          }`}
        >
          <HeartHandshake
            className={`h-4 w-4 shrink-0 ${
              walletTab === "sesiones_abonadas"
                ? "text-[#F3D791]"
                : "text-[#836DAD]"
            }`}
          />
          <span>Sesiones Abonadas (Consultante)</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              walletTab === "sesiones_abonadas"
                ? "bg-[#F3D791] text-[#2B1F42]"
                : "bg-[#836DAD]/15 text-[#836DAD]"
            }`}
          >
            {myPaidTransactions.length}
          </span>
        </button>
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

      {/* Ventana emergente (Top-Layer Modal Dialog) para que el Terapeuta vea el aviso en pantalla y confirme su lectura */}
      <dialog
        ref={noticeDialogRef}
        aria-labelledby="ro-mp-split-notice-title"
        onCancel={(e) => {
          // Exigir confirmación explícita de lectura mediante el botón
          e.preventDefault();
        }}
        onClose={() => setModalNotice(null)}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-3xl border-2 border-[#836DAD] bg-white p-0 text-[#2B1F42] shadow-2xl backdrop:bg-[#2B1F42]/65 backdrop:backdrop-blur-xs"
      >
        {modalNotice && (
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-start gap-3">
              <span
                className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  modalNotice.type === "ok"
                    ? "bg-emerald-100 text-emerald-700"
                    : modalNotice.type === "warn"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {modalNotice.type === "ok" ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </span>
              <div className="space-y-1">
                <span className="inline-block rounded-full bg-[#F6F3FA] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#836DAD]">
                  Aviso de Split de Pagos 1:1
                </span>
                <h4
                  id="ro-mp-split-notice-title"
                  className="text-base font-extrabold text-[#2B1F42]"
                >
                  {modalNotice.type === "ok"
                    ? "Confirmación de Split de Pagos"
                    : modalNotice.type === "warn"
                    ? "Aviso importante de Split de Pagos"
                    : "Atención requerida en Split de Pagos"}
                </h4>
              </div>
            </div>

            <div
              className={`rounded-2xl border p-4 text-xs sm:text-sm font-semibold leading-relaxed ${
                modalNotice.type === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                  : modalNotice.type === "warn"
                  ? "border-amber-300 bg-amber-50 text-amber-950"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {modalNotice.text}
            </div>

            <form
              method="dialog"
              onSubmit={() => setModalNotice(null)}
              className="pt-1"
            >
              <button
                type="submit"
                value="confirmed"
                autoFocus
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#836DAD] px-5 py-3 text-sm font-bold text-white shadow-md transition-colors hover:bg-[#6F599B]"
              >
                <CheckCircle2 className="h-4 w-4 text-[#F3D791]" />
                <span>He leído y confirmo</span>
              </button>
            </form>
          </div>
        )}
      </dialog>

      {/* =====================================================================
          OPCIÓN 1: SPLIT DE PAGOS 1:1 (COBROS Y CUENTA DE MERCADO PAGO)
      ===================================================================== */}
      {walletTab === "split_pagos" && (
        <div className="space-y-4">
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
          onClick={() => setWalletTab("sesiones_cobradas")}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD] bg-[#F3D791]/40 px-3.5 py-2.5 text-xs font-bold text-[#2B1F42] hover:bg-[#F3D791]"
        >
          <Receipt className="h-4 w-4 text-[#836DAD]" />
          <span>
            Sesiones Cobradas ({myTransactions.length})
          </span>
        </button>

        <button
          type="button"
          onClick={() => setWalletTab("sesiones_abonadas")}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD]/35 bg-[#FAF8FC] px-3.5 py-2.5 text-xs font-bold text-[#2B1F42] hover:bg-[#F6F3FA]"
        >
          <CreditCard className="h-4 w-4 text-[#836DAD]" />
          <span>
            Sesiones Abonadas ({myPaidTransactions.length})
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
        </div>
      )}

      {/* =====================================================================
          OPCIÓN 2: SESIONES COBRADAS (ROL TERAPEUTA)
      ===================================================================== */}
      {walletTab === "sesiones_cobradas" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#836DAD]/15 pb-3.5">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F3D791]/45 px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#2B1F42]">
                <UserCheck className="h-3.5 w-3.5 text-[#836DAD]" />
                Rol Terapeuta • Liquidación Automática Split 1:1
              </span>
              <h4
                id="ro-sesiones-cobradas-caption"
                className="mt-1 text-base sm:text-lg font-bold text-[#2B1F42]"
              >
                Sesiones Cobradas (Terapeuta)
              </h4>
              <p className="text-xs text-[#2B1F42]/75">
                Detalle de sesiones cobradas a consultantes, comisión retenida por Reiki Online y monto neto acreditado en tu cuenta de Mercado Pago.
              </p>
            </div>
          </div>

          {/* Tarjetas de resumen financiero de Sesiones Cobradas */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl border border-[#836DAD]/20 bg-[#F6F3FA] p-3.5">
              <span className="block text-[11px] font-semibold uppercase text-[#2B1F42]/70">
                Sesiones Cobradas
              </span>
              <span className="mt-1 block text-lg font-extrabold text-[#2B1F42]">
                {cobradasTotals.count}
              </span>
              <span className="text-[11px] text-[#836DAD] font-semibold">
                Pagos aprobados y confirmados
              </span>
            </div>

            <div className="rounded-xl border border-[#836DAD]/20 bg-[#F6F3FA] p-3.5">
              <span className="block text-[11px] font-semibold uppercase text-[#2B1F42]/70">
                Valor Total Sesiones
              </span>
              <span className="mt-1 block text-lg font-extrabold text-[#2B1F42]">
                {formatArs(cobradasTotals.totalSessionArs)}
              </span>
              <span className="text-[11px] text-[#2B1F42]/65">
                Suma de tarifas abonadas
              </span>
            </div>

            <div className="rounded-xl border border-[#836DAD]/20 bg-[#F6F3FA] p-3.5">
              <span className="block text-[11px] font-semibold uppercase text-[#2B1F42]/70">
                Comisión Reiki Online
              </span>
              <span className="mt-1 block text-lg font-extrabold text-[#836DAD]">
                {formatArs(cobradasTotals.totalFeeArs)}
              </span>
              <span className="text-[11px] text-[#2B1F42]/65">
                Separada en el Split 1:1
              </span>
            </div>

            <div className="rounded-xl border border-[#836DAD]/30 bg-[#F3D791]/35 p-3.5">
              <span className="block text-[11px] font-bold uppercase text-[#2B1F42]">
                Ingreso Neto Terapeuta
              </span>
              <span className="mt-1 block text-lg font-extrabold text-emerald-900">
                {formatArs(cobradasTotals.totalNetArs)}
              </span>
              <span className="text-[11px] text-[#2B1F42]/75">
                Bruto: {formatArs(cobradasTotals.totalGrossArs)} (antes de MP)
              </span>
            </div>
          </div>

          {myTransactions.length === 0 ? (
            <div className="rounded-2xl border border-[#836DAD]/20 bg-[#FAF8FC] p-5 text-center space-y-2">
              <p className="text-xs sm:text-sm font-semibold text-[#2B1F42]">
                Aún no registrás sesiones cobradas como Terapeuta.
              </p>
              <p className="text-xs text-[#2B1F42]/70">
                Cuando un consultante abone una sesión con vos mediante Mercado Pago, verás aquí el comprobante y el desglose automático de tu cobro.
              </p>
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-labelledby="ro-sesiones-cobradas-caption"
              className="max-h-[420px] overflow-auto rounded-2xl border border-[#836DAD]/25 bg-[#FAF8FC] p-3 shadow-2xs"
            >
              <table className="w-full border-separate border-spacing-0 text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#FAF8FC] text-[#836DAD]">
                  <tr>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Fecha / ID Pago MP
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Consultante
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Terapia / Modalidad / Turno
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Total Sesión
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Comisión Reiki
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Bruto / Neto Terapeuta
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Estado / Gestión
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#836DAD]/10">
                  {myTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/80">
                      <th
                        scope="row"
                        className="sticky left-0 bg-[#FAF8FC] py-2.5 pr-3 font-mono text-[11px] font-semibold text-[#2B1F42]"
                      >
                        <div>
                          {new Date(tx.createdAt).toLocaleDateString("es-AR")}
                        </div>
                        <div className="text-[#836DAD]">
                          {tx.mpPaymentId || tx.preferenceId}
                        </div>
                      </th>
                      <td className="py-2.5 pr-3">
                        <div className="font-bold text-[#2B1F42]">
                          {tx.consultanteName}
                        </div>
                        <div className="text-[11px] text-[#2B1F42]/65">
                          {tx.consultanteEmail}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-[#2B1F42]">
                          {tx.therapyName}
                        </div>
                        <div className="text-[11px] text-[#836DAD] font-medium">
                          {ATTENTION_MODALITY_LABELS[tx.attentionModality]} •{" "}
                          {BOOKING_TIMING_LABELS[tx.bookingTiming]}
                        </div>
                        <div className="text-[11px] text-[#2B1F42]/70">
                          {tx.scheduledSlotLabel}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-bold text-[#2B1F42]">
                        {formatArs(tx.sessionPriceArs)}
                      </td>
                      <td className="py-2.5 pr-3 font-semibold text-[#836DAD]">
                        {formatArs(tx.marketplaceFeeArs)} (
                        {tx.commissionSnapshot.appliedPercentage}%)
                      </td>
                      <td className="py-2.5 pr-3 text-[11px]">
                        <div className="font-semibold text-[#2B1F42]">
                          Bruto: {formatArs(tx.therapistGrossShareArs)}
                        </div>
                        <div className="text-[#2B1F42]/65">
                          Costo MP: -{formatArs(tx.mpProcessorFeeArs)}
                        </div>
                        <div className="font-bold text-emerald-800">
                          Neto: {formatArs(tx.therapistNetShareArs)}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 space-y-1.5">
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
                          {tx.status === "approved"
                            ? "Cobrada"
                            : tx.status === "refunded"
                            ? "Devuelta al consultante"
                            : tx.status}
                        </span>
                        {tx.status === "approved" && (
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                handleTherapistCancelAndRefund(tx.id)
                              }
                              className="cursor-pointer rounded-lg border border-red-200 bg-red-50 px-2 py-1 text-[10px] font-semibold text-red-700 hover:bg-red-100"
                              title="Si cancelás como terapeuta, devolvés el 100% al consultante y la comisión de Reiki Online queda firme"
                            >
                              Cancelar y devolver 100%
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          OPCIÓN 3: SESIONES ABONADAS (ROL CONSULTANTE)
      ===================================================================== */}
      {walletTab === "sesiones_abonadas" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#836DAD]/15 pb-3.5">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F6F3FA] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#836DAD]">
                <HeartHandshake className="h-3.5 w-3.5 text-[#836DAD]" />
                Rol Consultante • Pago Único Mercado Pago
              </span>
              <h4
                id="ro-sesiones-abonadas-caption"
                className="mt-1 text-base sm:text-lg font-bold text-[#2B1F42]"
              >
                Sesiones Abonadas (Consultante)
              </h4>
              <p className="text-xs text-[#2B1F42]/75">
                Comprobantes de las sesiones que abonaste como consultante, estado de tus turnos y opción de reprogramar en los turnos habilitados del terapeuta.
              </p>
            </div>
          </div>

          {/* Tarjetas de resumen de Sesiones Abonadas */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#836DAD]/20 bg-[#F6F3FA] p-3.5">
              <span className="block text-[11px] font-semibold uppercase text-[#2B1F42]/70">
                Sesiones Abonadas
              </span>
              <span className="mt-1 block text-lg font-extrabold text-[#2B1F42]">
                {abonadasTotals.count}
              </span>
              <span className="text-[11px] text-[#836DAD] font-semibold">
                Comprobantes registrados en Mercado Pago
              </span>
            </div>

            <div className="rounded-xl border border-[#836DAD]/20 bg-[#F6F3FA] p-3.5">
              <span className="block text-[11px] font-semibold uppercase text-[#2B1F42]/70">
                Total Abonado (Pago Único)
              </span>
              <span className="mt-1 block text-lg font-extrabold text-[#2B1F42]">
                {formatArs(abonadasTotals.totalPaidArs)}
              </span>
              <span className="text-[11px] text-[#2B1F42]/65">
                Mismo valor de sesión en cualquier modalidad
              </span>
            </div>

            <div className="rounded-xl border border-[#836DAD]/30 bg-[#F3D791]/35 p-3.5">
              <span className="block text-[11px] font-bold uppercase text-[#2B1F42]">
                Turnos Confirmados Vigentes
              </span>
              <span className="mt-1 block text-lg font-extrabold text-emerald-900">
                {abonadasTotals.activeCount}
              </span>
              <span className="text-[11px] text-[#2B1F42]/75">
                Reprogramables si desistís del horario
              </span>
            </div>
          </div>

          {myPaidTransactions.length === 0 ? (
            <div className="rounded-2xl border border-[#836DAD]/20 bg-[#FAF8FC] p-5 text-center space-y-2">
              <p className="text-xs sm:text-sm font-semibold text-[#2B1F42]">
                Aún no registrás sesiones abonadas como Consultante.
              </p>
              <p className="text-xs text-[#2B1F42]/70">
                Cuando contrates y abones una sesión con un terapeuta mediante Mercado Pago, verás aquí el comprobante, el horario y el estado de tu sesión.
              </p>
            </div>
          ) : (
            <div
              tabIndex={0}
              role="region"
              aria-labelledby="ro-sesiones-abonadas-caption"
              className="max-h-[420px] overflow-auto rounded-2xl border border-[#836DAD]/25 bg-[#FAF8FC] p-3 shadow-2xs"
            >
              <table className="w-full border-separate border-spacing-0 text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#FAF8FC] text-[#836DAD]">
                  <tr>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Fecha / Comprobante MP
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Terapeuta
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Terapia / Modalidad / Turno
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Importe Abonado
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Estado de la Sesión
                    </th>
                    <th scope="col" className="border-b border-[#836DAD]/20 py-2.5 pr-3 font-bold">
                      Gestión de Turno
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#836DAD]/10">
                  {myPaidTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-white/80">
                      <th
                        scope="row"
                        className="sticky left-0 bg-[#FAF8FC] py-2.5 pr-3 font-mono text-[11px] font-semibold text-[#2B1F42]"
                      >
                        <div>
                          {new Date(tx.createdAt).toLocaleDateString("es-AR")}
                        </div>
                        <div className="text-[#836DAD]">
                          {tx.mpPaymentId || tx.preferenceId}
                        </div>
                      </th>
                      <td className="py-2.5 pr-3">
                        <div className="font-bold text-[#2B1F42]">
                          {tx.therapistName}
                        </div>
                        <a
                          href={`/${tx.therapistNickname}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold text-[#836DAD] hover:underline"
                        >
                          <span>@{tx.therapistNickname}</span>
                          <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </td>
                      <td className="py-2.5 pr-3">
                        <div className="font-semibold text-[#2B1F42]">
                          {tx.therapyName}
                        </div>
                        <div className="text-[11px] text-[#836DAD] font-medium">
                          {ATTENTION_MODALITY_LABELS[tx.attentionModality]} •{" "}
                          {BOOKING_TIMING_LABELS[tx.bookingTiming]}
                        </div>
                        <div className="text-[11px] text-[#2B1F42]/70">
                          {tx.scheduledSlotLabel}
                        </div>
                      </td>
                      <td className="py-2.5 pr-3 font-extrabold text-[#2B1F42]">
                        {formatArs(tx.sessionPriceArs)}
                      </td>
                      <td className="py-2.5 pr-3">
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
                          {tx.status === "approved"
                            ? "Abonada • Sesión confirmada"
                            : tx.status === "refunded"
                            ? "100% Reintegrado (Canceló Terapeuta)"
                            : tx.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3">
                        {tx.status === "approved" && (
                          <button
                            type="button"
                            onClick={() =>
                              handleRescheduleConsultanteSession(tx.id)
                            }
                            className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#836DAD]/35 bg-white px-2.5 py-1 text-[11px] font-semibold text-[#836DAD] hover:bg-[#836DAD] hover:text-white"
                          >
                            <CalendarClock className="h-3 w-3" />
                            <span>Reprogramar en turnos del terapeuta</span>
                          </button>
                        )}
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
