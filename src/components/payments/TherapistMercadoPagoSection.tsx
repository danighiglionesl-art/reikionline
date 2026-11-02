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
  calculateSplitAmounts,
  formatArs,
  loadCommissionConfig,
  loadMpAccounts,
  loadMpTransactions,
  MP_SYNC_EVENT,
  resolveApplicableCommission,
  saveMpAccounts,
  SplitPaymentTransaction,
  TherapistMercadoPagoAccount,
} from "@/lib/mercadoPagoSplit";
import { ReikiUserProfile, sanitizeNickname } from "@/lib/geoData";

interface TherapistMercadoPagoSectionProps {
  profile: ReikiUserProfile;
}

export default function TherapistMercadoPagoSection({
  profile,
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
  const [sessionPriceInput, setSessionPriceInput] = useState<string>("30000");
  const [kycConfirmed, setKycConfirmed] = useState<boolean>(true);
  const [processorFeeAccepted, setProcessorFeeAccepted] =
    useState<boolean>(true);
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{
    type: "ok" | "warn" | "err";
    text: string;
  } | null>(null);

  const syncData = () => {
    const loadedAcc = loadMpAccounts();
    setAccountsMap(loadedAcc);
    const existing = loadedAcc[profile.id] || loadedAcc[cleanNick];
    if (existing) {
      setSessionPriceInput(String(existing.sessionPriceArs || 30000));
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
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(MP_SYNC_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, [profile.id, cleanNick]);

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
  const sampleSnapshot = useMemo(
    () =>
      resolveApplicableCommission(
        commissionConfig,
        "distancia_con_video",
        "con_turno",
        profile.id,
        cleanNick
      ),
    [commissionConfig, profile.id, cleanNick]
  );

  const numericPrice = Math.max(0, Number(sessionPriceInput) || 30000);
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

  const handleSaveSessionPrice = () => {
    const updated: TherapistMercadoPagoAccount = {
      ...currentAccount,
      sessionPriceArs: numericPrice,
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
      text: `Precio de sesión actualizado a ${formatArs(numericPrice)}.`,
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

      {/* Precio de sesión definido por el Terapeuta + Simulación en vivo del Split 1:1 (Punto 5) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-4">
        <div className="lg:col-span-5 space-y-2">
          <label
            htmlFor="ro-mp-session-price"
            className="block text-xs font-bold text-[#2B1F42]"
          >
            Precio total de tu sesión (ARS) *
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-[#836DAD]">
                $
              </span>
              <input
                id="ro-mp-session-price"
                type="number"
                min={1000}
                step={500}
                value={sessionPriceInput}
                onChange={(e) => setSessionPriceInput(e.target.value)}
                className="w-full rounded-xl border border-[#836DAD]/30 bg-white py-2 pr-3 pl-7 text-sm font-bold text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveSessionPrice}
              className="cursor-pointer rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-semibold text-white hover:bg-[#6F599B]"
            >
              Guardar precio
            </button>
          </div>
          <p className="text-[11px] text-[#2B1F42]/70">
            El consultante realiza un único pago y Mercado Pago separa
            automáticamente tu participación y la comisión de Reiki Online.
          </p>
        </div>

        <div className="lg:col-span-7 rounded-xl border border-[#836DAD]/20 bg-white p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-[#836DAD]">
            <span className="inline-flex items-center gap-1.5">
              <Calculator className="h-3.5 w-3.5" />
              Distribución automática Split 1:1 (Ejemplo sobre tu tarifa)
            </span>
            <span>
              {sampleSnapshot.appliedPercentage}% Reiki Online /{" "}
              {sampleSnapshot.therapistSharePercentage}% Terapeuta
            </span>
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
            </div>
            <div className="rounded-lg bg-[#F3D791]/35 p-2">
              <span className="block text-[10px] font-semibold uppercase text-[#2B1F42]/80">
                Participación bruta ({sampleSnapshot.therapistSharePercentage}%)
              </span>
              <span className="text-sm font-bold text-[#2B1F42]">
                {formatArs(splitPreview.therapistGrossShareArs)}
              </span>
            </div>
          </div>

          <p className="text-[11px] text-[#2B1F42]/75">
            Participación bruta del terapeuta:{" "}
            <strong>{formatArs(splitPreview.therapistGrossShareArs)}</strong>,
            antes de costos del procesador Mercado Pago (est.{" "}
            {formatArs(splitPreview.mpProcessorFeeArs)}) e impuestos.
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
            funcionamiento documentado del Split 1:1.
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
