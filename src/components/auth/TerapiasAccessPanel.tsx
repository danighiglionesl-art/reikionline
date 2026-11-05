"use client";

import React, { useState, useId, useEffect } from "react";
import {
  Eye,
  EyeOff,
  UserCheck,
  HeartHandshake,
  ArrowLeft,
  LogOut,
  User,
  IdCard,
  Calendar,
  Wallet,
  Loader2,
  BellRing,
  PlusCircle,
  CheckCircle2,
  Trash2,
  ChevronDown,
  Search,
  Sparkles,
  ShieldAlert,
  MapPin,
  CalendarClock,
  Video,
  ShieldCheck,
  Users,
  GraduationCap,
} from "lucide-react";
import {
  ROLE_THERAPY_CATEGORIES,
  RoleTherapyCategory,
} from "@/lib/reiki-data";
import {
  DEFAULT_ADMIN_PROFILE,
  getEffectiveNickname,
  ReikiUserProfile,
  sanitizeNickname,
} from "@/lib/geoData";
import {
  BiometricVerificationStatus,
  createInitialBiometricRecord,
  evaluateConsultanteBiometricRisk,
  isBiometricVerifiedAndValid,
} from "@/lib/biometricIdentity";
import WhatsAppVerificationStep from "@/components/auth/WhatsAppVerificationStep";
import BiometricIdentityStep from "@/components/auth/BiometricIdentityStep";
import UserProfilePanel from "@/components/profile/UserProfilePanel";
import SocialNetworkProfileView from "@/components/profile/SocialNetworkProfileView";
import ModalityWorkflowPanel from "@/components/auth/ModalityWorkflowPanel";
import UserCredentialPanel from "@/components/credential/UserCredentialPanel";
import NetworkProfilesDirectory from "@/components/credential/NetworkProfilesDirectory";
import AdminPaymentsCommissionsPanel from "@/components/payments/AdminPaymentsCommissionsPanel";
import TherapistMercadoPagoSection from "@/components/payments/TherapistMercadoPagoSection";
import DailyVideoCallModal from "@/components/video/DailyVideoCallModal";
import MisCapacitacionesPanel from "@/components/trainings/MisCapacitacionesPanel";
import AdminTrainingsSupervisionPanel from "@/components/trainings/AdminTrainingsSupervisionPanel";
import { loadConsultations, saveConsultations } from "@/lib/socialNetwork";
import {
  ATTENTION_MODALITY_LABELS,
  BOOKING_TIMING_LABELS,
  formatArs,
  loadMpTransactions,
  saveMpTransactions,
} from "@/lib/mercadoPagoSplit";

export type AccessTab = "login" | "register" | "recover" | "role-select";
export type ActiveRole = "Consultante" | "Terapeuta";
export type PersistentSection =
  | "Mi Perfil"
  | "Mi Credencial"
  | "Mis Consultas"
  | "Mis Capacitaciones"
  | "Mi Billetera"
  | "Mi Red Social";

export interface TerapiasAccessPanelProps {
  idPrefix?: string;
  initialMode?: "login" | "register" | "recover";
  preselectedContext?: string | null;
}

interface AuthenticatedUser {
  name: string;
  email: string;
  picture?: string;
  provider: "Google" | "Correo";
  isAdmin?: boolean;
}

export interface PendingAdminCategoryAlert {
  id: string;
  categoryId: string;
  categoryNumber: number;
  categoryTitle: string;
  proposedOption: string;
  proposedBy: string;
  createdAt: string;
}

interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
  error_description?: string;
}

interface GoogleTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            prompt?: string;
            callback: (response: GoogleTokenResponse) => void;
            error_callback?: (err: { type?: string; message?: string }) => void;
          }) => GoogleTokenClient;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "384115038053-8ej767ghcer6qklevc4onqtav29ppape.apps.googleusercontent.com";

const SESSION_STORAGE_KEY = "reiki_online_session_v1";
const CUSTOM_OPTIONS_STORAGE_KEY = "reiki_online_custom_therapy_options_v1";
const ADMIN_ALERTS_STORAGE_KEY = "reiki_online_admin_therapy_alerts_v1";
const SELECTIONS_STORAGE_KEY = "reiki_online_role_selections_v1";
const SELECTED_ROLE_STORAGE_KEY = "reiki_online_selected_role_v1";
const PROFILES_STORAGE_KEY = "reiki_online_user_profiles_v1";
const SYNC_EVENT_NAME = "reiki-online-catalog-sync";

function isAdminIdentity(email?: string, isAdminFlag?: boolean): boolean {
  const lower = (email || "").trim().toLowerCase();
  return Boolean(
    isAdminFlag ||
      lower === "reikionline" ||
      lower === "danighiglione@gmail.com" ||
      lower === "admin@reikionline.com.ar"
  );
}

function buildDefaultProfileForUser(user: AuthenticatedUser): ReikiUserProfile {
  const lowerEmail = user.email.trim().toLowerCase();
  if (isAdminIdentity(lowerEmail, user.isAdmin)) {
    return {
      ...DEFAULT_ADMIN_PROFILE,
      fotoUrl: user.picture || DEFAULT_ADMIN_PROFILE.fotoUrl || "",
      isAdmin: true,
    };
  }

  const safeId = `usr-${lowerEmail.replace(/[^a-z0-9]/g, "-")}`;
  const nowIso = new Date().toISOString();

  return {
    id: safeId,
    username: "",
    nickname: "",
    isAdmin: false,
    role: "pendiente",
    visibleEnRed: true,
    soyTerapeuta: false,
    nombre: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "",
    genero: "",
    prefijoTelefono: "+54",
    telefono: "",
    whatsappE164: "",
    whatsappVerified: false,
    whatsappVerifiedAt: null,
    email: user.email.includes("@") ? user.email.trim() : lowerEmail,
    pais: "Argentina",
    provincia: "",
    localidad: "",
    codigoPostal: "",
    barrio: "",
    calle: "",
    numeroCalle: "",
    edificio: "",
    torre: "",
    piso: "",
    dpto: "",
    observacionesDomicilio: "",
    fotoUrl: user.picture || "",
    geo: {
      lat: -34.603722,
      lng: -58.381592,
      captureMode: "manual-windows",
      osDetected: "Windows",
      capturedAt: nowIso,
      formattedAddress: "",
    },
    consents: {
      turnosYRecordatorios: true,
      notificacionesComerciales: false,
      updatedAt: nowIso,
    },
    biometricVerification: createInitialBiometricRecord(safeId, false),
    updatedAt: nowIso,
  };
}

function sanitizeStoredProfile(
  prof: ReikiUserProfile,
  keyEmail: string
): ReikiUserProfile {
  const isAdm = isAdminIdentity(prof.email || keyEmail, prof.isAdmin);
  if (isAdm) {
    const effNick = getEffectiveNickname({ ...prof, isAdmin: true });
    return {
      ...prof,
      isAdmin: true,
      nickname: effNick,
      username: effNick,
    };
  }

  // Limpiar cualquier dato de Daniel Ghiglione que haya quedado heredado por error en cuentas de otros usuarios
  const hadAdminDni = prof.dni === "22523947";
  const hadAdminPhone =
    prof.telefono === "3584244165" ||
    (prof.whatsappE164 || "").includes("3584244165");
  const hadAdminAddress =
    prof.calle === "San Martin" && prof.numeroCalle === "362";
  const hadAdminName =
    prof.nombre === "Daniel Alejandro" || prof.apellido === "Ghiglione";

  const cleaned: ReikiUserProfile = {
    ...prof,
    isAdmin: false,
    nickname:
      prof.nickname === "danielghiglione" ? "" : prof.nickname || "",
    username:
      prof.username === "danielghiglione" ? "" : prof.username || "",
    nombre:
      hadAdminName || hadAdminDni ? "" : prof.nombre || "",
    apellido:
      hadAdminName || hadAdminDni ? "" : prof.apellido || "",
    dni: hadAdminDni ? "" : prof.dni || "",
    fechaNacimiento:
      hadAdminDni || prof.fechaNacimiento === "1972-07-11"
        ? ""
        : prof.fechaNacimiento || "",
    genero: hadAdminDni ? "" : prof.genero || "",
    telefono: hadAdminPhone ? "" : prof.telefono || "",
    whatsappE164: hadAdminPhone ? "" : prof.whatsappE164 || "",
    whatsappVerified: hadAdminPhone ? false : Boolean(prof.whatsappVerified),
    whatsappVerifiedAt: hadAdminPhone ? null : prof.whatsappVerifiedAt || null,
    provincia: hadAdminAddress || hadAdminDni ? "" : prof.provincia || "",
    localidad:
      hadAdminAddress || prof.localidad === "Alcira Gigena"
        ? ""
        : prof.localidad || "",
    codigoPostal:
      hadAdminAddress || prof.codigoPostal === "5813"
        ? ""
        : prof.codigoPostal || "",
    barrio:
      hadAdminAddress || (hadAdminDni && prof.barrio === "Centro")
        ? ""
        : prof.barrio || "",
    calle: hadAdminAddress ? "" : prof.calle || "",
    numeroCalle: hadAdminAddress ? "" : prof.numeroCalle || "",
  };

  return cleaned;
}

export function TerapiasAccessPanel({
  idPrefix = "inline",
  initialMode = "login",
}: TerapiasAccessPanelProps) {
  const uniqueId = useId();
  const baseId = `${idPrefix}-${uniqueId}`;

  const [mode, setMode] = useState<AccessTab>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recoverySent, setRecoverySent] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [authenticatedUser, setAuthenticatedUser] =
    useState<AuthenticatedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<ActiveRole | null>(null);
  const [activeSection, setActiveSection] = useState<PersistentSection | null>(
    null
  );

  // Perfiles de usuarios (incluyendo Mi Perfil + Maps + Verificación WhatsApp)
  const [profilesByEmail, setProfilesByEmail] = useState<
    Record<string, ReikiUserProfile>
  >({
    reikionline: DEFAULT_ADMIN_PROFILE,
    "danighiglione@gmail.com": DEFAULT_ADMIN_PROFILE,
  });

  // Selecciones múltiples por rol (combinaciones de terapias)
  const [consultanteSelections, setConsultanteSelections] = useState<string[]>(
    []
  );
  const [terapeutaSelections, setTerapeutaSelections] = useState<string[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [selectionSavedFeedback, setSelectionSavedFeedback] = useState<
    string | null
  >(null);
  const [therapiesConfirmed, setTherapiesConfirmed] = useState(false);
  const [searchMode, setSearchMode] = useState<
    "Por Terapia" | "Por Persona" | null
  >(null);
  const [selectedModality, setSelectedModality] = useState<
    "Presencial con turno" | "Online con turno" | "Online ahora" | null
  >(null);

  // Estado "Otra" -> "¿Cuál?......" por categoría (exclusivo Terapeuta)
  const [otherCheckedByCat, setOtherCheckedByCat] = useState<
    Record<string, boolean>
  >({});
  const [otherInputByCat, setOtherInputByCat] = useState<
    Record<string, string>
  >({});
  const [otherAlertSentByCat, setOtherAlertSentByCat] = useState<
    Record<string, string | null>
  >({});

  // Opciones agregadas y aprobadas por el Administrador + Alertas pendientes
  const [approvedCustomOptions, setApprovedCustomOptions] = useState<
    Record<string, string[]>
  >({});
  const [pendingAdminAlerts, setPendingAdminAlerts] = useState<
    PendingAdminCategoryAlert[]
  >([]);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);
  const [consultasSubTab, setConsultasSubTab] = useState<
    "finalizadas" | "programadas"
  >("finalizadas");
  const [consultasRefreshKey, setConsultasRefreshKey] = useState(0);
  const [activeConsultasVideoRoom, setActiveConsultasVideoRoom] = useState<{
    sessionId: string;
    therapistName: string;
    therapistNickname: string;
    consultanteName: string;
    consultanteEmail: string;
    consultanteNickname: string;
    therapyName: string;
    modalityLabel: "Online con turno" | "Online ahora";
    scheduledSlotLabel: string;
  } | null>(null);

  useEffect(() => {
    if (preselectedContext === "Mis Capacitaciones" && authenticatedUser) {
      setActiveSection("Mis Capacitaciones");
    }
  }, [preselectedContext, authenticatedUser]);

  const loadSyncedData = () => {
    if (typeof window === "undefined") return;

    try {
      const savedProfilesRaw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
      if (savedProfilesRaw) {
        const parsedProfiles = JSON.parse(savedProfilesRaw) as Record<
          string,
          ReikiUserProfile
        >;
        const normalizedProfiles: Record<string, ReikiUserProfile> = {};
        let didCleanInheritedData = false;
        for (const [k, prof] of Object.entries(parsedProfiles)) {
          if (!prof) continue;
          const sanitized = sanitizeStoredProfile(prof, k);
          if (
            sanitized.dni !== prof.dni ||
            sanitized.telefono !== prof.telefono ||
            sanitized.nombre !== prof.nombre ||
            sanitized.apellido !== prof.apellido ||
            sanitized.nickname !== prof.nickname
          ) {
            didCleanInheritedData = true;
          }
          normalizedProfiles[k] = sanitized;
        }
        if (didCleanInheritedData) {
          try {
            window.localStorage.setItem(
              PROFILES_STORAGE_KEY,
              JSON.stringify(normalizedProfiles)
            );
          } catch {
            // Ignore
          }
        }
        setProfilesByEmail((prev) => ({
          ...prev,
          ...normalizedProfiles,
        }));
      }
    } catch {
      // Ignore
    }

    try {
      const savedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (savedSession) {
        const parsed = JSON.parse(savedSession) as AuthenticatedUser;
        if (parsed && parsed.email) {
          setAuthenticatedUser(parsed);
          setMode("role-select");
          if (parsed.isAdmin) {
            setShowAdminPanel(true);
          }
        }
      } else {
        setAuthenticatedUser(null);
      }
    } catch {
      // Ignore storage read errors
    }

    try {
      const savedCustom = window.localStorage.getItem(
        CUSTOM_OPTIONS_STORAGE_KEY
      );
      if (savedCustom) {
        setApprovedCustomOptions(
          JSON.parse(savedCustom) as Record<string, string[]>
        );
      }
    } catch {
      // Ignore
    }

    try {
      const savedAlerts = window.localStorage.getItem(ADMIN_ALERTS_STORAGE_KEY);
      if (savedAlerts) {
        setPendingAdminAlerts(
          JSON.parse(savedAlerts) as PendingAdminCategoryAlert[]
        );
      }
    } catch {
      // Ignore
    }

    try {
      const savedSelections = window.localStorage.getItem(
        SELECTIONS_STORAGE_KEY
      );
      if (savedSelections) {
        const parsed = JSON.parse(savedSelections) as {
          consultante?: string[];
          terapeuta?: string[];
        };
        if (Array.isArray(parsed.consultante)) {
          setConsultanteSelections(parsed.consultante);
        }
        if (Array.isArray(parsed.terapeuta)) {
          setTerapeutaSelections(parsed.terapeuta);
        }
      }
    } catch {
      // Ignore
    }

    try {
      const savedRole = window.localStorage.getItem(SELECTED_ROLE_STORAGE_KEY);
      if (savedRole === "Consultante" || savedRole === "Terapeuta") {
        setSelectedRole(savedRole);
      } else {
        setSelectedRole(null);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    loadSyncedData();

    const handleSync = () => loadSyncedData();
    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener("storage", handleSync);

    const existingScript = document.getElementById("google-gsi-client-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-gsi-client-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  const notifySync = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(SYNC_EVENT_NAME));
    }
  };

  const currentProfileKey = authenticatedUser?.email?.toLowerCase() || "";
  const activeUserProfile: ReikiUserProfile | null = authenticatedUser
    ? profilesByEmail[currentProfileKey] ||
      buildDefaultProfileForUser(authenticatedUser)
    : null;

  const saveUserProfile = (updated: ReikiUserProfile) => {
    if (!authenticatedUser) return;
    const key = authenticatedUser.email.toLowerCase();
    const nextMap: Record<string, ReikiUserProfile> = {
      ...profilesByEmail,
      [key]: updated,
    };
    if (authenticatedUser.isAdmin) {
      nextMap["reikionline"] = updated;
      nextMap["danighiglione@gmail.com"] = updated;
    }
    setProfilesByEmail(nextMap);
    try {
      window.localStorage.setItem(
        PROFILES_STORAGE_KEY,
        JSON.stringify(nextMap)
      );
      notifySync();
    } catch {
      // Ignore
    }
  };

  const persistSelections = (
    nextConsultante: string[],
    nextTerapeuta: string[]
  ) => {
    try {
      window.localStorage.setItem(
        SELECTIONS_STORAGE_KEY,
        JSON.stringify({
          consultante: nextConsultante,
          terapeuta: nextTerapeuta,
        })
      );
      notifySync();
    } catch {
      // Ignore
    }
  };

  const persistUserSession = (user: AuthenticatedUser) => {
    setAuthenticatedUser(user);
    setSelectedRole(null);
    setActiveSection(null);
    setAuthError(null);
    setMode("role-select");
    if (user.isAdmin) {
      setShowAdminPanel(true);
    }

    const key = user.email.toLowerCase();
    const rawExisting = profilesByEmail[key];
    const existing = rawExisting ? sanitizeStoredProfile(rawExisting, key) : null;
    if (!existing) {
      const initialProfile = buildDefaultProfileForUser(user);
      const nextMap = {
        ...profilesByEmail,
        [key]: initialProfile,
      };
      setProfilesByEmail(nextMap);
      try {
        window.localStorage.setItem(
          PROFILES_STORAGE_KEY,
          JSON.stringify(nextMap)
        );
      } catch {
        // Ignore
      }
    } else {
      const updatedExisting: ReikiUserProfile = {
        ...existing,
        fotoUrl: existing.fotoUrl || user.picture || "",
      };
      const nextMap = {
        ...profilesByEmail,
        [key]: updatedExisting,
      };
      setProfilesByEmail(nextMap);
      try {
        window.localStorage.setItem(
          PROFILES_STORAGE_KEY,
          JSON.stringify(nextMap)
        );
      } catch {
        // Ignore
      }
    }

    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
      notifySync();
    } catch {
      // Ignore storage write errors
    }
  };

  const syncAriaInvalid = (
    e: React.FocusEvent<HTMLInputElement> | React.FormEvent<HTMLInputElement>
  ) => {
    const el = e.currentTarget;
    if (typeof el.matches === "function") {
      try {
        el.setAttribute(
          "aria-invalid",
          el.matches(":user-invalid") ? "true" : "false"
        );
      } catch {
        el.setAttribute("aria-invalid", !el.validity.valid ? "true" : "false");
      }
    }
  };

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;

    const isAdminLogin =
      (cleanEmail.toLowerCase() === "reikionline" ||
        cleanEmail.toLowerCase() === "admin@reikionline.com.ar" ||
        cleanEmail.toLowerCase() === "danighiglione@gmail.com") &&
      password === "Reiki2026";

    const derivedName = isAdminLogin
      ? "Daniel Alejandro Ghiglione"
      : cleanEmail.split("@")[0].replace(/[._-]/g, " ");

    persistUserSession({
      name: derivedName.charAt(0).toUpperCase() + derivedName.slice(1),
      email: isAdminLogin ? "danighiglione@gmail.com" : cleanEmail,
      provider: "Correo",
      isAdmin: isAdminLogin,
    });
  };

  const handleRegisterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    persistUserSession({
      name: fullName.trim() || cleanEmail.split("@")[0],
      email: cleanEmail,
      provider: "Correo",
    });
  };

  const handleGoogleContinue = () => {
    setAuthError(null);

    const oauth2 = window.google?.accounts?.oauth2;
    if (!oauth2) {
      setAuthError(
        "Cargando servicios de Google, intentá nuevamente en un segundo."
      );
      return;
    }

    setGoogleLoading(true);

    try {
      const tokenClient = oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        prompt: "select_account",
        callback: async (tokenResponse: GoogleTokenResponse) => {
          if (tokenResponse.error || !tokenResponse.access_token) {
            setGoogleLoading(false);
            setAuthError("No se completó el acceso con Google.");
            return;
          }

          try {
            const res = await fetch(
              "https://www.googleapis.com/oauth2/v3/userinfo",
              {
                headers: {
                  Authorization: `Bearer ${tokenResponse.access_token}`,
                },
              }
            );

            if (!res.ok) {
              throw new Error("No se pudo verificar el perfil de Google");
            }

            const profile = (await res.json()) as {
              name?: string;
              email?: string;
              picture?: string;
            };

            const isGoogleAdmin = isAdminIdentity(profile.email);
            persistUserSession({
              name: isGoogleAdmin
                ? "Daniel Alejandro Ghiglione"
                : profile.name || "",
              email: profile.email || "",
              picture: profile.picture,
              provider: "Google",
              isAdmin: isGoogleAdmin,
            });
          } catch {
            setAuthError("Error al obtener los datos de tu cuenta de Google.");
          } finally {
            setGoogleLoading(false);
          }
        },
        error_callback: () => {
          setGoogleLoading(false);
        },
      });

      tokenClient.requestAccessToken({ prompt: "select_account" });
    } catch {
      setGoogleLoading(false);
      setAuthError("No se pudo abrir la ventana de Google.");
    }
  };

  const handleRecoverSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRecoverySent(true);
  };

  const handleChooseRole = (role: ActiveRole) => {
    setSelectedRole(role);
    setActiveSection(null);
    setSelectionSavedFeedback(null);
    setSearchMode(null);
    setTherapiesConfirmed(false);
    setSelectedModality(null);
    try {
      window.localStorage.setItem(SELECTED_ROLE_STORAGE_KEY, role);
      notifySync();
    } catch {
      // Ignore
    }
  };

  const handleGoToComoIngresas = () => {
    setActiveSection(null);
    setSelectedRole(null);
    setSearchMode(null);
    setTherapiesConfirmed(false);
    setSelectedModality(null);
    setSelectionSavedFeedback(null);
    try {
      window.localStorage.removeItem(SELECTED_ROLE_STORAGE_KEY);
      notifySync();
    } catch {
      // Ignore
    }
  };

  const handleGoToComoBuscas = () => {
    setActiveSection(null);
    setSearchMode(null);
    setTherapiesConfirmed(false);
    setSelectedModality(null);
    setSelectionSavedFeedback(null);
  };

  const handleBackToRoleSelect = () => {
    if (activeSection) {
      handleGoToComoIngresas();
      return;
    }
    if (selectedModality) {
      setSelectedModality(null);
      return;
    }
    if (therapiesConfirmed) {
      setTherapiesConfirmed(false);
      setSelectedModality(null);
      return;
    }
    if (searchMode) {
      setSearchMode(null);
      return;
    }
    handleGoToComoIngresas();
  };

  const handleResetSession = () => {
    setAuthenticatedUser(null);
    setSelectedRole(null);
    setActiveSection(null);
    setSearchMode(null);
    setTherapiesConfirmed(false);
    setSelectedModality(null);
    setPassword("");
    setAuthError(null);
    setShowAdminPanel(false);
    setMode("login");
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
      window.localStorage.removeItem(SELECTED_ROLE_STORAGE_KEY);
      notifySync();
    } catch {
      // Ignore storage errors
    }
  };

  // Obtener lista combinada (opciones oficiales + opciones aprobadas por el Administrador)
  const getCategoryOptions = (cat: RoleTherapyCategory): string[] => {
    const customList = approvedCustomOptions[cat.id] || [];
    const merged = [...cat.options];
    for (const item of customList) {
      if (
        !merged.some((existing) => existing.toLowerCase() === item.toLowerCase())
      ) {
        merged.push(item);
      }
    }
    return merged;
  };

  const activeSelections =
    selectedRole === "Terapeuta" ? terapeutaSelections : consultanteSelections;

  const toggleTherapyOption = (optionLabel: string) => {
    setSelectionSavedFeedback(null);
    if (selectedRole === "Terapeuta") {
      const exists = terapeutaSelections.includes(optionLabel);
      const next = exists
        ? terapeutaSelections.filter((item) => item !== optionLabel)
        : [...terapeutaSelections, optionLabel];
      setTerapeutaSelections(next);
      persistSelections(consultanteSelections, next);
    } else {
      const exists = consultanteSelections.includes(optionLabel);
      const next = exists
        ? consultanteSelections.filter((item) => item !== optionLabel)
        : [...consultanteSelections, optionLabel];
      setConsultanteSelections(next);
      persistSelections(next, terapeutaSelections);
    }
  };

  const clearCurrentRoleSelections = () => {
    setSelectionSavedFeedback(null);
    if (selectedRole === "Terapeuta") {
      setTerapeutaSelections([]);
      persistSelections(consultanteSelections, []);
    } else {
      setConsultanteSelections([]);
      persistSelections([], terapeutaSelections);
    }
  };

  // Cuando el Terapeuta escribe en "Otra" -> "¿Cuál?......" y lo agrega
  const handleProposeOtherOption = (cat: RoleTherapyCategory) => {
    const rawValue = (otherInputByCat[cat.id] || "").trim();
    if (!rawValue) return;

    const formattedOption =
      rawValue.charAt(0).toUpperCase() + rawValue.slice(1);

    // 1. Incluir inmediatamente en la combinación seleccionada por el Terapeuta
    const nextTerapeuta = terapeutaSelections.includes(formattedOption)
      ? terapeutaSelections
      : [...terapeutaSelections, formattedOption];
    setTerapeutaSelections(nextTerapeuta);
    persistSelections(consultanteSelections, nextTerapeuta);

    // 2. Verificar si ya existe en la categoría; si no está, disparar alerta al Administrador
    const currentCatOptions = getCategoryOptions(cat);
    const alreadyInList = currentCatOptions.some(
      (opt) => opt.toLowerCase() === formattedOption.toLowerCase()
    );

    if (!alreadyInList) {
      const alreadyAlerted = pendingAdminAlerts.some(
        (alert) =>
          alert.categoryId === cat.id &&
          alert.proposedOption.toLowerCase() === formattedOption.toLowerCase()
      );

      if (!alreadyAlerted) {
        const newAlert: PendingAdminCategoryAlert = {
          id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          categoryId: cat.id,
          categoryNumber: cat.number,
          categoryTitle: cat.title,
          proposedOption: formattedOption,
          proposedBy: authenticatedUser?.name || "Terapeuta",
          createdAt: new Date().toISOString(),
        };
        const nextAlerts = [newAlert, ...pendingAdminAlerts];
        setPendingAdminAlerts(nextAlerts);
        try {
          window.localStorage.setItem(
            ADMIN_ALERTS_STORAGE_KEY,
            JSON.stringify(nextAlerts)
          );
          notifySync();
        } catch {
          // Ignore
        }
      }

      setOtherAlertSentByCat((prev) => ({
        ...prev,
        [cat.id]: `Se sumó «${formattedOption}» a tus terapias ofrecidas y se envió una alerta al Administrador para evaluar su incorporación a «${cat.title}».`,
      }));
      setShowAdminPanel(true);
    } else {
      setOtherAlertSentByCat((prev) => ({
        ...prev,
        [cat.id]: `«${formattedOption}» ya forma parte de la lista y quedó seleccionada en tu combinación.`,
      }));
    }

    setOtherInputByCat((prev) => ({ ...prev, [cat.id]: "" }));
  };

  // Acción del Administrador: Aprobar y agregar a la lista existente como opción válida
  const handleAdminApproveAlert = (alertItem: PendingAdminCategoryAlert) => {
    const existingCustom = approvedCustomOptions[alertItem.categoryId] || [];
    const alreadyExists = existingCustom.some(
      (opt) => opt.toLowerCase() === alertItem.proposedOption.toLowerCase()
    );

    const nextCustomForCat = alreadyExists
      ? existingCustom
      : [...existingCustom, alertItem.proposedOption];

    const nextCustomMap: Record<string, string[]> = {
      ...approvedCustomOptions,
      [alertItem.categoryId]: nextCustomForCat,
    };

    const nextAlerts = pendingAdminAlerts.filter(
      (item) => item.id !== alertItem.id
    );

    setApprovedCustomOptions(nextCustomMap);
    setPendingAdminAlerts(nextAlerts);
    setAdminFeedback(
      `Se agregó «${alertItem.proposedOption}» como opción válida en «${alertItem.categoryTitle}».`
    );

    try {
      window.localStorage.setItem(
        CUSTOM_OPTIONS_STORAGE_KEY,
        JSON.stringify(nextCustomMap)
      );
      window.localStorage.setItem(
        ADMIN_ALERTS_STORAGE_KEY,
        JSON.stringify(nextAlerts)
      );
      notifySync();
    } catch {
      // Ignore
    }
  };

  // Acción del Administrador: Descartar alerta
  const handleAdminDismissAlert = (alertId: string) => {
    const nextAlerts = pendingAdminAlerts.filter((item) => item.id !== alertId);
    setPendingAdminAlerts(nextAlerts);
    setAdminFeedback("Propuesta descartada por el Administrador.");
    try {
      window.localStorage.setItem(
        ADMIN_ALERTS_STORAGE_KEY,
        JSON.stringify(nextAlerts)
      );
      notifySync();
    } catch {
      // Ignore
    }
  };

  const isWhatsAppVerified = Boolean(activeUserProfile?.whatsappVerified);
  const isBiometricVerified = Boolean(
    activeUserProfile &&
      (activeUserProfile.biometricVerification
        ? isBiometricVerifiedAndValid(activeUserProfile.biometricVerification)
        : activeUserProfile.isAdmin)
  );
  const consultanteRisk = evaluateConsultanteBiometricRisk({
    record: activeUserProfile?.biometricVerification,
    dni: activeUserProfile?.dni,
  });
  const requiresBiometricGate = Boolean(
    (selectedRole === "Terapeuta" && !isBiometricVerified) ||
      (selectedRole === "Consultante" && consultanteRisk.requiresBiometric)
  );

  return (
    <div className="rounded-3xl border border-[#836DAD]/25 bg-white p-6 sm:p-8 text-[#2B1F42] shadow-xl shadow-[#836DAD]/10">
      {/* BORDE SUPERIOR FIJO Y SIEMPRE VISIBLE (Cabecera + Barra Mi Perfil · Mi Credencial · Mis Consultas · Mi Billetera) */}
      <div
        className={`${
          idPrefix === "modal" ? "sticky top-0" : "sticky top-16 sm:top-20"
        } z-20 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 rounded-t-3xl border-b border-[#836DAD]/15 bg-white/95 px-6 pt-5 pb-4 sm:px-8 sm:pt-6 sm:pb-4 backdrop-blur-md shadow-xs`}
      >
        <div
          className={`flex flex-wrap items-center justify-between gap-3 ${
            idPrefix === "modal" ? "pr-10" : ""
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="shrink-0 overflow-hidden rounded-2xl bg-[#836DAD] p-1.5 shadow-sm">
              <img
                src="/brand/Reiki_Icono_Lavanda_Unificado.png"
                alt="Reiki Online"
                width={40}
                height={40}
                className="h-10 w-10 object-contain"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-semibold text-[#2B1F42]">
                  {authenticatedUser
                    ? !isWhatsAppVerified
                      ? "Verificación de WhatsApp"
                      : selectedRole
                      ? `Espacio de ${selectedRole}`
                      : "Reiki Online"
                    : mode === "register"
                    ? "Registrarme"
                    : mode === "recover"
                    ? "Recuperar contraseña"
                    : "Ingresar"}
                </h3>
                {authenticatedUser &&
                  isWhatsAppVerified &&
                  isBiometricVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#836DAD] px-2.5 py-0.5 text-[11px] font-bold text-[#F3D791] shadow-2xs">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      ✓ Identidad verificada
                    </span>
                  )}
              </div>
              {authenticatedUser && activeUserProfile && !isWhatsAppVerified && (
                <p className="text-xs font-medium text-[#836DAD]">
                  Estado: WhatsApp sin verificar
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botones rectangulares en la parte fija superior: ¿Cómo ingresas? y ¿Cómo buscas? */}
            {authenticatedUser && isWhatsAppVerified && (
              <>
                <button
                  type="button"
                  onClick={handleGoToComoIngresas}
                  title="Ir a ¿Cómo ingresas?"
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
                    !selectedRole && !activeSection
                      ? "border-[#836DAD] bg-[#836DAD] text-white shadow-sm"
                      : "border-[#836DAD]/25 bg-[#F6F3FA] text-[#2B1F42] hover:bg-[#836DAD] hover:text-white"
                  }`}
                >
                  {(selectedRole || activeSection) && (
                    <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span>¿Cómo ingresas?</span>
                </button>

                {selectedRole && (
                  <button
                    type="button"
                    onClick={handleGoToComoBuscas}
                    title="Ir a ¿Cómo buscas?"
                    className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs sm:text-sm font-semibold transition-all ${
                      selectedRole &&
                      !activeSection &&
                      !searchMode &&
                      !therapiesConfirmed
                        ? "border-[#836DAD] bg-[#836DAD] text-white shadow-sm"
                        : "border-[#836DAD]/25 bg-[#F6F3FA] text-[#2B1F42] hover:bg-[#836DAD] hover:text-white"
                    }`}
                  >
                    {(activeSection || searchMode || therapiesConfirmed) && (
                      <ArrowLeft className="h-3.5 w-3.5 shrink-0" />
                    )}
                    <span>¿Cómo buscas?</span>
                  </button>
                )}
              </>
            )}

            {/* Botón / Indicador de Alerta al Administrador */}
            {(pendingAdminAlerts.length > 0 || authenticatedUser?.isAdmin) && (
              <button
                type="button"
                onClick={() => setShowAdminPanel((prev) => !prev)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
                  pendingAdminAlerts.length > 0
                    ? "border-[#836DAD] bg-[#F3D791] text-[#2B1F42] shadow-sm"
                    : "border-[#836DAD]/25 bg-[#F6F3FA] text-[#836DAD]"
                }`}
                title="Ver panel y alertas del Administrador"
              >
                <BellRing className="h-3.5 w-3.5 text-[#836DAD]" />
                <span>
                  Admin
                  {pendingAdminAlerts.length > 0
                    ? ` (${pendingAdminAlerts.length} alerta${
                        pendingAdminAlerts.length === 1 ? "" : "s"
                      })`
                    : ""}
                </span>
              </button>
            )}

            {authenticatedUser && (
              <button
                type="button"
                onClick={handleResetSession}
                title="Salir"
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD]/25 px-3 py-1.5 text-xs font-semibold text-[#836DAD] transition-colors hover:bg-[#836DAD]/10"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span>Salir</span>
              </button>
            )}
          </div>
        </div>

        {/* BARRA SUPERIOR SIEMPRE FIJA Y VISIBLE: Mi Perfil · Mi Credencial · Mis Consultas · Mis Capacitaciones · Mi Billetera · Mi Red Social */}
        {authenticatedUser && isWhatsAppVerified && (
          <nav
            aria-label="Accesos permanentes del usuario"
            className="mt-3.5 grid grid-cols-2 gap-2 rounded-2xl bg-[#F6F3FA] p-1.5 sm:grid-cols-3 lg:grid-cols-6"
          >
            {(
              [
                { label: "Mi Perfil", icon: User },
                { label: "Mi Credencial", icon: IdCard },
                { label: "Mis Consultas", icon: Calendar },
                { label: "Mis Capacitaciones", icon: GraduationCap },
                { label: "Mi Billetera", icon: Wallet },
                { label: "Mi Red Social", icon: Users },
              ] as const
            ).map(({ label, icon: Icon }) => {
              const isActive = activeSection === label;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() =>
                    setActiveSection((prev) =>
                      prev === label ? null : label
                    )
                  }
                  className={`inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-[#836DAD] text-white shadow-sm"
                      : "bg-white text-[#2B1F42] hover:bg-[#836DAD]/12"
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* ALERTA AL ADMINISTRADOR: Nueva categoría / opción ofrecida + Estado de Verificación WhatsApp */}
      {(pendingAdminAlerts.length > 0 || showAdminPanel) && (
        <div
          role="alert"
          aria-live="polite"
          className="mt-4 rounded-2xl border-2 border-[#836DAD] bg-[#F6F3FA] p-4 sm:p-5 shadow-md space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-[#836DAD] text-[#F3D791]">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-xs sm:text-sm font-semibold text-[#2B1F42]">
                  Panel de Administrador · Nuevas opciones y Verificación WhatsApp
                </h4>
                <p className="text-[11px] sm:text-xs text-[#2B1F42]/75">
                  Gestión de terapias propuestas en el PWA y estado de
                  verificación de WhatsApp (Twilio Verify E.164).
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowAdminPanel(false)}
              className="cursor-pointer text-xs font-semibold text-[#836DAD] underline"
            >
              Ocultar
            </button>
          </div>

          {adminFeedback && (
            <div className="flex items-center gap-2 rounded-xl border border-[#836DAD]/25 bg-white px-3 py-2 text-xs font-semibold text-[#836DAD]">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{adminFeedback}</span>
            </div>
          )}

          {pendingAdminAlerts.length > 0 ? (
            <ul className="space-y-2.5">
              {pendingAdminAlerts.map((alertItem) => (
                <li
                  key={alertItem.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-[#836DAD]/25 bg-white p-3.5"
                >
                  <div className="space-y-0.5">
                    <span className="inline-block rounded-full bg-[#836DAD]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#836DAD]">
                      Categoría {alertItem.categoryNumber}: {alertItem.categoryTitle}
                    </span>
                    <p className="text-sm font-semibold text-[#2B1F42]">
                      Nueva opción ofrecida: «{alertItem.proposedOption}»
                    </p>
                    <p className="text-[11px] text-[#2B1F42]/65">
                      Ofrecida por: {alertItem.proposedBy}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleAdminApproveAlert(alertItem)}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#6F599B]"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-[#F3D791]" />
                      <span>Agregar a la lista existente</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdminDismissAlert(alertItem.id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] px-3 py-2 text-xs font-semibold text-[#2B1F42]/75 transition-colors hover:bg-[#836DAD]/10 hover:text-[#2B1F42]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Descartar</span>
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#2B1F42]/70">
              No hay alertas pendientes de nuevas terapias en este momento.
            </p>
          )}

          {/* Resumen de estado de verificación WhatsApp para herramientas del Administrador */}
          {authenticatedUser?.isAdmin && (
            <div className="rounded-xl border border-[#836DAD]/20 bg-white p-3.5 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#2B1F42]">
                  Usuarios registrados y Estado de Verificación WhatsApp (Twilio Verify)
                </span>
                <span className="rounded-full bg-[#F6F3FA] px-2.5 py-0.5 text-[11px] font-semibold text-[#836DAD]">
                  Formato E.164 activo
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#836DAD]/15 text-[#836DAD]">
                    <tr>
                      <th className="py-1.5 pr-3">Nombre</th>
                      <th className="py-1.5 pr-3">WhatsApp</th>
                      <th className="py-1.5 pr-3">Identidad Biométrica</th>
                      <th className="py-1.5 pr-3">Simular Estado / Riesgo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#836DAD]/10">
                    {Object.values(
                      Object.values(profilesByEmail).reduce<
                        Record<string, ReikiUserProfile>
                      >((acc, prof) => {
                        acc[prof.id] = prof;
                        return acc;
                      }, {})
                    ).map((prof) => {
                      const bioRec =
                        prof.biometricVerification ||
                        createInitialBiometricRecord(prof.id, Boolean(prof.isAdmin));
                      return (
                        <tr key={prof.id}>
                          <td className="py-1.5 pr-3 font-medium">
                            {prof.nombre} {prof.apellido}
                          </td>
                          <td className="py-1.5 pr-3">
                            {prof.whatsappVerified ? (
                              <span className="text-emerald-700 font-semibold">
                                WhatsApp verificado
                              </span>
                            ) : (
                              <span className="text-amber-700 font-semibold">
                                WhatsApp sin verificar
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 pr-3">
                            <span
                              className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                bioRec.status === "verificada"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : bioRec.status === "pendiente"
                                  ? "bg-amber-100 text-amber-800"
                                  : bioRec.status === "rechazada"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-[#F4F0FA] text-[#5E4B8B]"
                              }`}
                            >
                              {bioRec.status === "verificada"
                                ? "✓ Identidad verificada"
                                : bioRec.status}
                            </span>
                          </td>
                          <td className="py-1.5 pr-3">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <select
                                aria-label="Cambiar estado biométrico"
                                value={bioRec.status}
                                onChange={(e) => {
                                  const nextSt = e.target
                                    .value as BiometricVerificationStatus;
                                  const nowIso = new Date().toISOString();
                                  const nextBio = {
                                    ...bioRec,
                                    status: nextSt,
                                    resolvedAt:
                                      nextSt === "verificada" ||
                                      nextSt === "rechazada"
                                        ? nowIso
                                        : null,
                                    expiresAt:
                                      nextSt === "verificada"
                                        ? new Date(
                                            Date.now() +
                                              365 * 24 * 60 * 60 * 1000
                                          ).toISOString()
                                        : null,
                                    technicalResult:
                                      nextSt === "verificada"
                                        ? {
                                            dniFrontCaptured: true,
                                            dniBackCaptured: true,
                                            selfieCaptured: true,
                                            livenessPassed: true,
                                            facialMatchScore: 99.1,
                                            renaperChecked: true,
                                            renaperStatus: "validado" as const,
                                            providerReference: `ADM-${prof.id.toUpperCase()}`,
                                            serverSignature: `adm-sig-${Date.now()}`,
                                          }
                                        : bioRec.technicalResult,
                                    rejectionOrReviewReason:
                                      nextSt === "rechazada"
                                        ? "Imagen del documento borrosa o con reflejos. Intentá nuevamente con buena luz."
                                        : nextSt === "revision_requerida"
                                        ? "Derivado a revisión documental asistida."
                                        : null,
                                  };
                                  saveUserProfile({
                                    ...prof,
                                    biometricVerification: nextBio,
                                  });
                                }}
                                className="rounded-lg border border-[#836DAD]/30 bg-white px-2 py-1 text-[11px] font-semibold text-[#2B1F42]"
                              >
                                <option value="no_iniciada">no_iniciada</option>
                                <option value="pendiente">pendiente</option>
                                <option value="verificada">verificada</option>
                                <option value="rechazada">rechazada</option>
                                <option value="revision_requerida">
                                  revision_requerida
                                </option>
                              </select>
                              <button
                                type="button"
                                onClick={() => {
                                  const hasRisk =
                                    (bioRec.riskFlags || []).length > 0;
                                  saveUserProfile({
                                    ...prof,
                                    biometricVerification: {
                                      ...bioRec,
                                      status: hasRisk
                                        ? bioRec.status
                                        : "no_iniciada",
                                      riskFlags: hasRisk
                                        ? []
                                        : ["alerta_seguridad"],
                                    },
                                  });
                                }}
                                className="cursor-pointer rounded-lg border border-[#836DAD]/30 bg-[#FAF8FC] px-2 py-1 text-[10px] font-bold text-[#5E4B8B] hover:bg-[#836DAD] hover:text-white"
                              >
                                {(bioRec.riskFlags || []).length > 0
                                  ? "Quitar alerta riesgo Consultante"
                                  : "Simular riesgo Consultante"}
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* SECCIÓN EXCLUSIVA PARA EL ADMINISTRADOR (INVISIBLE EN NAVEGACIÓN PÚBLICA):
              PAGOS Y COMISIONES — MERCADO PAGO SPLIT 1:1 + SUPERVISIÓN DE CAPACITACIONES */}
          {authenticatedUser?.isAdmin && (
            <div className="space-y-4">
              <AdminPaymentsCommissionsPanel
                adminUser={authenticatedUser.email}
              />
              <AdminTrainingsSupervisionPanel
                adminUser={authenticatedUser.email}
              />
            </div>
          )}
        </div>
      )}

      {authError && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-[#836DAD]/30 bg-[#F6F3FA] px-3.5 py-2.5 text-xs font-semibold text-[#836DAD]"
        >
          {authError}
        </div>
      )}

      {/* 1. MODO LOGIN */}
      {!authenticatedUser && mode === "login" && (
        <div className="mt-5">
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="ro-field">
              <label
                htmlFor={`${baseId}-email`}
                className="block text-xs sm:text-sm font-semibold text-[#2B1F42]"
              >
                Correo electrónico
              </label>
              <input
                type="text"
                id={`${baseId}-email`}
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={syncAriaInvalid}
                onInput={syncAriaInvalid}
                required
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="next"
                placeholder="tucorreo@ejemplo.com"
                className="ro-input mt-1.5 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-3 text-base sm:text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/40 focus:border-[#836DAD] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="ro-field">
              <div className="flex items-center justify-between gap-2">
                <label
                  htmlFor={`${baseId}-current-password`}
                  className="block text-xs sm:text-sm font-semibold text-[#2B1F42]"
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setRecoverySent(false);
                    setMode("recover");
                  }}
                  className="cursor-pointer text-xs font-semibold text-[#836DAD] underline underline-offset-4 hover:text-[#5E4987]"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  id={`${baseId}-current-password`}
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={syncAriaInvalid}
                  onInput={syncAriaInvalid}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  placeholder="••••••••"
                  className="ro-input w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] py-3 pr-24 pl-4 text-base sm:text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/40 focus:border-[#836DAD] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#836DAD] hover:bg-[#836DAD]/10"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      <span>Ocultar</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      <span>Mostrar</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-[#836DAD] px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#836DAD]/25 transition-all hover:bg-[#6F599B]"
            >
              Ingresar
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#836DAD]/15" />
            <span className="text-xs font-medium text-[#2B1F42]/60">o</span>
            <div className="h-px flex-1 bg-[#836DAD]/15" />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleGoogleContinue}
              disabled={googleLoading}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-[#836DAD]/30 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-[#2B1F42] transition-all hover:border-[#836DAD] hover:bg-[#F6F3FA] disabled:opacity-60"
            >
              {googleLoading ? (
                <Loader2 className="h-4 w-4 animate-spin text-[#836DAD]" />
              ) : (
                <svg
                  className="h-4 w-4 shrink-0"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fill="#4285F4"
                    d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"
                  />
                </svg>
              )}
              <span>Google</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("register")}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-[#836DAD] bg-[#F3D791]/35 px-4 py-3 text-xs sm:text-sm font-semibold text-[#2B1F42] transition-all hover:bg-[#F3D791]"
            >
              <span>Registrarme</span>
            </button>
          </div>
        </div>
      )}

      {/* 2. MODO REGISTRO */}
      {!authenticatedUser && mode === "register" && (
        <div className="mt-5">
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div>
              <label
                htmlFor={`${baseId}-fullname`}
                className="block text-xs sm:text-sm font-semibold text-[#2B1F42]"
              >
                Nombre y apellido
              </label>
              <input
                type="text"
                id={`${baseId}-fullname`}
                name="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                autoComplete="name"
                enterKeyHint="next"
                placeholder="Tu nombre"
                className="ro-input mt-1.5 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-3 text-base sm:text-sm text-[#2B1F42] focus:border-[#836DAD] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor={`${baseId}-reg-email`}
                className="block text-xs sm:text-sm font-semibold text-[#2B1F42]"
              >
                Correo electrónico
              </label>
              <input
                type="email"
                id={`${baseId}-reg-email`}
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="next"
                placeholder="tucorreo@ejemplo.com"
                className="ro-input mt-1.5 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-3 text-base sm:text-sm text-[#2B1F42] focus:border-[#836DAD] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor={`${baseId}-new-password`}
                className="block text-xs sm:text-sm font-semibold text-[#2B1F42]"
              >
                Contraseña
              </label>
              <div className="relative mt-1.5">
                <input
                  type={showPassword ? "text" : "password"}
                  id={`${baseId}-new-password`}
                  name="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  enterKeyHint="done"
                  placeholder="••••••••"
                  className="ro-input w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] py-3 pr-24 pl-4 text-base sm:text-sm text-[#2B1F42] focus:border-[#836DAD] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#836DAD] hover:bg-[#836DAD]/10"
                >
                  {showPassword ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-[#836DAD] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#6F599B]"
            >
              Registrarme
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between border-t border-[#836DAD]/15 pt-4">
            <button
              type="button"
              onClick={() => setMode("login")}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#836DAD] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Volver</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleContinue}
              className="cursor-pointer text-xs font-semibold text-[#2B1F42] underline underline-offset-4 hover:text-[#836DAD]"
            >
              Google
            </button>
          </div>
        </div>
      )}

      {/* 3. MODO RECUPERAR CONTRASEÑA */}
      {!authenticatedUser && mode === "recover" && (
        <div className="mt-5 space-y-4">
          {!recoverySent ? (
            <form onSubmit={handleRecoverSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor={`${baseId}-recover-email`}
                  className="block text-xs sm:text-sm font-semibold text-[#2B1F42]"
                >
                  Correo electrónico
                </label>
                <input
                  type="email"
                  id={`${baseId}-recover-email`}
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="tucorreo@ejemplo.com"
                  className="ro-input mt-1.5 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-3 text-base sm:text-sm text-[#2B1F42] focus:border-[#836DAD] focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full cursor-pointer rounded-xl bg-[#836DAD] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#6F599B]"
              >
                Enviar enlace
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-4 text-center text-sm font-semibold text-[#2B1F42]">
              Enlace enviado a {email || "tu correo"}
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode("login")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#836DAD] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver</span>
          </button>
        </div>
      )}

      {/* 4. PANTALLA POST-LOGIN:
          - Si WhatsApp NO está verificado: muestra primero Verificación obligatoria de WhatsApp (Twilio Verify)
          - Si WhatsApp está verificado:
            Arriba: «Consultante» | «Terapeuta»
            Al elegir rol: Las 6 categorías sin números duplicados ni "(podés combinar opciones)"
            Abajo: Barra fija «Mi Perfil · Mi Credencial · Mis Consultas · Mi Billetera» */}
      {authenticatedUser && activeUserProfile && (
        <div className="mt-6 space-y-6">
          {!isWhatsAppVerified ? (
            <WhatsAppVerificationStep
              key={activeUserProfile.email}
              initialPrefijo={activeUserProfile.prefijoTelefono}
              initialTelefono={activeUserProfile.telefono}
              initialConsents={activeUserProfile.consents}
              userEmail={activeUserProfile.email}
              onVerified={(res) => {
                const updated: ReikiUserProfile = {
                  ...activeUserProfile,
                  prefijoTelefono: res.prefijoTelefono,
                  telefono: res.telefono,
                  whatsappE164: res.whatsappE164,
                  whatsappVerified: true,
                  whatsappVerifiedAt: res.whatsappVerifiedAt,
                  whatsappChannel: res.channel,
                  consents: res.consents,
                  updatedAt: new Date().toISOString(),
                };
                saveUserProfile(updated);
              }}
            />
          ) : (
            <>
              {/* Opciones principales debajo de la línea de Mi Perfil: ¿Cómo ingresas? + Consultante | Terapeuta */}
              {!selectedRole && !activeSection && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] px-4 py-3.5 text-center">
                    <h4 className="text-base sm:text-lg font-semibold text-[#2B1F42]">
                      ¿Cómo ingresas?
                    </h4>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => handleChooseRole("Consultante")}
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-[#836DAD]/30 bg-white p-6 text-center text-[#2B1F42] transition-all hover:border-[#836DAD] hover:bg-[#836DAD] hover:text-white hover:shadow-md group"
                    >
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#836DAD] text-[#F3D791] group-hover:bg-white/20">
                        <HeartHandshake className="h-6 w-6" />
                      </span>
                      <span className="text-lg font-semibold">Consultante</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChooseRole("Terapeuta")}
                      className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-[#836DAD]/30 bg-white p-6 text-center text-[#2B1F42] transition-all hover:border-[#836DAD] hover:bg-[#836DAD] hover:text-white hover:shadow-md group"
                    >
                      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3D791] text-[#836DAD] group-hover:text-[#2B1F42]">
                        <UserCheck className="h-6 w-6" />
                      </span>
                      <span className="text-lg font-semibold">Terapeuta</span>
                    </button>
                  </div>
                </div>
              )}

              {/* SECCIÓN ACTIVA DE LA BARRA SUPERIOR: MI PERFIL (Geoposición Satelital + Maps) */}
              {activeSection === "Mi Perfil" && (
                <UserProfilePanel
                  key={activeUserProfile.email}
                  profile={activeUserProfile}
                  googlePhotoUrl={authenticatedUser?.picture}
                  allProfiles={profilesByEmail}
                  selectedTherapies={activeSelections}
                  activeRoleLabel={selectedRole || "Terapeuta"}
                  onSaveProfile={(updated) => saveUserProfile(updated)}
                />
              )}

              {/* SECCIÓN ACTIVA DE LA BARRA SUPERIOR: MI CREDENCIAL (Tamaño Feed + Tamaño Estados + QR) */}
              {activeSection === "Mi Credencial" && (
                <UserCredentialPanel
                  profile={activeUserProfile}
                  activeRole={selectedRole || "Consultante"}
                  terapeutaSelections={terapeutaSelections}
                  onSaveProfile={(updated) => saveUserProfile(updated)}
                />
              )}

              {/* SECCIÓN ACTIVA DE LA BARRA SUPERIOR: MIS CAPACITACIONES (Academia Reiki Online) */}
              {activeSection === "Mis Capacitaciones" && (
                <MisCapacitacionesPanel
                  profile={activeUserProfile}
                  activeRole={
                    selectedRole ||
                    (activeUserProfile.soyTerapeuta ||
                    activeUserProfile.role === "terapeuta"
                      ? "Terapeuta"
                      : "Consultante")
                  }
                  isBiometricVerified={isBiometricVerified}
                  availableDisciplines={ROLE_THERAPY_CATEGORIES.flatMap((cat) =>
                    getCategoryOptions(cat)
                  )}
                />
              )}

              {/* SECCIÓN ACTIVA DE LA BARRA SUPERIOR: MI BILLETERA (Cobros y cuenta de Mercado Pago Split 1:1) */}
              {activeSection === "Mi Billetera" && (
                <TherapistMercadoPagoSection
                  profile={activeUserProfile}
                  activeRole={
                    selectedRole ||
                    (activeUserProfile.soyTerapeuta ||
                    activeUserProfile.role === "terapeuta"
                      ? "Terapeuta"
                      : "Consultante")
                  }
                  offeredTherapies={terapeutaSelections}
                />
              )}

              {/* QUINTA PESTAÑA DE LA BARRA SUPERIOR: MI RED SOCIAL (Seguidores, Seguidos, Historias y Feed) */}
              {activeSection === "Mi Red Social" && (
                <SocialNetworkProfileView
                  nickname={getEffectiveNickname(activeUserProfile)}
                  compact
                  currentUserEmail={activeUserProfile.email}
                  currentUserName={
                    `${activeUserProfile.nombre} ${activeUserProfile.apellido}`.trim() ||
                    activeUserProfile.nombre
                  }
                  currentUserNickname={getEffectiveNickname(activeUserProfile)}
                  currentUserPhotoUrl={
                    activeUserProfile.fotoUrl || authenticatedUser?.picture || ""
                  }
                  overrideProfile={{
                    nickname: getEffectiveNickname(activeUserProfile),
                    displayName:
                      `${activeUserProfile.nombre} ${activeUserProfile.apellido}`.trim() ||
                      activeUserProfile.nombre ||
                      getEffectiveNickname(activeUserProfile),
                    role:
                      selectedRole ||
                      (activeUserProfile.soyTerapeuta ||
                      activeUserProfile.role === "terapeuta"
                        ? "Terapeuta"
                        : "Consultante"),
                    fotoUrl:
                      activeUserProfile.fotoUrl ||
                      authenticatedUser?.picture ||
                      "",
                    localidad: activeUserProfile.localidad,
                    provincia: activeUserProfile.provincia,
                    pais: activeUserProfile.pais,
                    therapies:
                      activeSelections && activeSelections.length > 0
                        ? activeSelections
                        : undefined,
                    whatsappVerified: activeUserProfile.whatsappVerified,
                    identityVerified: isBiometricVerified,
                  }}
                />
              )}

              {/* SECCIÓN ACTIVA DE LA BARRA SUPERIOR: MIS CONSULTAS (Sesiones finalizadas · Sesiones programadas) */}
              {activeSection === "Mis Consultas" && (
                <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-5 text-sm text-[#2B1F42] space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h4 className="text-base font-bold text-[#836DAD]">
                        Mis Consultas y Contrataciones
                      </h4>
                      <p className="text-xs text-[#2B1F42]/70">
                        Gestioná tus sesiones finalizadas y tus sesiones programadas en Reiki Online.
                      </p>
                    </div>
                  </div>

                  {(() => {
                    void consultasRefreshKey;
                    const allTxs = loadMpTransactions();
                    const allConsultations = loadConsultations();
                    const myNick = sanitizeNickname(
                      activeUserProfile.nickname ||
                        `${activeUserProfile.nombre}${activeUserProfile.apellido}`
                    ).toLowerCase();
                    const myTxs = allTxs.filter(
                      (t) =>
                        t.consultanteEmail.toLowerCase() ===
                          activeUserProfile.email.toLowerCase() ||
                        t.therapistNickname.toLowerCase() === myNick ||
                        authenticatedUser.isAdmin
                    );
                    const myConsultations = allConsultations.filter(
                      (c) =>
                        c.consultanteEmail.toLowerCase() ===
                          activeUserProfile.email.toLowerCase() ||
                        (c.consultanteNickname || "").toLowerCase() === myNick ||
                        c.therapistNickname.toLowerCase() === myNick ||
                        authenticatedUser.isAdmin
                    );

                    const finalizedConsultations = myConsultations.filter(
                      (c) => c.status === "efectuada"
                    );
                    const scheduledConsultations = myConsultations.filter(
                      (c) => c.status === "programada"
                    );
                    const finalizedTxs = myTxs.filter((t) => t.sessionConfirmed);
                    const scheduledTxs = myTxs.filter((t) => !t.sessionConfirmed);

                    const totalFinalizadas =
                      finalizedConsultations.length + finalizedTxs.length;
                    const totalProgramadas =
                      scheduledConsultations.length + scheduledTxs.length;

                    return (
                      <div className="space-y-4">
                        {/* DOS OPCIONES DE MIS CONSULTAS: Sesiones finalizadas | Sesiones programadas */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setConsultasSubTab("finalizadas")}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                              consultasSubTab === "finalizadas"
                                ? "border-[#F3D791] bg-[#836DAD] text-white shadow-md"
                                : "border-[#836DAD]/30 bg-white text-[#2B1F42] hover:border-[#836DAD]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                  consultasSubTab === "finalizadas"
                                    ? "bg-[#F3D791] text-[#2B1F42]"
                                    : "bg-[#836DAD]/15 text-[#836DAD]"
                                }`}
                              >
                                <CheckCircle2 className="h-5 w-5" />
                              </span>
                              <div>
                                <span className="block text-sm sm:text-base font-bold">
                                  Sesiones finalizadas
                                </span>
                                <span
                                  className={`block text-xs ${
                                    consultasSubTab === "finalizadas"
                                      ? "text-white/85"
                                      : "text-[#2B1F42]/65"
                                  }`}
                                >
                                  Consultas efectuadas y listas para calificar
                                </span>
                              </div>
                            </div>
                            <span
                              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-extrabold ${
                                consultasSubTab === "finalizadas"
                                  ? "bg-[#F3D791] text-[#2B1F42]"
                                  : "bg-[#836DAD] text-white"
                              }`}
                            >
                              {totalFinalizadas}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setConsultasSubTab("programadas")}
                            className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 p-4 text-left transition-all ${
                              consultasSubTab === "programadas"
                                ? "border-[#F3D791] bg-[#836DAD] text-white shadow-md"
                                : "border-[#836DAD]/30 bg-white text-[#2B1F42] hover:border-[#836DAD]"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <span
                                className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                                  consultasSubTab === "programadas"
                                    ? "bg-[#F3D791] text-[#2B1F42]"
                                    : "bg-[#836DAD]/15 text-[#836DAD]"
                                }`}
                              >
                                <CalendarClock className="h-5 w-5" />
                              </span>
                              <div>
                                <span className="block text-sm sm:text-base font-bold">
                                  Sesiones programadas
                                </span>
                                <span
                                  className={`block text-xs ${
                                    consultasSubTab === "programadas"
                                      ? "text-white/85"
                                      : "text-[#2B1F42]/65"
                                  }`}
                                >
                                  Turnos agendados y salas de videollamada
                                </span>
                              </div>
                            </div>
                            <span
                              className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-xs font-extrabold ${
                                consultasSubTab === "programadas"
                                  ? "bg-[#F3D791] text-[#2B1F42]"
                                  : "bg-[#836DAD] text-white"
                              }`}
                            >
                              {totalProgramadas}
                            </span>
                          </button>
                        </div>

                        {/* OPCIÓN 1: SESIONES FINALIZADAS */}
                        {consultasSubTab === "finalizadas" && (
                          <div className="space-y-2.5">
                            {totalFinalizadas === 0 ? (
                              <div className="rounded-xl border border-[#836DAD]/15 bg-white p-4 text-xs text-[#2B1F42]/75">
                                Aún no registrás sesiones finalizadas. Cuando completes una consulta con un terapeuta, aparecerá aquí para que puedas calificar de 1 a 5 estrellas y dejar tu reseña.
                              </div>
                            ) : (
                              <>
                                {finalizedConsultations.map((cons) => (
                                  <div
                                    key={cons.id}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#836DAD]/25 bg-white p-4 text-xs shadow-2xs"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-[#2B1F42] text-sm">
                                          {cons.therapyName}
                                        </p>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Sesión finalizada
                                        </span>
                                      </div>
                                      <p className="text-xs text-[#2B1F42]/80">
                                        Terapeuta:{" "}
                                        <strong className="text-[#836DAD]">
                                          {cons.therapistName ||
                                            `@${cons.therapistNickname}`}
                                        </strong>{" "}
                                        (@{cons.therapistNickname}) ↔ Consultante:{" "}
                                        <strong>{cons.consultanteName}</strong>
                                      </p>
                                      <p className="text-[11px] text-[#2B1F42]/65">
                                        Modalidad: {cons.modality} · Fecha y hora:{" "}
                                        {cons.scheduledAt}
                                      </p>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setActiveSection("Mi Red Social")
                                        }
                                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-[#6F599B]"
                                      >
                                        <Sparkles className="h-3.5 w-3.5 text-[#F3D791]" />
                                        <span>
                                          {cons.reviewed
                                            ? "Ver reseña en Mi Red Social"
                                            : "Calificar (1 a 5 ★) en Mi Red Social"}
                                        </span>
                                      </button>
                                    </div>
                                  </div>
                                ))}

                                {finalizedTxs.map((tx) => (
                                  <div
                                    key={tx.id}
                                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#836DAD]/25 bg-white p-4 text-xs shadow-2xs"
                                  >
                                    <div className="space-y-1">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="font-bold text-[#2B1F42] text-sm">
                                          {tx.therapyName}
                                        </p>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[10px] font-bold text-emerald-800">
                                          <CheckCircle2 className="h-3 w-3" />
                                          Sesión finalizada
                                        </span>
                                      </div>
                                      <p className="text-xs text-[#2B1F42]/80">
                                        Terapeuta:{" "}
                                        <strong className="text-[#836DAD]">
                                          {tx.therapistName}
                                        </strong>{" "}
                                        ↔ Consultante:{" "}
                                        <strong>{tx.consultanteName}</strong>
                                      </p>
                                      <p className="text-[11px] text-[#2B1F42]/65">
                                        {
                                          ATTENTION_MODALITY_LABELS[
                                            tx.attentionModality
                                          ]
                                        }{" "}
                                        · {BOOKING_TIMING_LABELS[tx.bookingTiming]} (
                                        {tx.scheduledSlotLabel})
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="font-extrabold text-[#836DAD]">
                                        {formatArs(tx.sessionPriceArs)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}

                        {/* OPCIÓN 2: SESIONES PROGRAMADAS */}
                        {consultasSubTab === "programadas" && (
                          <div className="space-y-3">
                            <div className="rounded-xl border border-[#836DAD]/25 bg-white px-4 py-3 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="text-xs font-semibold text-[#2B1F42]">
                                  Videollamada privada 1:1 integrada (sin exponer WhatsApp ni correo personal)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const myFullName =
                                      `${activeUserProfile.nombre} ${activeUserProfile.apellido}`.trim() ||
                                      activeUserProfile.nombre ||
                                      myNick;
                                    const isTherapistRole =
                                      selectedRole === "Terapeuta";
                                    setActiveConsultasVideoRoom({
                                      sessionId: `daily-direct-${myNick}-${new Date()
                                        .toISOString()
                                        .slice(0, 10)}`,
                                      therapistName: isTherapistRole
                                        ? myFullName
                                        : "Valeria Méndez",
                                      therapistNickname: isTherapistRole
                                        ? myNick
                                        : "valeriamendez",
                                      consultanteName: isTherapistRole
                                        ? "Consultante en Sala"
                                        : myFullName,
                                      consultanteEmail: activeUserProfile.email,
                                      consultanteNickname: myNick,
                                      therapyName:
                                        (activeSelections && activeSelections[0]) ||
                                        "Sesión Online Reiki",
                                      modalityLabel: "Online ahora",
                                      scheduledSlotLabel: "Sala activa · 1 hora",
                                    });
                                  }}
                                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#6D5898]"
                                >
                                  <Video className="h-3.5 w-3.5 text-[#F3D791]" />
                                  Abrir Sala de Videollamada Daily.co
                                </button>
                              </div>
                              <div className="border-t border-[#836DAD]/15 pt-2 text-[11px] text-[#2B1F42]/80">
                                <strong>Política de sesiones confirmadas:</strong> El pago se confirma al reservar la sesión (con turno o inmediata). Si el <strong>consultante desiste</strong>, la sesión <strong>se reprograma en los turnos habilitados por el terapeuta</strong>. Si el <strong>terapeuta cancela</strong> la reunión, <strong>deberá devolver el dinero al consultante sin descontar la comisión de Reiki Online</strong>, que queda firme.
                              </div>
                            </div>

                            {totalProgramadas === 0 ? (
                              <div className="rounded-xl border border-[#836DAD]/15 bg-white p-4 text-xs text-[#2B1F42]/75">
                                Aún no tenés sesiones programadas pendientes. Podés seleccionar una terapia o terapeuta para agendar con turno (de 1 hora exacta) o conectar en <strong>Online ahora</strong>.
                              </div>
                            ) : (
                              <div className="space-y-2.5">
                                {scheduledConsultations.map((cons) => {
                                  const isOnlineModality =
                                    cons.modality === "Online con turno" ||
                                    cons.modality === "Online ahora";
                                  return (
                                    <div
                                      key={cons.id}
                                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#836DAD]/25 bg-white p-4 text-xs shadow-2xs"
                                    >
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-bold text-[#2B1F42] text-sm">
                                            {cons.therapyName}
                                          </p>
                                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3D791]/60 px-2.5 py-0.5 text-[10px] font-bold text-[#2B1F42]">
                                            <CalendarClock className="h-3 w-3 text-[#836DAD]" />
                                            Sesión programada
                                          </span>
                                        </div>
                                        <p className="text-xs text-[#2B1F42]/80">
                                          Terapeuta:{" "}
                                          <strong className="text-[#836DAD]">
                                            {cons.therapistName ||
                                              `@${cons.therapistNickname}`}
                                          </strong>{" "}
                                          (@{cons.therapistNickname}) ↔ Consultante:{" "}
                                          <strong>{cons.consultanteName}</strong>
                                        </p>
                                        <p className="text-[11px] text-[#2B1F42]/65">
                                          Modalidad: {cons.modality} · Turno programado:{" "}
                                          <strong>{cons.scheduledAt}</strong> (1 hora)
                                        </p>
                                      </div>

                                      <div className="flex flex-wrap items-center gap-2">
                                        {isOnlineModality && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setActiveConsultasVideoRoom({
                                                sessionId: cons.id,
                                                therapistName:
                                                  cons.therapistName ||
                                                  `@${cons.therapistNickname}`,
                                                therapistNickname:
                                                  cons.therapistNickname,
                                                consultanteName:
                                                  cons.consultanteName,
                                                consultanteEmail:
                                                  cons.consultanteEmail,
                                                consultanteNickname:
                                                  cons.consultanteNickname ||
                                                  sanitizeNickname(
                                                    cons.consultanteName
                                                  ),
                                                therapyName: cons.therapyName,
                                                modalityLabel: cons.modality as
                                                  | "Online con turno"
                                                  | "Online ahora",
                                                scheduledSlotLabel:
                                                  cons.scheduledAt ||
                                                  "1 hora (Daily.co)",
                                              })
                                            }
                                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#6D5898]"
                                          >
                                            <Video className="h-3.5 w-3.5 text-[#F3D791]" />
                                            Ingresar a Videollamada
                                          </button>
                                        )}

                                        <button
                                          type="button"
                                          onClick={() => {
                                            const updated = allConsultations.map(
                                              (item) =>
                                                item.id === cons.id
                                                  ? {
                                                      ...item,
                                                      status:
                                                        "efectuada" as const,
                                                    }
                                                  : item
                                            );
                                            saveConsultations(updated);
                                            setConsultasRefreshKey(
                                              (prev) => prev + 1
                                            );
                                            setConsultasSubTab("finalizadas");
                                          }}
                                          className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-1.5 text-xs font-bold text-[#836DAD] hover:bg-[#836DAD] hover:text-white transition"
                                        >
                                          <CheckCircle2 className="h-3.5 w-3.5" />
                                          Marcar como finalizada
                                        </button>

                                        {/* Reprogramación en turnos habilitados del terapeuta ante desistimiento del consultante */}
                                        <select
                                          defaultValue=""
                                          onChange={(e) => {
                                            const newSlot = e.target.value;
                                            if (!newSlot) return;
                                            const updated = allConsultations.map(
                                              (item) =>
                                                item.id === cons.id
                                                  ? {
                                                      ...item,
                                                      scheduledAt: `${newSlot} (Reprogramada)`,
                                                    }
                                                  : item
                                            );
                                            saveConsultations(updated);
                                            const updatedTxs = allTxs.map((t) =>
                                              `cons-${t.id}` === cons.id
                                                ? {
                                                    ...t,
                                                    cancellationCategory:
                                                      "cancelacion_consultante" as const,
                                                    scheduledSlotLabel: `${newSlot} (Reprogramada)`,
                                                    rescheduled: true,
                                                    rescheduledSlotLabel: `${newSlot} (Reprogramada)`,
                                                    rescheduledAt:
                                                      new Date().toISOString(),
                                                    reikiCommissionFirm: true,
                                                    refundStatus:
                                                      "rescheduled_no_refund" as const,
                                                  }
                                                : t
                                            );
                                            saveMpTransactions(updatedTxs);
                                            setConsultasRefreshKey(
                                              (prev) => prev + 1
                                            );
                                          }}
                                          className="cursor-pointer rounded-xl border border-[#836DAD]/35 bg-[#F6F3FA] px-2.5 py-1.5 text-[11px] font-bold text-[#2B1F42]"
                                        >
                                          <option value="" disabled>
                                            📅 Reprogramar (Turnos del terapeuta)...
                                          </option>
                                          <option value="Lunes · 10:00 a 11:00 hs">
                                            Lunes · 10:00 a 11:00 hs
                                          </option>
                                          <option value="Martes · 15:00 a 16:00 hs">
                                            Martes · 15:00 a 16:00 hs
                                          </option>
                                          <option value="Jueves · 18:00 a 19:00 hs">
                                            Jueves · 18:00 a 19:00 hs
                                          </option>
                                          <option value="Viernes · 11:00 a 12:00 hs">
                                            Viernes · 11:00 a 12:00 hs
                                          </option>
                                        </select>
                                      </div>
                                    </div>
                                  );
                                })}

                                {scheduledTxs.map((tx) => {
                                  const isOnlineVideo =
                                    tx.attentionModality ===
                                    "distancia_con_video";
                                  return (
                                    <div
                                      key={tx.id}
                                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#836DAD]/25 bg-white p-4 text-xs shadow-2xs"
                                    >
                                      <div className="space-y-1">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <p className="font-bold text-[#2B1F42] text-sm">
                                            {tx.therapyName}
                                          </p>
                                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3D791]/60 px-2.5 py-0.5 text-[10px] font-bold text-[#2B1F42]">
                                            <CalendarClock className="h-3 w-3 text-[#836DAD]" />
                                            Sesión programada
                                          </span>
                                        </div>
                                        <p className="text-xs text-[#2B1F42]/80">
                                          Terapeuta:{" "}
                                          <strong className="text-[#836DAD]">
                                            {tx.therapistName}
                                          </strong>{" "}
                                          ↔ Consultante:{" "}
                                          <strong>{tx.consultanteName}</strong>
                                        </p>
                                        <p className="text-[11px] text-[#2B1F42]/65">
                                          {
                                            ATTENTION_MODALITY_LABELS[
                                              tx.attentionModality
                                            ]
                                          }{" "}
                                          ·{" "}
                                          {
                                            BOOKING_TIMING_LABELS[
                                              tx.bookingTiming
                                            ]
                                          }{" "}
                                          ({tx.scheduledSlotLabel})
                                        </p>
                                      </div>
                                      <div className="flex flex-wrap items-center gap-2.5">
                                        {isOnlineVideo && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setActiveConsultasVideoRoom({
                                                sessionId: `tx-${tx.id}`,
                                                therapistName: tx.therapistName,
                                                therapistNickname:
                                                  tx.therapistNickname,
                                                consultanteName:
                                                  tx.consultanteName,
                                                consultanteEmail:
                                                  tx.consultanteEmail,
                                                consultanteNickname:
                                                  sanitizeNickname(
                                                    tx.consultanteName
                                                  ),
                                                therapyName: tx.therapyName,
                                                modalityLabel:
                                                  tx.bookingTiming ===
                                                  "inmediata"
                                                    ? "Online ahora"
                                                    : "Online con turno",
                                                scheduledSlotLabel:
                                                  tx.scheduledSlotLabel,
                                              })
                                            }
                                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3 py-1.5 text-xs font-bold text-white shadow-sm transition-all hover:bg-[#6D5898]"
                                          >
                                            <Video className="h-3.5 w-3.5 text-[#F3D791]" />
                                            Ingresar a Videollamada
                                          </button>
                                        )}
                                        <div className="text-right">
                                          <p className="font-extrabold text-[#836DAD]">
                                            {formatArs(tx.sessionPriceArs)}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {activeConsultasVideoRoom && (
                    <DailyVideoCallModal
                      isOpen={true}
                      onClose={() => setActiveConsultasVideoRoom(null)}
                      sessionId={activeConsultasVideoRoom.sessionId}
                      viewerRole={selectedRole || "Consultante"}
                      therapistName={activeConsultasVideoRoom.therapistName}
                      therapistNickname={
                        activeConsultasVideoRoom.therapistNickname
                      }
                      consultanteName={activeConsultasVideoRoom.consultanteName}
                      consultanteEmail={
                        activeConsultasVideoRoom.consultanteEmail
                      }
                      therapyName={activeConsultasVideoRoom.therapyName}
                      modality={activeConsultasVideoRoom.modalityLabel}
                      scheduledSlotLabel={
                        activeConsultasVideoRoom.scheduledSlotLabel
                      }
                    />
                  )}
                </div>
              )}

              {/* CIRCUITO AUTOMÁTICO DE VERIFICACIÓN DE IDENTIDAD BIOMÉTRICA (Sección 3, 4 y 6):
                  - Obligatorio cuando el usuario selecciona Terapeuta y su biometría no está verificada/vigente.
                  - Proporcional en Consultante cuando se detectan indicadores objetivos de riesgo.
                  - Permite en todo momento completar los datos de Mi Perfil mientras esté pendiente. */}
              {selectedRole && !activeSection && requiresBiometricGate && (
                <BiometricIdentityStep
                  profile={activeUserProfile}
                  roleContext={selectedRole}
                  consultanteRiskReasons={consultanteRisk.reasons}
                  onUpdateBiometric={(nextBioRecord) => {
                    saveUserProfile({
                      ...activeUserProfile,
                      biometricVerification: nextBioRecord,
                      updatedAt: new Date().toISOString(),
                    });
                  }}
                  onGoToProfile={() => setActiveSection("Mi Perfil")}
                  onBackToRoles={handleGoToComoIngresas}
                />
              )}

              {/* NUEVA VENTANA LIMPIA TRAS CONFIRMAR/GUARDAR TERAPIAS:
                  - Presencial con turno
                  - Online con turno
                  - Online ahora */}
              {selectedRole &&
                !activeSection &&
                !requiresBiometricGate &&
                therapiesConfirmed && (
                <div className="rounded-2xl border border-[#836DAD]/25 bg-white p-6 sm:p-8 space-y-5 shadow-xs">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {(
                      [
                        {
                          label: "Presencial con turno" as const,
                          icon: MapPin,
                          badgeClass:
                            "bg-[#836DAD] text-[#F3D791] group-hover:bg-white/20 group-hover:text-[#F3D791]",
                          selectedBadgeClass: "bg-white/20 text-[#F3D791]",
                        },
                        {
                          label: "Online con turno" as const,
                          icon: CalendarClock,
                          badgeClass:
                            "bg-[#F3D791] text-[#836DAD] group-hover:bg-white/20 group-hover:text-[#F3D791]",
                          selectedBadgeClass: "bg-white/20 text-[#F3D791]",
                        },
                        {
                          label: "Online ahora" as const,
                          icon: Video,
                          badgeClass:
                            "bg-[#836DAD] text-[#F3D791] group-hover:bg-white/20 group-hover:text-[#F3D791]",
                          selectedBadgeClass: "bg-white/20 text-[#F3D791]",
                        },
                      ]
                    ).map(({ label, icon: Icon, badgeClass, selectedBadgeClass }) => {
                      const isSelected = selectedModality === label;
                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setSelectedModality(label)}
                          className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 px-5 py-6 text-center text-base sm:text-lg font-semibold transition-all ${
                            isSelected
                              ? "border-[#836DAD] bg-[#836DAD] text-white shadow-md"
                              : "border-[#836DAD]/30 bg-[#FAF8FC] text-[#2B1F42] hover:border-[#836DAD] hover:bg-[#836DAD] hover:text-white hover:shadow-md"
                          }`}
                        >
                          <span
                            className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl transition-colors ${
                              isSelected ? selectedBadgeClass : badgeClass
                            }`}
                          >
                            <Icon className="h-6 w-6" />
                          </span>
                          <span>{label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {selectedModality && activeUserProfile && (
                    <ModalityWorkflowPanel
                      role={selectedRole}
                      modality={selectedModality}
                      userProfile={activeUserProfile}
                      selectedTherapies={activeSelections}
                      onChangeModality={(next) => setSelectedModality(next)}
                    />
                  )}
                </div>
              )}

              {/* PANTALLA INTERMEDIA SIMPLE DESPUÉS DE ¿Cómo ingresas?:
                  ¿Cómo buscas? -> Por Terapia | Por Terapeuta (Consultante) / Por Consultante (Terapeuta) */}
              {selectedRole &&
                !activeSection &&
                !requiresBiometricGate &&
                !searchMode &&
                !therapiesConfirmed && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] px-4 py-3.5 text-center">
                      <h4 className="text-base sm:text-lg font-semibold text-[#2B1F42]">
                        ¿Cómo buscas?
                      </h4>
                    </div>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => setSearchMode("Por Terapia")}
                        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-[#836DAD]/30 bg-white p-6 text-center text-[#2B1F42] transition-all hover:border-[#836DAD] hover:bg-[#836DAD] hover:text-white hover:shadow-md group"
                      >
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#836DAD] text-[#F3D791] group-hover:bg-white/20">
                          <Sparkles className="h-6 w-6" />
                        </span>
                        <span className="text-lg font-semibold">
                          Por Terapia
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setSearchMode("Por Persona")}
                        className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-[#836DAD]/30 bg-white p-6 text-center text-[#2B1F42] transition-all hover:border-[#836DAD] hover:bg-[#836DAD] hover:text-white hover:shadow-md group"
                      >
                        <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F3D791] text-[#836DAD] group-hover:text-[#2B1F42]">
                          {selectedRole === "Consultante" ? (
                            <UserCheck className="h-6 w-6" />
                          ) : (
                            <HeartHandshake className="h-6 w-6" />
                          )}
                        </span>
                        <span className="text-lg font-semibold">
                          {selectedRole === "Consultante"
                            ? "Por Terapeuta"
                            : "Por Consultante"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

              {/* SI ELIGE POR TERAPEUTA (Consultante) O POR CONSULTANTE (Terapeuta):
                  Aparecen los perfiles con un formato similar a la Credencial */}
              {selectedRole &&
                !activeSection &&
                !requiresBiometricGate &&
                searchMode === "Por Persona" &&
                !therapiesConfirmed && (
                  <NetworkProfilesDirectory
                    viewerRole={selectedRole}
                    viewerProfile={activeUserProfile}
                    allStoredProfiles={profilesByEmail}
                    onToggleViewerVisibility={(visible) => {
                      saveUserProfile({
                        ...activeUserProfile,
                        visibleEnRed: visible,
                        updatedAt: new Date().toISOString(),
                      });
                    }}
                    onSelectProfileToConnect={() => {
                      setTherapiesConfirmed(true);
                      setSelectedModality(null);
                    }}
                  />
                )}

              {/* SELECTOR MÚLTIPLE DE TERAPIAS SEGÚN ROL ELEGIDO (cuando elige "Por Terapia") */}
              {selectedRole &&
                !activeSection &&
                !requiresBiometricGate &&
                searchMode === "Por Terapia" &&
                !therapiesConfirmed && (
                <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-4 sm:p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-3.5">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#836DAD]/15 px-3 py-0.5 text-xs font-semibold text-[#836DAD]">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>
                          {selectedRole === "Consultante"
                            ? "Búsqueda de terapias (Consultante)"
                            : "Oferta de terapias (Terapeuta)"}
                        </span>
                      </span>
                      <h4 className="mt-1.5 text-base sm:text-lg font-semibold text-[#2B1F42]">
                        {selectedRole === "Consultante"
                          ? "Elegí una o más terapias"
                          : "Seleccioná las terapias que ofrecés"}
                      </h4>
                    </div>

                    {/* Buscador rápido */}
                    <div className="relative w-full sm:w-64">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#836DAD]" />
                      <input
                        type="search"
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        placeholder="Filtrar terapia..."
                        aria-label="Filtrar opciones de terapias"
                        className="w-full rounded-xl border border-[#836DAD]/30 bg-white py-2 pr-3 pl-9 text-xs sm:text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/45 focus:border-[#836DAD] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Resumen de combinación elegida */}
                  <div className="rounded-xl border border-[#836DAD]/20 bg-white p-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#2B1F42]">
                        {selectedRole === "Consultante"
                          ? `Terapias seleccionadas para tu búsqueda (${activeSelections.length}):`
                          : `Terapias seleccionadas que ofrecés (${activeSelections.length}):`}
                      </span>
                      {activeSelections.length > 0 && (
                        <button
                          type="button"
                          onClick={clearCurrentRoleSelections}
                          className="cursor-pointer text-xs font-semibold text-[#836DAD] underline hover:text-[#5E4987]"
                        >
                          Limpiar selección
                        </button>
                      )}
                    </div>

                    {activeSelections.length > 0 ? (
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {activeSelections.map((item) => (
                          <span
                            key={item}
                            className="inline-flex items-center gap-1.5 rounded-full bg-[#836DAD] px-3 py-1 text-xs font-semibold text-white"
                          >
                            <span>{item}</span>
                            <button
                              type="button"
                              onClick={() => toggleTherapyOption(item)}
                              aria-label={`Quitar ${item}`}
                              className="cursor-pointer rounded-full bg-white/20 px-1.5 text-[11px] leading-none text-[#F3D791] hover:bg-white/35"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1.5 text-xs text-[#2B1F42]/60">
                        Tocá una o más opciones en las 6 categorías de abajo
                        para armar tu combinación.
                      </p>
                    )}
                  </div>

                  {/* Listado de las 6 categorías usando <details open> nativo accesible y buscable */}
                  <div className="space-y-3">
                    {ROLE_THERAPY_CATEGORIES.map((cat) => {
                      const allOptions = getCategoryOptions(cat);
                      const cleanQuery = searchFilter.trim().toLowerCase();
                      const visibleOptions = cleanQuery
                        ? allOptions.filter(
                            (opt) =>
                              opt.toLowerCase().includes(cleanQuery) ||
                              cat.title.toLowerCase().includes(cleanQuery)
                          )
                        : allOptions;

                      if (
                        cleanQuery &&
                        visibleOptions.length === 0 &&
                        selectedRole !== "Terapeuta"
                      ) {
                        return null;
                      }

                      const selectedCountInCat = allOptions.filter((opt) =>
                        activeSelections.includes(opt)
                      ).length;

                      const isOtherChecked = Boolean(otherCheckedByCat[cat.id]);

                      return (
                        <details
                          key={cat.id}
                          open
                          className="group rounded-2xl border border-[#836DAD]/20 bg-white p-4 shadow-xs"
                        >
                          <summary className="flex cursor-pointer items-center justify-between gap-2 select-none">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#836DAD] text-xs font-semibold text-[#F3D791]">
                                {cat.number}
                              </span>
                              <span className="text-sm sm:text-base font-semibold text-[#2B1F42]">
                                {cat.title}
                              </span>
                              {selectedCountInCat > 0 && (
                                <span className="rounded-full bg-[#836DAD]/15 px-2.5 py-0.5 text-[11px] font-semibold text-[#836DAD]">
                                  {selectedCountInCat} seleccionada
                                  {selectedCountInCat === 1 ? "" : "s"}
                                </span>
                              )}
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 text-[#836DAD] transition-transform group-open:rotate-180" />
                          </summary>

                          <div className="mt-3.5 border-t border-[#836DAD]/10 pt-3.5">
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                              {visibleOptions.map((optionLabel) => {
                                const isChecked =
                                  activeSelections.includes(optionLabel);
                                return (
                                  <label
                                    key={optionLabel}
                                    className="ro-choice-label flex cursor-pointer items-center gap-2.5 rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] px-3 py-2.5 text-xs sm:text-sm font-medium text-[#2B1F42] hover:border-[#836DAD]"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        toggleTherapyOption(optionLabel)
                                      }
                                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-[#836DAD]"
                                    />
                                    <span className="leading-snug">
                                      {optionLabel}
                                    </span>
                                  </label>
                                );
                              })}

                              {/* En modo Terapeuta, en cada categoría se agrega "Otra" */}
                              {selectedRole === "Terapeuta" && (
                                <label className="ro-choice-label flex cursor-pointer items-center gap-2.5 rounded-xl border border-dashed border-[#836DAD]/50 bg-[#F3D791]/20 px-3 py-2.5 text-xs sm:text-sm font-semibold text-[#2B1F42] hover:border-[#836DAD]">
                                  <input
                                    type="checkbox"
                                    checked={isOtherChecked}
                                    onChange={(e) => {
                                      const checked = e.target.checked;
                                      setOtherCheckedByCat((prev) => ({
                                        ...prev,
                                        [cat.id]: checked,
                                      }));
                                      if (!checked) {
                                        setOtherAlertSentByCat((prev) => ({
                                          ...prev,
                                          [cat.id]: null,
                                        }));
                                      }
                                    }}
                                    className="h-4 w-4 shrink-0 cursor-pointer rounded border-[#836DAD]"
                                  />
                                  <span>Otra</span>
                                </label>
                              )}
                            </div>

                            {/* Campo "¿Cuál?......" cuando el Terapeuta marca "Otra" en esta categoría */}
                            {selectedRole === "Terapeuta" && isOtherChecked && (
                              <div className="mt-3 rounded-xl border border-[#836DAD]/30 bg-[#F6F3FA] p-3">
                                <label
                                  htmlFor={`${baseId}-other-${cat.id}`}
                                  className="block text-xs font-semibold text-[#2B1F42]"
                                >
                                  ¿Cuál?......{" "}
                                  <span className="font-normal text-[#2B1F42]/70">
                                    ({cat.title})
                                  </span>
                                </label>
                                <div className="mt-1.5 flex flex-col sm:flex-row gap-2">
                                  <input
                                    id={`${baseId}-other-${cat.id}`}
                                    type="text"
                                    value={otherInputByCat[cat.id] || ""}
                                    onChange={(e) =>
                                      setOtherInputByCat((prev) => ({
                                        ...prev,
                                        [cat.id]: e.target.value,
                                      }))
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        handleProposeOtherOption(cat);
                                      }
                                    }}
                                    placeholder="¿Cuál?......"
                                    className="flex-1 rounded-xl border border-[#836DAD]/35 bg-white px-3.5 py-2 text-xs sm:text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/45 focus:border-[#836DAD] focus:outline-none"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleProposeOtherOption(cat)}
                                    className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#836DAD] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#6F599B]"
                                  >
                                    <PlusCircle className="h-3.5 w-3.5 text-[#F3D791]" />
                                    <span>
                                      Sumar y notificar al Administrador
                                    </span>
                                  </button>
                                </div>
                              </div>
                            )}

                            {selectedRole === "Terapeuta" &&
                              otherAlertSentByCat[cat.id] && (
                                <p className="mt-2.5 rounded-xl border border-[#836DAD]/25 bg-[#F6F3FA] px-3 py-2 text-xs font-medium text-[#836DAD]">
                                  {otherAlertSentByCat[cat.id]}
                                </p>
                              )}
                          </div>
                        </details>
                      );
                    })}
                  </div>

                  {/* Botón de confirmación de combinación */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedRole === "Terapeuta") {
                          for (const cat of ROLE_THERAPY_CATEGORIES) {
                            if (
                              otherCheckedByCat[cat.id] &&
                              (otherInputByCat[cat.id] || "").trim()
                            ) {
                              handleProposeOtherOption(cat);
                            }
                          }
                        }
                        setSelectionSavedFeedback(null);
                        setSelectedModality(null);
                        setTherapiesConfirmed(true);
                      }}
                      className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#836DAD] px-5 py-3 text-xs sm:text-sm font-semibold text-white shadow-md shadow-[#836DAD]/20 transition-all hover:bg-[#6F599B]"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#F3D791]" />
                      <span>
                        {selectedRole === "Consultante"
                          ? "Confirmar terapias buscadas"
                          : "Guardar terapias ofrecidas"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default TerapiasAccessPanel;
