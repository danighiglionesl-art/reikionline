// ============================================================================
// REIKI ONLINE — MÓDULO «MIS CAPACITACIONES» Y «ACADEMIA REIKI ONLINE»
// ============================================================================

import {
  calculateSplitAmounts,
  ImmutableCommissionSnapshot,
  loadCommissionConfig,
  loadMpTransactions,
  resolveTrainingCommission,
  saveMpTransactions,
  SplitPaymentTransaction,
} from "@/lib/mercadoPagoSplit";

export type TrainingLevel = "Inicial" | "Intermedio" | "Avanzado";

export type TrainingStatus =
  | "borrador"
  | "publicada"
  | "en_curso"
  | "finalizada"
  | "cancelada"
  | "suspendida_admin";

export type TrainingModality =
  | "Online en vivo (Daily.co)"
  | "Online intensivo en vivo"
  | "Ciclo de formación online";

export type CertificateType =
  | "sin_certificado"
  | "participacion"
  | "aprobacion";

export type MaterialFormat =
  | "pdf"
  | "lectura"
  | "imagen"
  | "complementario"
  | "grabacion";

export interface TrainingMaterialItem {
  id: string;
  title: string;
  format: MaterialFormat;
  description: string;
  urlOrContent: string;
  addedAt: string;
  requiresRecordingConsent?: boolean;
}

export interface TrainingClassSession {
  id: string;
  classNumber: number;
  title: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  durationMinutes: number;
  status: "programada" | "en_vivo" | "finalizada" | "reprogramada";
  roomSlug: string;
  recordingEnabled: boolean;
  recordingConsentConfirmed: boolean;
  recordingUrl?: string;
}

export interface TrainingCourse {
  id: string;
  title: string;
  discipline: string;
  description: string;
  objectives: string;
  syllabus: string;
  level: TrainingLevel;
  modality: TrainingModality;
  startDate: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  durationHoursTotal: number;
  sessionsCount: number;
  sessions: TrainingClassSession[];
  maxQuota: number;
  enrolledCount: number;
  isFree: boolean;
  priceArs: number;
  coverImageUrl: string;
  prerequisites: string;
  materialsIncludedSummary: string;
  materials: TrainingMaterialItem[];
  certificateType: CertificateType;
  status: TrainingStatus;
  // Datos del Terapeuta organizador (mantiene el rol único «Terapeuta»)
  therapistEmail: string;
  therapistName: string;
  therapistNickname: string;
  therapistPhotoUrl?: string;
  therapistBiometricVerified: boolean;
  additionalDocumentationRef?: string;
  moderationNote?: string;
  promoSlug?: string;
  createdAt: string;
  updatedAt: string;
}

export type EnrollmentPaymentStatus =
  | "gratuito"
  | "aprobado"
  | "pendiente"
  | "reembolsado"
  | "cancelado";

export interface TrainingEnrollment {
  id: string;
  trainingId: string;
  trainingTitle: string;
  discipline: string;
  therapistEmail: string;
  therapistName: string;
  therapistNickname: string;
  // Datos del alumno (puede ser Consultante o Terapeuta aprendiendo de otro colega)
  studentEmail: string;
  studentName: string;
  studentNickname: string;
  studentRoleAtEnrollment: "Consultante" | "Terapeuta";
  status: "confirmada" | "cancelada_alumno" | "cancelada_terapeuta";
  paymentStatus: EnrollmentPaymentStatus;
  pricePaidArs: number;
  marketplaceFeeArs: number;
  therapistGrossShareArs: number;
  therapistNetShareArs: number;
  commissionSnapshot: ImmutableCommissionSnapshot;
  mpTransactionId?: string;
  recordingConsentAccepted: boolean;
  attendedSessionIds: string[];
  certificateId?: string;
  enrolledAt: string;
  updatedAt: string;
}

export interface TrainingCertificate {
  id: string;
  verificationCode: string;
  trainingId: string;
  trainingTitle: string;
  discipline: string;
  certificateType: "participacion" | "aprobacion";
  studentEmail: string;
  studentName: string;
  studentNickname: string;
  therapistName: string;
  therapistNickname: string;
  durationHours: number;
  issuedAt: string;
}

export type TrainingNotificationEvent =
  | "confirmacion_inscripcion"
  | "confirmacion_pago"
  | "recordatorio_capacitacion"
  | "aviso_inicio_clase"
  | "modificacion_horarios"
  | "cancelacion"
  | "disponibilidad_materiales"
  | "disponibilidad_certificados";

export interface TrainingNotificationRecord {
  id: string;
  event: TrainingNotificationEvent;
  trainingId: string;
  trainingTitle: string;
  recipientEmail: string;
  recipientName: string;
  channels: Array<"email" | "whatsapp">;
  subject: string;
  message: string;
  sentAt: string;
  read: boolean;
}

export const TRAININGS_STORAGE_KEY = "reiki_online_trainings_catalog_v1";
export const TRAINING_ENROLLMENTS_STORAGE_KEY =
  "reiki_online_training_enrollments_v1";
export const TRAINING_CERTIFICATES_STORAGE_KEY =
  "reiki_online_training_certificates_v1";
export const TRAINING_NOTIFICATIONS_STORAGE_KEY =
  "reiki_online_training_notifications_v1";
export const TRAININGS_SYNC_EVENT = "reiki-online-trainings-sync";

export const EVENT_LABELS: Record<TrainingNotificationEvent, string> = {
  confirmacion_inscripcion: "Confirmación de inscripción",
  confirmacion_pago: "Confirmación de pago",
  recordatorio_capacitacion: "Recordatorio de capacitación",
  aviso_inicio_clase: "Aviso de inicio de clase",
  modificacion_horarios: "Modificación de horarios",
  cancelacion: "Cancelación de capacitación",
  disponibilidad_materiales: "Disponibilidad de materiales",
  disponibilidad_certificados: "Disponibilidad de certificados",
};

export const INITIAL_SEED_TRAININGS: TrainingCourse[] = [
  {
    id: "cap-reiki-usui-1",
    title: "Formación Integral en Reiki Usui Nivel I (Shoden)",
    discipline: "Reiki Usui",
    description:
      "Capacitación teórico-práctica online en vivo para aprender la canalización de energía vital universal, autotratamiento diario, armonización de centros energéticos y principios tradicionales del método Usui.",
    objectives:
      "Comprender los fundamentos del Reiki Usui, aplicar el protocolo completo de autotratamiento y realizar sesiones iniciales de armonización energética con ética y cuidado consciente.",
    syllabus:
      "Módulo 1: Historia del Reiki Usui y los 5 Principios (Gokai).\nMódulo 2: Anatomía sutil y los 7 chakras principales.\nMódulo 3: Posiciones de manos para autotratamiento y sesión a terceros.\nMódulo 4: Sintonización online asistida y práctica supervisada en sala.",
    level: "Inicial",
    modality: "Online en vivo (Daily.co)",
    startDate: "2026-11-18",
    startTime: "19:00",
    durationHoursTotal: 8,
    sessionsCount: 4,
    sessions: [
      {
        id: "ses-usui-1",
        classNumber: 1,
        title: "Encuentro 1: Fundamentos, Gokai y Canalización Energética",
        date: "2026-11-18",
        time: "19:00",
        durationMinutes: 120,
        status: "programada",
        roomSlug: "cap-reiki-usui-1-clase-1",
        recordingEnabled: true,
        recordingConsentConfirmed: true,
      },
      {
        id: "ses-usui-2",
        classNumber: 2,
        title: "Encuentro 2: Sistema de Chakras y Autotratamiento",
        date: "2026-11-25",
        time: "19:00",
        durationMinutes: 120,
        status: "programada",
        roomSlug: "cap-reiki-usui-1-clase-2",
        recordingEnabled: true,
        recordingConsentConfirmed: true,
      },
      {
        id: "ses-usui-3",
        classNumber: 3,
        title: "Encuentro 3: Posiciones en Sesión y Armonización Integral",
        date: "2026-12-02",
        time: "19:00",
        durationMinutes: 120,
        status: "programada",
        roomSlug: "cap-reiki-usui-1-clase-3",
        recordingEnabled: true,
        recordingConsentConfirmed: true,
      },
      {
        id: "ses-usui-4",
        classNumber: 4,
        title: "Encuentro 4: Sintonización e Integración Práctica",
        date: "2026-12-09",
        time: "19:00",
        durationMinutes: 120,
        status: "programada",
        roomSlug: "cap-reiki-usui-1-clase-4",
        recordingEnabled: true,
        recordingConsentConfirmed: true,
      },
    ],
    maxQuota: 20,
    enrolledCount: 2,
    isFree: false,
    priceArs: 45000,
    coverImageUrl:
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
    prerequisites: "No requiere conocimientos previos.",
    materialsIncludedSummary:
      "Manual completo en PDF, láminas de posiciones de manos, guía de meditación Gassho y acceso a grabaciones autorizadas.",
    materials: [
      {
        id: "mat-usui-pdf-1",
        title: "Manual Oficial Reiki Usui Nivel I (Shoden) — PDF",
        format: "pdf",
        description:
          "Guía ilustrada de 42 páginas con historia, principios y posiciones de manos.",
        urlOrContent:
          "Documento PDF verificado en Academia Reiki Online: Manual Shoden Nivel I (42 págs.).",
        addedAt: "2026-11-01T10:00:00.000Z",
      },
      {
        id: "mat-usui-img-1",
        title: "Mapa de los 7 Chakras y Posiciones de Autotratamiento",
        format: "imagen",
        description: "Lámina visual de alta resolución para práctica diaria.",
        urlOrContent:
          "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=900&q=80",
        addedAt: "2026-11-01T10:05:00.000Z",
      },
    ],
    certificateType: "aprobacion",
    status: "publicada",
    therapistEmail: "danighiglione@gmail.com",
    therapistName: "Daniel Alejandro Ghiglione",
    therapistNickname: "danielghiglione",
    therapistPhotoUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    therapistBiometricVerified: true,
    additionalDocumentationRef: "Maestría Reiki Usui Verificada — Reg. RO-001",
    createdAt: "2026-11-01T10:00:00.000Z",
    updatedAt: "2026-11-01T10:00:00.000Z",
  },
  {
    id: "cap-mindfulness-chakras-2",
    title: "Taller Práctico de Meditación Mindfulness y Armonización de Chakras",
    discipline: "Meditación mindfulness",
    description:
      "Encuentro intensivo de respiración consciente, presencia plena y desbloqueo energético para integrar en la vida cotidiana o complementar el acompañamiento holístico.",
    objectives:
      "Incorporar técnicas de regulación emocional mediante respiración consciente y escaneo energético de los centros vitales.",
    syllabus:
      "1. Atención plena y anclaje respiratorio.\n2. Reconocimiento de tensiones bioenergéticas.\n3. Meditación guiada por los 7 centros de energía.\n4. Espacio de preguntas e integración grupal.",
    level: "Inicial",
    modality: "Online intensivo en vivo",
    startDate: "2026-11-21",
    startTime: "18:30",
    durationHoursTotal: 3,
    sessionsCount: 1,
    sessions: [
      {
        id: "ses-mind-1",
        classNumber: 1,
        title: "Clase Única Intensiva en Vivo: Respiración y Chakras",
        date: "2026-11-21",
        time: "18:30",
        durationMinutes: 180,
        status: "programada",
        roomSlug: "cap-mindfulness-chakras-2-clase-1",
        recordingEnabled: true,
        recordingConsentConfirmed: true,
      },
    ],
    maxQuota: 30,
    enrolledCount: 1,
    isFree: true,
    priceArs: 0,
    coverImageUrl:
      "https://images.unsplash.com/photo-1528319725582-ddc096101511?auto=format&fit=crop&w=900&q=80",
    prerequisites: "Abierto a toda la comunidad de Reiki Online.",
    materialsIncludedSummary:
      "Guía de lectura sobre Mindfulness diario y audio/guía de ejercicios respiratorios.",
    materials: [
      {
        id: "mat-mind-lectura-1",
        title: "Guía de Lectura: Práctica de 10 minutos diarios de Atención Plena",
        format: "lectura",
        description: "Protocolo paso a paso para sostener el hábito meditativo.",
        urlOrContent:
          "Lectura formativa Academia Reiki Online: Respiración 4-4-6, observación sin juicio y cierre en gratitud.",
        addedAt: "2026-11-01T12:00:00.000Z",
      },
    ],
    certificateType: "participacion",
    status: "publicada",
    therapistEmail: "valeria.mendez@reikionline.com.ar",
    therapistName: "Valeria Méndez",
    therapistNickname: "valeriamendez",
    therapistPhotoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    therapistBiometricVerified: true,
    additionalDocumentationRef: "Instructora en Mindfulness y Reiki Karuna",
    createdAt: "2026-11-01T12:00:00.000Z",
    updatedAt: "2026-11-01T12:00:00.000Z",
  },
  {
    id: "cap-radiestesia-pendulo-3",
    title: "Especialización en Radiestesia, Péndulo Hebreo y Limpieza Energética",
    discipline: "Radiestesia",
    description:
      "Capacitación de nivel intermedio para terapeutas y consultantes avanzados en el uso de gráficos radiestésicos, diagnóstico vibracional y armonización de ambientes.",
    objectives:
      "Dominar la calibración del péndulo, lectura de biómetros y aplicación de etiquetas de armonización vibracional.",
    syllabus:
      "Encuentro 1: Convención mental, calibración y ética radiestésica.\nEncuentro 2: Uso del Péndulo Hebreo y detección de miasmas/bloqueos.\nEncuentro 3: Armonización de espacios y casos prácticos en vivo.",
    level: "Intermedio",
    modality: "Ciclo de formación online",
    startDate: "2026-11-24",
    startTime: "20:00",
    durationHoursTotal: 6,
    sessionsCount: 3,
    sessions: [
      {
        id: "ses-rad-1",
        classNumber: 1,
        title: "Encuentro 1: Calibración y Biómetros Radiestésicos",
        date: "2026-11-24",
        time: "20:00",
        durationMinutes: 120,
        status: "programada",
        roomSlug: "cap-radiestesia-3-clase-1",
        recordingEnabled: true,
        recordingConsentConfirmed: true,
      },
      {
        id: "ses-rad-2",
        classNumber: 2,
        title: "Encuentro 2: Protocolo de Péndulo Hebreo",
        date: "2026-12-01",
        time: "20:00",
        durationMinutes: 120,
        status: "programada",
        roomSlug: "cap-radiestesia-3-clase-2",
        recordingEnabled: true,
        recordingConsentConfirmed: true,
      },
      {
        id: "ses-rad-3",
        classNumber: 3,
        title: "Encuentro 3: Limpieza de Ambientes y Práctica",
        date: "2026-12-08",
        time: "20:00",
        durationMinutes: 120,
        status: "programada",
        roomSlug: "cap-radiestesia-3-clase-3",
        recordingEnabled: true,
        recordingConsentConfirmed: true,
      },
    ],
    maxQuota: 15,
    enrolledCount: 1,
    isFree: false,
    priceArs: 38000,
    coverImageUrl:
      "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=900&q=80",
    prerequisites: "Se recomienda contar con péndulo para las prácticas.",
    materialsIncludedSummary:
      "Plantillas imprimibles de biómetros en PDF, etiquetas en alta definición y grabación de cada encuentro.",
    materials: [
      {
        id: "mat-rad-pdf-1",
        title: "Dossier de Gráficos Radiestésicos y Etiquetas (PDF)",
        format: "pdf",
        description: "Colección de 18 gráficos listos para imprimir en A4.",
        urlOrContent:
          "Dossier PDF Oficial Academia Reiki Online: 18 Biómetros y Etiquetas de Péndulo Hebreo.",
        addedAt: "2026-11-02T09:00:00.000Z",
      },
    ],
    certificateType: "aprobacion",
    status: "publicada",
    therapistEmail: "martin.arrieta@reikionline.com.ar",
    therapistName: "Martín Arrieta",
    therapistNickname: "martinarrieta",
    therapistPhotoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    therapistBiometricVerified: true,
    additionalDocumentationRef: "Especialista en Radiestesia y Bioenergética",
    createdAt: "2026-11-02T09:00:00.000Z",
    updatedAt: "2026-11-02T09:00:00.000Z",
  },
];

function emitTrainingsSync(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(TRAININGS_SYNC_EVENT));
  }
}

export function loadTrainingsCatalog(): TrainingCourse[] {
  if (typeof window === "undefined") return INITIAL_SEED_TRAININGS;
  try {
    const raw = window.localStorage.getItem(TRAININGS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TrainingCourse[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    window.localStorage.setItem(
      TRAININGS_STORAGE_KEY,
      JSON.stringify(INITIAL_SEED_TRAININGS)
    );
  } catch {
    // Ignore
  }
  return INITIAL_SEED_TRAININGS;
}

export function saveTrainingsCatalog(list: TrainingCourse[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TRAININGS_STORAGE_KEY, JSON.stringify(list));
    emitTrainingsSync();
  } catch {
    // Ignore
  }
}

export function loadTrainingEnrollments(): TrainingEnrollment[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_ENROLLMENTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TrainingEnrollment[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

export function saveTrainingEnrollments(list: TrainingEnrollment[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TRAINING_ENROLLMENTS_STORAGE_KEY,
      JSON.stringify(list)
    );
    emitTrainingsSync();
  } catch {
    // Ignore
  }
}

export function loadTrainingCertificates(): TrainingCertificate[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_CERTIFICATES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TrainingCertificate[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

export function saveTrainingCertificates(list: TrainingCertificate[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TRAINING_CERTIFICATES_STORAGE_KEY,
      JSON.stringify(list)
    );
    emitTrainingsSync();
  } catch {
    // Ignore
  }
}

export function loadTrainingNotifications(): TrainingNotificationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(TRAINING_NOTIFICATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TrainingNotificationRecord[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore
  }
  return [];
}

export function saveTrainingNotifications(
  list: TrainingNotificationRecord[]
): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      TRAINING_NOTIFICATIONS_STORAGE_KEY,
      JSON.stringify(list)
    );
    emitTrainingsSync();
  } catch {
    // Ignore
  }
}

/**
 * Emite una notificación automática por Correo Electrónico y WhatsApp (cuando está autorizado)
 * sin requerir intervención manual del administrador.
 */
export function dispatchTrainingNotification(params: {
  event: TrainingNotificationEvent;
  trainingId: string;
  trainingTitle: string;
  recipientEmail: string;
  recipientName: string;
  subject: string;
  message: string;
  includeWhatsApp?: boolean;
}): TrainingNotificationRecord {
  const existing = loadTrainingNotifications();
  const record: TrainingNotificationRecord = {
    id: `notif-cap-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    event: params.event,
    trainingId: params.trainingId,
    trainingTitle: params.trainingTitle,
    recipientEmail: params.recipientEmail,
    recipientName: params.recipientName,
    channels:
      params.includeWhatsApp !== false ? ["email", "whatsapp"] : ["email"],
    subject: params.subject,
    message: params.message,
    sentAt: new Date().toISOString(),
    read: false,
  };
  saveTrainingNotifications([record, ...existing]);
  return record;
}

/**
 * Inscribe a un usuario (Consultante o Terapeuta actuando como alumno) en una capacitación,
 * verificando cupos disponibles, evitando duplicación de inscripciones y registrando el pago
 * con comisión independiente de capacitaciones en Mercado Pago Split 1:1.
 */
export function enrollStudentInTraining(params: {
  training: TrainingCourse;
  studentEmail: string;
  studentName: string;
  studentNickname: string;
  studentRole: "Consultante" | "Terapeuta";
  recordingConsentAccepted: boolean;
  mpPreferenceId?: string;
  mpPaymentId?: string;
}): {
  ok: boolean;
  error?: string;
  enrollment?: TrainingEnrollment;
} {
  const catalog = loadTrainingsCatalog();
  const currentCourse =
    catalog.find((c) => c.id === params.training.id) || params.training;

  if (
    currentCourse.status === "cancelada" ||
    currentCourse.status === "suspendida_admin" ||
    currentCourse.status === "finalizada"
  ) {
    return {
      ok: false,
      error: "Esta capacitación no se encuentra abierta para nuevas inscripciones.",
    };
  }

  const enrollments = loadTrainingEnrollments();
  const cleanStudentEmail = params.studentEmail.trim().toLowerCase();

  // Evitar duplicación de inscripciones o cobros
  const alreadyEnrolled = enrollments.find(
    (e) =>
      e.trainingId === currentCourse.id &&
      e.studentEmail.trim().toLowerCase() === cleanStudentEmail &&
      e.status === "confirmada"
  );
  if (alreadyEnrolled) {
    return {
      ok: false,
      error: "Ya te encontrás inscripto en esta capacitación.",
      enrollment: alreadyEnrolled,
    };
  }

  // Verificar cupos disponibles (evitar sobreventa de cupos)
  const activeEnrollmentsForCourse = enrollments.filter(
    (e) => e.trainingId === currentCourse.id && e.status === "confirmada"
  ).length;
  const effectiveOccupied = Math.max(
    currentCourse.enrolledCount,
    activeEnrollmentsForCourse
  );
  if (effectiveOccupied >= currentCourse.maxQuota) {
    return {
      ok: false,
      error: "No quedan cupos disponibles para esta capacitación.",
    };
  }

  const commissionConfig = loadCommissionConfig();
  const commissionSnapshot = resolveTrainingCommission(
    commissionConfig,
    currentCourse.therapistEmail,
    currentCourse.therapistNickname
  );

  const priceArs = currentCourse.isFree ? 0 : Math.max(0, currentCourse.priceArs);
  const split = calculateSplitAmounts(
    priceArs,
    commissionSnapshot.appliedPercentage
  );

  const nowIso = new Date().toISOString();
  const enrollmentId = `ins-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;

  let mpTransactionId: string | undefined;
  if (!currentCourse.isFree && priceArs > 0) {
    mpTransactionId = `TX-CAP-${Date.now()}`;
    const mpTx: SplitPaymentTransaction = {
      id: mpTransactionId,
      idempotencyKey: `idem-cap-${currentCourse.id}-${cleanStudentEmail}`,
      reservationId: enrollmentId,
      preferenceId: params.mpPreferenceId || `PREF-CAP-${Date.now()}`,
      mpPaymentId: params.mpPaymentId || `MP-PAY-CAP-${Date.now()}`,
      integrationMode: "checkout_pro",
      consultanteId: cleanStudentEmail,
      consultanteName: params.studentName,
      consultanteEmail: cleanStudentEmail,
      therapistId: currentCourse.therapistEmail,
      therapistName: currentCourse.therapistName,
      therapistNickname: currentCourse.therapistNickname,
      therapistMpUserId: "3211430751",
      therapyName: `Capacitación: ${currentCourse.title}`,
      attentionModality: "distancia_con_video",
      bookingTiming: "con_turno",
      scheduledSlotLabel: `${currentCourse.startDate} ${currentCourse.startTime} hs (${currentCourse.sessionsCount} encuentro/s)`,
      sessionPriceArs: split.sessionPriceArs,
      marketplaceFeeArs: split.marketplaceFeeArs,
      therapistGrossShareArs: split.therapistGrossShareArs,
      mpProcessorFeeArs: split.mpProcessorFeeArs,
      therapistNetShareArs: split.therapistNetShareArs,
      commissionSnapshot,
      status: "approved",
      sessionConfirmed: true,
      reservationExpiresAt: nowIso,
      approvedAfterExpiration: false,
      reconciliationRequired: false,
      cancellationCategory: "none",
      reikiCommissionFirm: true,
      refundRequested: false,
      refundStatus: "none",
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    const allTx = loadMpTransactions();
    saveMpTransactions([mpTx, ...allTx]);
  }

  const newEnrollment: TrainingEnrollment = {
    id: enrollmentId,
    trainingId: currentCourse.id,
    trainingTitle: currentCourse.title,
    discipline: currentCourse.discipline,
    therapistEmail: currentCourse.therapistEmail,
    therapistName: currentCourse.therapistName,
    therapistNickname: currentCourse.therapistNickname,
    studentEmail: cleanStudentEmail,
    studentName: params.studentName,
    studentNickname: params.studentNickname,
    studentRoleAtEnrollment: params.studentRole,
    status: "confirmada",
    paymentStatus: currentCourse.isFree ? "gratuito" : "aprobado",
    pricePaidArs: split.sessionPriceArs,
    marketplaceFeeArs: split.marketplaceFeeArs,
    therapistGrossShareArs: split.therapistGrossShareArs,
    therapistNetShareArs: split.therapistNetShareArs,
    commissionSnapshot,
    mpTransactionId,
    recordingConsentAccepted: params.recordingConsentAccepted,
    attendedSessionIds: [],
    enrolledAt: nowIso,
    updatedAt: nowIso,
  };

  saveTrainingEnrollments([newEnrollment, ...enrollments]);

  // Actualizar cupo ocupado en el catálogo
  const updatedCatalog = catalog.map((c) =>
    c.id === currentCourse.id
      ? {
          ...c,
          enrolledCount: Math.min(c.maxQuota, c.enrolledCount + 1),
          updatedAt: nowIso,
        }
      : c
  );
  saveTrainingsCatalog(updatedCatalog);

  // Disparar notificaciones automáticas (Confirmación de inscripción + Confirmación de pago)
  dispatchTrainingNotification({
    event: "confirmacion_inscripcion",
    trainingId: currentCourse.id,
    trainingTitle: currentCourse.title,
    recipientEmail: cleanStudentEmail,
    recipientName: params.studentName,
    subject: `Inscripción confirmada: ${currentCourse.title}`,
    message: `Hola ${params.studentName}, tu inscripción a «${currentCourse.title}» dictada por ${currentCourse.therapistName} quedó confirmada. Inicio: ${currentCourse.startDate} a las ${currentCourse.startTime} hs. Ya tenés habilitado el acceso a la sala online y materiales desde «Mis Capacitaciones».`,
  });

  if (!currentCourse.isFree && priceArs > 0) {
    dispatchTrainingNotification({
      event: "confirmacion_pago",
      trainingId: currentCourse.id,
      trainingTitle: currentCourse.title,
      recipientEmail: cleanStudentEmail,
      recipientName: params.studentName,
      subject: `Pago acreditado Mercado Pago: ${currentCourse.title}`,
      message: `Confirmamos el pago de $${priceArs.toLocaleString("es-AR")} ARS por Mercado Pago para la capacitación «${currentCourse.title}». Cupo reservado y habilitado.`,
    });
  }

  return {
    ok: true,
    enrollment: newEnrollment,
  };
}

/**
 * Emite el certificado digital privado de participación o aprobación
 * con código único de verificación verificable en Reiki Online.
 */
export function issueTrainingCertificate(params: {
  enrollmentId: string;
  training: TrainingCourse;
}): TrainingCertificate | null {
  if (params.training.certificateType === "sin_certificado") return null;

  const enrollments = loadTrainingEnrollments();
  const target = enrollments.find((e) => e.id === params.enrollmentId);
  if (!target) return null;

  const existingCerts = loadTrainingCertificates();
  if (target.certificateId) {
    const found = existingCerts.find((c) => c.id === target.certificateId);
    if (found) return found;
  }

  const nowIso = new Date().toISOString();
  const codeSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
  const cert: TrainingCertificate = {
    id: `cert-${Date.now()}-${codeSuffix}`,
    verificationCode: `RO-CERT-${new Date().getFullYear()}-${codeSuffix}`,
    trainingId: params.training.id,
    trainingTitle: params.training.title,
    discipline: params.training.discipline,
    certificateType: params.training.certificateType,
    studentEmail: target.studentEmail,
    studentName: target.studentName,
    studentNickname: target.studentNickname,
    therapistName: params.training.therapistName,
    therapistNickname: params.training.therapistNickname,
    durationHours: params.training.durationHoursTotal,
    issuedAt: nowIso,
  };

  saveTrainingCertificates([cert, ...existingCerts]);

  const updatedEnrollments = enrollments.map((e) =>
    e.id === target.id
      ? { ...e, certificateId: cert.id, updatedAt: nowIso }
      : e
  );
  saveTrainingEnrollments(updatedEnrollments);

  dispatchTrainingNotification({
    event: "disponibilidad_certificados",
    trainingId: params.training.id,
    trainingTitle: params.training.title,
    recipientEmail: target.studentEmail,
    recipientName: target.studentName,
    subject: `Certificado disponible: ${params.training.title}`,
    message: `Hola ${target.studentName}, ya está disponible tu certificado digital de ${
      cert.certificateType === "aprobacion" ? "aprobación" : "participación"
    } de «${params.training.title}» (Código de verificación: ${
      cert.verificationCode
    }). Podés visualizarlo y descargarlo en «Mis Capacitaciones».`,
  });

  return cert;
}

/**
 * Genera un slug limpio para promocionar una capacitación en Reiki Online.
 */
export function buildTrainingSlug(title: string, fallbackId?: string): string {
  const normalized = (title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48)
    .replace(/-+$/g, "");
  if (normalized.length >= 3) {
    return normalized;
  }
  return (fallbackId || "capacitacion-reiki").toLowerCase();
}

export function getTrainingPromoSlug(course: {
  id?: string;
  title?: string;
  promoSlug?: string;
}): string {
  if (course.promoSlug && course.promoSlug.trim()) {
    return buildTrainingSlug(course.promoSlug.trim(), course.id);
  }
  if (course.id && course.id.startsWith("cap-")) {
    return course.id;
  }
  return buildTrainingSlug(course.title || "", course.id);
}

export function getTrainingPromoUrl(course: {
  id?: string;
  title?: string;
  promoSlug?: string;
}): string {
  const slug = getTrainingPromoSlug(course);
  return `https://www.reikionline.com.ar/capacitaciones/${slug}`;
}

export function getTrainingDisplayUrl(course: {
  id?: string;
  title?: string;
  promoSlug?: string;
}): string {
  const slug = getTrainingPromoSlug(course);
  return `www.reikionline.com.ar/capacitaciones/${slug}`;
}

export function findTrainingBySlugOrId(
  slugOrId: string,
  catalogInput?: TrainingCourse[]
): TrainingCourse | undefined {
  const catalog = catalogInput || loadTrainingsCatalog();
  const clean = decodeURIComponent(slugOrId || "").trim().toLowerCase();
  if (!clean) return undefined;
  return catalog.find(
    (c) =>
      c.id.toLowerCase() === clean ||
      (c.promoSlug || "").toLowerCase() === clean ||
      getTrainingPromoSlug(c).toLowerCase() === clean ||
      buildTrainingSlug(c.title, c.id).toLowerCase() === clean
  );
}

