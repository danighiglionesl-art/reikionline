export type BiometricVerificationStatus =
  | "no_iniciada"
  | "pendiente"
  | "verificada"
  | "rechazada"
  | "revision_requerida";

export type BiometricProviderId = "didit" | "valida" | "sandbox";

export type ConsultanteRiskReasonCode =
  | "indicio_suplantacion"
  | "inconsistencia_datos"
  | "operacion_riesgo"
  | "recuperacion_sospechosa"
  | "alerta_seguridad";

export interface BiometricTechnicalResult {
  dniFrontCaptured: boolean;
  dniBackCaptured: boolean;
  selfieCaptured: boolean;
  livenessPassed: boolean;
  facialMatchScore: number; // 0 to 100
  renaperChecked: boolean;
  renaperStatus: "validado" | "no_disponible" | "inconsistente";
  providerReference: string;
  serverSignature?: string;
}

export interface BiometricAuditEvent {
  id: string;
  timestamp: string;
  previousStatus: BiometricVerificationStatus | null;
  newStatus: BiometricVerificationStatus;
  actor: "user" | "provider_api" | "webhook" | "admin" | "risk_engine";
  summary: string;
}

export interface BiometricVerificationRecord {
  userId: string;
  provider: BiometricProviderId;
  externalOperationId: string | null;
  status: BiometricVerificationStatus;
  startedAt: string | null;
  resolvedAt: string | null;
  expiresAt: string | null;
  technicalResult: BiometricTechnicalResult | null;
  rejectionOrReviewReason: string | null;
  attemptsCount: number;
  consentAcceptedAt: string | null;
  riskFlags?: ConsultanteRiskReasonCode[];
  accessibilityAlternativeRequested?: boolean;
  events: BiometricAuditEvent[];
}

export const MAX_BIOMETRIC_ATTEMPTS = 5;

export const BIOMETRIC_PROVIDER_CATALOG: Record<
  BiometricProviderId,
  {
    id: BiometricProviderId;
    name: string;
    supportsDniArgentino: boolean;
    supportsLiveness: boolean;
    supportsRenaper: boolean;
    environmentLabel: string;
  }
> = {
  sandbox: {
    id: "sandbox",
    name: "Proveedor Biométrico (Entorno de Pruebas Reiki Online)",
    supportsDniArgentino: true,
    supportsLiveness: true,
    supportsRenaper: true,
    environmentLabel: "Entorno de Pruebas (Sin costo)",
  },
  didit: {
    id: "didit",
    name: "Didit Identity Verification API",
    supportsDniArgentino: true,
    supportsLiveness: true,
    supportsRenaper: true,
    environmentLabel: "API Externa • Didit",
  },
  valida: {
    id: "valida",
    name: "Valida Identidad + RENAPER Argentina",
    supportsDniArgentino: true,
    supportsLiveness: true,
    supportsRenaper: true,
    environmentLabel: "API Externa • Valida / RENAPER",
  },
};

export const CONSULTANTE_RISK_DESCRIPTIONS: Record<
  ConsultanteRiskReasonCode,
  string
> = {
  indicio_suplantacion:
    "Se detectaron indicios de posible suplantación de identidad en la cuenta.",
  inconsistencia_datos:
    "Existen inconsistencias relevantes en los datos declarados que requieren validación documental.",
  operacion_riesgo:
    "Se registró una operación inusual que requiere confirmar la titularidad por seguridad.",
  recuperacion_sospechosa:
    "Se detectaron intentos reiterados o inusuales de recuperación de cuenta.",
  alerta_seguridad:
    "Alerta preventiva de seguridad activada para proteger tu cuenta.",
};

export function createInitialBiometricRecord(
  userId: string,
  preverified = false
): BiometricVerificationRecord {
  const now = "2026-11-01T14:30:00.000Z";
  if (preverified) {
    return {
      userId,
      provider: "sandbox",
      externalOperationId: `op-ro-${userId}`,
      status: "verificada",
      startedAt: now,
      resolvedAt: now,
      expiresAt: "2027-11-01T14:30:00.000Z",
      technicalResult: {
        dniFrontCaptured: true,
        dniBackCaptured: true,
        selfieCaptured: true,
        livenessPassed: true,
        facialMatchScore: 99.2,
        renaperChecked: true,
        renaperStatus: "validado",
        providerReference: `RENAPER-OK-${userId.toUpperCase()}`,
        serverSignature: `verified-srv-${userId}`,
      },
      rejectionOrReviewReason: null,
      attemptsCount: 1,
      consentAcceptedAt: now,
      riskFlags: [],
      events: [
        {
          id: `evt-init-${userId}`,
          timestamp: now,
          previousStatus: "no_iniciada",
          newStatus: "verificada",
          actor: "provider_api",
          summary:
            "Identidad biométrica verificada (DNI frente/dorso + prueba de vida + cruce RENAPER).",
        },
      ],
    };
  }

  return {
    userId,
    provider: "sandbox",
    externalOperationId: null,
    status: "no_iniciada",
    startedAt: null,
    resolvedAt: null,
    expiresAt: null,
    technicalResult: null,
    rejectionOrReviewReason: null,
    attemptsCount: 0,
    consentAcceptedAt: null,
    riskFlags: [],
    events: [],
  };
}

/**
 * Comprueba si la verificación biométrica del usuario está en estado "verificada",
 * cuenta con resultado técnico firmado por el backend y continúa vigente.
 */
export function isBiometricVerifiedAndValid(
  record?: BiometricVerificationRecord | null
): boolean {
  if (!record) return false;
  if (record.status !== "verificada") return false;
  if (!record.technicalResult?.serverSignature) return false;
  if (record.expiresAt) {
    const expTime = new Date(record.expiresAt).getTime();
    if (Number.isFinite(expTime) && expTime < Date.now()) {
      return false;
    }
  }
  return true;
}

/**
 * Evaluación objetiva y proporcional de riesgo para Consultantes (Sección 4).
 * Por regla general, los consultantes NO requieren verificación biométrica al registrarse,
 * salvo cuando existan indicadores objetivos de riesgo.
 */
export function evaluateConsultanteBiometricRisk(params: {
  record?: BiometricVerificationRecord | null;
  dni?: string;
}): {
  requiresBiometric: boolean;
  reasons: string[];
  codes: ConsultanteRiskReasonCode[];
} {
  const codes: ConsultanteRiskReasonCode[] = [
    ...(params.record?.riskFlags || []),
  ];

  // Si ya está verificada y vigente, no bloquear
  if (isBiometricVerifiedAndValid(params.record)) {
    return { requiresBiometric: false, reasons: [], codes: [] };
  }

  // Criterio objetivo adicional: DNI con formato manifiestamente inválido/repetitivo de prueba fraudulenta (ej. "00000000" o "11111111")
  const cleanDni = (params.dni || "").replace(/\D/g, "");
  if (cleanDni.length > 0 && /^(\d)\1{6,8}$/.test(cleanDni)) {
    if (!codes.includes("inconsistencia_datos")) {
      codes.push("inconsistencia_datos");
    }
  }

  const reasons = codes.map((c) => CONSULTANTE_RISK_DESCRIPTIONS[c]);
  return {
    requiresBiometric: codes.length > 0,
    reasons,
    codes,
  };
}

export function getBiometricStatusMeta(status: BiometricVerificationStatus): {
  label: string;
  badgeText: string;
  colorClass: string;
  description: string;
} {
  switch (status) {
    case "verificada":
      return {
        label: "Verificada",
        badgeText: "✓ Identidad verificada",
        colorClass: "border-emerald-300 bg-emerald-50 text-emerald-900",
        description:
          "Tu identidad biométrica fue validada con éxito (DNI frente y dorso, selfie con prueba de vida y contraste documental).",
      };
    case "pendiente":
      return {
        label: "Pendiente de validación",
        badgeText: "Verificación en proceso",
        colorClass: "border-amber-300 bg-amber-50 text-amber-900",
        description:
          "Tu verificación biométrica está siendo procesada por el proveedor especializado. Podés completar los datos de Mi Perfil, pero la publicación de servicios como terapeuta se habilitará al aprobarse.",
      };
    case "rechazada":
      return {
        label: "Rechazada",
        badgeText: "Verificación rechazada",
        colorClass: "border-red-300 bg-red-50 text-red-900",
        description:
          "No pudimos validar tu identidad en este intento. Revisá las condiciones de iluminación y legibilidad de tu DNI o solicitá asistencia.",
      };
    case "revision_requerida":
      return {
        label: "Revisión requerida",
        badgeText: "Revisión manual requerida",
        colorClass: "border-purple-300 bg-[#F4F0FA] text-[#2B1F42]",
        description:
          "Tu solicitud requiere una validación adicional asistida para confirmar los datos documentales.",
      };
    case "no_iniciada":
    default:
      return {
        label: "No iniciada",
        badgeText: "Identidad sin verificar",
        colorClass: "border-[#836DAD]/35 bg-[#FAF8FC] text-[#2B1F42]",
        description:
          "Todo usuario que desee ofrecer servicios como Terapeuta debe completar la verificación de identidad biométrica (frente y dorso del DNI + selfie con prueba de vida).",
      };
  }
}
