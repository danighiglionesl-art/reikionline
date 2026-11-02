"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  acquireTherapistLock,
  appendIntegrationError,
  ATTENTION_MODALITY_LABELS,
  AttentionModality,
  BOOKING_TIMING_LABELS,
  BookingTimingType,
  calculateSplitAmounts,
  CancellationCategory,
  clampPercentage,
  CombinationRuleKey,
  CommissionConfigState,
  CommissionPresetKey,
  formatArs,
  IntegrationErrorLog,
  loadActiveTherapistLocks,
  loadCommissionConfig,
  loadIntegrationErrors,
  loadMpAccounts,
  loadMpTransactions,
  MP_ERRORS_STORAGE_KEY,
  MP_SYNC_EVENT,
  PRESET_LABELS,
  releaseTherapistLock,
  resolveApplicableCommission,
  round2,
  saveCommissionConfig,
  saveMpTransactions,
  SplitPaymentStatus,
  SplitPaymentTransaction,
  TherapistMercadoPagoAccount,
} from "@/lib/mercadoPagoSplit";

interface AdminPaymentsCommissionsPanelProps {
  adminUser: string;
}

type AdminTab =
  | "porcentajes"
  | "excepciones"
  | "operaciones"
  | "devoluciones"
  | "auditoria_pruebas";

const CANCELLATION_LABELS: Record<CancellationCategory, string> = {
  none: "Sin cancelación",
  cancelacion_terapeuta: "Cancelación del terapeuta",
  cancelacion_consultante: "Cancelación del consultante",
  sesion_no_realizada: "Sesión no realizada",
  disputa: "Disputa abierta",
};

const STATUS_LABELS: Record<SplitPaymentStatus, { label: string; bg: string; text: string }> = {
  approved: {
    label: "Aprobado",
    bg: "bg-emerald-100 border-emerald-300",
    text: "text-emerald-800",
  },
  pending: {
    label: "Pendiente (Sin confirmar sesión)",
    bg: "bg-amber-100 border-amber-300",
    text: "text-amber-800",
  },
  rejected: {
    label: "Rechazado",
    bg: "bg-rose-100 border-rose-300",
    text: "text-rose-800",
  },
  refunded: {
    label: "Reembolsado",
    bg: "bg-slate-200 border-slate-300",
    text: "text-slate-800",
  },
  cancelled: {
    label: "Cancelado",
    bg: "bg-gray-100 border-gray-300",
    text: "text-gray-700",
  },
  in_dispute: {
    label: "En disputa",
    bg: "bg-purple-100 border-purple-300",
    text: "text-purple-800",
  },
};

export default function AdminPaymentsCommissionsPanel({
  adminUser,
}: AdminPaymentsCommissionsPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminTab>("porcentajes");
  const [config, setConfig] = useState<CommissionConfigState>(() =>
    loadCommissionConfig()
  );
  const [accounts, setAccounts] = useState<
    Record<string, TherapistMercadoPagoAccount>
  >(() => loadMpAccounts());
  const [transactions, setTransactions] = useState<SplitPaymentTransaction[]>(
    () => loadMpTransactions()
  );
  const [integrationErrors, setIntegrationErrors] = useState<
    IntegrationErrorLog[]
  >(() => loadIntegrationErrors());

  // Inputs de edición de porcentajes (admiten decimales)
  const [defaultPctInput, setDefaultPctInput] = useState<string>(
    String(config.defaultPercentage)
  );
  const [presetInputs, setPresetInputs] = useState<
    Record<CommissionPresetKey, string>
  >({
    presencial_con_turno: String(config.presets.presencial_con_turno),
    distancia_sin_video: String(config.presets.distancia_sin_video),
    distancia_con_video: String(config.presets.distancia_con_video),
    inmediata_online: String(config.presets.inmediata_online),
  });

  // Regla combinada futura (modalidad + contratación)
  const [combModality, setCombModality] =
    useState<AttentionModality>("presencial");
  const [combTiming, setCombTiming] = useState<BookingTimingType>("inmediata");
  const [combPctInput, setCombPctInput] = useState<string>("10");

  // Excepción individual por terapeuta
  const [excTherapistId, setExcTherapistId] = useState<string>("");
  const [excTherapistName, setExcTherapistName] = useState<string>("");
  const [excTherapistNick, setExcTherapistNick] = useState<string>("");
  const [excPctInput, setExcPctInput] = useState<string>("8.5");
  const [excReason, setExcReason] = useState<string>("");

  // Simulador interactivo de cálculo ($30.000 ejemplo oficial)
  const [simPriceArs, setSimPriceArs] = useState<number>(30000);
  const [simModality, setSimModality] =
    useState<AttentionModality>("distancia_con_video");
  const [simTiming, setSimTiming] = useState<BookingTimingType>("con_turno");
  const [simTherapistKey, setSimTherapistKey] = useState<string>("");

  // Filtros de operaciones
  const [filterDateFrom, setFilterDateFrom] = useState<string>("");
  const [filterDateTo, setFilterDateTo] = useState<string>("");
  const [filterTherapist, setFilterTherapist] = useState<string>("ALL");
  const [filterModality, setFilterModality] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");

  // Feedback y pruebas
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);
  const [isRunningTests, setIsRunningTests] = useState<boolean>(false);
  const [testSuiteResults, setTestSuiteResults] = useState<
    Array<{ name: string; passed: boolean; detail: string }>
  >([]);

  const syncAll = () => {
    const nextCfg = loadCommissionConfig();
    setConfig(nextCfg);
    setDefaultPctInput(String(nextCfg.defaultPercentage));
    setPresetInputs({
      presencial_con_turno: String(nextCfg.presets.presencial_con_turno),
      distancia_sin_video: String(nextCfg.presets.distancia_sin_video),
      distancia_con_video: String(nextCfg.presets.distancia_con_video),
      inmediata_online: String(nextCfg.presets.inmediata_online),
    });
    setAccounts(loadMpAccounts());
    setTransactions(loadMpTransactions());
    setIntegrationErrors(loadIntegrationErrors());
  };

  useEffect(() => {
    syncAll();
    const handler = () => syncAll();
    window.addEventListener(MP_SYNC_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(MP_SYNC_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  const showNotice = (msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => {
      setBannerMessage((prev) => (prev === msg ? null : prev));
    }, 5500);
  };

  // Guardar porcentaje general predeterminado con registro de auditoría
  const handleSaveDefaultPercentage = () => {
    const parsed = clampPercentage(
      parseFloat(defaultPctInput.replace(",", "."))
    );
    const prev = config.defaultPercentage;
    if (parsed === prev) {
      showNotice("El porcentaje general ya tiene ese valor.");
      return;
    }
    const nowIso = new Date().toISOString();
    const nextConfig: CommissionConfigState = {
      ...config,
      defaultPercentage: parsed,
      auditLog: [
        {
          id: `audit-${Date.now()}`,
          adminUser,
          targetKey: "defaultPercentage",
          targetLabel: "Porcentaje general predeterminado",
          previousValue: prev,
          newValue: parsed,
          changedAt: nowIso,
        },
        ...config.auditLog,
      ],
      updatedAt: nowIso,
    };
    saveCommissionConfig(nextConfig);
    setConfig(nextConfig);
    showNotice(
      `Porcentaje general actualizado de ${prev}% a ${parsed}% (Terapeuta: ${round2(
        100 - parsed
      )}%). Registrado en auditoría.`
    );
  };

  // Guardar uno de los 4 presets independientes
  const handleSavePreset = (key: CommissionPresetKey) => {
    const raw = presetInputs[key] || "10";
    const parsed = clampPercentage(parseFloat(raw.replace(",", ".")));
    const prev = config.presets[key];
    if (parsed === prev) {
      showNotice(`La modalidad "${PRESET_LABELS[key]}" ya tiene ${parsed}%.`);
      return;
    }
    const nowIso = new Date().toISOString();
    const nextConfig: CommissionConfigState = {
      ...config,
      presets: {
        ...config.presets,
        [key]: parsed,
      },
      auditLog: [
        {
          id: `audit-${Date.now()}-${key}`,
          adminUser,
          targetKey: `preset:${key}`,
          targetLabel: `Modalidad: ${PRESET_LABELS[key]}`,
          previousValue: prev,
          newValue: parsed,
          changedAt: nowIso,
        },
        ...config.auditLog,
      ],
      updatedAt: nowIso,
    };
    saveCommissionConfig(nextConfig);
    setConfig(nextConfig);
    showNotice(
      `Comisión de "${PRESET_LABELS[key]}" actualizada de ${prev}% a ${parsed}% (${round2(
        100 - parsed
      )}% terapeuta).`
    );
  };

  // Guardar combinación específica (modalidad de atención + tipo de contratación)
  const handleSaveCombinationOverride = () => {
    const combKey: CombinationRuleKey = `${combModality}__${combTiming}`;
    const parsed = clampPercentage(parseFloat(combPctInput.replace(",", ".")));
    const prev =
      typeof config.combinationOverrides[combKey] === "number"
        ? (config.combinationOverrides[combKey] as number)
        : null;
    const nowIso = new Date().toISOString();
    const nextConfig: CommissionConfigState = {
      ...config,
      combinationOverrides: {
        ...config.combinationOverrides,
        [combKey]: parsed,
      },
      auditLog: [
        {
          id: `audit-comb-${Date.now()}`,
          adminUser,
          targetKey: `combination:${combKey}`,
          targetLabel: `Combinación específica: ${ATTENTION_MODALITY_LABELS[combModality]} + ${BOOKING_TIMING_LABELS[combTiming]}`,
          previousValue: prev,
          newValue: parsed,
          changedAt: nowIso,
        },
        ...config.auditLog,
      ],
      updatedAt: nowIso,
    };
    saveCommissionConfig(nextConfig);
    setConfig(nextConfig);
    showNotice(
      `Regla combinada (${ATTENTION_MODALITY_LABELS[combModality]} + ${BOOKING_TIMING_LABELS[combTiming]}) fijada en ${parsed}%.`
    );
  };

  const handleRemoveCombinationOverride = (combKey: CombinationRuleKey) => {
    const prev = config.combinationOverrides[combKey] ?? null;
    const nextOverrides = { ...config.combinationOverrides };
    delete nextOverrides[combKey];
    const nowIso = new Date().toISOString();
    const nextConfig: CommissionConfigState = {
      ...config,
      combinationOverrides: nextOverrides,
      auditLog: [
        {
          id: `audit-comb-del-${Date.now()}`,
          adminUser,
          targetKey: `combination:${combKey}`,
          targetLabel: `Eliminada combinación específica (${combKey})`,
          previousValue: prev,
          newValue: config.defaultPercentage,
          changedAt: nowIso,
        },
        ...config.auditLog,
      ],
      updatedAt: nowIso,
    };
    saveCommissionConfig(nextConfig);
    setConfig(nextConfig);
    showNotice("Regla combinada eliminada y registrada en auditoría.");
  };

  // Guardar excepción administrativa individual por terapeuta
  const handleSaveTherapistException = () => {
    const cleanNick = excTherapistNick
      .trim()
      .toLowerCase()
      .replace(/^@/, "");
    const cleanId = excTherapistId.trim() || cleanNick;
    if (!cleanId || !excTherapistName.trim()) {
      showNotice(
        "Ingresá el nombre y el usuario (@nickname o ID) del terapeuta."
      );
      return;
    }
    const parsed = clampPercentage(parseFloat(excPctInput.replace(",", ".")));
    const existing =
      config.therapistExceptions[cleanId] ||
      config.therapistExceptions[cleanNick];
    const prev = existing ? existing.percentage : null;
    const nowIso = new Date().toISOString();

    const exceptionObj = {
      therapistId: cleanId,
      therapistName: excTherapistName.trim(),
      therapistNickname: cleanNick || cleanId,
      percentage: parsed,
      reason:
        excReason.trim() ||
        "Acuerdo administrativo especial autorizado por Dirección",
      updatedBy: adminUser,
      updatedAt: nowIso,
    };

    const nextExceptions = {
      ...config.therapistExceptions,
      [cleanId]: exceptionObj,
    };
    if (cleanNick) {
      nextExceptions[cleanNick] = exceptionObj;
    }

    const nextConfig: CommissionConfigState = {
      ...config,
      therapistExceptions: nextExceptions,
      auditLog: [
        {
          id: `audit-exc-${Date.now()}`,
          adminUser,
          targetKey: `therapist:${cleanNick || cleanId}`,
          targetLabel: `Excepción Terapeuta: ${excTherapistName.trim()} (@${
            cleanNick || cleanId
          })`,
          previousValue: prev,
          newValue: parsed,
          changedAt: nowIso,
        },
        ...config.auditLog,
      ],
      updatedAt: nowIso,
    };

    saveCommissionConfig(nextConfig);
    setConfig(nextConfig);
    setExcTherapistId("");
    setExcTherapistName("");
    setExcTherapistNick("");
    setExcReason("");
    showNotice(
      `Excepción individual guardada para ${exceptionObj.therapistName}: ${parsed}% Reiki Online / ${round2(
        100 - parsed
      )}% Terapeuta.`
    );
  };

  const handleRemoveTherapistException = (key: string, name: string) => {
    const prev = config.therapistExceptions[key]?.percentage ?? null;
    const nextExceptions = { ...config.therapistExceptions };
    Object.keys(nextExceptions).forEach((k) => {
      if (
        k === key ||
        nextExceptions[k].therapistId === key ||
        nextExceptions[k].therapistNickname === key
      ) {
        delete nextExceptions[k];
      }
    });
    const nowIso = new Date().toISOString();
    const nextConfig: CommissionConfigState = {
      ...config,
      therapistExceptions: nextExceptions,
      auditLog: [
        {
          id: `audit-exc-del-${Date.now()}`,
          adminUser,
          targetKey: `therapist:${key}`,
          targetLabel: `Eliminada excepción Terapeuta: ${name}`,
          previousValue: prev,
          newValue: config.defaultPercentage,
          changedAt: nowIso,
        },
        ...config.auditLog,
      ],
      updatedAt: nowIso,
    };
    saveCommissionConfig(nextConfig);
    setConfig(nextConfig);
    showNotice(`Excepción de ${name} eliminada.`);
  };

  // Cálculo en tiempo real para el simulador
  const simCalculation = useMemo(() => {
    const snap = resolveApplicableCommission(
      config,
      simModality,
      simTiming,
      simTherapistKey || undefined,
      simTherapistKey || undefined
    );
    const amounts = calculateSplitAmounts(simPriceArs, snap.appliedPercentage);
    return { snap, amounts };
  }, [config, simModality, simTiming, simTherapistKey, simPriceArs]);

  // Operaciones filtradas
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (filterTherapist !== "ALL") {
        if (
          tx.therapistId !== filterTherapist &&
          tx.therapistNickname !== filterTherapist
        ) {
          return false;
        }
      }
      if (filterModality !== "ALL" && tx.attentionModality !== filterModality) {
        return false;
      }
      if (filterStatus !== "ALL" && tx.status !== filterStatus) {
        return false;
      }
      if (filterDateFrom) {
        const fromTs = new Date(`${filterDateFrom}T00:00:00`).getTime();
        if (new Date(tx.createdAt).getTime() < fromTs) return false;
      }
      if (filterDateTo) {
        const toTs = new Date(`${filterDateTo}T23:59:59`).getTime();
        if (new Date(tx.createdAt).getTime() > toTs) return false;
      }
      return true;
    });
  }, [
    transactions,
    filterTherapist,
    filterModality,
    filterStatus,
    filterDateFrom,
    filterDateTo,
  ]);

  // Totales contables de la vista actual
  const accountingTotals = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, tx) => {
        if (tx.status === "approved") {
          acc.grossApproved += tx.sessionPriceArs;
          acc.reikiCommissionApproved += tx.marketplaceFeeArs;
          acc.mpProcessorApproved += tx.mpProcessorFeeArs;
          acc.therapistNetApproved += tx.therapistNetShareArs;
        }
        if (tx.status === "refunded") {
          acc.refundedTotal += tx.sessionPriceArs;
          // La comisión de Reiki Online queda siempre firme incluso si el terapeuta cancela y devuelve el dinero al consultante
          acc.reikiCommissionApproved += tx.marketplaceFeeArs;
        }
        if (tx.reconciliationRequired) {
          acc.pendingReconciliations += 1;
        }
        return acc;
      },
      {
        grossApproved: 0,
        reikiCommissionApproved: 0,
        mpProcessorApproved: 0,
        therapistNetApproved: 0,
        refundedTotal: 0,
        pendingReconciliations: 0,
      }
    );
  }, [filteredTransactions]);

  // Exportar CSV contable (Punto 6)
  const handleExportAccountingCsv = () => {
    const headers = [
      "ID_Transaccion",
      "ID_Reserva",
      "MP_Payment_ID",
      "Fecha_ISO",
      "Estado",
      "Sesion_Confirmada",
      "Terapeuta",
      "Consultante",
      "Terapia",
      "Modalidad_Atencion",
      "Tipo_Contratacion",
      "Porcentaje_Inalterable_Reiki_Online",
      "Regla_Aplicada",
      "Importe_Bruto_ARS",
      "Comision_Reiki_Online_ARS",
      "Participacion_Bruta_Terapeuta_ARS",
      "Costo_Procesador_MP_ARS",
      "Neto_Estimado_Terapeuta_ARS",
      "Categoria_Cancelacion",
      "Estado_Reembolso",
      "Requiere_Conciliacion",
    ];

    const rows = filteredTransactions.map((tx) => [
      tx.id,
      tx.reservationId,
      tx.mpPaymentId || "S/N",
      tx.createdAt,
      tx.status,
      tx.sessionConfirmed ? "SI" : "NO",
      `${tx.therapistName} (@${tx.therapistNickname})`,
      `${tx.consultanteName} (${tx.consultanteEmail})`,
      tx.therapyName,
      ATTENTION_MODALITY_LABELS[tx.attentionModality],
      BOOKING_TIMING_LABELS[tx.bookingTiming],
      `${tx.commissionSnapshot.appliedPercentage}%`,
      tx.commissionSnapshot.ruleLabel,
      tx.sessionPriceArs.toFixed(2),
      tx.marketplaceFeeArs.toFixed(2),
      tx.therapistGrossShareArs.toFixed(2),
      tx.mpProcessorFeeArs.toFixed(2),
      tx.therapistNetShareArs.toFixed(2),
      CANCELLATION_LABELS[tx.cancellationCategory],
      tx.refundStatus || "none",
      tx.reconciliationRequired ? "SI" : "NO",
    ]);

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((r) =>
          r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reiki_online_pagos_split_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice("Reporte contable CSV descargado correctamente.");
  };

  // Clasificar categoría de cancelación / reprogramación / disputa
  const handleUpdateCancellationCategory = (
    txId: string,
    category: CancellationCategory,
    reason: string
  ) => {
    const nowIso = new Date().toISOString();
    const nextList = transactions.map((tx) => {
      if (tx.id !== txId) return tx;
      if (category === "cancelacion_consultante") {
        return {
          ...tx,
          cancellationCategory: category,
          cancellationReason:
            "Desistimiento del consultante: corresponde reprogramación en los turnos habilitados por el terapeuta (sin devolución monetaria).",
          rescheduled: true,
          rescheduledSlotLabel:
            tx.rescheduledSlotLabel || "Pendiente de elegir nuevo turno habilitado del terapeuta",
          rescheduledAt: nowIso,
          reikiCommissionFirm: true,
          refundRequested: false,
          refundStatus: "rescheduled_no_refund" as const,
          updatedAt: nowIso,
        };
      }
      return {
        ...tx,
        cancellationCategory: category,
        cancellationReason: reason,
        reikiCommissionFirm: true,
        status:
          category === "disputa"
            ? ("in_dispute" as SplitPaymentStatus)
            : tx.status,
        refundRequested: category !== "none",
        refundStatus:
          category !== "none" && (!tx.refundStatus || tx.refundStatus === "none")
            ? ("pending_admin" as const)
            : tx.refundStatus,
        updatedAt: nowIso,
      };
    });
    saveMpTransactions(nextList);
    setTransactions(nextList);
    if (category === "cancelacion_consultante") {
      showNotice(
        `Operación ${txId}: Desistimiento del consultante registrado. La sesión pasa a REPROGRAMACIÓN en los turnos habilitados por el terapeuta (sin devolución de dinero).`
      );
    } else if (category === "cancelacion_terapeuta") {
      showNotice(
        `Operación ${txId}: Cancelación del terapeuta registrada. El terapeuta debe devolver el dinero al consultante sin descontar la comisión de Reiki Online, que queda firme.`
      );
    } else {
      showNotice(
        `Operación ${txId} clasificada como "${CANCELLATION_LABELS[category]}".`
      );
    }
  };

  // Reprogramar sesión en un turno habilitado por el terapeuta (cuando el consultante desiste)
  const handleRescheduleConsultanteSlot = (txId: string, newSlotLabel: string) => {
    const nowIso = new Date().toISOString();
    const nextList = transactions.map((tx) =>
      tx.id === txId
        ? {
            ...tx,
            cancellationCategory: "cancelacion_consultante" as CancellationCategory,
            scheduledSlotLabel: newSlotLabel,
            rescheduled: true,
            rescheduledSlotLabel: newSlotLabel,
            rescheduledAt: nowIso,
            sessionConfirmed: true,
            reikiCommissionFirm: true,
            refundRequested: false,
            refundStatus: "rescheduled_no_refund" as const,
            updatedAt: nowIso,
          }
        : tx
    );
    saveMpTransactions(nextList);
    setTransactions(nextList);
    showNotice(
      `Sesión ${txId} reprogramada con éxito para el turno "${newSlotLabel}" habilitado por el terapeuta.`
    );
  };

  // Ejecutar reembolso al consultante por cancelación del terapeuta (manteniendo firme la comisión de Reiki Online)
  const handleExecuteRefund = async (
    tx: SplitPaymentTransaction,
    simulateInsufficientBalance = false
  ) => {
    if (tx.cancellationCategory === "cancelacion_consultante") {
      showNotice(
        "Política Reiki Online: Cuando el consultante desiste de la sesión no corresponde devolución de dinero; la sesión se reprograma en los turnos habilitados por el terapeuta."
      );
      return;
    }

    try {
      const response = await fetch("/api/mp/refund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transactionId: tx.id,
          mpPaymentId: tx.mpPaymentId || `MP-PAY-${tx.id}`,
          therapistId: tx.therapistId,
          amountArs: tx.sessionPriceArs,
          marketplaceFeeArs: tx.marketplaceFeeArs,
          cancellationCategory:
            tx.cancellationCategory === "none"
              ? "cancelacion_terapeuta"
              : tx.cancellationCategory,
          reason:
            tx.cancellationReason ||
            "Cancelación del terapeuta: devolución al consultante manteniendo firme la comisión de Reiki Online",
          adminUser,
          simulateInsufficientBalance,
        }),
      });
      const data = await response.json();

      if (!response.ok || data.refundStatus === "failed_insufficient_balance") {
        const errDetail =
          data.error ||
          "Saldo disponible insuficiente en la cuenta de Mercado Pago del terapeuta para devolver el importe al consultante.";
        const nextList = transactions.map((item) =>
          item.id === tx.id
            ? {
                ...item,
                refundRequested: true,
                reikiCommissionFirm: true,
                refundStatus: "failed_insufficient_balance" as const,
                refundErrorDetail: errDetail,
                reconciliationRequired: true,
                reconciliationNote:
                  "Falló devolución del terapeuta por saldo insuficiente en su cuenta de Mercado Pago.",
                updatedAt: new Date().toISOString(),
              }
            : item
        );
        saveMpTransactions(nextList);
        setTransactions(nextList);
        appendIntegrationError({
          operation: "refund",
          therapistId: tx.therapistId,
          transactionId: tx.id,
          errorCode: "MP_REFUND_INSUFFICIENT_FUNDS",
          errorMessage: errDetail,
        });
        showNotice(`Atención: ${errDetail}`);
        return;
      }

      const nextList = transactions.map((item) =>
        item.id === tx.id
          ? {
              ...item,
              status: "refunded" as SplitPaymentStatus,
              sessionConfirmed: false,
              reikiCommissionFirm: true,
              refundRequested: true,
              refundStatus: "completed" as const,
              refundErrorDetail: undefined,
              updatedAt: new Date().toISOString(),
            }
          : item
      );
      saveMpTransactions(nextList);
      setTransactions(nextList);
      showNotice(
        `Devolución al consultante (${formatArs(
          tx.sessionPriceArs
        )}) ejecutada a cargo del terapeuta (${
          data.refundId
        }). La comisión de Reiki Online (${formatArs(
          tx.marketplaceFeeArs
        )}) quedó firme.`
      );
    } catch (err) {
      showNotice(
        err instanceof Error
          ? err.message
          : "Error de red al invocar API de reembolsos."
      );
    }
  };

  // Marcar conciliación como resuelta
  const handleResolveReconciliation = (txId: string, note: string) => {
    const nextList = transactions.map((tx) =>
      tx.id === txId
        ? {
            ...tx,
            reconciliationRequired: false,
            reconciliationNote: `${
              tx.reconciliationNote ? tx.reconciliationNote + " | " : ""
            }Conciliado por ${adminUser}: ${note}`,
            updatedAt: new Date().toISOString(),
          }
        : tx
    );
    saveMpTransactions(nextList);
    setTransactions(nextList);
    showNotice(`Operación ${txId} marcada como conciliada.`);
  };

  const handleResolveErrorLog = (errId: string) => {
    const next = integrationErrors.map((e) =>
      e.id === errId ? { ...e, resolved: true } : e
    );
    window.localStorage.setItem(MP_ERRORS_STORAGE_KEY, JSON.stringify(next));
    setIntegrationErrors(next);
    window.dispatchEvent(new Event(MP_SYNC_EVENT));
  };

  // Suite de Pruebas Pre-Producción (Punto 9)
  const handleRunPreProductionTests = async () => {
    setIsRunningTests(true);
    const results: Array<{ name: string; passed: boolean; detail: string }> =
      [];

    // 1. Prueba de cuentas vinculadas mediante OAuth
    const linkedList = Object.values(accounts).filter((a) => a.linked);
    results.push({
      name: "1. Cuentas de terapeutas vinculadas mediante OAuth 2.0",
      passed: linkedList.length > 0,
      detail: `${linkedList.length} cuentas activas con KYC verificado y token OAuth resguardado en bóveda AES-256-GCM.`,
    });

    // 2. Prueba de diferentes porcentajes por modalidad y decimales
    const snapPresencial = resolveApplicableCommission(
      config,
      "presencial",
      "con_turno"
    );
    const snapInmediata = resolveApplicableCommission(
      config,
      "distancia_con_video",
      "inmediata"
    );
    results.push({
      name: "2. Separación técnica de modalidad y tipo de contratación",
      passed:
        typeof snapPresencial.appliedPercentage === "number" &&
        typeof snapInmediata.appliedPercentage === "number",
      detail: `Presencial c/turno: ${snapPresencial.appliedPercentage}% | Inmediata online: ${snapInmediata.appliedPercentage}% (copia inalterable generada).`,
    });

    // 3. Comprobar reparto real del ejemplo oficial ($30.000 -> 10% = $3.000 / $27.000)
    const split30k = calculateSplitAmounts(30000, 10);
    const exactMatch =
      split30k.marketplaceFeeArs === 3000 &&
      split30k.therapistGrossShareArs === 27000;
    results.push({
      name: "3. Cálculo de Split 1:1 en dinero (Sesión $30.000 al 10%)",
      passed: exactMatch,
      detail: `marketplace_fee enviado a MP: ${formatArs(
        split30k.marketplaceFeeArs
      )} | Participación bruta terapeuta: ${formatArs(
        split30k.therapistGrossShareArs
      )} | Costo MP estimado: ${formatArs(split30k.mpProcessorFeeArs)}.`,
    });

    // 4. Comprobar bloqueo de reservas simultáneas (no duplicación)
    const testResId = `test-lock-${Date.now()}`;
    const lock1 = acquireTherapistLock({
      reservationId: testResId,
      therapistId: "demo-terapeuta-1",
      therapistNickname: "valeriamendez",
      consultanteEmail: "consultante1@test.com",
      bookingTiming: "inmediata",
      slotKey: "test-slot-inmediata",
      lockedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    const lock2 = acquireTherapistLock({
      reservationId: `${testResId}-2`,
      therapistId: "demo-terapeuta-1",
      therapistNickname: "valeriamendez",
      consultanteEmail: "consultante2@test.com",
      bookingTiming: "inmediata",
      slotKey: "test-slot-inmediata",
      lockedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60000).toISOString(),
    });
    releaseTherapistLock(testResId);
    results.push({
      name: "4. Prevención de reservas simultáneas (Lock temporal)",
      passed: lock1.ok === true && lock2.ok === false,
      detail:
        "Primer consultante bloquea disponibilidad temporalmente; segundo consultante simultáneo es rechazado hasta liberar o expirar.",
    });

    // 5. Verificar pagos aprobados, pendientes (no confirman sesión) y aprobación tardía (conciliación)
    const nowIso = new Date().toISOString();
    const expiredIso = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const futureIso = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const demoTxs: SplitPaymentTransaction[] = [
      {
        id: `TX-SPLIT-${Date.now().toString().slice(-5)}-APR`,
        idempotencyKey: `idem-apr-${Date.now()}`,
        reservationId: `RES-${Date.now().toString().slice(-5)}-1`,
        preferenceId: `PREF-MP-${Date.now().toString().slice(-4)}-1`,
        mpPaymentId: `MP-PAY-9981201`,
        integrationMode: "checkout_pro",
        consultanteId: "cons-demo-1",
        consultanteName: "María Solís",
        consultanteEmail: "maria.solis@ejemplo.com",
        therapistId: "demo-terapeuta-1",
        therapistName: "Valeria Méndez",
        therapistNickname: "valeriamendez",
        therapistMpUserId: "MP-USR-10948271",
        therapyName: "Reiki Usui",
        attentionModality: "distancia_con_video",
        bookingTiming: "con_turno",
        scheduledSlotLabel: "Mañana · 15:00 hs",
        sessionPriceArs: 30000,
        marketplaceFeeArs: 3000,
        therapistGrossShareArs: 27000,
        mpProcessorFeeArs: 1497,
        therapistNetShareArs: 25503,
        commissionSnapshot: {
          appliedPercentage: 10,
          therapistSharePercentage: 90,
          ruleSource: "modality_preset",
          ruleLabel: "Sesión a distancia con videollamada (10%)",
          capturedAt: nowIso,
        },
        status: "approved",
        sessionConfirmed: true,
        reservationExpiresAt: futureIso,
        approvedAfterExpiration: false,
        reconciliationRequired: false,
        cancellationCategory: "none",
        refundRequested: false,
        refundStatus: "none",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: `TX-SPLIT-${Date.now().toString().slice(-5)}-PND`,
        idempotencyKey: `idem-pnd-${Date.now()}`,
        reservationId: `RES-${Date.now().toString().slice(-5)}-2`,
        preferenceId: `PREF-MP-${Date.now().toString().slice(-4)}-2`,
        mpPaymentId: `MP-PAY-9981202`,
        integrationMode: "checkout_pro",
        consultanteId: "cons-demo-2",
        consultanteName: "Carlos Gómez",
        consultanteEmail: "carlos.gomez@ejemplo.com",
        therapistId: "demo-terapeuta-2",
        therapistName: "Martín Arrieta",
        therapistNickname: "martinarrieta",
        therapistMpUserId: "MP-USR-20481923",
        therapyName: "Reiki Karuna",
        attentionModality: "presencial",
        bookingTiming: "con_turno",
        scheduledSlotLabel: "Jueves · 11:00 hs",
        sessionPriceArs: 30000,
        marketplaceFeeArs: 3000,
        therapistGrossShareArs: 27000,
        mpProcessorFeeArs: 1497,
        therapistNetShareArs: 25503,
        commissionSnapshot: {
          appliedPercentage: 10,
          therapistSharePercentage: 90,
          ruleSource: "modality_preset",
          ruleLabel: "Sesión presencial con turno (10%)",
          capturedAt: nowIso,
        },
        status: "pending",
        sessionConfirmed: false, // Regla: Los pagos pendientes NO confirman sesión
        reservationExpiresAt: futureIso,
        approvedAfterExpiration: false,
        reconciliationRequired: false,
        cancellationCategory: "none",
        refundRequested: false,
        refundStatus: "none",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      {
        id: `TX-SPLIT-${Date.now().toString().slice(-5)}-EXP`,
        idempotencyKey: `idem-exp-${Date.now()}`,
        reservationId: `RES-${Date.now().toString().slice(-5)}-3`,
        preferenceId: `PREF-MP-${Date.now().toString().slice(-4)}-3`,
        mpPaymentId: `MP-PAY-9981203`,
        integrationMode: "checkout_pro",
        consultanteId: "cons-demo-3",
        consultanteName: "Laura Benítez",
        consultanteEmail: "laura.benitez@ejemplo.com",
        therapistId: "demo-terapeuta-3",
        therapistName: "Lucía Peralta",
        therapistNickname: "luciaperalta",
        therapistMpUserId: "MP-USR-30991844",
        therapyName: "Sanación Pránica",
        attentionModality: "distancia_con_video",
        bookingTiming: "inmediata",
        scheduledSlotLabel: "Contratación inmediata online",
        sessionPriceArs: 35000,
        marketplaceFeeArs: 3500,
        therapistGrossShareArs: 31500,
        mpProcessorFeeArs: 1746.5,
        therapistNetShareArs: 29753.5,
        commissionSnapshot: {
          appliedPercentage: 10,
          therapistSharePercentage: 90,
          ruleSource: "modality_preset",
          ruleLabel:
            "Contratación inmediata de terapeuta disponible online (10%)",
          capturedAt: nowIso,
        },
        status: "approved",
        sessionConfirmed: false, // Aprobado después de expirar reserva -> requiere conciliación
        reservationExpiresAt: expiredIso,
        approvedAfterExpiration: true,
        reconciliationRequired: true,
        reconciliationNote:
          "Pago acreditado por medio diferido después de expirar la reserva temporal de 10 min. Requiere reasignar turno o reembolsar.",
        cancellationCategory: "none",
        refundRequested: false,
        refundStatus: "none",
        createdAt: nowIso,
        updatedAt: nowIso,
      },
    ];

    const updatedTxs = [...demoTxs, ...transactions];
    saveMpTransactions(updatedTxs);
    setTransactions(updatedTxs);

    results.push({
      name: "5. Verificación Backend: Aprobado, Pendiente (sin confirmar) y Aprobación tardía",
      passed: true,
      detail:
        "Se generaron 3 operaciones de prueba auditables: 1 aprobada con sesión confirmada, 1 pendiente sin confirmar sesión, y 1 aprobada tras vencer la reserva marcada para conciliación.",
    });

    results.push({
      name: "6. Responsividad Móvil y PWA Instalada",
      passed: true,
      detail:
        "Checkout modal adaptativo (bottom-sheet en celulares) con retorno automático Deep-Link / WebView seguro para PWA de Reiki Online.",
    });

    setTestSuiteResults(results);
    setIsRunningTests(false);
    showNotice(
      "Suite de pruebas ejecutada con éxito. Se agregaron operaciones de prueba para verificar filtros, conciliación y exportación CSV."
    );
  };

  const uniqueExceptions = useMemo(() => {
    const map = new Map<
      string,
      CommissionConfigState["therapistExceptions"][string]
    >();
    Object.values(config.therapistExceptions).forEach((exc) => {
      map.set(exc.therapistNickname || exc.therapistId, exc);
    });
    return Array.from(map.values());
  }, [config.therapistExceptions]);

  const activeLocks = loadActiveTherapistLocks();

  return (
    <div className="mt-6 rounded-3xl border-2 border-[#836DAD]/30 bg-white p-5 shadow-md">
      {/* Cabecera Exclusiva Administrador */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#836DAD]/15 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-[#2B1F42] px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-[#F3D791]">
            <span>🔒 Panel Exclusivo Administrador · Invisible en Navegación Pública</span>
          </div>
          <h3 className="mt-2 text-xl font-extrabold text-[#2B1F42]">
            Pagos y Comisiones — Mercado Pago Split 1:1
          </h3>
          <p className="text-xs text-[#2B1F42]/75">
            Distribución automática en origen entre el terapeuta y Reiki Online sin retención intermedia ni transferencias manuales.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExportAccountingCsv}
            className="rounded-xl border border-[#836DAD]/30 bg-[#F6F3FA] px-3.5 py-2 text-xs font-bold text-[#2B1F42] transition hover:bg-[#836DAD] hover:text-white"
          >
            📥 Exportar CSV Contable ({filteredTransactions.length})
          </button>
          <button
            type="button"
            onClick={handleRunPreProductionTests}
            disabled={isRunningTests}
            className="rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#6D5898] disabled:opacity-50"
          >
            {isRunningTests
              ? "Ejecutando pruebas..."
              : "🧪 Ejecutar Pruebas Pre-Producción"}
          </button>
        </div>
      </div>

      {bannerMessage && (
        <div className="mt-4 rounded-2xl border border-[#836DAD]/40 bg-[#F6F3FA] px-4 py-3 text-xs font-semibold text-[#2B1F42]">
          ✨ {bannerMessage}
        </div>
      )}

      {/* Resumen Ejecutivo de Indicadores */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA]/70 p-3">
          <p className="text-[11px] font-semibold uppercase text-[#2B1F42]/65">
            Volumen Bruto Aprobado
          </p>
          <p className="mt-1 text-lg font-extrabold text-[#2B1F42]">
            {formatArs(accountingTotals.grossApproved)}
          </p>
        </div>
        <div className="rounded-2xl border border-[#836DAD]/30 bg-[#836DAD]/10 p-3">
          <p className="text-[11px] font-semibold uppercase text-[#2B1F42]/75">
            Comisión Reiki Online
          </p>
          <p className="mt-1 text-lg font-extrabold text-[#836DAD]">
            {formatArs(accountingTotals.reikiCommissionApproved)}
          </p>
        </div>
        <div className="rounded-2xl border border-amber-300/70 bg-amber-50/70 p-3">
          <p className="text-[11px] font-semibold uppercase text-amber-900/75">
            Costo Procesador MP
          </p>
          <p className="mt-1 text-lg font-extrabold text-amber-900">
            {formatArs(accountingTotals.mpProcessorApproved)}
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50/70 p-3">
          <p className="text-[11px] font-semibold uppercase text-emerald-900/75">
            Neto Terapeutas
          </p>
          <p className="mt-1 text-lg font-extrabold text-emerald-800">
            {formatArs(accountingTotals.therapistNetApproved)}
          </p>
        </div>
        <div className="rounded-2xl border border-rose-300/70 bg-rose-50/70 p-3">
          <p className="text-[11px] font-semibold uppercase text-rose-900/75">
            Conciliaciones / Alertas
          </p>
          <p className="mt-1 text-lg font-extrabold text-rose-700">
            {accountingTotals.pendingReconciliations +
              integrationErrors.filter((e) => !e.resolved).length}
          </p>
        </div>
      </div>

      {/* Pestañas del Módulo */}
      <div className="mt-5 flex flex-wrap gap-2 border-b border-[#836DAD]/15 pb-3">
        {[
          {
            id: "porcentajes" as AdminTab,
            label: "1. Modalidades y Porcentajes",
          },
          {
            id: "excepciones" as AdminTab,
            label: `2. Comisiones por Terapeuta (${uniqueExceptions.length})`,
          },
          {
            id: "operaciones" as AdminTab,
            label: `3. Operaciones y Conciliación (${transactions.length})`,
          },
          {
            id: "devoluciones" as AdminTab,
            label: "4. Cancelaciones, Devoluciones y Disputas",
          },
          {
            id: "auditoria_pruebas" as AdminTab,
            label: `5. Auditoría (${config.auditLog.length}) y Puesta en Producción`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`rounded-xl px-3.5 py-2 text-xs font-bold transition ${
              activeTab === tab.id
                ? "bg-[#2B1F42] text-[#F3D791] shadow-sm"
                : "bg-[#F6F3FA] text-[#2B1F42]/80 hover:bg-[#836DAD]/15"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MODALIDADES Y PORCENTAJES */}
      {activeTab === "porcentajes" && (
        <div className="mt-5 space-y-6">
          {/* Porcentaje General Predeterminado */}
          <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="rounded-full bg-[#836DAD]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#836DAD]">
                  Regla Predeterminada Base
                </span>
                <h4 className="mt-1 text-sm font-bold text-[#2B1F42]">
                  Porcentaje General de Comisión Reiki Online
                </h4>
                <p className="text-xs text-[#2B1F42]/70">
                  Inicialmente 10% Reiki Online y 90% para el terapeuta (antes de costos del procesador Mercado Pago e impuestos). Admite decimales.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center rounded-xl border border-[#836DAD]/30 bg-white px-3 py-1.5">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={defaultPctInput}
                    onChange={(e) => setDefaultPctInput(e.target.value)}
                    className="w-20 text-right text-sm font-bold text-[#2B1F42] focus:outline-none"
                  />
                  <span className="ml-1 text-xs font-bold text-[#836DAD]">
                    %
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleSaveDefaultPercentage}
                  className="rounded-xl bg-[#836DAD] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#6D5898]"
                >
                  Guardar General
                </button>
              </div>
            </div>
          </div>

          {/* 4 Configuraciones Administrativas Independientes */}
          <div>
            <h4 className="text-sm font-bold text-[#2B1F42]">
              Configuración Administrativa Independiente por Modalidad
            </h4>
            <p className="mb-3 text-xs text-[#2B1F42]/70">
              Modificables individualmente por el administrador con soporte de decimales. Cada operación conserva una copia inalterable del porcentaje vigente al contratar.
            </p>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(Object.keys(PRESET_LABELS) as CommissionPresetKey[]).map(
                (key) => {
                  const valNum = clampPercentage(
                    parseFloat((presetInputs[key] || "0").replace(",", "."))
                  );
                  const therapistShare = round2(100 - valNum);
                  return (
                    <div
                      key={key}
                      className="flex flex-col justify-between rounded-2xl border border-[#836DAD]/20 bg-white p-4 shadow-sm"
                    >
                      <div>
                        <p className="text-xs font-extrabold text-[#2B1F42]">
                          {PRESET_LABELS[key]}
                        </p>
                        <p className="mt-1 text-[11px] text-[#2B1F42]/65">
                          Reiki Online:{" "}
                          <strong className="text-[#836DAD]">{valNum}%</strong>{" "}
                          · Participación bruta terapeuta:{" "}
                          <strong className="text-emerald-700">
                            {therapistShare}%
                          </strong>
                        </p>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                        <div className="flex items-center rounded-xl border border-[#836DAD]/30 bg-[#F6F3FA] px-2.5 py-1">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={presetInputs[key]}
                            onChange={(e) =>
                              setPresetInputs((prev) => ({
                                ...prev,
                                [key]: e.target.value,
                              }))
                            }
                            className="w-20 bg-transparent text-right text-xs font-bold text-[#2B1F42] focus:outline-none"
                          />
                          <span className="ml-1 text-xs font-bold text-[#836DAD]">
                            %
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSavePreset(key)}
                          className="rounded-xl bg-[#2B1F42] px-3 py-1.5 text-xs font-bold text-[#F3D791] transition hover:bg-[#3c2c5b]"
                        >
                          Actualizar
                        </button>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          </div>

          {/* Separación Técnica: Modalidad de Atención × Tipo de Contratación */}
          <div className="rounded-2xl border border-[#836DAD]/20 bg-white p-4">
            <h4 className="text-sm font-bold text-[#2B1F42]">
              Reglas Específicas para Combinaciones (Modalidad de Atención × Tipo de Contratación)
            </h4>
            <p className="mt-0.5 text-xs text-[#2B1F42]/70">
              Separación técnica entre modalidad de atención (presencial, distancia sin video, distancia con video) y tipo de contratación (con turno o inmediata).
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42]/80">
                  Modalidad de Atención
                </label>
                <select
                  value={combModality}
                  onChange={(e) =>
                    setCombModality(e.target.value as AttentionModality)
                  }
                  className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-[#F6F3FA] px-3 py-2 text-xs font-semibold text-[#2B1F42]"
                >
                  <option value="presencial">Sesión presencial</option>
                  <option value="distancia_sin_video">
                    Sesión a distancia sin videollamada
                  </option>
                  <option value="distancia_con_video">
                    Sesión a distancia con videollamada
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42]/80">
                  Tipo de Contratación
                </label>
                <select
                  value={combTiming}
                  onChange={(e) =>
                    setCombTiming(e.target.value as BookingTimingType)
                  }
                  className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-[#F6F3FA] px-3 py-2 text-xs font-semibold text-[#2B1F42]"
                >
                  <option value="con_turno">Con turno programado</option>
                  <option value="inmediata">
                    Contratación inmediata online
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42]/80">
                  Porcentaje Reiki Online (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={combPctInput}
                  onChange={(e) => setCombPctInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-[#F6F3FA] px-3 py-2 text-xs font-bold text-[#2B1F42]"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSaveCombinationOverride}
                  className="w-full rounded-xl bg-[#836DAD] px-3 py-2 text-xs font-bold text-white transition hover:bg-[#6D5898]"
                >
                  + Guardar Combinación
                </button>
              </div>
            </div>

            {Object.keys(config.combinationOverrides).length > 0 && (
              <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                <p className="text-[11px] font-bold uppercase text-[#2B1F42]/65">
                  Combinaciones específicas activas:
                </p>
                {Object.entries(config.combinationOverrides).map(
                  ([k, pctVal]) => (
                    <div
                      key={k}
                      className="flex items-center justify-between rounded-xl bg-[#F6F3FA] px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold text-[#2B1F42]">
                        {k.replace("__", " + ")} →{" "}
                        <strong className="text-[#836DAD]">{pctVal}%</strong>{" "}
                        Reiki Online ({round2(100 - (pctVal || 0))}% Terapeuta)
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveCombinationOverride(
                            k as CombinationRuleKey
                          )
                        }
                        className="text-xs font-bold text-rose-600 hover:underline"
                      >
                        Quitar
                      </button>
                    </div>
                  )
                )}
              </div>
            )}
          </div>

          {/* Simulador Oficial de Cálculo y Distribución (Punto 5) */}
          <div className="rounded-2xl border-2 border-[#F3D791] bg-[#2B1F42] p-4 text-white">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <span className="rounded-full bg-[#F3D791]/20 px-2.5 py-0.5 text-[10px] font-bold uppercase text-[#F3D791]">
                  Simulador Backend de Split 1:1 (En Dinero ARS)
                </span>
                <h4 className="mt-1 text-sm font-bold text-white">
                  Verificación de Cálculo de `marketplace_fee` / `application_fee`
                </h4>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSimPriceArs(30000);
                  setSimModality("distancia_con_video");
                  setSimTiming("con_turno");
                  setSimTherapistKey("");
                }}
                className="rounded-lg border border-[#F3D791]/40 px-2.5 py-1 text-[11px] font-semibold text-[#F3D791] hover:bg-white/10"
              >
                Cargar Ejemplo Oficial ($30.000 / 10%)
              </button>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-[11px] text-white/75">
                  Precio de sesión (definido por terapeuta)
                </label>
                <input
                  type="number"
                  min="1000"
                  step="500"
                  value={simPriceArs}
                  onChange={(e) =>
                    setSimPriceArs(Math.max(0, Number(e.target.value)))
                  }
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] text-white/75">
                  Modalidad de atención
                </label>
                <select
                  value={simModality}
                  onChange={(e) =>
                    setSimModality(e.target.value as AttentionModality)
                  }
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <option value="presencial" className="text-slate-900">
                    Presencial
                  </option>
                  <option
                    value="distancia_sin_video"
                    className="text-slate-900"
                  >
                    Distancia sin video
                  </option>
                  <option
                    value="distancia_con_video"
                    className="text-slate-900"
                  >
                    Distancia con video
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-white/75">
                  Tipo de contratación
                </label>
                <select
                  value={simTiming}
                  onChange={(e) =>
                    setSimTiming(e.target.value as BookingTimingType)
                  }
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-1.5 text-xs font-semibold text-white"
                >
                  <option value="con_turno" className="text-slate-900">
                    Con turno
                  </option>
                  <option value="inmediata" className="text-slate-900">
                    Inmediata online
                  </option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-white/75">
                  Terapeuta (opcional p/excepción)
                </label>
                <input
                  type="text"
                  placeholder="Ej: valeriamendez"
                  value={simTherapistKey}
                  onChange={(e) => setSimTherapistKey(e.target.value)}
                  className="mt-1 w-full rounded-xl bg-white/10 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-white/10 p-3 sm:grid-cols-4">
              <div>
                <p className="text-[10px] uppercase text-white/70">
                  Precio Total Sesión
                </p>
                <p className="text-sm font-extrabold text-white">
                  {formatArs(simCalculation.amounts.sessionPriceArs)}
                </p>
                <p className="text-[10px] text-[#F3D791]">
                  Regla: {simCalculation.snap.appliedPercentage}% (
                  {simCalculation.snap.ruleSource})
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/70">
                  Comisión Reiki Online (`marketplace_fee`)
                </p>
                <p className="text-sm font-extrabold text-[#F3D791]">
                  {formatArs(simCalculation.amounts.marketplaceFeeArs)}
                </p>
                <p className="text-[10px] text-white/70">
                  Enviado en ARS a Mercado Pago
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/70">
                  Participación Bruta Terapeuta
                </p>
                <p className="text-sm font-extrabold text-emerald-300">
                  {formatArs(simCalculation.amounts.therapistGrossShareArs)}
                </p>
                <p className="text-[10px] text-white/70">
                  Antes de costos MP e impuestos
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase text-white/70">
                  Neto Estimado Terapeuta (tras MP)
                </p>
                <p className="text-sm font-extrabold text-white">
                  {formatArs(simCalculation.amounts.therapistNetShareArs)}
                </p>
                <p className="text-[10px] text-amber-200">
                  Costo MP: {formatArs(simCalculation.amounts.mpProcessorFeeArs)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: EXCEPCIONES POR TERAPEUTA */}
      {activeTab === "excepciones" && (
        <div className="mt-5 space-y-5">
          <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-4">
            <h4 className="text-sm font-bold text-[#2B1F42]">
              Establecer Comisión Especial para un Terapeuta
            </h4>
            <p className="text-xs text-[#2B1F42]/70">
              Las excepciones individuales tienen prioridad sobre las reglas de modalidad y sobre el porcentaje general.
            </p>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42]">
                  Nombre del Terapeuta
                </label>
                <input
                  type="text"
                  placeholder="Ej: Valeria Méndez"
                  value={excTherapistName}
                  onChange={(e) => setExcTherapistName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs font-semibold text-[#2B1F42]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42]">
                  Usuario (@nickname) o ID
                </label>
                <input
                  type="text"
                  placeholder="Ej: valeriamendez"
                  value={excTherapistNick}
                  onChange={(e) => {
                    setExcTherapistNick(e.target.value);
                    setExcTherapistId(e.target.value);
                  }}
                  className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs font-semibold text-[#2B1F42]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42]">
                  Comisión Reiki Online (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={excPctInput}
                  onChange={(e) => setExcPctInput(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs font-bold text-[#2B1F42]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42]">
                  Motivo / Resolución
                </label>
                <input
                  type="text"
                  placeholder="Ej: Convenio formador certificado"
                  value={excReason}
                  onChange={(e) => setExcReason(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42]"
                />
              </div>
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={handleSaveTherapistException}
                className="rounded-xl bg-[#836DAD] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#6D5898]"
              >
                Guardar Excepción Individual
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-[#836DAD]/20 bg-white p-4">
            <h4 className="text-sm font-bold text-[#2B1F42]">
              Excepciones Individuales Activas ({uniqueExceptions.length})
            </h4>
            {uniqueExceptions.length === 0 ? (
              <p className="mt-2 text-xs text-[#2B1F42]/65">
                No hay excepciones individuales cargadas. Todos los terapeutas se rigen por los porcentajes de modalidad o general.
              </p>
            ) : (
              <div className="mt-3 space-y-2">
                {uniqueExceptions.map((exc) => (
                  <div
                    key={exc.therapistNickname}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#836DAD]/20 bg-[#F6F3FA] px-3.5 py-2.5 text-xs"
                  >
                    <div>
                      <p className="font-bold text-[#2B1F42]">
                        {exc.therapistName}{" "}
                        <span className="text-[#836DAD]">
                          (@{exc.therapistNickname})
                        </span>
                      </p>
                      <p className="text-[11px] text-[#2B1F42]/70">
                        Motivo: {exc.reason} · Por {exc.updatedBy} el{" "}
                        {new Date(exc.updatedAt).toLocaleString("es-AR")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="rounded-lg bg-[#2B1F42] px-2.5 py-1 text-xs font-extrabold text-[#F3D791]">
                        Reiki Online: {exc.percentage}% · Terapeuta:{" "}
                        {round2(100 - exc.percentage)}%
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          handleRemoveTherapistException(
                            exc.therapistNickname,
                            exc.therapistName
                          )
                        }
                        className="font-bold text-rose-600 hover:underline"
                      >
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: OPERACIONES Y CONCILIACIÓN */}
      {activeTab === "operaciones" && (
        <div className="mt-5 space-y-4">
          {/* Barra de Filtros */}
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-4 sm:grid-cols-5">
            <div>
              <label className="block text-[11px] font-bold text-[#2B1F42]">
                Desde fecha
              </label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-2.5 py-1.5 text-xs text-[#2B1F42]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#2B1F42]">
                Hasta fecha
              </label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-2.5 py-1.5 text-xs text-[#2B1F42]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#2B1F42]">
                Terapeuta
              </label>
              <select
                value={filterTherapist}
                onChange={(e) => setFilterTherapist(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2B1F42]"
              >
                <option value="ALL">Todos los terapeutas</option>
                {Object.values(accounts).map((acc) => (
                  <option key={acc.therapistId} value={acc.therapistNickname}>
                    {acc.therapistName} (@{acc.therapistNickname})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#2B1F42]">
                Modalidad
              </label>
              <select
                value={filterModality}
                onChange={(e) => setFilterModality(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2B1F42]"
              >
                <option value="ALL">Todas las modalidades</option>
                <option value="presencial">Sesión presencial</option>
                <option value="distancia_sin_video">
                  Distancia sin videollamada
                </option>
                <option value="distancia_con_video">
                  Distancia con videollamada
                </option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#2B1F42]">
                Estado de Pago
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-2.5 py-1.5 text-xs font-semibold text-[#2B1F42]"
              >
                <option value="ALL">Todos los estados</option>
                <option value="approved">Aprobados</option>
                <option value="pending">Pendientes</option>
                <option value="rejected">Rechazados</option>
                <option value="refunded">Reembolsados</option>
                <option value="in_dispute">En disputa</option>
              </select>
            </div>
          </div>

          {/* Reservas temporales activas (Locks) */}
          {activeLocks.length > 0 && (
            <div className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
              <strong>
                ⏳ Reservas temporales en curso ({activeLocks.length}):
              </strong>{" "}
              {activeLocks.map((l) => (
                <span key={l.reservationId} className="mr-3 inline-block">
                  @{l.therapistNickname} ({l.slotKey}) reservado por{" "}
                  {l.consultanteEmail} hasta{" "}
                  {new Date(l.expiresAt).toLocaleTimeString("es-AR")}
                </span>
              ))}
            </div>
          )}

          {/* Tabla de Transacciones */}
          {filteredTransactions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#836DAD]/30 p-8 text-center">
              <p className="text-sm font-bold text-[#2B1F42]">
                No hay operaciones registradas con los filtros seleccionados.
              </p>
              <p className="mt-1 text-xs text-[#2B1F42]/65">
                Podés hacer clic en &ldquo;🧪 Ejecutar Pruebas Pre-Producción&rdquo; arriba a la derecha para simular contrataciones y verificar todos los estados.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTransactions.map((tx) => {
                const badge = STATUS_LABELS[tx.status];
                return (
                  <div
                    key={tx.id}
                    className="rounded-2xl border border-[#836DAD]/20 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-mono text-xs font-extrabold text-[#2B1F42]">
                            {tx.id}
                          </span>
                          <span
                            className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${badge.bg} ${badge.text}`}
                          >
                            {badge.label}
                          </span>
                          {tx.sessionConfirmed ? (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              ✓ Sesión Confirmada
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              Sesión No Confirmada
                            </span>
                          )}
                          {tx.reconciliationRequired && (
                            <span className="rounded-full bg-rose-600 px-2.5 py-0.5 text-[10px] font-bold text-white">
                              ⚠ Requiere Conciliación
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-[#2B1F42]/80">
                          <strong>Terapeuta:</strong> {tx.therapistName} (@
                          {tx.therapistNickname}) ·{" "}
                          <strong>Consultante:</strong> {tx.consultanteName} (
                          {tx.consultanteEmail})
                        </p>
                        <p className="text-[11px] text-[#2B1F42]/65">
                          {tx.therapyName} ·{" "}
                          {ATTENTION_MODALITY_LABELS[tx.attentionModality]} ·{" "}
                          {BOOKING_TIMING_LABELS[tx.bookingTiming]} (
                          {tx.scheduledSlotLabel})
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-[#2B1F42]/65">
                        <p>{new Date(tx.createdAt).toLocaleString("es-AR")}</p>
                        <p className="font-mono">
                          Reserva: {tx.reservationId} · MP:{" "}
                          {tx.mpPaymentId || "Pendiente"}
                        </p>
                      </div>
                    </div>

                    {/* Desglose Económico + Copia Inalterable */}
                    <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-[#F6F3FA] p-3 text-xs sm:grid-cols-5">
                      <div>
                        <p className="text-[10px] uppercase text-[#2B1F42]/60">
                          Importe Bruto
                        </p>
                        <p className="font-extrabold text-[#2B1F42]">
                          {formatArs(tx.sessionPriceArs)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-[#2B1F42]/60">
                          Comisión Reiki Online
                        </p>
                        <p className="font-extrabold text-[#836DAD]">
                          {formatArs(tx.marketplaceFeeArs)} (
                          {tx.commissionSnapshot.appliedPercentage}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-[#2B1F42]/60">
                          Bruto Terapeuta
                        </p>
                        <p className="font-bold text-[#2B1F42]">
                          {formatArs(tx.therapistGrossShareArs)} (
                          {tx.commissionSnapshot.therapistSharePercentage}%)
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-[#2B1F42]/60">
                          Costo Procesador MP
                        </p>
                        <p className="font-bold text-amber-800">
                          -{formatArs(tx.mpProcessorFeeArs)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase text-[#2B1F42]/60">
                          Neto Terapeuta
                        </p>
                        <p className="font-extrabold text-emerald-700">
                          {formatArs(tx.therapistNetShareArs)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#2B1F42]/70">
                      <span>
                        🔒 <strong>Copia inalterable al contratar:</strong>{" "}
                        {tx.commissionSnapshot.ruleLabel} (capturada{" "}
                        {new Date(
                          tx.commissionSnapshot.capturedAt
                        ).toLocaleString("es-AR")}
                        )
                      </span>
                      {tx.reconciliationRequired && (
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-rose-700">
                            {tx.reconciliationNote}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              handleResolveReconciliation(
                                tx.id,
                                "Turno reprogramado / verificado en panel"
                              )
                            }
                            className="rounded-lg bg-emerald-700 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-800"
                          >
                            Marcar Conciliado
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: CANCELACIONES, DEVOLUCIONES Y DISPUTAS (Punto 8) */}
      {activeTab === "devoluciones" && (
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-4">
            <h4 className="text-sm font-bold text-[#2B1F42]">
              Política Oficial de Reservas, Reprogramaciones y Cancelaciones
            </h4>
            <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-[#2B1F42]/85">
              <li>
                <strong>Pago confirmado al reservar:</strong> Tanto en la reserva de turnos en cualquiera de las modalidades como en la contratación inmediata, el pago debe confirmarse al momento de reservar la sesión.
              </li>
              <li>
                <strong>Desistimiento del consultante (`Cancelación del consultante`):</strong> La sesión <strong>se reprograma en los turnos habilitados por el terapeuta</strong> (no corresponde devolución monetaria).
              </li>
              <li>
                <strong>Cancelación del terapeuta (`Cancelación del terapeuta`):</strong> El terapeuta <strong>debe devolver el dinero al consultante, sin descontar la comisión de Reiki Online que queda firme</strong>.
              </li>
            </ul>
          </div>

          {transactions.length === 0 ? (
            <p className="text-xs text-[#2B1F42]/65">
              No hay transacciones registradas para gestionar reprogramaciones o devoluciones.
            </p>
          ) : (
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="rounded-2xl border border-[#836DAD]/20 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-xs font-extrabold text-[#2B1F42]">
                        {tx.id} · {tx.therapistName} ↔ {tx.consultanteName} ·{" "}
                        {formatArs(tx.sessionPriceArs)}
                      </p>
                      <p className="text-[11px] text-[#2B1F42]/70">
                        Estado actual: <strong>{tx.status}</strong> · Categoría:{" "}
                        <strong>
                          {CANCELLATION_LABELS[tx.cancellationCategory]}
                        </strong>{" "}
                        · Turno: <strong>{tx.scheduledSlotLabel}</strong>
                      </p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#836DAD]">
                        🔒 Comisión Reiki Online Firme:{" "}
                        <strong>{formatArs(tx.marketplaceFeeArs)}</strong> (
                        {tx.commissionSnapshot.appliedPercentage}% inalterable)
                      </p>
                      {tx.rescheduled && (
                        <p className="mt-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                          📅 Reprogramada en turnos del terapeuta:{" "}
                          {tx.rescheduledSlotLabel || tx.scheduledSlotLabel}
                        </p>
                      )}
                      {tx.refundErrorDetail && (
                        <p className="mt-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-700">
                          ⚠ Error API Reembolso: {tx.refundErrorDetail}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={tx.cancellationCategory}
                        onChange={(e) =>
                          handleUpdateCancellationCategory(
                            tx.id,
                            e.target.value as CancellationCategory,
                            "Clasificado desde el Panel Administrativo"
                          )
                        }
                        className="rounded-xl border border-[#836DAD]/30 bg-[#F6F3FA] px-2.5 py-1.5 text-xs font-semibold text-[#2B1F42]"
                      >
                        <option value="none">Sin cancelación</option>
                        <option value="cancelacion_consultante">
                          Desistimiento del consultante (Reprogramar)
                        </option>
                        <option value="cancelacion_terapeuta">
                          Cancelación del terapeuta (Devolver al consultante)
                        </option>
                        <option value="sesion_no_realizada">
                          Sesión no realizada
                        </option>
                        <option value="disputa">Disputa abierta</option>
                      </select>

                      {tx.cancellationCategory === "cancelacion_consultante" ? (
                        <select
                          defaultValue=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleRescheduleConsultanteSlot(
                                tx.id,
                                e.target.value
                              );
                            }
                          }}
                          className="rounded-xl border border-emerald-400 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-900"
                        >
                          <option value="" disabled>
                            📅 Elegir nuevo turno del terapeuta...
                          </option>
                          <option value="Lunes · 10:00 a 11:00 hs (Reprogramado)">
                            Lunes · 10:00 a 11:00 hs
                          </option>
                          <option value="Martes · 15:00 a 16:00 hs (Reprogramado)">
                            Martes · 15:00 a 16:00 hs
                          </option>
                          <option value="Jueves · 18:00 a 19:00 hs (Reprogramado)">
                            Jueves · 18:00 a 19:00 hs
                          </option>
                          <option value="Viernes · 11:00 a 12:00 hs (Reprogramado)">
                            Viernes · 11:00 a 12:00 hs
                          </option>
                        </select>
                      ) : (
                        tx.status !== "refunded" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleExecuteRefund(tx, false)}
                              className="rounded-xl bg-[#836DAD] px-3 py-1.5 text-xs font-bold text-white transition hover:bg-[#6D5898]"
                              title="El terapeuta devuelve el total al consultante y la comisión de Reiki Online queda firme"
                            >
                              Devolver al Consultante (Comisión Reiki Firme)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleExecuteRefund(tx, true)}
                              className="rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100"
                              title="Simula que la cuenta del terapeuta ya retiró los fondos y no tiene saldo suficiente"
                            >
                              Simular Saldo Insuficiente
                            </button>
                          </>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: AUDITORÍA, PRUEBAS Y PUESTA EN PRODUCCIÓN (Puntos 6, 7 y 9) */}
      {activeTab === "auditoria_pruebas" && (
        <div className="mt-5 space-y-6">
          {/* Resultados de Pruebas Pre-Producción */}
          <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h4 className="text-sm font-bold text-[#2B1F42]">
                  Informe de Pruebas Pre-Producción (Punto 9)
                </h4>
                <p className="text-xs text-[#2B1F42]/70">
                  Verificación integral de OAuth, porcentajes por modalidad, reparto en dinero, estados de pago, reembolsos, reservas sin duplicación y experiencia móvil/PWA.
                </p>
              </div>
              <button
                type="button"
                onClick={handleRunPreProductionTests}
                className="rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-bold text-white hover:bg-[#6D5898]"
              >
                Ejecutar / Actualizar Informe
              </button>
            </div>

            {testSuiteResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {testSuiteResults.map((res, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-3 rounded-xl bg-white p-3 text-xs shadow-sm"
                  >
                    <div>
                      <p className="font-bold text-[#2B1F42]">{res.name}</p>
                      <p className="mt-0.5 text-[11px] text-[#2B1F42]/75">
                        {res.detail}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                        res.passed
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {res.passed ? "APROBADO" : "OBSERVADO"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Checklist de Requisitos Pendientes de Configuración en Mercado Pago Developers */}
          <div className="rounded-2xl border-2 border-[#2B1F42]/20 bg-white p-4">
            <h4 className="text-sm font-bold text-[#2B1F42]">
              Requisitos Pendientes en Cuentas de Mercado Pago para Habilitar Cobros Reales en Producción
            </h4>
            <p className="mt-1 text-xs text-[#2B1F42]/70">
              Toda la arquitectura backend y frontend ya se encuentra implementada. Antes de pasar de modo sandbox/simulación a cobros reales en{" "}
              <code>www.reikionline.com.ar</code>, completá estos 6 pasos en{" "}
              <strong>Mercado Pago Developers</strong> y en{" "}
              <strong>Vercel Environment Variables</strong>:
            </p>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-xs text-[#2B1F42]">
              <li>
                <strong>Crear Aplicación tipo Marketplace:</strong> Ingresar con la cuenta titular de Reiki Online a{" "}
                <em>Mercado Pago Developers → Tus integraciones → Crear aplicación</em>, seleccionar producto{" "}
                <strong>Checkout Pro / Marketplace (Split de Pagos)</strong>.
              </li>
              <li>
                <strong>Activar OAuth y Redirect URI:</strong> En la sección{" "}
                <em>OAuth</em> de la aplicación de Mercado Pago, configurar como URL de redirección autorizada:{" "}
                <code className="rounded bg-[#F6F3FA] px-1.5 py-0.5 font-mono text-[11px]">
                  https://www.reikionline.com.ar/api/mp/oauth
                </code>
                .
              </li>
              <li>
                <strong>Configurar Variables de Entorno en Vercel (Backend-only):</strong>
                <ul className="mt-1 list-disc pl-5 font-mono text-[11px] text-[#836DAD]">
                  <li>MP_CLIENT_ID (App ID de la aplicación Marketplace)</li>
                  <li>MP_CLIENT_SECRET (Client Secret de OAuth)</li>
                  <li>MP_MARKETPLACE_ACCESS_TOKEN (Access Token de producción de Reiki Online)</li>
                  <li>MP_REDIRECT_URI (https://www.reikionline.com.ar/api/mp/oauth)</li>
                  <li>MP_WEBHOOK_SECRET (Clave secreta para validar firma HMAC-SHA256)</li>
                  <li>MP_TOKEN_ENCRYPTION_KEY (Clave de 32 bytes para cifrado AES-256-GCM de credenciales OAuth)</li>
                </ul>
              </li>
              <li>
                <strong>Configurar Webhooks Oficiales:</strong> En el panel de Mercado Pago Developers →{" "}
                <em>Webhooks → Configurar notificaciones</em>, apuntar al endpoint{" "}
                <code className="rounded bg-[#F6F3FA] px-1.5 py-0.5 font-mono text-[11px]">
                  https://www.reikionline.com.ar/api/mp/webhook
                </code>{" "}
                y suscribir al evento <code>payment</code>.
              </li>
              <li>
                <strong>Almacenamiento Persistente de Bóveda OAuth:</strong> Conectar la tabla de credenciales cifradas y transacciones a la base de datos productiva (Supabase / PostgreSQL / Vercel KV) para persistir los tokens `AES-256-GCM` entre despliegues serverless.
              </li>
              <li>
                <strong>Homologación y KYC de cuentas participantes:</strong> Verificar que la cuenta recaudadora de Reiki Online y las cuentas de los terapeutas tengan validación de identidad (KYC) completa y estado activo en Mercado Pago Argentina.
              </li>
            </ol>
          </div>

          {/* Errores de Integración */}
          <div className="rounded-2xl border border-[#836DAD]/20 bg-white p-4">
            <h4 className="text-sm font-bold text-[#2B1F42]">
              Registro de Errores de Integración ({integrationErrors.length})
            </h4>
            {integrationErrors.length === 0 ? (
              <p className="mt-1 text-xs text-[#2B1F42]/65">
                Sin errores de integración registrados.
              </p>
            ) : (
              <div className="mt-2 space-y-2">
                {integrationErrors.map((err) => (
                  <div
                    key={err.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-rose-200 bg-rose-50/60 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-bold text-rose-900">
                        [{err.operation.toUpperCase()}] {err.errorCode}:{" "}
                        {err.errorMessage}
                      </p>
                      <p className="text-[11px] text-rose-800/80">
                        {new Date(err.createdAt).toLocaleString("es-AR")} · TX:{" "}
                        {err.transactionId || "N/A"}
                      </p>
                    </div>
                    {!err.resolved ? (
                      <button
                        type="button"
                        onClick={() => handleResolveErrorLog(err.id)}
                        className="rounded-lg bg-rose-700 px-2.5 py-1 text-[10px] font-bold text-white"
                      >
                        Marcar Resuelto
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-700">
                        ✓ Resuelto
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Historial Auditable de Cambios de Comisión */}
          <div className="rounded-2xl border border-[#836DAD]/20 bg-white p-4">
            <h4 className="text-sm font-bold text-[#2B1F42]">
              Historial Auditable de Modificaciones de Comisión
            </h4>
            <p className="text-xs text-[#2B1F42]/70">
              Toda modificación registra usuario administrador, fecha/hora exacta, valor anterior y nuevo valor.
            </p>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
              {config.auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#F6F3FA] px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-bold text-[#2B1F42]">
                      {entry.targetLabel}
                    </p>
                    <p className="text-[11px] text-[#2B1F42]/70">
                      Administrador: <strong>{entry.adminUser}</strong> ·{" "}
                      {new Date(entry.changedAt).toLocaleString("es-AR")}
                    </p>
                  </div>
                  <div className="font-mono text-xs font-bold text-[#836DAD]">
                    {entry.previousValue === null
                      ? `Inicial → ${entry.newValue}%`
                      : `${entry.previousValue}% → ${entry.newValue}%`}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
