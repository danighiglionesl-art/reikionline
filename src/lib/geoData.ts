import localidadesData from "@/lib/data/localidadesArgentina.json";

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

export interface ReikiUserProfile {
  id: string;
  username?: string;
  isAdmin?: boolean;
  role: "consultante" | "terapeuta" | "pendiente";
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
  updatedAt: string;
}

export const DEFAULT_ADMIN_PROFILE: ReikiUserProfile = {
  id: "admin-reikionline",
  username: "ReikiOnline",
  isAdmin: true,
  role: "terapeuta",
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
  updatedAt: "2026-11-01T14:30:00.000Z",
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
