import localidadesData from "@/lib/data/localidadesArgentina.json";
import {
  BiometricVerificationRecord,
  createInitialBiometricRecord,
} from "@/lib/biometricIdentity";

export interface PaisOption {
  nombre: string;
  codigo: string;
  prefijo: string;
}

export const PAISES: PaisOption[] = [
  { nombre: "Argentina", codigo: "AR", prefijo: "+54" },
  { nombre: "Uruguay", codigo: "UY", prefijo: "+598" },
  { nombre: "Chile", codigo: "CL", prefijo: "+56" },
  { nombre: "Paraguay", codigo: "PY", prefijo: "+595" },
  { nombre: "Brasil", codigo: "BR", prefijo: "+55" },
  { nombre: "Bolivia", codigo: "BO", prefijo: "+591" },
  { nombre: "España", codigo: "ES", prefijo: "+34" },
  { nombre: "Estados Unidos", codigo: "US", prefijo: "+1" },
  { nombre: "Italia", codigo: "IT", prefijo: "+39" },
  { nombre: "México", codigo: "MX", prefijo: "+52" },
  { nombre: "Colombia", codigo: "CO", prefijo: "+57" },
  { nombre: "Perú", codigo: "PE", prefijo: "+51" },
  { nombre: "Otro país", codigo: "OT", prefijo: "+1" },
];

export const PROVINCIAS_ARGENTINA: string[] = [
  "Buenos Aires",
  "Ciudad Autónoma de Buenos Aires",
  "Catamarca",
  "Chaco",
  "Chubut",
  "Córdoba",
  "Corrientes",
  "Entre Ríos",
  "Formosa",
  "Jujuy",
  "La Pampa",
  "La Rioja",
  "Mendoza",
  "Misiones",
  "Neuquén",
  "Río Negro",
  "Salta",
  "San Juan",
  "San Luis",
  "Santa Cruz",
  "Santa Fe",
  "Santiago del Estero",
  "Tierra del Fuego",
  "Tucumán",
];

const LOCALIDADES_ARGENTINA = localidadesData as Record<string, string[]>;

export function getLocalidadesParaProvincia(provincia: string): string[] {
  const lista = LOCALIDADES_ARGENTINA[provincia];
  if (lista && lista.length > 0) {
    return lista;
  }
  return ["Capital / Centro", "Otra localidad"];
}

/**
 * Formats a prefix (e.g. "+54") and local number (e.g. "3584244165") into strict E.164 format.
 */
export function formatToE164(prefijo: string, rawNumber: string): string {
  const cleanPrefix = prefijo.startsWith("+")
    ? `+${prefijo.replace(/\D/g, "")}`
    : `+${prefijo.replace(/\D/g, "")}`;
  let digits = rawNumber.replace(/\D/g, "");
  // Strip leading 0 if user typed 0358...
  digits = digits.replace(/^0+/, "");
  // Strip leading 15 if user typed 15...
  if (cleanPrefix === "+54" && digits.startsWith("15") && digits.length > 8) {
    digits = digits.slice(2);
  }
  // In Argentina (+54), mobile numbers for WhatsApp E.164 require the '9' after +54 (e.g. +5493585095475)
  if (cleanPrefix === "+54" && digits.length === 10 && !digits.startsWith("9")) {
    digits = `9${digits}`;
  }
  return `${cleanPrefix}${digits}`;
}

export function isValidE164(e164: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(e164);
}

export interface UserConsents {
  turnosYRecordatorios: boolean;
  notificacionesComerciales: boolean;
  updatedAt: string;
}

export interface UserGeoLocation {
  lat: number;
  lng: number;
  accuracyMeters?: number;
  captureMode: "auto-gps-mobile" | "manual-windows" | "geocoded-address";
  osDetected: "Android" | "iOS" | "Windows" | "Other";
  capturedAt: string;
  formattedAddress: string;
}

export type CommunitySuspensionType = "activa" | "temporal" | "definitiva";

export interface UserCommunitySuspension {
  status: CommunitySuspensionType;
  reason?: string;
  suspendedAt?: string | null;
  suspendedUntil?: string | null; // ISO timestamp cuando status === "temporal"
  suspendedBy?: string;
}

export interface ReikiUserProfile {
  id: string;
  username?: string;
  nickname: string; // 4 a 16 caracteres, solo letras y números (https://www.reikionline.com.ar/nickname)
  isAdmin?: boolean;
  role: "consultante" | "terapeuta" | "pendiente";
  visibleEnRed?: boolean; // Mi Perfil visible
  soyTerapeuta?: boolean; // Soy Terapeuta (por defecto destildado)
  therapiesOffered?: string[];
  therapiesSought?: string[];
  suspension?: UserCommunitySuspension;
  // Datos personales obligatorios
  nombre: string;
  apellido: string;
  dni: string;
  fechaNacimiento: string; // YYYY-MM-DD
  genero: "Hombre" | "Mujer" | "No binario" | "Prefiero no decirlo" | "";
  // Contacto y Verificación WhatsApp (E.164)
  prefijoTelefono: string;
  telefono: string;
  whatsappE164: string;
  whatsappVerified: boolean;
  whatsappVerifiedAt: string | null;
  whatsappChannel?: "whatsapp" | "sms";
  email: string;
  // Ubicación obligatoria
  pais: string;
  provincia: string;
  localidad: string;
  codigoPostal: string;
  barrio: string;
  calle: string;
  numeroCalle: string;
  // Opcionales de domicilio
  edificio: string;
  torre: string;
  piso: string;
  dpto: string;
  observacionesDomicilio: string;
  fotoUrl: string;
  // Geoposición satelital + Imagen de Maps
  geo: UserGeoLocation;
  // Consentimientos específicos WhatsApp
  consents: UserConsents;
  // Verificación de identidad biométrica (asociada a la identidad única del usuario)
  biometricVerification?: BiometricVerificationRecord;
  updatedAt: string;
}

export function isProfileCurrentlySuspended(
  profile?: Partial<ReikiUserProfile> | null
): boolean {
  if (!profile?.suspension) return false;
  if (profile.suspension.status === "definitiva") return true;
  if (profile.suspension.status === "temporal") {
    if (!profile.suspension.suspendedUntil) return true;
    const untilMs = new Date(profile.suspension.suspendedUntil).getTime();
    return Number.isFinite(untilMs) && untilMs > Date.now();
  }
  return false;
}

export const NICKNAME_REGEX = /^[a-zA-Z0-9]{4,16}$/;

export function sanitizeNickname(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(0, 16);
}

export function isValidNickname(nickname: string): boolean {
  return NICKNAME_REGEX.test(nickname.trim());
}

/**
 * Obtiene siempre el nickname personal del consultante o terapeuta (nunca el genérico "reikionline").
 */
export function getEffectiveNickname(profile: Partial<ReikiUserProfile>): string {
  const isAdmin = Boolean(profile.isAdmin);
  const rawNick = sanitizeNickname(profile.nickname || "").toLowerCase();
  if (
    rawNick.length >= 4 &&
    rawNick !== "reikionline" &&
    (isAdmin || rawNick !== "danielghiglione")
  ) {
    return rawNick;
  }
  const rawUser = sanitizeNickname(profile.username || "").toLowerCase();
  if (
    rawUser.length >= 4 &&
    rawUser !== "reikionline" &&
    (isAdmin || rawUser !== "danielghiglione")
  ) {
    return rawUser;
  }
  const fromName = sanitizeNickname(
    `${profile.nombre?.split(" ")[0] || ""}${profile.apellido || ""}`
  ).toLowerCase();
  if (
    fromName.length >= 4 &&
    (isAdmin || fromName !== "danielghiglione")
  ) {
    return fromName;
  }
  if (isAdmin) {
    return "danielghiglione";
  }
  const fromEmail = sanitizeNickname(
    (profile.email || "").split("@")[0] || ""
  ).toLowerCase();
  if (
    fromEmail.length >= 4 &&
    fromEmail !== "reikionline" &&
    fromEmail !== "danielghiglione"
  ) {
    return fromEmail;
  }
  return "";
}

export const DEFAULT_ADMIN_PROFILE: ReikiUserProfile = {
  id: "admin-reikionline",
  username: "danielghiglione",
  nickname: "danielghiglione",
  isAdmin: true,
  role: "terapeuta",
  visibleEnRed: true,
  soyTerapeuta: false,
  nombre: "Daniel Alejandro",
  apellido: "Ghiglione",
  dni: "22523947",
  fechaNacimiento: "1972-07-11",
  genero: "Hombre",
  prefijoTelefono: "+54",
  telefono: "3584244165",
  whatsappE164: "+543584244165",
  whatsappVerified: true,
  whatsappVerifiedAt: "2026-11-01T14:30:00.000Z",
  whatsappChannel: "whatsapp",
  email: "danighiglione@gmail.com",
  pais: "Argentina",
  provincia: "Córdoba",
  localidad: "Alcira Gigena",
  codigoPostal: "5813",
  barrio: "Centro",
  calle: "San Martin",
  numeroCalle: "362",
  edificio: "",
  torre: "",
  piso: "",
  dpto: "",
  observacionesDomicilio: "",
  fotoUrl: "",
  geo: {
    lat: -32.75472,
    lng: -64.33648,
    accuracyMeters: 12,
    captureMode: "manual-windows",
    osDetected: "Windows",
    capturedAt: "2026-11-01T14:30:00.000Z",
    formattedAddress: "San Martin 362, Barrio Centro, Alcira Gigena (CP 5813), Córdoba, Argentina",
  },
  consents: {
    turnosYRecordatorios: true,
    notificacionesComerciales: true,
    updatedAt: "2026-11-01T14:30:00.000Z",
  },
  biometricVerification: createInitialBiometricRecord("admin-reikionline", true),
  updatedAt: "2026-11-01T14:30:00.000Z",
};

export const COMMUNITY_SEED_PROFILES: Record<string, ReikiUserProfile> = {
  "valeria.mendez@reikionline.com.ar": {
    id: "seed-terapeuta-valeria",
    username: "valeriamendez",
    nickname: "valeriamendez",
    isAdmin: false,
    role: "terapeuta",
    visibleEnRed: true,
    soyTerapeuta: true,
    therapiesOffered: [
      "Reiki Usui",
      "Alineación de chakras",
      "Limpieza y armonización energética",
      "Meditación guiada",
    ],
    nombre: "Valeria",
    apellido: "Méndez",
    dni: "31845920",
    fechaNacimiento: "1985-04-18",
    genero: "Mujer",
    prefijoTelefono: "+54",
    telefono: "3516482910",
    whatsappE164: "+5493516482910",
    whatsappVerified: true,
    whatsappVerifiedAt: "2026-10-28T11:20:00.000Z",
    whatsappChannel: "whatsapp",
    email: "valeria.mendez@reikionline.com.ar",
    pais: "Argentina",
    provincia: "Córdoba",
    localidad: "Córdoba",
    codigoPostal: "5000",
    barrio: "Nueva Córdoba",
    calle: "Av. Hipólito Yrigoyen",
    numeroCalle: "420",
    edificio: "Mirador del Parque",
    torre: "A",
    piso: "6",
    dpto: "B",
    observacionesDomicilio: "Consultorio luminoso a metros de Plaza España",
    fotoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    geo: {
      lat: -31.4252,
      lng: -64.1865,
      accuracyMeters: 15,
      captureMode: "geocoded-address",
      osDetected: "Android",
      capturedAt: "2026-10-28T11:20:00.000Z",
      formattedAddress:
        "Av. Hipólito Yrigoyen 420, Nueva Córdoba, Córdoba (CP 5000), Argentina",
    },
    consents: {
      turnosYRecordatorios: true,
      notificacionesComerciales: true,
      updatedAt: "2026-10-28T11:20:00.000Z",
    },
    biometricVerification: createInitialBiometricRecord(
      "seed-terapeuta-valeria",
      true
    ),
    updatedAt: "2026-10-28T11:20:00.000Z",
  },
  "martin.arrieta@reikionline.com.ar": {
    id: "seed-terapeuta-martin",
    username: "martinarrieta",
    nickname: "martinarrieta",
    isAdmin: false,
    role: "terapeuta",
    visibleEnRed: true,
    soyTerapeuta: true,
    therapiesOffered: [
      "Reiki Karuna",
      "Tarot",
      "Lectura de registros akáshicos",
      "Constelaciones individuales",
    ],
    nombre: "Martín",
    apellido: "Arrieta",
    dni: "29410832",
    fechaNacimiento: "1982-09-05",
    genero: "Hombre",
    prefijoTelefono: "+54",
    telefono: "3584192834",
    whatsappE164: "+5493584192834",
    whatsappVerified: true,
    whatsappVerifiedAt: "2026-10-29T15:10:00.000Z",
    whatsappChannel: "whatsapp",
    email: "martin.arrieta@reikionline.com.ar",
    pais: "Argentina",
    provincia: "Córdoba",
    localidad: "Río Cuarto",
    codigoPostal: "5800",
    barrio: "Centro",
    calle: "Sobremonte",
    numeroCalle: "845",
    edificio: "",
    torre: "",
    piso: "PB",
    dpto: "1",
    observacionesDomicilio: "Espacio terapéutico planta baja",
    fotoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    geo: {
      lat: -33.1232,
      lng: -64.3493,
      accuracyMeters: 10,
      captureMode: "auto-gps-mobile",
      osDetected: "Android",
      capturedAt: "2026-10-29T15:10:00.000Z",
      formattedAddress:
        "Sobremonte 845, Centro, Río Cuarto (CP 5800), Córdoba, Argentina",
    },
    consents: {
      turnosYRecordatorios: true,
      notificacionesComerciales: false,
      updatedAt: "2026-10-29T15:10:00.000Z",
    },
    biometricVerification: createInitialBiometricRecord(
      "seed-terapeuta-martin",
      true
    ),
    updatedAt: "2026-10-29T15:10:00.000Z",
  },
  "sofia.benitez@reikionline.com.ar": {
    id: "seed-terapeuta-sofia",
    username: "sofiabenitez",
    nickname: "sofiabenitez",
    isAdmin: false,
    role: "terapeuta",
    visibleEnRed: true,
    soyTerapeuta: true,
    therapiesOffered: [
      "Flores de Bach",
      "Biodescodificación",
      "Sonoterapia con cuencos tibetanos",
      "Aromaterapia",
    ],
    nombre: "Sofía",
    apellido: "Benítez",
    dni: "34902118",
    fechaNacimiento: "1990-01-24",
    genero: "Mujer",
    prefijoTelefono: "+54",
    telefono: "3534829104",
    whatsappE164: "+5493534829104",
    whatsappVerified: true,
    whatsappVerifiedAt: "2026-10-30T10:00:00.000Z",
    whatsappChannel: "whatsapp",
    email: "sofia.benitez@reikionline.com.ar",
    pais: "Argentina",
    provincia: "Córdoba",
    localidad: "Villa María",
    codigoPostal: "5900",
    barrio: "Centro Sur",
    calle: "San Juan",
    numeroCalle: "1120",
    edificio: "",
    torre: "",
    piso: "",
    dpto: "",
    observacionesDomicilio: "",
    fotoUrl:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
    geo: {
      lat: -32.4075,
      lng: -63.2402,
      accuracyMeters: 14,
      captureMode: "geocoded-address",
      osDetected: "iOS",
      capturedAt: "2026-10-30T10:00:00.000Z",
      formattedAddress:
        "San Juan 1120, Villa María (CP 5900), Córdoba, Argentina",
    },
    consents: {
      turnosYRecordatorios: true,
      notificacionesComerciales: true,
      updatedAt: "2026-10-30T10:00:00.000Z",
    },
    biometricVerification: createInitialBiometricRecord(
      "seed-terapeuta-sofia",
      true
    ),
    updatedAt: "2026-10-30T10:00:00.000Z",
  },
  "lucia.peralta@reikionline.com.ar": {
    id: "seed-terapeuta-lucia",
    username: "luciaperalta",
    nickname: "luciaperalta",
    isAdmin: false,
    role: "terapeuta",
    visibleEnRed: true,
    soyTerapeuta: true,
    therapiesOffered: [
      "Sanación pránica",
      "Magnified Healing",
      "Terapia de cristales (cristaloterapia)",
    ],
    nombre: "Lucía",
    apellido: "Peralta",
    dni: "33128945",
    fechaNacimiento: "1987-11-12",
    genero: "Mujer",
    prefijoTelefono: "+54",
    telefono: "1158492011",
    whatsappE164: "+5491158492011",
    whatsappVerified: true,
    whatsappVerifiedAt: "2026-10-30T16:40:00.000Z",
    whatsappChannel: "whatsapp",
    email: "lucia.peralta@reikionline.com.ar",
    pais: "Argentina",
    provincia: "Ciudad Autónoma de Buenos Aires",
    localidad: "Palermo",
    codigoPostal: "1425",
    barrio: "Palermo Soho",
    calle: "Thames",
    numeroCalle: "1840",
    edificio: "Solares de Palermo",
    torre: "",
    piso: "3",
    dpto: "C",
    observacionesDomicilio: "Timbre 3C",
    fotoUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    geo: {
      lat: -34.5885,
      lng: -58.4305,
      accuracyMeters: 11,
      captureMode: "auto-gps-mobile",
      osDetected: "iOS",
      capturedAt: "2026-10-30T16:40:00.000Z",
      formattedAddress:
        "Thames 1840, Palermo (CP 1425), Ciudad Autónoma de Buenos Aires, Argentina",
    },
    consents: {
      turnosYRecordatorios: true,
      notificacionesComerciales: true,
      updatedAt: "2026-10-30T16:40:00.000Z",
    },
    biometricVerification: createInitialBiometricRecord(
      "seed-terapeuta-lucia",
      true
    ),
    updatedAt: "2026-10-30T16:40:00.000Z",
  },
  "sofia.villalba@reikionline.com.ar": {
    id: "seed-consultante-sofiavillalba",
    username: "sofiavillalba",
    nickname: "sofiavillalba",
    isAdmin: false,
    role: "consultante",
    visibleEnRed: true,
    soyTerapeuta: false,
    therapiesSought: ["Reiki Usui", "Meditación guiada", "Flores de Bach"],
    nombre: "Sofía",
    apellido: "Villalba",
    dni: "38491022",
    fechaNacimiento: "1994-06-21",
    genero: "Mujer",
    prefijoTelefono: "+54",
    telefono: "3584391028",
    whatsappE164: "+5493584391028",
    whatsappVerified: true,
    whatsappVerifiedAt: "2026-10-31T09:15:00.000Z",
    whatsappChannel: "whatsapp",
    email: "sofia.villalba@reikionline.com.ar",
    pais: "Argentina",
    provincia: "Córdoba",
    localidad: "Río Cuarto",
    codigoPostal: "5800",
    barrio: "Banda Norte",
    calle: "Marcelo T. de Alvear",
    numeroCalle: "640",
    edificio: "",
    torre: "",
    piso: "",
    dpto: "",
    observacionesDomicilio: "Casa portón blanco",
    fotoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    geo: {
      lat: -33.1128,
      lng: -64.3381,
      accuracyMeters: 16,
      captureMode: "auto-gps-mobile",
      osDetected: "Android",
      capturedAt: "2026-10-31T09:15:00.000Z",
      formattedAddress:
        "Marcelo T. de Alvear 640, Banda Norte, Río Cuarto (CP 5800), Córdoba, Argentina",
    },
    consents: {
      turnosYRecordatorios: true,
      notificacionesComerciales: false,
      updatedAt: "2026-10-31T09:15:00.000Z",
    },
    biometricVerification: createInitialBiometricRecord(
      "seed-consultante-sofiavillalba",
      true
    ),
    updatedAt: "2026-10-31T09:15:00.000Z",
  },
  "nicolas.ferreyra@reikionline.com.ar": {
    id: "seed-consultante-nicoferreyra",
    username: "nicoferreyra",
    nickname: "nicoferreyra",
    isAdmin: false,
    role: "consultante",
    visibleEnRed: true,
    soyTerapeuta: false,
    therapiesSought: [
      "Alineación de chakras",
      "Lectura de registros akáshicos",
    ],
    nombre: "Nicolás",
    apellido: "Ferreyra",
    dni: "36102948",
    fechaNacimiento: "1991-12-03",
    genero: "Hombre",
    prefijoTelefono: "+54",
    telefono: "3515928371",
    whatsappE164: "+5493515928371",
    whatsappVerified: true,
    whatsappVerifiedAt: "2026-10-31T18:05:00.000Z",
    whatsappChannel: "whatsapp",
    email: "nicolas.ferreyra@reikionline.com.ar",
    pais: "Argentina",
    provincia: "Córdoba",
    localidad: "Villa Carlos Paz",
    codigoPostal: "5152",
    barrio: "Centro",
    calle: "Av. San Martín",
    numeroCalle: "510",
    edificio: "",
    torre: "",
    piso: "2",
    dpto: "A",
    observacionesDomicilio: "",
    fotoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    geo: {
      lat: -31.4241,
      lng: -64.4978,
      accuracyMeters: 18,
      captureMode: "manual-windows",
      osDetected: "Windows",
      capturedAt: "2026-10-31T18:05:00.000Z",
      formattedAddress:
        "Av. San Martín 510, Villa Carlos Paz (CP 5152), Córdoba, Argentina",
    },
    consents: {
      turnosYRecordatorios: true,
      notificacionesComerciales: true,
      updatedAt: "2026-10-31T18:05:00.000Z",
    },
    biometricVerification: createInitialBiometricRecord(
      "seed-consultante-nicoferreyra",
      true
    ),
    updatedAt: "2026-10-31T18:05:00.000Z",
  },
};

/**
 * Generates an SVG static satellite/hybrid map preview data URI as an instant high-res fallback
 * alongside the live interactive Google Maps Satellite embed (`t=h`).
 */
export function buildGoogleMapsEmbedUrl(lat: number, lng: number, zoom = 18, mapType: "h" | "k" | "m" = "h"): string {
  const safeLat = Number.isFinite(lat) ? lat.toFixed(6) : "-32.754720";
  const safeLng = Number.isFinite(lng) ? lng.toFixed(6) : "-64.336480";
  return `https://maps.google.com/maps?q=${safeLat},${safeLng}&z=${zoom}&t=${mapType}&hl=es&output=embed`;
}

export function buildGoogleMapsExternalUrl(lat: number, lng: number): string {
  const safeLat = Number.isFinite(lat) ? lat.toFixed(6) : "-32.754720";
  const safeLng = Number.isFinite(lng) ? lng.toFixed(6) : "-64.336480";
  return `https://www.google.com/maps/search/?api=1&query=${safeLat},${safeLng}`;
}
