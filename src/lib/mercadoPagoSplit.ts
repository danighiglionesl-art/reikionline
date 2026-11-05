// ============================================================================
// REIKI ONLINE — MÓDULO DE PAGOS DISTRIBUIDOS (SPLIT DE PAGOS 1:1 MERCADO PAGO)
// ============================================================================

export type AttentionModality =
  | "presencial"
  | "distancia_sin_video"
  | "distancia_con_video";

export type BookingTimingType = "con_turno" | "inmediata";

export type CommissionPresetKey =
  | "presencial_con_turno"
  | "distancia_sin_video"
  | "distancia_con_video"
  | "inmediata_online";

export type CombinationRuleKey = `${AttentionModality}__${BookingTimingType}`;

export interface TherapistCommissionException {
  therapistId: string;
  therapistName: string;
  therapistNickname: string;
  percentage: number;
  reason: string;
  updatedBy: string;
  updatedAt: string;
}

export interface CommissionAuditLogEntry {
  id: string;
  adminUser: string;
  targetKey: string;
  targetLabel: string;
  previousValue: number | null;
  newValue: number;
  changedAt: string;
}

export interface CommissionConfigState {
  // Porcentaje general predeterminado (inicialmente 10% Reiki Online / 90% Terapeuta)
  defaultPercentage: number;
  // Porcentaje independiente para Capacitaciones («Mis Capacitaciones» / «Academia Reiki Online»)
  trainingCommissionPercentage?: number;
  // Configuración administrativa independiente para las 4 modalidades requeridas
  presets: Record<CommissionPresetKey, number>;
  // Reglas específicas adicionales para combinaciones futuras (modalidad + contratación)
  combinationOverrides: Partial<Record<CombinationRuleKey, number>>;
  // Excepciones administrativas individuales por terapeuta (key = therapistId o nickname)
  therapistExceptions: Record<string, TherapistCommissionException>;
  // Historial auditable de cambios económicos
  auditLog: CommissionAuditLogEntry[];
  updatedAt: string;
}

export interface TherapistMercadoPagoAccount {
  therapistId: string;
  therapistName: string;
  therapistNickname: string;
  therapistEmail: string;
  linked: boolean;
  mpUserId: string | null;
  mpPublicKey: string | null;
  mpAccountAlias: string | null;
  kycVerified: boolean;
  processorFeeAccepted: boolean;
  sessionPriceArs: number;
  // Precios por terapia en función de los tildes del listado de Terapias (mismo valor para presencial, virtual con turno o virtual ahora)
  therapyPricesArs?: Record<string, number>;
  // Token cifrado en backend; en cliente solo se guarda referencia de estado y vencimiento
  tokenStatus: "active" | "expired" | "disconnected";
  tokenExpiresAt: string | null;
  linkedAt: string | null;
  lastRefreshedAt: string | null;
}

export interface ImmutableCommissionSnapshot {
  appliedPercentage: number;
  therapistSharePercentage: number;
  ruleSource:
    | "therapist_exception"
    | "combination_override"
    | "modality_preset"
    | "default_general";
  ruleLabel: string;
  capturedAt: string;
}

export type SplitPaymentStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "refunded"
  | "cancelled"
  | "in_dispute";

export type CancellationCategory =
  | "none"
  | "cancelacion_terapeuta"
  | "cancelacion_consultante"
  | "sesion_no_realizada"
  | "disputa";

export interface SplitPaymentTransaction {
  id: string;
  idempotencyKey: string;
  reservationId: string;
  preferenceId: string;
  mpPaymentId: string | null;
  integrationMode: "checkout_pro" | "checkout_api";
  // Participantes
  consultanteId: string;
  consultanteName: string;
  consultanteEmail: string;
  therapistId: string;
  therapistName: string;
  therapistNickname: string;
  therapistMpUserId: string;
  // Detalle de la sesión
  therapyName: string;
  attentionModality: AttentionModality;
  bookingTiming: BookingTimingType;
  scheduledSlotLabel: string;
  // Importes en ARS (Mercado Pago recibe marketplace_fee en dinero, no porcentaje)
  sessionPriceArs: number;
  marketplaceFeeArs: number; // Comisión Reiki Online en dinero
  therapistGrossShareArs: number; // Participación bruta del terapeuta antes de costos MP
  mpProcessorFeeArs: number; // Costo cobrado por Mercado Pago (soportado por cuenta del terapeuta)
  therapistNetShareArs: number; // Neto estimado percibido por el terapeuta
  // Copia inalterable del porcentaje aplicado al momento de contratar
  commissionSnapshot: ImmutableCommissionSnapshot;
  // Estado y control de reserva temporal
  status: SplitPaymentStatus;
  sessionConfirmed: boolean;
  reservationExpiresAt: string;
  approvedAfterExpiration: boolean;
  reconciliationRequired: boolean;
  reconciliationNote?: string;
  // Cancelaciones, reprogramaciones, devoluciones y disputas
  cancellationCategory: CancellationCategory;
  cancellationReason?: string;
  rescheduled?: boolean;
  rescheduledSlotLabel?: string;
  rescheduledAt?: string;
  reikiCommissionFirm?: boolean; // La comisión de Reiki Online queda siempre firme incluso si el terapeuta cancela y devuelve al consultante
  refundRequested: boolean;
  refundStatus?:
    | "none"
    | "pending_admin"
    | "completed"
    | "failed_insufficient_balance"
    | "rescheduled_no_refund";
  refundErrorDetail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TemporaryTherapistLock {
  reservationId: string;
  therapistId: string;
  therapistNickname: string;
  consultanteEmail: string;
  bookingTiming: BookingTimingType;
  slotKey: string; // "inmediata" o "${fecha}-${hora}"
  lockedAt: string;
  expiresAt: string;
}

export interface IntegrationErrorLog {
  id: string;
  operation: "oauth" | "preference" | "webhook" | "verify_payment" | "refund";
  therapistId?: string;
  transactionId?: string;
  errorCode: string;
  errorMessage: string;
  createdAt: string;
  resolved: boolean;
}

export const COMMISSION_CONFIG_STORAGE_KEY = "reiki_online_mp_commission_config_v1";
export const MP_ACCOUNTS_STORAGE_KEY = "reiki_online_mp_therapist_accounts_v1";
export const MP_TRANSACTIONS_STORAGE_KEY = "reiki_online_mp_transactions_v1";
export const MP_LOCKS_STORAGE_KEY = "reiki_online_mp_temp_locks_v1";
export const MP_ERRORS_STORAGE_KEY = "reiki_online_mp_integration_errors_v1";
export const MP_SYNC_EVENT = "reiki-online-mp-sync";

// Porcentaje estimado de costo de procesamiento de Mercado Pago para desglose informativo
export const ESTIMATED_MP_PROCESSOR_FEE_RATE = 0.0499; // 4.99%

export const PRESET_LABELS: Record<CommissionPresetKey, string> = {
  presencial_con_turno: "Sesión presencial con turno",
  distancia_sin_video: "Sesión a distancia sin videollamada",
  distancia_con_video: "Sesión a distancia con videollamada",
  inmediata_online: "Contratación inmediata de terapeuta disponible online",
};

export const ATTENTION_MODALITY_LABELS: Record<AttentionModality, string> = {
  presencial: "Sesión presencial",
  distancia_sin_video: "Sesión a distancia sin videollamada",
  distancia_con_video: "Sesión a distancia con videollamada",
};

export const BOOKING_TIMING_LABELS: Record<BookingTimingType, string> = {
  con_turno: "Con turno programado",
  inmediata: "Contratación inmediata online",
};

export const DEFAULT_COMMISSION_CONFIG: CommissionConfigState = {
  defaultPercentage: 10,
  trainingCommissionPercentage: 10,
  presets: {
    presencial_con_turno: 10,
    distancia_sin_video: 10,
    distancia_con_video: 10,
    inmediata_online: 10,
  },
  combinationOverrides: {},
  therapistExceptions: {},
  auditLog: [
    {
      id: "audit-init-1",
      adminUser: "Sistema Inicial (Manual Reiki Online)",
      targetKey: "defaultPercentage",
      targetLabel: "Comisión General Predeterminada (10% Reiki Online / 90% Terapeuta)",
      previousValue: null,
      newValue: 10,
      changedAt: "2026-11-01T12:00:00.000Z",
    },
  ],
  updatedAt: "2026-11-01T12:00:00.000Z",
};

/**
 * Resuelve la clave de preset administrativo según la modalidad de atención y el tipo de contratación.
 */
export function resolvePresetKey(
  attentionModality: AttentionModality,
  bookingTiming: BookingTimingType
): CommissionPresetKey {
  if (bookingTiming === "inmediata") {
    return "inmediata_online";
  }
  if (attentionModality === "presencial") {
    return "presencial_con_turno";
  }
  if (attentionModality === "distancia_sin_video") {
    return "distancia_sin_video";
  }
  return "distancia_con_video";
}

/**
 * Jerarquía oficial de cálculo del porcentaje aplicable:
 * 1. Excepción administrativa individual para el terapeuta (si existe).
 * 2. Regla específica de combinación futura (modalidad + contratación).
 * 3. Regla específica de modalidad / contratación (los 4 presets independientes).
 * 4. Porcentaje general predeterminado.
 */
export function resolveApplicableCommission(
  config: CommissionConfigState,
  attentionModality: AttentionModality,
  bookingTiming: BookingTimingType,
  therapistId?: string,
  therapistNickname?: string
): ImmutableCommissionSnapshot {
  const nowIso = new Date().toISOString();

  // 1. Verificar excepción individual por terapeuta
  const cleanNick = (therapistNickname || "").trim().toLowerCase();
  const exception =
    (therapistId && config.therapistExceptions[therapistId]) ||
    (cleanNick && config.therapistExceptions[cleanNick]);

  if (exception && typeof exception.percentage === "number") {
    const pct = clampPercentage(exception.percentage);
    return {
      appliedPercentage: pct,
      therapistSharePercentage: round2(100 - pct),
      ruleSource: "therapist_exception",
      ruleLabel: `Excepción individual (${exception.therapistName}): ${pct}%`,
      capturedAt: nowIso,
    };
  }

  // 2. Verificar combinación específica (attentionModality__bookingTiming)
  const combKey: CombinationRuleKey = `${attentionModality}__${bookingTiming}`;
  const combValue = config.combinationOverrides[combKey];
  if (typeof combValue === "number" && !Number.isNaN(combValue)) {
    const pct = clampPercentage(combValue);
    return {
      appliedPercentage: pct,
      therapistSharePercentage: round2(100 - pct),
      ruleSource: "combination_override",
      ruleLabel: `${ATTENTION_MODALITY_LABELS[attentionModality]} + ${BOOKING_TIMING_LABELS[bookingTiming]} (${pct}%)`,
      capturedAt: nowIso,
    };
  }

  // 3. Regla independiente de las 4 configuraciones de modalidad/contratación
  const presetKey = resolvePresetKey(attentionModality, bookingTiming);
  const presetValue = config.presets[presetKey];
  if (typeof presetValue === "number" && !Number.isNaN(presetValue)) {
    const pct = clampPercentage(presetValue);
    return {
      appliedPercentage: pct,
      therapistSharePercentage: round2(100 - pct),
      ruleSource: "modality_preset",
      ruleLabel: `${PRESET_LABELS[presetKey]} (${pct}%)`,
      capturedAt: nowIso,
    };
  }

  // 4. Porcentaje general predeterminado
  const defPct = clampPercentage(config.defaultPercentage ?? 10);
  return {
    appliedPercentage: defPct,
    therapistSharePercentage: round2(100 - defPct),
    ruleSource: "default_general",
    ruleLabel: `Porcentaje general predeterminado (${defPct}%)`,
    capturedAt: nowIso,
  };
}

/**
 * Resuelve el porcentaje de comisión de Reiki Online aplicable a Capacitaciones
 * (independiente de la comisión aplicada a las sesiones terapéuticas).
 */
export function resolveTrainingCommission(
  config: CommissionConfigState,
  therapistId?: string,
  therapistNickname?: string
): ImmutableCommissionSnapshot {
  const nowIso = new Date().toISOString();
  const cleanNick = (therapistNickname || "").trim().toLowerCase();
  const exception =
    (therapistId && config.therapistExceptions[therapistId]) ||
    (cleanNick && config.therapistExceptions[cleanNick]);

  if (exception && typeof exception.percentage === "number") {
    const pct = clampPercentage(exception.percentage);
    return {
      appliedPercentage: pct,
      therapistSharePercentage: round2(100 - pct),
      ruleSource: "therapist_exception",
      ruleLabel: `Excepción individual en Capacitaciones (${exception.therapistName}): ${pct}%`,
      capturedAt: nowIso,
    };
  }

  const trainingPct = clampPercentage(
    config.trainingCommissionPercentage ?? config.defaultPercentage ?? 10
  );
  return {
    appliedPercentage: trainingPct,
    therapistSharePercentage: round2(100 - trainingPct),
    ruleSource: "modality_preset",
    ruleLabel: `Comisión Academia Reiki Online / Capacitaciones (${trainingPct}%)`,
    capturedAt: nowIso,
  };
}

export function round2(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}

export function clampPercentage(val: number): number {
  if (Number.isNaN(val) || val < 0) return 0;
  if (val > 100) return 100;
  return round2(val);
}

/**
 * Calcula en dinero (ARS) los importes exactos para el Split 1:1 de Mercado Pago:
 * - Comisión Reiki Online (marketplace_fee / application_fee) = Precio × Porcentaje / 100
 * - Participación bruta del terapeuta = Precio − Comisión Reiki Online
 * - Costo estimado de procesamiento Mercado Pago (soportado por la cuenta del terapeuta)
 */
export function calculateSplitAmounts(
  sessionPriceArs: number,
  appliedPercentage: number
): {
  sessionPriceArs: number;
  marketplaceFeeArs: number;
  therapistGrossShareArs: number;
  mpProcessorFeeArs: number;
  therapistNetShareArs: number;
} {
  const safePrice = Math.max(0, round2(sessionPriceArs));
  const safePct = clampPercentage(appliedPercentage);
  const marketplaceFeeArs = round2((safePrice * safePct) / 100);
  const therapistGrossShareArs = round2(safePrice - marketplaceFeeArs);
  const mpProcessorFeeArs = round2(safePrice * ESTIMATED_MP_PROCESSOR_FEE_RATE);
  const therapistNetShareArs = Math.max(
    0,
    round2(therapistGrossShareArs - mpProcessorFeeArs)
  );

  return {
    sessionPriceArs: safePrice,
    marketplaceFeeArs,
    therapistGrossShareArs,
    mpProcessorFeeArs,
    therapistNetShareArs,
  };
}

export function formatArs(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Resuelve el Precio Total de la Sesión (ARS) según la terapia seleccionada.
 * El valor de la sesión de cada terapia es único (el mismo sea presencial,
 * virtual con turno o virtual ahora; lo que varía en cada caso son las comisiones).
 */
export function resolveTherapySessionPrice(
  account: TherapistMercadoPagoAccount | null | undefined,
  therapyName?: string
): number {
  if (!account) return 30000;
  if (therapyName && account.therapyPricesArs) {
    const specific = account.therapyPricesArs[therapyName];
    if (typeof specific === "number" && specific > 0) {
      return specific;
    }
  }
  return account.sessionPriceArs > 0 ? account.sessionPriceArs : 30000;
}

// Cuentas demo de terapeutas vinculadas para pruebas inmediatas en el directorio
export const DEMO_LINKED_MP_ACCOUNTS: Record<string, TherapistMercadoPagoAccount> = {
  "demo-terapeuta-1": {
    therapistId: "demo-terapeuta-1",
    therapistName: "Valeria Méndez",
    therapistNickname: "valeriamendez",
    therapistEmail: "valeria.mendez@reikionline.com.ar",
    linked: true,
    mpUserId: "MP-USR-10948271",
    mpPublicKey: "APP_USR-valeria-mendez-pk",
    mpAccountAlias: "valeria.reiki.mp",
    kycVerified: true,
    processorFeeAccepted: true,
    sessionPriceArs: 30000,
    therapyPricesArs: {
      "Reiki Usui": 30000,
      "Alineación de chakras": 28000,
      "Limpieza y armonización energética": 32000,
      "Meditación guiada": 25000,
    },
    tokenStatus: "active",
    tokenExpiresAt: "2027-05-01T00:00:00.000Z",
    linkedAt: "2026-10-25T14:20:00.000Z",
    lastRefreshedAt: "2026-11-01T10:00:00.000Z",
  },
  "demo-terapeuta-2": {
    therapistId: "demo-terapeuta-2",
    therapistName: "Martín Arrieta",
    therapistNickname: "martinarrieta",
    therapistEmail: "martin.arrieta@reikionline.com.ar",
    linked: true,
    mpUserId: "MP-USR-20481923",
    mpPublicKey: "APP_USR-martin-arrieta-pk",
    mpAccountAlias: "martin.karuna.mp",
    kycVerified: true,
    processorFeeAccepted: true,
    sessionPriceArs: 30000,
    therapyPricesArs: {
      "Reiki Karuna": 30000,
      Tarot: 26000,
      "Lectura de registros akáshicos": 36000,
      "Constelaciones individuales": 42000,
    },
    tokenStatus: "active",
    tokenExpiresAt: "2027-05-01T00:00:00.000Z",
    linkedAt: "2026-10-26T16:10:00.000Z",
    lastRefreshedAt: "2026-11-01T10:00:00.000Z",
  },
  "demo-terapeuta-3": {
    therapistId: "demo-terapeuta-3",
    therapistName: "Lucía Peralta",
    therapistNickname: "luciaperalta",
    therapistEmail: "lucia.peralta@reikionline.com.ar",
    linked: true,
    mpUserId: "MP-USR-30991844",
    mpPublicKey: "APP_USR-lucia-peralta-pk",
    mpAccountAlias: "lucia.holistica.mp",
    kycVerified: true,
    processorFeeAccepted: true,
    sessionPriceArs: 35000,
    therapyPricesArs: {
      "Flores de Bach": 32000,
      Biodescodificación: 40000,
      "Sonoterapia con cuencos tibetanos": 35000,
      "Reiki con cristales": 34000,
    },
    tokenStatus: "active",
    tokenExpiresAt: "2027-05-01T00:00:00.000Z",
    linkedAt: "2026-10-28T11:45:00.000Z",
    lastRefreshedAt: "2026-11-01T10:00:00.000Z",
  },
};

export function loadCommissionConfig(): CommissionConfigState {
  if (typeof window === "undefined") return DEFAULT_COMMISSION_CONFIG;
  try {
    const raw = window.localStorage.getItem(COMMISSION_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_COMMISSION_CONFIG;
    const parsed = JSON.parse(raw) as CommissionConfigState;
    return {
      ...DEFAULT_COMMISSION_CONFIG,
      ...parsed,
      presets: {
        ...DEFAULT_COMMISSION_CONFIG.presets,
        ...(parsed.presets || {}),
      },
      combinationOverrides: parsed.combinationOverrides || {},
      therapistExceptions: parsed.therapistExceptions || {},
      auditLog: Array.isArray(parsed.auditLog)
        ? parsed.auditLog
        : DEFAULT_COMMISSION_CONFIG.auditLog,
    };
  } catch {
    return DEFAULT_COMMISSION_CONFIG;
  }
}

export function saveCommissionConfig(next: CommissionConfigState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      COMMISSION_CONFIG_STORAGE_KEY,
      JSON.stringify(next)
    );
    window.dispatchEvent(new Event(MP_SYNC_EVENT));
  } catch {
    // Ignore
  }
}

export function loadMpAccounts(): Record<string, TherapistMercadoPagoAccount> {
  if (typeof window === "undefined") return { ...DEMO_LINKED_MP_ACCOUNTS };
  try {
    const raw = window.localStorage.getItem(MP_ACCOUNTS_STORAGE_KEY);
    const parsed = raw
      ? (JSON.parse(raw) as Record<string, TherapistMercadoPagoAccount>)
      : {};
    return {
      ...DEMO_LINKED_MP_ACCOUNTS,
      ...parsed,
    };
  } catch {
    return { ...DEMO_LINKED_MP_ACCOUNTS };
  }
}

export function saveMpAccounts(
  map: Record<string, TherapistMercadoPagoAccount>
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MP_ACCOUNTS_STORAGE_KEY, JSON.stringify(map));
    window.dispatchEvent(new Event(MP_SYNC_EVENT));
  } catch {
    // Ignore
  }
}

export const INITIAL_DEMO_MP_TRANSACTIONS: SplitPaymentTransaction[] = [
  {
    id: "tx-demo-cobrada-1",
    idempotencyKey: "idem-demo-cobrada-1",
    reservationId: "res-demo-101",
    preferenceId: "PREF-MP-8841201",
    mpPaymentId: "MP-PAY-90418273",
    integrationMode: "checkout_pro",
    consultanteId: "usr-mariana-lopez",
    consultanteName: "Mariana López",
    consultanteEmail: "mariana.lopez@ejemplo.com",
    therapistId: "admin-reikionline",
    therapistName: "Daniel Alejandro Ghiglione",
    therapistNickname: "danielghiglione",
    therapistMpUserId: "MP-USR-87292169",
    therapyName: "Magnified Healing",
    attentionModality: "distancia_con_video",
    bookingTiming: "con_turno",
    scheduledSlotLabel: "Lun 12:00 a 13:00 hs (1 h)",
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
      capturedAt: "2026-10-28T15:00:00.000Z",
    },
    status: "approved",
    sessionConfirmed: true,
    reservationExpiresAt: "2026-10-28T15:15:00.000Z",
    approvedAfterExpiration: false,
    reconciliationRequired: false,
    cancellationCategory: "none",
    refundRequested: false,
    refundStatus: "none",
    createdAt: "2026-10-28T15:02:00.000Z",
    updatedAt: "2026-10-28T15:02:00.000Z",
  },
  {
    id: "tx-demo-cobrada-2",
    idempotencyKey: "idem-demo-cobrada-2",
    reservationId: "res-demo-102",
    preferenceId: "PREF-MP-8841299",
    mpPaymentId: "MP-PAY-90451920",
    integrationMode: "checkout_pro",
    consultanteId: "usr-lucas-ferreyra",
    consultanteName: "Lucas Ferreyra",
    consultanteEmail: "lucas.ferreyra@ejemplo.com",
    therapistId: "admin-reikionline",
    therapistName: "Daniel Alejandro Ghiglione",
    therapistNickname: "danielghiglione",
    therapistMpUserId: "MP-USR-87292169",
    therapyName: "Constelaciones individuales",
    attentionModality: "presencial",
    bookingTiming: "con_turno",
    scheduledSlotLabel: "Mié 15:00 a 16:00 hs (1 h)",
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
      capturedAt: "2026-10-30T11:20:00.000Z",
    },
    status: "approved",
    sessionConfirmed: true,
    reservationExpiresAt: "2026-10-30T11:35:00.000Z",
    approvedAfterExpiration: false,
    reconciliationRequired: false,
    cancellationCategory: "none",
    refundRequested: false,
    refundStatus: "none",
    createdAt: "2026-10-30T11:22:00.000Z",
    updatedAt: "2026-10-30T11:22:00.000Z",
  },
  {
    id: "tx-demo-abonada-1",
    idempotencyKey: "idem-demo-abonada-1",
    reservationId: "res-demo-201",
    preferenceId: "PREF-MP-8859102",
    mpPaymentId: "MP-PAY-90512844",
    integrationMode: "checkout_pro",
    consultanteId: "admin-reikionline",
    consultanteName: "Daniel Alejandro Ghiglione",
    consultanteEmail: "danighiglione@gmail.com",
    therapistId: "demo-terapeuta-1",
    therapistName: "Valeria Méndez",
    therapistNickname: "valeriamendez",
    therapistMpUserId: "MP-USR-10948271",
    therapyName: "Reiki Usui",
    attentionModality: "distancia_con_video",
    bookingTiming: "inmediata",
    scheduledSlotLabel: "Contratación inmediata online (1 h)",
    sessionPriceArs: 30000,
    marketplaceFeeArs: 3000,
    therapistGrossShareArs: 27000,
    mpProcessorFeeArs: 1497,
    therapistNetShareArs: 25503,
    commissionSnapshot: {
      appliedPercentage: 10,
      therapistSharePercentage: 90,
      ruleSource: "modality_preset",
      ruleLabel: "Contratación inmediata de terapeuta disponible online (10%)",
      capturedAt: "2026-10-31T18:00:00.000Z",
    },
    status: "approved",
    sessionConfirmed: true,
    reservationExpiresAt: "2026-10-31T18:10:00.000Z",
    approvedAfterExpiration: false,
    reconciliationRequired: false,
    cancellationCategory: "none",
    refundRequested: false,
    refundStatus: "none",
    createdAt: "2026-10-31T18:01:00.000Z",
    updatedAt: "2026-10-31T18:01:00.000Z",
  },
  {
    id: "tx-demo-abonada-2",
    idempotencyKey: "idem-demo-abonada-2",
    reservationId: "res-demo-202",
    preferenceId: "PREF-MP-8864310",
    mpPaymentId: "MP-PAY-90603912",
    integrationMode: "checkout_pro",
    consultanteId: "admin-reikionline",
    consultanteName: "Daniel Alejandro Ghiglione",
    consultanteEmail: "danighiglione@gmail.com",
    therapistId: "demo-terapeuta-2",
    therapistName: "Martín Arrieta",
    therapistNickname: "martinarrieta",
    therapistMpUserId: "MP-USR-20481923",
    therapyName: "Lectura de registros akáshicos",
    attentionModality: "presencial",
    bookingTiming: "con_turno",
    scheduledSlotLabel: "Mié 13:00 a 14:00 hs (1 h)",
    sessionPriceArs: 36000,
    marketplaceFeeArs: 3600,
    therapistGrossShareArs: 32400,
    mpProcessorFeeArs: 1796.4,
    therapistNetShareArs: 30603.6,
    commissionSnapshot: {
      appliedPercentage: 10,
      therapistSharePercentage: 90,
      ruleSource: "modality_preset",
      ruleLabel: "Sesión presencial con turno (10%)",
      capturedAt: "2026-11-01T14:30:00.000Z",
    },
    status: "approved",
    sessionConfirmed: true,
    reservationExpiresAt: "2026-11-01T14:45:00.000Z",
    approvedAfterExpiration: false,
    reconciliationRequired: false,
    cancellationCategory: "none",
    refundRequested: false,
    refundStatus: "none",
    createdAt: "2026-11-01T14:32:00.000Z",
    updatedAt: "2026-11-01T14:32:00.000Z",
  },
];

export function loadMpTransactions(): SplitPaymentTransaction[] {
  if (typeof window === "undefined") return INITIAL_DEMO_MP_TRANSACTIONS;
  try {
    const raw = window.localStorage.getItem(MP_TRANSACTIONS_STORAGE_KEY);
    if (!raw) return INITIAL_DEMO_MP_TRANSACTIONS;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0
      ? parsed
      : INITIAL_DEMO_MP_TRANSACTIONS;
  } catch {
    return INITIAL_DEMO_MP_TRANSACTIONS;
  }
}

export function saveMpTransactions(list: SplitPaymentTransaction[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      MP_TRANSACTIONS_STORAGE_KEY,
      JSON.stringify(list)
    );
    window.dispatchEvent(new Event(MP_SYNC_EVENT));
  } catch {
    // Ignore
  }
}

export function loadActiveTherapistLocks(): TemporaryTherapistLock[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MP_LOCKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TemporaryTherapistLock[];
    const now = Date.now();
    return Array.isArray(parsed)
      ? parsed.filter((l) => new Date(l.expiresAt).getTime() > now)
      : [];
  } catch {
    return [];
  }
}

export function acquireTherapistLock(
  lock: TemporaryTherapistLock
): { ok: boolean; error?: string } {
  const active = loadActiveTherapistLocks();
  const conflict = active.find(
    (l) =>
      (l.therapistId === lock.therapistId ||
        l.therapistNickname === lock.therapistNickname) &&
      l.slotKey === lock.slotKey &&
      l.consultanteEmail !== lock.consultanteEmail
  );
  if (conflict) {
    return {
      ok: false,
      error:
        "Este terapeuta tiene una reserva temporal en curso por otro consultante mientras se procesa el pago. Por favor aguarde unos minutos o elija otro horario.",
    };
  }
  const filtered = active.filter(
    (l) =>
      !(
        l.therapistId === lock.therapistId &&
        l.slotKey === lock.slotKey &&
        l.consultanteEmail === lock.consultanteEmail
      )
  );
  const next = [lock, ...filtered];
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(MP_LOCKS_STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(MP_SYNC_EVENT));
    } catch {
      // Ignore
    }
  }
  return { ok: true };
}

export function releaseTherapistLock(reservationId: string): void {
  if (typeof window === "undefined") return;
  try {
    const active = loadActiveTherapistLocks();
    const next = active.filter((l) => l.reservationId !== reservationId);
    window.localStorage.setItem(MP_LOCKS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(MP_SYNC_EVENT));
  } catch {
    // Ignore
  }
}

export function loadIntegrationErrors(): IntegrationErrorLog[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MP_ERRORS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendIntegrationError(
  entry: Omit<IntegrationErrorLog, "id" | "createdAt" | "resolved">
): void {
  if (typeof window === "undefined") return;
  try {
    const current = loadIntegrationErrors();
    const newItem: IntegrationErrorLog = {
      ...entry,
      id: `mp-err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      createdAt: new Date().toISOString(),
      resolved: false,
    };
    window.localStorage.setItem(
      MP_ERRORS_STORAGE_KEY,
      JSON.stringify([newItem, ...current])
    );
    window.dispatchEvent(new Event(MP_SYNC_EVENT));
  } catch {
    // Ignore
  }
}
