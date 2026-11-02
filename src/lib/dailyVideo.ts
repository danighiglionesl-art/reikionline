// ============================================================================
// REIKI ONLINE — SALAS DE VIDEOLLAMADA PRIVADAS 1:1 (INTEGRACIÓN DAILY.CO)
// ============================================================================

import {
  loadConsultations,
  ReikiConsultationRecord,
  saveConsultations,
  SYNC_EVENT_NAME,
} from "@/lib/socialNetwork";
import { sanitizeNickname } from "@/lib/geoData";

export type VideoSessionModality = "Online con turno" | "Online ahora";

export interface DailyVideoRoomRecord {
  sessionId: string;
  roomName: string;
  roomUrl: string;
  providerMode: "daily_api" | "daily_sandbox";
  modality: VideoSessionModality;
  therapyName: string;
  scheduledSlotLabel: string;
  therapistName: string;
  therapistNickname: string;
  consultanteName: string;
  consultanteEmail: string;
  durationMinutes: number; // 60 minutos exactos por sesión
  createdAt: string;
  expiresAt: string;
  status: "activa" | "finalizada";
  completedAt?: string | null;
}

export const VIDEO_ROOMS_STORAGE_KEY = "reiki_online_daily_video_rooms_v1";

export function loadDailyVideoRooms(): Record<string, DailyVideoRoomRecord> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VIDEO_ROOMS_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as Record<string, DailyVideoRoomRecord>;
    }
  } catch {
    // Ignore
  }
  return {};
}

export function saveDailyVideoRoom(room: DailyVideoRoomRecord): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadDailyVideoRooms();
    const next = {
      ...existing,
      [room.sessionId]: room,
    };
    window.localStorage.setItem(VIDEO_ROOMS_STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new Event(SYNC_EVENT_NAME));
  } catch {
    // Ignore
  }
}

/**
 * Marca la sesión de videollamada como finalizada y registra automáticamente
 * la consulta como «efectuada» en el historial de Reiki Online para habilitar
 * la calificación de 1 a 5 estrellas y la reseña (máx. 150 caracteres).
 */
export function markVideoSessionCompleted(params: {
  sessionId: string;
  therapistNickname: string;
  therapistName: string;
  consultanteEmail: string;
  consultanteName: string;
  therapyName: string;
  modality: VideoSessionModality;
  scheduledSlotLabel: string;
}): ReikiConsultationRecord {
  const cleanNick =
    sanitizeNickname(params.therapistNickname || params.therapistName).toLowerCase() ||
    "danielghiglione";

  const rooms = loadDailyVideoRooms();
  if (rooms[params.sessionId]) {
    saveDailyVideoRoom({
      ...rooms[params.sessionId],
      status: "finalizada",
      completedAt: new Date().toISOString(),
    });
  }

  const consultations = loadConsultations();
  const existingIdx = consultations.findIndex(
    (c) => c.id === params.sessionId
  );

  let record: ReikiConsultationRecord;
  let nextList: ReikiConsultationRecord[];

  if (existingIdx >= 0) {
    record = {
      ...consultations[existingIdx],
      status: "efectuada",
    };
    nextList = consultations.map((item, idx) =>
      idx === existingIdx ? record : item
    );
  } else {
    record = {
      id: params.sessionId,
      therapistNickname: cleanNick,
      therapistName: params.therapistName,
      consultanteEmail: params.consultanteEmail || "consultante@reikionline.com.ar",
      consultanteName: params.consultanteName || "Consultante",
      therapyName: params.therapyName || "Reiki Usui",
      modality: params.modality,
      scheduledAt:
        params.scheduledSlotLabel ||
        new Date().toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
      status: "efectuada",
      reviewed: false,
    };
    nextList = [record, ...consultations];
  }

  saveConsultations(nextList);
  return record;
}
