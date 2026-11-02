import {
  DEFAULT_ADMIN_PROFILE,
  ReikiUserProfile,
  sanitizeNickname,
} from "@/lib/geoData";
import { isBiometricVerifiedAndValid } from "@/lib/biometricIdentity";

export const PROFILES_STORAGE_KEY = "reiki_online_user_profiles_v1";
export const REVIEWS_STORAGE_KEY = "reiki_online_social_reviews_v1";
export const CONSULTATIONS_STORAGE_KEY = "reiki_online_consultations_v1";
export const FOLLOWS_STORAGE_KEY = "reiki_online_social_follows_v1";
export const SYNC_EVENT_NAME = "reiki-online-catalog-sync";

export interface SocialFollowRecord {
  id: string;
  followerNickname: string; // normalized lowercase
  followerName: string;
  followerRole: "Consultante" | "Terapeuta";
  followerFotoUrl?: string;
  targetNickname: string; // normalized lowercase
  targetName: string;
  targetRole: "Consultante" | "Terapeuta";
  targetFotoUrl?: string;
  createdAt: string;
}

export interface TherapistReview {
  id: string;
  therapistNickname: string; // normalized lowercase
  authorEmail: string;
  authorName: string;
  authorNickname?: string;
  authorPhotoUrl?: string;
  rating: 1 | 2 | 3 | 4 | 5; // 1 a 5 estrellas
  comment: string; // máx 150 caracteres
  therapyName: string;
  consultationId: string;
  createdAt: string;
}

export interface ReikiConsultationRecord {
  id: string;
  therapistNickname: string; // normalized lowercase
  therapistName: string;
  consultanteEmail: string;
  consultanteName: string;
  consultanteNickname?: string;
  therapyName: string;
  modality: "Presencial con turno" | "Online con turno" | "Online ahora";
  scheduledAt: string;
  status: "programada" | "efectuada";
  reviewed?: boolean;
  ratingGiven?: 1 | 2 | 3 | 4 | 5;
}

export interface PublicSocialProfile {
  nickname: string;
  displayName: string;
  role: "Terapeuta" | "Consultante";
  fotoUrl: string;
  localidad: string;
  provincia: string;
  pais: string;
  therapies: string[];
  bio: string;
  email?: string;
  whatsappVerified: boolean;
  identityVerified?: boolean;
}

export const DEMO_SOCIAL_PROFILES: Record<string, PublicSocialProfile> = {
  danielghiglione: {
    nickname: "danielghiglione",
    displayName: "Daniel Alejandro Ghiglione",
    role: "Terapeuta",
    fotoUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    localidad: "Alcira Gigena",
    provincia: "Córdoba",
    pais: "Argentina",
    therapies: [
      "Reiki Usui",
      "Alineación de chakras",
      "Limpieza y armonización energética",
      "Meditación guiada",
    ],
    bio: "Terapeuta holístico y reikista en Reiki Online. Sesiones presenciales y a distancia de armonización energética y bienestar integral.",
    email: "danighiglione@gmail.com",
    whatsappVerified: true,
    identityVerified: true,
  },
  valeriamendez: {
    nickname: "valeriamendez",
    displayName: "Valeria Méndez",
    role: "Terapeuta",
    fotoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    localidad: "Córdoba",
    provincia: "Córdoba",
    pais: "Argentina",
    therapies: [
      "Reiki Usui",
      "Alineación de chakras",
      "Limpieza y armonización energética",
      "Meditación guiada",
    ],
    bio: "Master Reiki Usui y guía de meditación consciente. Acompañamiento energético personalizado.",
    whatsappVerified: true,
    identityVerified: true,
  },
  martinarrieta: {
    nickname: "martinarrieta",
    displayName: "Martín Arrieta",
    role: "Terapeuta",
    fotoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    localidad: "Río Cuarto",
    provincia: "Córdoba",
    pais: "Argentina",
    therapies: [
      "Reiki Karuna",
      "Tarot",
      "Lectura de registros akáshicos",
      "Constelaciones individuales",
    ],
    bio: "Lector de Registros Akáshicos y practicante de Reiki Karuna.",
    whatsappVerified: true,
    identityVerified: true,
  },
  sofiabenitez: {
    nickname: "sofiabenitez",
    displayName: "Sofía Benítez",
    role: "Terapeuta",
    fotoUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
    localidad: "Villa María",
    provincia: "Córdoba",
    pais: "Argentina",
    therapies: [
      "Flores de Bach",
      "Biodescodificación",
      "Sanación pránica",
      "Sonoterapia con cuencos tibetanos",
    ],
    bio: "Terapeuta floral y biodescodificación emocional.",
    whatsappVerified: true,
    identityVerified: true,
  },
  luciaperalta: {
    nickname: "luciaperalta",
    displayName: "Lucía Peralta",
    role: "Terapeuta",
    fotoUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    localidad: "Palermo",
    provincia: "Ciudad Autónoma de Buenos Aires",
    pais: "Argentina",
    therapies: [
      "Flores de Bach",
      "Biodescodificación",
      "Sonoterapia con cuencos tibetanos",
    ],
    bio: "Terapeuta holística especializada en esencias florales y armonización sonora.",
    whatsappVerified: true,
    identityVerified: true,
  },
  sofiavillalba: {
    nickname: "sofiavillalba",
    displayName: "Sofía Villalba",
    role: "Consultante",
    fotoUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    localidad: "Villa María",
    provincia: "Córdoba",
    pais: "Argentina",
    therapies: ["Reiki Usui", "Meditación mindfulness", "Flores de Bach"],
    bio: "Consultante activa en la Red Social de Reiki Online.",
    whatsappVerified: true,
  },
  nicoferreyra: {
    nickname: "nicoferreyra",
    displayName: "Nicolás Ferreyra",
    role: "Consultante",
    fotoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    localidad: "Rosario",
    provincia: "Santa Fe",
    pais: "Argentina",
    therapies: ["Alineación de chakras", "Carta natal", "Biodescodificación"],
    bio: "Consultante en búsqueda de bienestar energético y autoconocimiento.",
    whatsappVerified: true,
  },
  camilaquiroga: {
    nickname: "camilaquiroga",
    displayName: "Camila Quiroga",
    role: "Consultante",
    fotoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    localidad: "Mendoza",
    provincia: "Mendoza",
    pais: "Argentina",
    therapies: ["Constelaciones familiares", "Reiki con cristales"],
    bio: "Integrante de la comunidad Reiki Online.",
    whatsappVerified: true,
  },
};

export const INITIAL_DEMO_FOLLOWS: SocialFollowRecord[] = [
  {
    id: "fol-demo-1",
    followerNickname: "sofiavillalba",
    followerName: "Sofía Villalba",
    followerRole: "Consultante",
    followerFotoUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    targetNickname: "danielghiglione",
    targetName: "Daniel Alejandro Ghiglione",
    targetRole: "Terapeuta",
    targetFotoUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    createdAt: "2026-10-25T14:00:00.000Z",
  },
  {
    id: "fol-demo-2",
    followerNickname: "nicoferreyra",
    followerName: "Nicolás Ferreyra",
    followerRole: "Consultante",
    followerFotoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    targetNickname: "danielghiglione",
    targetName: "Daniel Alejandro Ghiglione",
    targetRole: "Terapeuta",
    targetFotoUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    createdAt: "2026-10-26T16:30:00.000Z",
  },
  {
    id: "fol-demo-3",
    followerNickname: "valeriamendez",
    followerName: "Valeria Méndez",
    followerRole: "Terapeuta",
    followerFotoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    targetNickname: "danielghiglione",
    targetName: "Daniel Alejandro Ghiglione",
    targetRole: "Terapeuta",
    targetFotoUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    createdAt: "2026-10-27T11:20:00.000Z",
  },
  {
    id: "fol-demo-4",
    followerNickname: "danielghiglione",
    followerName: "Daniel Alejandro Ghiglione",
    followerRole: "Terapeuta",
    followerFotoUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    targetNickname: "valeriamendez",
    targetName: "Valeria Méndez",
    targetRole: "Terapeuta",
    targetFotoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    createdAt: "2026-10-27T12:00:00.000Z",
  },
  {
    id: "fol-demo-5",
    followerNickname: "danielghiglione",
    followerName: "Daniel Alejandro Ghiglione",
    followerRole: "Terapeuta",
    followerFotoUrl:
      "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=400&q=80",
    targetNickname: "sofiavillalba",
    targetName: "Sofía Villalba",
    targetRole: "Consultante",
    targetFotoUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    createdAt: "2026-10-28T09:15:00.000Z",
  },
  {
    id: "fol-demo-6",
    followerNickname: "camilaquiroga",
    followerName: "Camila Quiroga",
    followerRole: "Consultante",
    followerFotoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    targetNickname: "valeriamendez",
    targetName: "Valeria Méndez",
    targetRole: "Terapeuta",
    targetFotoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    createdAt: "2026-10-29T18:00:00.000Z",
  },
  {
    id: "fol-demo-7",
    followerNickname: "sofiavillalba",
    followerName: "Sofía Villalba",
    followerRole: "Consultante",
    followerFotoUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    targetNickname: "martinarrieta",
    targetName: "Martín Arrieta",
    targetRole: "Terapeuta",
    targetFotoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    createdAt: "2026-10-30T10:45:00.000Z",
  },
  {
    id: "fol-demo-8",
    followerNickname: "martinarrieta",
    followerName: "Martín Arrieta",
    followerRole: "Terapeuta",
    followerFotoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    targetNickname: "nicoferreyra",
    targetName: "Nicolás Ferreyra",
    targetRole: "Consultante",
    targetFotoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    createdAt: "2026-10-30T15:10:00.000Z",
  },
  {
    id: "fol-demo-9",
    followerNickname: "nicoferreyra",
    followerName: "Nicolás Ferreyra",
    followerRole: "Consultante",
    followerFotoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    targetNickname: "luciaperalta",
    targetName: "Lucía Peralta",
    targetRole: "Terapeuta",
    targetFotoUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    createdAt: "2026-10-31T13:00:00.000Z",
  },
];

export const INITIAL_DEMO_REVIEWS: TherapistReview[] = [
  {
    id: "rev-demo-1",
    therapistNickname: "danielghiglione",
    authorEmail: "mariana.lopez@ejemplo.com",
    authorName: "Mariana López",
    authorNickname: "marianalopez",
    rating: 5,
    comment:
      "Excelente sesión de Reiki Usui y alineación de chakras. Sentí mucha paz y claridad desde el primer momento. ¡Muy recomendable!",
    therapyName: "Reiki Usui",
    consultationId: "cons-demo-0",
    createdAt: "2026-10-28T18:30:00.000Z",
  },
  {
    id: "rev-demo-2",
    therapistNickname: "danielghiglione",
    authorEmail: "lucas.ferreyra@ejemplo.com",
    authorName: "Lucas Ferreyra",
    authorNickname: "lucasferreyra",
    rating: 5,
    comment:
      "Muy cálido y profesional. La armonización energética a distancia fue puntual y súper renovadora.",
    therapyName: "Limpieza y armonización energética",
    consultationId: "cons-demo-0b",
    createdAt: "2026-10-30T15:10:00.000Z",
  },
  {
    id: "rev-demo-3",
    therapistNickname: "valeriamendez",
    authorEmail: "danighiglione@gmail.com",
    authorName: "Daniel Alejandro Ghiglione",
    authorNickname: "danielghiglione",
    rating: 5,
    comment:
      "Gran experiencia en la sesión online de meditación guiada y armonización.",
    therapyName: "Meditación guiada",
    consultationId: "cons-demo-valeria",
    createdAt: "2026-10-29T19:00:00.000Z",
  },
];

export const INITIAL_DEMO_CONSULTATIONS: ReikiConsultationRecord[] = [
  {
    id: "cons-efectuada-1",
    therapistNickname: "danielghiglione",
    therapistName: "Daniel Alejandro Ghiglione",
    consultanteEmail: "danighiglione@gmail.com",
    consultanteName: "Daniel Alejandro Ghiglione",
    consultanteNickname: "danielghiglione",
    therapyName: "Reiki Usui + Alineación de chakras",
    modality: "Online con turno",
    scheduledAt: "2026-11-01 12:00 hs",
    status: "efectuada",
    reviewed: false,
  },
  {
    id: "cons-efectuada-2",
    therapistNickname: "valeriamendez",
    therapistName: "Valeria Méndez",
    consultanteEmail: "danighiglione@gmail.com",
    consultanteName: "Daniel Alejandro Ghiglione",
    consultanteNickname: "danielghiglione",
    therapyName: "Reiki Usui",
    modality: "Online ahora",
    scheduledAt: "2026-10-31 18:00 hs",
    status: "efectuada",
    reviewed: false,
  },
  {
    id: "cons-programada-3",
    therapistNickname: "martinarrieta",
    therapistName: "Martín Arrieta",
    consultanteEmail: "danighiglione@gmail.com",
    consultanteName: "Daniel Alejandro Ghiglione",
    consultanteNickname: "danielghiglione",
    therapyName: "Lectura de registros akáshicos",
    modality: "Presencial con turno",
    scheduledAt: "2026-11-04 13:00 hs",
    status: "programada",
    reviewed: false,
  },
];

const RESERVED_SYSTEM_SLUGS = new Set([
  "api",
  "admin",
  "login",
  "register",
  "brand",
  "images",
  "manifest",
  "robots",
  "sitemap",
]);

/**
 * Checks if a nickname is already used by another user profile or reserved demo therapist.
 */
export function isNicknameAlreadyInUse(
  candidateRaw: string,
  currentUserEmail?: string,
  currentUserId?: string,
  profilesByEmail?: Record<string, ReikiUserProfile>
): boolean {
  const clean = sanitizeNickname(candidateRaw).toLowerCase();
  if (!clean) return false;

  if (RESERVED_SYSTEM_SLUGS.has(clean)) {
    return true;
  }

  const normEmail = (currentUserEmail || "").trim().toLowerCase();
  const isCurrentUserAdmin =
    normEmail === "danighiglione@gmail.com" ||
    normEmail === "reikionline" ||
    normEmail === "admin@reikionline.com.ar" ||
    currentUserId === DEFAULT_ADMIN_PROFILE.id;

  // Check demo therapists (excluding danielghiglione if current user is admin)
  for (const [demoNick, demoProfile] of Object.entries(DEMO_SOCIAL_PROFILES)) {
    if (demoNick.toLowerCase() === clean) {
      if (demoNick === "danielghiglione" && isCurrentUserAdmin) {
        continue;
      }
      if (
        demoProfile.email &&
        normEmail &&
        demoProfile.email.toLowerCase() === normEmail
      ) {
        continue;
      }
      return true;
    }
  }

  // Check saved user profiles
  let mapToSearch = profilesByEmail;
  if (!mapToSearch && typeof window !== "undefined") {
    try {
      const raw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
      if (raw) {
        mapToSearch = JSON.parse(raw) as Record<string, ReikiUserProfile>;
      }
    } catch {
      // Ignore
    }
  }

  if (mapToSearch) {
    for (const [, prof] of Object.entries(mapToSearch)) {
      if (!prof || !prof.nickname) continue;
      const profNick = prof.nickname.trim().toLowerCase();
      if (profNick !== clean) continue;

      const sameId = Boolean(currentUserId && prof.id === currentUserId);
      const sameEmail = Boolean(
        normEmail && prof.email && prof.email.toLowerCase() === normEmail
      );
      const bothAdmin = Boolean(isCurrentUserAdmin && prof.isAdmin);

      if (!sameId && !sameEmail && !bothAdmin) {
        return true;
      }
    }
  }

  return false;
}

export function loadSocialReviews(): TherapistReview[] {
  if (typeof window === "undefined") return INITIAL_DEMO_REVIEWS;
  try {
    const raw = window.localStorage.getItem(REVIEWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as TherapistReview[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return INITIAL_DEMO_REVIEWS;
}

export function saveSocialReviews(reviews: TherapistReview[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REVIEWS_STORAGE_KEY, JSON.stringify(reviews));
    window.dispatchEvent(new Event(SYNC_EVENT_NAME));
  } catch {
    // Ignore
  }
}

export function loadConsultations(): ReikiConsultationRecord[] {
  if (typeof window === "undefined") return INITIAL_DEMO_CONSULTATIONS;
  try {
    const raw = window.localStorage.getItem(CONSULTATIONS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ReikiConsultationRecord[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return INITIAL_DEMO_CONSULTATIONS;
}

export function saveConsultations(list: ReikiConsultationRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CONSULTATIONS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SYNC_EVENT_NAME));
  } catch {
    // Ignore
  }
}

export function loadSocialFollows(): SocialFollowRecord[] {
  if (typeof window === "undefined") return INITIAL_DEMO_FOLLOWS;
  try {
    const raw = window.localStorage.getItem(FOLLOWS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as SocialFollowRecord[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // Ignore
  }
  return INITIAL_DEMO_FOLLOWS;
}

export function saveSocialFollows(list: SocialFollowRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FOLLOWS_STORAGE_KEY, JSON.stringify(list));
    window.dispatchEvent(new Event(SYNC_EVENT_NAME));
  } catch {
    // Ignore
  }
}

export function isFollowingProfile(
  followerNickname: string,
  targetNickname: string,
  list?: SocialFollowRecord[]
): boolean {
  const f = sanitizeNickname(followerNickname).toLowerCase();
  const t = sanitizeNickname(targetNickname).toLowerCase();
  if (!f || !t || f === t) return false;
  const source = list ?? loadSocialFollows();
  return source.some(
    (item) =>
      item.followerNickname.toLowerCase() === f &&
      item.targetNickname.toLowerCase() === t
  );
}

export function getFollowersForNickname(
  nickname: string,
  list?: SocialFollowRecord[]
): SocialFollowRecord[] {
  const clean = sanitizeNickname(nickname).toLowerCase();
  if (!clean) return [];
  const source = list ?? loadSocialFollows();
  return source.filter((item) => item.targetNickname.toLowerCase() === clean);
}

export function getFollowingForNickname(
  nickname: string,
  list?: SocialFollowRecord[]
): SocialFollowRecord[] {
  const clean = sanitizeNickname(nickname).toLowerCase();
  if (!clean) return [];
  const source = list ?? loadSocialFollows();
  return source.filter((item) => item.followerNickname.toLowerCase() === clean);
}

export function toggleSocialFollow(params: {
  followerNickname: string;
  followerName: string;
  followerRole: "Consultante" | "Terapeuta";
  followerFotoUrl?: string;
  targetNickname: string;
  targetName: string;
  targetRole: "Consultante" | "Terapeuta";
  targetFotoUrl?: string;
}): { following: boolean; list: SocialFollowRecord[] } {
  const currentList = loadSocialFollows();
  const fNick = sanitizeNickname(params.followerNickname).toLowerCase();
  const tNick = sanitizeNickname(params.targetNickname).toLowerCase();
  if (!fNick || !tNick || fNick === tNick) {
    return { following: false, list: currentList };
  }

  const existingIdx = currentList.findIndex(
    (item) =>
      item.followerNickname.toLowerCase() === fNick &&
      item.targetNickname.toLowerCase() === tNick
  );

  let nextList: SocialFollowRecord[];
  let following: boolean;

  if (existingIdx >= 0) {
    nextList = currentList.filter((_, idx) => idx !== existingIdx);
    following = false;
  } else {
    const newRecord: SocialFollowRecord = {
      id: `fol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      followerNickname: fNick,
      followerName: params.followerName || fNick,
      followerRole: params.followerRole,
      followerFotoUrl: params.followerFotoUrl || "",
      targetNickname: tNick,
      targetName: params.targetName || tNick,
      targetRole: params.targetRole,
      targetFotoUrl: params.targetFotoUrl || "",
      createdAt: new Date().toISOString(),
    };
    nextList = [newRecord, ...currentList];
    following = true;
  }

  saveSocialFollows(nextList);
  return { following, list: nextList };
}

export function resolvePublicProfileByNickname(
  nicknameParam: string
): PublicSocialProfile | null {
  const clean = sanitizeNickname(nicknameParam).toLowerCase();
  if (!clean) return null;

  if (typeof window !== "undefined") {
    try {
      const rawProfiles = window.localStorage.getItem(PROFILES_STORAGE_KEY);
      const rawSelections = window.localStorage.getItem(
        "reiki_online_role_selections_v1"
      );
      let userTherapies: string[] = [];
      if (rawSelections) {
        const parsedSel = JSON.parse(rawSelections) as {
          terapeuta?: string[];
          consultante?: string[];
        };
        userTherapies =
          parsedSel.terapeuta && parsedSel.terapeuta.length > 0
            ? parsedSel.terapeuta
            : parsedSel.consultante || [];
      }

      if (rawProfiles) {
        const map = JSON.parse(rawProfiles) as Record<string, ReikiUserProfile>;
        for (const prof of Object.values(map)) {
          if (prof && prof.nickname && prof.nickname.toLowerCase() === clean) {
            return {
              nickname: prof.nickname,
              displayName:
                `${prof.nombre} ${prof.apellido}`.trim() || prof.nickname,
              role: prof.role === "consultante" ? "Consultante" : "Terapeuta",
              fotoUrl: prof.fotoUrl || "",
              localidad: prof.localidad || "Alcira Gigena",
              provincia: prof.provincia || "Córdoba",
              pais: prof.pais || "Argentina",
              therapies:
                userTherapies.length > 0
                  ? userTherapies
                  : [
                      "Reiki Usui",
                      "Alineación de chakras",
                      "Limpieza y armonización energética",
                    ],
              bio: `Perfil oficial en la Red Social de Reiki Online (reikionline.com.ar/${prof.nickname}).`,
              email: prof.email,
              whatsappVerified: prof.whatsappVerified,
              identityVerified:
                prof.isAdmin ||
                isBiometricVerifiedAndValid(prof.biometricVerification),
            };
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  if (DEMO_SOCIAL_PROFILES[clean]) {
    return DEMO_SOCIAL_PROFILES[clean];
  }

  // Dynamic fallback so any valid 4-16 char nickname preview works seamlessly
  if (/^[a-z0-9]{4,16}$/i.test(clean)) {
    return {
      nickname: clean,
      displayName: clean.charAt(0).toUpperCase() + clean.slice(1),
      role: "Terapeuta",
      fotoUrl: "",
      localidad: "Córdoba",
      provincia: "Córdoba",
      pais: "Argentina",
      therapies: ["Reiki Usui", "Armonización energética"],
      bio: `Espacio en la Red Social de Reiki Online (https://www.reikionline.com.ar/${clean}).`,
      whatsappVerified: true,
    };
  }

  return null;
}
