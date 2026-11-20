"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Users,
  Sparkles,
  Wallet,
  GraduationCap,
  ShieldCheck,
  Video,
  MessageSquare,
  BarChart3,
  Sun,
  Moon,
  User,
  HelpCircle,
  Search,
  LogOut,
  Eye,
  EyeOff,
  LogIn,
  AlertCircle,
  Download,
  CheckCircle2,
  CalendarClock,
  BookOpen,
  Keyboard,
  Activity,
} from "lucide-react";
import {
  COMMUNITY_SEED_PROFILES,
  DEFAULT_ADMIN_PROFILE,
  getEffectiveNickname,
  isProfileCurrentlySuspended,
  ReikiUserProfile,
} from "@/lib/geoData";
import {
  BiometricVerificationStatus,
  createInitialBiometricRecord,
} from "@/lib/biometricIdentity";
import {
  ADMIN_ACCOUNTS,
  AdminAccountConfig,
  findAdminAccountByIdentifier,
  PendingAdminCategoryAlert,
} from "@/components/auth/TerapiasAccessPanel";
import AdminDashboardPanel from "@/components/admin/AdminDashboardPanel";
import AdminPaymentsCommissionsPanel from "@/components/payments/AdminPaymentsCommissionsPanel";
import AdminTrainingsSupervisionPanel from "@/components/trainings/AdminTrainingsSupervisionPanel";
import {
  ATTENTION_MODALITY_LABELS,
  BOOKING_TIMING_LABELS,
  formatArs,
  loadMpTransactions,
} from "@/lib/mercadoPagoSplit";
import { loadConsultations } from "@/lib/socialNetwork";
import {
  loadTrainingCertificates,
  loadTrainingEnrollments,
  loadTrainingsCatalog,
} from "@/lib/trainingsData";

const ADMIN_ERP_SESSION_KEY = "ro_erp_active_admin_v1";
const ADMIN_ERP_THEME_KEY = "ro_erp_theme_by_user_v1";
const PROFILES_STORAGE_KEY = "reiki_online_user_profiles_v1";
const CUSTOM_OPTIONS_STORAGE_KEY = "reiki_online_custom_therapy_options_v1";
const ADMIN_ALERTS_STORAGE_KEY = "reiki_online_admin_therapy_alerts_v1";
const SYNC_EVENT_NAME = "reiki-online-catalog-sync";

type ErpSectionId =
  | "sec-inicio"
  | "sec-usuarios"
  | "sec-terapias"
  | "sec-comisiones"
  | "sec-capacitaciones"
  | "sec-biometria"
  | "sec-videollamadas"
  | "sec-whatsapp"
  | "sec-estadisticas"
  | "sec-perfil-usuario"
  | "sec-menu-ayuda"
  | "sec-atajos"
  | "sec-manual-usuario"
  | "sec-estado-sistema";

interface OmniboxFunctionItem {
  id: string;
  title: string;
  badge: string;
  section: ErpSectionId;
  keywords: string;
}

const OMNIBOX_FUNCTIONS: OmniboxFunctionItem[] = [
  {
    id: "fn-usuarios",
    title: "Consultantes y Terapeutas (Padrón, Moderación y CSV)",
    badge: "Módulo Padrón",
    section: "sec-usuarios",
    keywords: "consultantes terapeutas usuarios padron suspender csv dni domicilio",
  },
  {
    id: "fn-terapias",
    title: "Terapias y Categorías Propuestas («Otra → ¿Cuál?»)",
    badge: "Módulo Terapias",
    section: "sec-terapias",
    keywords: "terapias categorias propuestas alertas aprobar",
  },
  {
    id: "fn-comisiones",
    title: "Comisiones y Pagos Split 1:1 (Mercado Pago)",
    badge: "Módulo Finanzas",
    section: "sec-comisiones",
    keywords: "comisiones pagos split mercado pago porcentajes devoluciones",
  },
  {
    id: "fn-capacitaciones",
    title: "Academia y Capacitaciones (Cursos, Inscriptos y Certificados)",
    badge: "Módulo Academia",
    section: "sec-capacitaciones",
    keywords: "academia capacitaciones cursos certificados alumnos formacion",
  },
  {
    id: "fn-biometria",
    title: "Verificación Biométrica e Identidad (RENAPER / KYC)",
    badge: "Módulo Seguridad",
    section: "sec-biometria",
    keywords: "biometria identidad renaper dni selfie kyc riesgo",
  },
  {
    id: "fn-videollamadas",
    title: "Videollamadas y Turnos (Salas 1:1 Daily.co)",
    badge: "Módulo Turnos",
    section: "sec-videollamadas",
    keywords: "videollamadas turnos daily sesiones programadas finalizadas",
  },
  {
    id: "fn-whatsapp",
    title: "WhatsApp Oficial (Twilio Verify E.164)",
    badge: "Módulo WhatsApp",
    section: "sec-whatsapp",
    keywords: "whatsapp twilio verify otp telefono e164",
  },
  {
    id: "fn-estadisticas",
    title: "Estadísticas y Reportes Ejecutivos",
    badge: "Módulo Estadísticas",
    section: "sec-estadisticas",
    keywords: "estadisticas reportes metricas kpi ingresos",
  },
  {
    id: "fn-perfil",
    title: "Perfil de Usuario y Nómina de Administradores",
    badge: "Administración",
    section: "sec-perfil-usuario",
    keywords: "perfil usuario administradores federicod josem miltonv danielg",
  },
  {
    id: "fn-ayuda",
    title: "Ayuda, Atajos y Manual del Administrador",
    badge: "Soporte ERP",
    section: "sec-menu-ayuda",
    keywords: "ayuda atajos manual soporte estado sistema",
  },
];

const SECTION_TITLES: Record<ErpSectionId, string> = {
  "sec-inicio": "Pantalla Principal",
  "sec-usuarios": "Consultantes y Terapeutas",
  "sec-terapias": "Terapias y Categorías Propuestas",
  "sec-comisiones": "Comisiones y Pagos Split 1:1",
  "sec-capacitaciones": "Academia y Capacitaciones",
  "sec-biometria": "Verificación Biométrica e Identidad",
  "sec-videollamadas": "Videollamadas y Turnos (Daily.co)",
  "sec-whatsapp": "WhatsApp Oficial (Twilio Verify)",
  "sec-estadisticas": "Estadísticas y Reportes",
  "sec-perfil-usuario": "Perfil de Usuario",
  "sec-menu-ayuda": "Ayuda",
  "sec-atajos": "Atajos de Teclado",
  "sec-manual-usuario": "Manual del Administrador",
  "sec-estado-sistema": "Estado del Sistema",
};

export default function AdminErpPortalPage() {
  const [activeAdmin, setActiveAdmin] = useState<AdminAccountConfig | null>(
    null
  );
  const [checkedSession, setCheckedSession] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // Login form state
  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Navigation & Omnibox state
  const [activeSection, setActiveSection] =
    useState<ErpSectionId>("sec-inicio");
  const [omniboxQuery, setOmniboxQuery] = useState("");
  const [omniboxOpen, setOmniboxOpen] = useState(false);
  const omniboxInputRef = useRef<HTMLInputElement>(null);

  // Shared platform data
  const [profilesByEmail, setProfilesByEmail] = useState<
    Record<string, ReikiUserProfile>
  >({
    reikionline: DEFAULT_ADMIN_PROFILE,
    "danighiglione@gmail.com": DEFAULT_ADMIN_PROFILE,
    ...COMMUNITY_SEED_PROFILES,
  });
  const [approvedCustomOptions, setApprovedCustomOptions] = useState<
    Record<string, string[]>
  >({});
  const [pendingAdminAlerts, setPendingAdminAlerts] = useState<
    PendingAdminCategoryAlert[]
  >([]);
  const [adminFeedback, setAdminFeedback] = useState<string | null>(null);

  const loadSyncedData = () => {
    if (typeof window === "undefined") return;

    try {
      const savedProfilesRaw = window.localStorage.getItem(PROFILES_STORAGE_KEY);
      if (savedProfilesRaw) {
        const parsed = JSON.parse(savedProfilesRaw) as Record<
          string,
          ReikiUserProfile
        >;
        setProfilesByEmail((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch {
      // Ignore
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
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Check active admin session
    try {
      const rawSess =
        window.sessionStorage.getItem(ADMIN_ERP_SESSION_KEY) ||
        window.localStorage.getItem(ADMIN_ERP_SESSION_KEY);
      if (rawSess) {
        const parsed = JSON.parse(rawSess) as { username?: string };
        const matched = findAdminAccountByIdentifier(parsed?.username);
        if (matched) {
          setActiveAdmin(matched);
          const byUserRaw = window.localStorage.getItem(ADMIN_ERP_THEME_KEY);
          if (byUserRaw) {
            const byUser = JSON.parse(byUserRaw) as Record<
              string,
              "light" | "dark"
            >;
            if (
              byUser[matched.username] === "dark" ||
              byUser[matched.username] === "light"
            ) {
              setTheme(byUser[matched.username]);
            }
          }
        }
      }
    } catch {
      // Ignore
    } finally {
      setCheckedSession(true);
    }

    loadSyncedData();

    const handleSync = () => loadSyncedData();
    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener("storage", handleSync);

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        omniboxInputRef.current?.focus();
        setOmniboxOpen(true);
      } else if (e.key === "Escape") {
        setOmniboxOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const notifySync = () => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(SYNC_EVENT_NAME));
    }
  };

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);

    const cleanUser = usernameInput.trim().toLowerCase();
    if (!cleanUser || !passwordInput) {
      setLoginError(
        "Por favor completá tu Usuario Administrador y Contraseña."
      );
      return;
    }

    const matched = findAdminAccountByIdentifier(cleanUser);
    if (!matched || matched.password !== passwordInput) {
      setLoginError(
        "Credenciales inválidas. Este portal es de acceso exclusivo para Administradores autorizados de Reiki Online."
      );
      return;
    }

    setActiveAdmin(matched);
    setActiveSection("sec-inicio");
    setPasswordInput("");

    try {
      const payload = JSON.stringify({
        username: matched.username,
        email: matched.email,
        loggedAt: new Date().toISOString(),
      });
      window.sessionStorage.setItem(ADMIN_ERP_SESSION_KEY, payload);
      window.localStorage.setItem(ADMIN_ERP_SESSION_KEY, payload);

      // Also sync with main platform session so admin privileges are active everywhere
      window.localStorage.setItem(
        "reiki_online_session_v1",
        JSON.stringify({
          name: `${matched.nombre} ${matched.apellido}`.trim(),
          email: matched.email,
          provider: "Correo",
          isAdmin: true,
        })
      );

      const byUserRaw = window.localStorage.getItem(ADMIN_ERP_THEME_KEY);
      if (byUserRaw) {
        const byUser = JSON.parse(byUserRaw) as Record<
          string,
          "light" | "dark"
        >;
        if (byUser[matched.username]) {
          setTheme(byUser[matched.username]);
        }
      }
    } catch {
      // Ignore
    }
  };

  const handleLogout = () => {
    setActiveAdmin(null);
    setActiveSection("sec-inicio");
    setUsernameInput("");
    setPasswordInput("");
    setLoginError(null);
    try {
      window.sessionStorage.removeItem(ADMIN_ERP_SESSION_KEY);
      window.localStorage.removeItem(ADMIN_ERP_SESSION_KEY);
    } catch {
      // Ignore
    }
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    if (activeAdmin && typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(ADMIN_ERP_THEME_KEY);
        const byUser = raw
          ? (JSON.parse(raw) as Record<string, "light" | "dark">)
          : {};
        byUser[activeAdmin.username] = nextTheme;
        window.localStorage.setItem(
          ADMIN_ERP_THEME_KEY,
          JSON.stringify(byUser)
        );
      } catch {
        // Ignore
      }
    }
  };

  const saveUserProfile = (updated: ReikiUserProfile) => {
    const targetEmailKey = (updated.email || updated.id || "")
      .trim()
      .toLowerCase();
    if (!targetEmailKey) return;

    const nextMap: Record<string, ReikiUserProfile> = {
      ...profilesByEmail,
      [targetEmailKey]: updated,
    };
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

  const handleRemoveCustomOption = (
    categoryId: string,
    optionLabel: string
  ) => {
    const existing = approvedCustomOptions[categoryId] || [];
    const nextList = existing.filter((opt) => opt !== optionLabel);
    const nextCustomMap: Record<string, string[]> = {
      ...approvedCustomOptions,
      [categoryId]: nextList,
    };
    setApprovedCustomOptions(nextCustomMap);
    setAdminFeedback(`Se quitó «${optionLabel}» del listado personalizado.`);
    try {
      window.localStorage.setItem(
        CUSTOM_OPTIONS_STORAGE_KEY,
        JSON.stringify(nextCustomMap)
      );
      notifySync();
    } catch {
      // Ignore
    }
  };

  // Unique profiles for metrics and tables
  const uniqueProfiles = useMemo<ReikiUserProfile[]>(() => {
    const mapById = new Map<string, ReikiUserProfile>();
    Object.entries(profilesByEmail).forEach(([key, prof]) => {
      if (!prof) return;
      if (key === "reikionline" && mapById.has(prof.id)) return;
      const uniqueKey = prof.id || prof.email || key;
      mapById.set(uniqueKey, prof);
    });
    return Array.from(mapById.values());
  }, [profilesByEmail]);

  const metrics = useMemo(() => {
    let terapeutas = 0;
    let consultantes = 0;
    let suspendidos = 0;
    let bioVerificados = 0;
    let whatsappVerificados = 0;

    for (const p of uniqueProfiles) {
      const isTer = Boolean(p.soyTerapeuta || p.role === "terapeuta");
      if (isTer) terapeutas++;
      else consultantes++;
      if (isProfileCurrentlySuspended(p)) suspendidos++;
      if (
        p.isAdmin ||
        p.biometricVerification?.status === "verificada"
      ) {
        bioVerificados++;
      }
      if (p.whatsappVerified) whatsappVerificados++;
    }

    const txs = loadMpTransactions();
    const consultations = loadConsultations();
    const courses = loadTrainingsCatalog();
    const enrollments = loadTrainingEnrollments();
    const certificates = loadTrainingCertificates();

    const totalVolumeArs = txs.reduce(
      (acc, t) => acc + (t.sessionPriceArs || 0),
      0
    );
    const totalCommissionArs = txs.reduce(
      (acc, t) => acc + (t.marketplaceFeeArs || 0),
      0
    );

    return {
      totalUsers: uniqueProfiles.length,
      terapeutas,
      consultantes,
      suspendidos,
      bioVerificados,
      whatsappVerificados,
      txsCount: txs.length,
      consultationsCount: consultations.length,
      coursesCount: courses.length,
      enrollmentsCount: enrollments.length,
      certificatesCount: certificates.length,
      totalVolumeArs,
      totalCommissionArs,
    };
  }, [uniqueProfiles]);

  const filteredOmniboxResults = useMemo(() => {
    const q = omniboxQuery.trim().toLowerCase();
    if (!q) return OMNIBOX_FUNCTIONS;
    return OMNIBOX_FUNCTIONS.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.badge.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
    );
  }, [omniboxQuery]);

  const handleInstallPwa = () => {
    if (typeof window === "undefined") return;
    const win = window as unknown as { __instalarReikiPwa?: () => void };
    if (win.__instalarReikiPwa) {
      win.__instalarReikiPwa();
    }
  };

  if (!checkedSession) {
    return null;
  }

  const isDark = theme === "dark";

  // =========================================================================
  // VISTA 1: INGRESO EXCLUSIVO DE USUARIOS ADMINISTRADORES (FORMATO CN / SISTEMA)
  // =========================================================================
  if (!activeAdmin) {
    return (
      <main className="min-h-dvh flex flex-col items-center justify-center bg-[#f8f9fa] px-4 py-8 text-[#1e293b]">
        {/* Emblema superior centrado estilo www.cn.com.ar/sistema */}
        <div className="mb-3.5 flex h-24 w-24 items-center justify-center rounded-3xl bg-[#836DAD] p-3 shadow-lg shadow-[#2B1F42]/15">
          <img
            src="/brand/Reiki_Icono_Lavanda_Unificado.png"
            alt="Emblema Reiki Online ERP"
            width={96}
            height={96}
            fetchPriority="high"
            className="h-full w-full object-contain"
          />
        </div>

        <section
          aria-labelledby="login-heading"
          className="w-full max-w-[410px] rounded-[12px] border border-[#eef0f4] bg-white p-7 sm:p-8 shadow-[0_10px_30px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.04)]"
        >
          <header className="mb-5 text-left">
            <h1
              id="login-heading"
              className="text-[1.45rem] font-extrabold tracking-tight text-[#1e293b]"
            >
              Bienvenido
            </h1>
            <p className="mt-1 text-[0.85rem] font-medium text-[#64748b]">
              Inicie sesión para ingresar al sistema ERP de Reiki Online
            </p>
          </header>

          {loginError && (
            <div
              role="alert"
              aria-live="assertive"
              className="mb-4 flex items-start gap-2.5 rounded-[12px] border border-[#fecaca] bg-[#fef2f2] px-4 py-3 text-[0.86rem] font-medium text-[#b91c1c]"
            >
              <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="erp-admin-username"
                className="mb-1.5 inline-block text-[0.85rem] font-semibold text-[#334155]"
              >
                Usuario Administrador
                <span className="ml-0.5 text-[#836DAD]" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  type="text"
                  id="erp-admin-username"
                  name="username"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  autoComplete="username"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  enterKeyHint="next"
                  placeholder="Ej: danielg"
                  required
                  className="min-h-[44px] w-full rounded-[8px] border border-[#cbd5e1] bg-[#eef2ff] px-3.5 py-2 text-[0.95rem] text-[#1e293b] transition focus:border-[#836DAD] focus:bg-white focus:ring-3 focus:ring-[#836DAD]/20 focus:outline-none"
                />
              </div>
              <span className="mt-1 block text-[0.78rem] text-[#64748b]">
                Ingresá tu usuario asignado sin espacios.
              </span>
            </div>

            <div>
              <label
                htmlFor="erp-admin-password"
                className="mb-1.5 inline-block text-[0.85rem] font-semibold text-[#334155]"
              >
                Contraseña
                <span className="ml-0.5 text-[#836DAD]" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? "text" : "password"}
                  id="erp-admin-password"
                  name="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  placeholder="••••••••"
                  required
                  className="min-h-[44px] w-full rounded-[8px] border border-[#cbd5e1] bg-[#eef2ff] py-2 pr-12 pl-3.5 text-[0.95rem] text-[#1e293b] transition focus:border-[#836DAD] focus:bg-white focus:ring-3 focus:ring-[#836DAD]/20 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-pressed={showPassword}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  className="absolute right-1.5 inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-[8px] text-[#64748b] transition hover:bg-[#836DAD]/12 hover:text-[#836DAD]"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center gap-2 rounded-[8px] border border-[#6F599B] bg-[#836DAD] px-4 py-2.5 text-[0.94rem] font-bold text-white shadow-sm transition hover:bg-[#6F599B]"
            >
              <LogIn className="h-5 w-5 text-[#F3D791]" />
              <span>Ingresar al Sistema</span>
            </button>

            <div className="mt-2.5 border-t border-[#e2e8f0] pt-3">
              <Link
                href="/"
                className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[8px] border border-[#e6dec8] bg-[#faf8f2] px-3.5 py-2 text-[0.86rem] font-semibold text-[#334155] transition hover:border-[#836DAD] hover:bg-[#F6F3FA] hover:text-[#1e293b]"
              >
                <span>🌐 Ir a la Plataforma Pública de Reiki Online</span>
              </Link>
            </div>
          </form>

          <footer className="mt-5 flex items-center justify-between gap-3 border-t border-[#e2e8f0] pt-4 text-[0.82rem] text-[#64748b]">
            <span>Sistema preparado para PWA · v1.2</span>
            <button
              type="button"
              onClick={handleInstallPwa}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#e6dec8] bg-[#faf8f2] px-3 py-1.5 text-[0.8rem] font-semibold text-[#836DAD] hover:bg-[#F6F3FA]"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Instalar App</span>
            </button>
          </footer>
        </section>
      </main>
    );
  }

  // =========================================================================
  // VISTA 2: SISTEMA ERP REIKI ONLINE (FORMATO MÓDULOS CASANUEVAERP)
  // =========================================================================
  const adminFullName = `${activeAdmin.nombre} ${activeAdmin.apellido}`.trim();
  const adminInitial = (activeAdmin.nombre?.[0] || "A").toUpperCase();

  return (
    <div
      className={`min-h-dvh flex flex-col transition-colors ${
        isDark ? "bg-[#0f172a] text-[#f8fafc]" : "bg-[#f8f9fa] text-[#1e293b]"
      }`}
    >
      {/* BARRA SUPERIOR ERP (.erp-topbar idéntica a CasaNuevaERP) */}
      <header
        className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 border-b-2 border-[#F3D791]/70 shadow-[0_4px_16px_rgba(15,23,42,0.14)]"
        style={{
          background:
            "linear-gradient(90deg, #2B1F42 0%, #4A386E 50%, #2B1F42 100%)",
        }}
      >
        {/* Marca izquierda: Clic lleva a Pantalla Principal */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => setActiveSection("sec-inicio")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setActiveSection("sec-inicio");
            }
          }}
          title="Ir a la Pantalla Principal"
          className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-1 transition hover:bg-white/10"
        >
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#836DAD] p-1.5 shadow-sm border border-[#F3D791]/40">
            <img
              src="/brand/Reiki_Icono_Lavanda_Unificado.png"
              alt="Ir a la Pantalla Principal - Reiki Online ERP"
              width={40}
              height={40}
              className="h-full w-full object-contain"
            />
          </div>
          <div>
            <h1 className="m-0 text-base font-extrabold tracking-wide text-white">
              REIKI ONLINE ERP
            </h1>
            <p className="m-0 text-[11px] font-bold uppercase tracking-widest text-[#F3D791]">
              PORTAL DE ADMINISTRACIÓN
            </p>
          </div>
        </div>

        {/* Buscador inteligente Omnibox (CTRL + K) */}
        <div
          className="relative flex-1 max-w-[520px] min-w-[240px]"
          role="search"
          aria-label="Búsqueda inteligente de función o sección"
        >
          <div className="relative flex items-center">
            <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-[#836DAD]" />
            <input
              ref={omniboxInputRef}
              type="search"
              value={omniboxQuery}
              onFocus={() => setOmniboxOpen(true)}
              onBlur={() => setTimeout(() => setOmniboxOpen(false), 180)}
              onChange={(e) => {
                setOmniboxQuery(e.target.value);
                setOmniboxOpen(true);
              }}
              placeholder="Buscar función o sección (ej: Consultantes, Comisiones, Capacitaciones...)"
              autoComplete="off"
              className="min-h-[40px] w-full rounded-full border border-white/55 bg-white py-1.5 pr-20 pl-10 text-[0.86rem] text-[#0f172a] shadow-sm focus:border-[#F3D791] focus:ring-3 focus:ring-[#F3D791]/35 focus:outline-none"
            />
            <kbd className="pointer-events-none absolute right-3 rounded-md border border-[#cbd5e1] bg-[#f8fafc] px-1.5 py-0.5 text-[0.7rem] font-semibold text-[#475569]">
              CTRL + K
            </kbd>
          </div>

          {omniboxOpen && (
            <div
              role="listbox"
              className="absolute top-[calc(100%+0.45rem)] right-0 left-0 z-50 max-h-80 overflow-y-auto rounded-xl border border-[#e2e8f0] bg-white p-1.5 text-[#1e293b] shadow-2xl"
            >
              {filteredOmniboxResults.map((fn) => (
                <button
                  key={fn.id}
                  type="button"
                  onMouseDown={() => {
                    setActiveSection(fn.section);
                    setOmniboxOpen(false);
                    setOmniboxQuery("");
                  }}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition hover:bg-[#F6F3FA]"
                >
                  <span className="text-[0.86rem] font-semibold text-[#1e293b]">
                    {fn.title}
                  </span>
                  <span className="shrink-0 rounded-full border border-[#836DAD]/30 bg-[#F6F3FA] px-2.5 py-0.5 text-[0.72rem] font-bold text-[#836DAD]">
                    {fn.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Acciones derechas: Badge de sección activa + ← Atrás + Usuario + Salir */}
        <div className="flex flex-wrap items-center gap-2.5">
          {activeSection !== "sec-inicio" && (
            <>
              <span className="hidden sm:inline-flex items-center rounded-full border border-[#F3D791]/45 bg-white/10 px-3 py-1 text-xs font-bold text-[#F3D791]">
                {SECTION_TITLES[activeSection]}
              </span>
              <button
                type="button"
                onClick={() =>
                  activeSection === "sec-atajos" ||
                  activeSection === "sec-manual-usuario" ||
                  activeSection === "sec-estado-sistema"
                    ? setActiveSection("sec-menu-ayuda")
                    : setActiveSection("sec-inicio")
                }
                className="inline-flex min-h-[38px] cursor-pointer items-center justify-center gap-1.5 rounded-[8px] border border-white/40 bg-white/15 px-3.5 py-1.5 text-[0.82rem] font-bold text-white transition hover:border-[#F3D791] hover:bg-white/25"
              >
                <span>← Atrás</span>
              </button>
            </>
          )}

          {/* Píldora del Administrador activo */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => setActiveSection("sec-perfil-usuario")}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setActiveSection("sec-perfil-usuario");
              }
            }}
            title="Abrir Perfil de Usuario Administrador"
            className="flex cursor-pointer items-center gap-2.5 rounded-full border border-white/30 bg-white/15 px-3.5 py-1.5 transition hover:border-[#F3D791] hover:bg-white/25"
          >
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-[#F3D791] text-[0.82rem] font-extrabold text-[#2B1F42]">
              {adminInitial}
            </span>
            <div className="flex flex-col leading-tight">
              <strong className="text-[0.82rem] text-white">
                {adminFullName}
              </strong>
              <span className="text-[0.7rem] text-[#F3D791]">
                @{activeAdmin.username} · Administración
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex min-h-[38px] cursor-pointer items-center gap-1.5 rounded-[8px] border border-[#fecaca] bg-white px-3.5 py-1.5 text-[0.82rem] font-bold text-[#dc2626] shadow-xs transition hover:bg-[#fef2f2]"
          >
            <LogOut className="h-4 w-4" />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* CONTENEDOR PRINCIPAL DEL ERP (.erp-main) */}
      <div className="mx-auto w-full max-w-[1460px] flex-1 px-4 pt-5 pb-12 sm:px-6">
        {/* ================================================================
            SECCIÓN 0: PANTALLA PRINCIPAL (GRILLA DE MÓDULOS CASA NUEVA ERP)
           ================================================================ */}
        {activeSection === "sec-inicio" && (
          <section aria-label="Módulos principales del ERP de Reiki Online">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {/* 1. Consultantes y Terapeutas */}
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-usuarios")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-usuarios")
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  <Users className="h-5 w-5" />
                </div>
                <span className="absolute top-4 right-4 rounded-full border border-[#836DAD]/30 bg-[#F6F3FA] px-2.5 py-0.5 text-[0.72rem] font-bold text-[#836DAD]">
                  {metrics.totalUsers} perfiles
                </span>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Consultantes y Terapeutas
                </h3>
              </article>

              {/* 2. Terapias y Categorías Propuestas */}
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-terapias")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-terapias")
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  <Sparkles className="h-5 w-5" />
                </div>
                <span className="absolute top-4 right-4 rounded-full border border-[#836DAD]/30 bg-[#F3D791]/40 px-2.5 py-0.5 text-[0.72rem] font-bold text-[#2B1F42]">
                  {pendingAdminAlerts.length > 0
                    ? `${pendingAdminAlerts.length} pendientes`
                    : "6 categorías"}
                </span>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Terapias y Categorías Propuestas
                </h3>
              </article>

              {/* 3. Comisiones y Pagos Split 1:1 */}
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-comisiones")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-comisiones")
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  <Wallet className="h-5 w-5" />
                </div>
                <span className="absolute top-4 right-4 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[0.72rem] font-bold text-emerald-800">
                  Split 1:1 MP
                </span>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Comisiones y Pagos Split 1:1
                </h3>
              </article>

              {/* 4. Academia y Capacitaciones */}
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-capacitaciones")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-capacitaciones")
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <span className="absolute top-4 right-4 rounded-full border border-[#836DAD]/30 bg-[#F6F3FA] px-2.5 py-0.5 text-[0.72rem] font-bold text-[#836DAD]">
                  {metrics.coursesCount} cursos
                </span>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Academia y Capacitaciones
                </h3>
              </article>

              {/* 5. Verificación Biométrica e Identidad */}
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-biometria")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-biometria")
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="absolute top-4 right-4 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[0.72rem] font-bold text-emerald-800">
                  {metrics.bioVerificados} verificados
                </span>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Verificación Biométrica e Identidad
                </h3>
              </article>

              {/* 6. Videollamadas y Turnos (Daily.co) */}
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-videollamadas")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-videollamadas")
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  <Video className="h-5 w-5" />
                </div>
                <span className="absolute top-4 right-4 rounded-full border border-[#836DAD]/30 bg-[#F6F3FA] px-2.5 py-0.5 text-[0.72rem] font-bold text-[#836DAD]">
                  Daily.co 1:1
                </span>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Videollamadas y Turnos
                </h3>
              </article>

              {/* 7. WhatsApp Oficial (Twilio Verify) */}
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-whatsapp")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-whatsapp")
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <span className="absolute top-4 right-4 rounded-full border border-emerald-300 bg-emerald-50 px-2.5 py-0.5 text-[0.72rem] font-bold text-emerald-800">
                  E.164 Activo
                </span>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  WhatsApp Oficial
                </h3>
              </article>

              {/* 8. Estadísticas */}
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-estadisticas")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-estadisticas")
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Estadísticas
                </h3>
              </article>

              {/* 9. Fondo Claro / Fondo Oscuro (idéntico a CasaNuevaERP) */}
              <article
                role="button"
                tabIndex={0}
                onClick={handleToggleTheme}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") && handleToggleTheme()
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  {isDark ? (
                    <Moon className="h-5 w-5" />
                  ) : (
                    <Sun className="h-5 w-5" />
                  )}
                </div>
                <span className="absolute top-4 right-4 rounded-full border border-[#836DAD]/30 bg-[#F6F3FA] px-2.5 py-0.5 text-[0.72rem] font-bold text-[#836DAD]">
                  {isDark ? "Modo Oscuro" : "Modo Claro"}
                </span>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Fondo Claro / Fondo Oscuro
                </h3>
              </article>

              {/* 10. Perfil de Usuario */}
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-perfil-usuario")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-perfil-usuario")
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  <User className="h-5 w-5" />
                </div>
                <span className="absolute top-4 right-4 rounded-full border border-[#836DAD]/30 bg-[#F6F3FA] px-2.5 py-0.5 text-[0.72rem] font-bold text-[#836DAD]">
                  @{activeAdmin.username}
                </span>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Perfil de Usuario
                </h3>
              </article>

              {/* 11. Ayuda */}
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-menu-ayuda")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-menu-ayuda")
                }
                className={`group relative flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11),0_3px_8px_rgba(15,23,42,0.06)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD] shadow-2xs">
                  <HelpCircle className="h-5 w-5" />
                </div>
                <h3 className="m-0 text-[1.05rem] font-extrabold">Ayuda</h3>
              </article>
            </div>
          </section>
        )}

        {/* ================================================================
            MÓDULO 1: CONSULTANTES Y TERAPEUTAS
           ================================================================ */}
        {activeSection === "sec-usuarios" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-5 text-[#2B1F42] shadow-sm">
            <AdminDashboardPanel
              adminEmail={activeAdmin.email}
              profilesByEmail={profilesByEmail}
              onSaveUserProfile={saveUserProfile}
              pendingAdminAlerts={pendingAdminAlerts}
              approvedCustomOptions={approvedCustomOptions}
              adminFeedback={adminFeedback}
              onApproveAlert={handleAdminApproveAlert}
              onDismissAlert={handleAdminDismissAlert}
              onRemoveCustomOption={handleRemoveCustomOption}
              initialTab="usuarios"
              hideTopTabSelector
            />
          </div>
        )}

        {/* ================================================================
            MÓDULO 2: TERAPIAS Y CATEGORÍAS PROPUESTAS
           ================================================================ */}
        {activeSection === "sec-terapias" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-5 text-[#2B1F42] shadow-sm">
            <AdminDashboardPanel
              adminEmail={activeAdmin.email}
              profilesByEmail={profilesByEmail}
              onSaveUserProfile={saveUserProfile}
              pendingAdminAlerts={pendingAdminAlerts}
              approvedCustomOptions={approvedCustomOptions}
              adminFeedback={adminFeedback}
              onApproveAlert={handleAdminApproveAlert}
              onDismissAlert={handleAdminDismissAlert}
              onRemoveCustomOption={handleRemoveCustomOption}
              initialTab="terapias"
              hideTopTabSelector
            />
          </div>
        )}

        {/* ================================================================
            MÓDULO 3: COMISIONES Y PAGOS SPLIT 1:1 (MERCADO PAGO)
           ================================================================ */}
        {activeSection === "sec-comisiones" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-5 text-[#2B1F42] shadow-sm">
            <AdminPaymentsCommissionsPanel adminUser={activeAdmin.email} />
          </div>
        )}

        {/* ================================================================
            MÓDULO 4: ACADEMIA Y CAPACITACIONES
           ================================================================ */}
        {activeSection === "sec-capacitaciones" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-5 text-[#2B1F42] shadow-sm">
            <AdminTrainingsSupervisionPanel adminUser={activeAdmin.email} />
          </div>
        )}

        {/* ================================================================
            MÓDULO 5: VERIFICACIÓN BIOMÉTRICA E IDENTIDAD (RENAPER / KYC)
           ================================================================ */}
        {activeSection === "sec-biometria" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-5 text-[#2B1F42] shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#2B1F42]">
                  Verificación Biométrica e Identidad (RENAPER / KYC)
                </h2>
                <p className="text-xs text-[#2B1F42]/70">
                  Control administrativo de estados biométricos obligatorios para Terapeutas y alertas de riesgo objetivos para Consultantes.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {metrics.bioVerificados} de {metrics.totalUsers} identidades verificadas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#836DAD]/20 bg-[#F6F3FA] text-[#836DAD]">
                  <tr>
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">DNI</th>
                    <th className="p-3">Estado Biométrico</th>
                    <th className="p-3">Cambiar Estado / Simular Riesgo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#836DAD]/10">
                  {uniqueProfiles.map((prof) => {
                    const nick = getEffectiveNickname(prof);
                    const isTer = Boolean(
                      prof.soyTerapeuta || prof.role === "terapeuta"
                    );
                    const bioRec =
                      prof.biometricVerification ||
                      createInitialBiometricRecord(
                        prof.id,
                        Boolean(prof.isAdmin)
                      );
                    const hasRisk = (bioRec.riskFlags || []).length > 0;

                    return (
                      <tr key={prof.id} className="hover:bg-[#FAF8FC]">
                        <td className="p-3 font-bold">
                          {prof.nombre} {prof.apellido}{" "}
                          <span className="text-[#836DAD]">(@{nick})</span>
                        </td>
                        <td className="p-3">
                          {isTer ? "Terapeuta" : "Consultante"}
                        </td>
                        <td className="p-3">{prof.dni || "-"}</td>
                        <td className="p-3">
                          <span
                            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              bioRec.status === "verificada"
                                ? "bg-emerald-100 text-emerald-800"
                                : bioRec.status === "pendiente"
                                ? "bg-amber-100 text-amber-800"
                                : bioRec.status === "rechazada"
                                ? "bg-rose-100 text-rose-800"
                                : "bg-[#F6F3FA] text-[#836DAD]"
                            }`}
                          >
                            {bioRec.status === "verificada"
                              ? "✓ Identidad verificada"
                              : bioRec.status}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              aria-label={`Estado biométrico de ${prof.nombre}`}
                              value={bioRec.status}
                              onChange={(e) => {
                                const nextSt = e.target
                                  .value as BiometricVerificationStatus;
                                const nowIso = new Date().toISOString();
                                saveUserProfile({
                                  ...prof,
                                  biometricVerification: {
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
                                  },
                                  updatedAt: nowIso,
                                });
                              }}
                              className="cursor-pointer rounded-lg border border-[#836DAD]/30 bg-white px-2.5 py-1 text-xs font-bold text-[#2B1F42]"
                            >
                              <option value="verificada">verificada</option>
                              <option value="pendiente">pendiente</option>
                              <option value="no_iniciada">no_iniciada</option>
                              <option value="revision_requerida">
                                revision_requerida
                              </option>
                              <option value="rechazada">rechazada</option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
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
                                  updatedAt: new Date().toISOString(),
                                });
                              }}
                              className="cursor-pointer rounded-lg border border-[#836DAD]/30 bg-[#FAF8FC] px-2.5 py-1 text-[11px] font-bold text-[#836DAD] hover:bg-[#836DAD] hover:text-white"
                            >
                              {hasRisk
                                ? "Quitar alerta riesgo"
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

        {/* ================================================================
            MÓDULO 6: VIDEOLLAMADAS Y TURNOS (SALAS 1:1 DAILY.CO)
           ================================================================ */}
        {activeSection === "sec-videollamadas" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-5 text-[#2B1F42] shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#2B1F42]">
                  Videollamadas y Turnos (Salas Privadas 1:1 Daily.co)
                </h2>
                <p className="text-xs text-[#2B1F42]/70">
                  Auditoría de sesiones programadas, sesiones finalizadas y contrataciones procesadas en la plataforma.
                </p>
              </div>
              <span className="rounded-full bg-[#F6F3FA] px-3 py-1 text-xs font-bold text-[#836DAD]">
                {metrics.consultationsCount + metrics.txsCount} sesiones registradas
              </span>
            </div>

            <div className="space-y-2.5">
              {loadConsultations().map((cons) => (
                <div
                  key={cons.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-3.5 text-xs"
                >
                  <div>
                    <p className="font-bold text-[#2B1F42]">
                      {cons.therapyName} · Terapeuta: @{cons.therapistNickname} ↔
                      Consultante: {cons.consultanteName}
                    </p>
                    <p className="text-[11px] text-[#2B1F42]/70">
                      Modalidad: {cons.modality} · Horario: {cons.scheduledAt}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                      cons.status === "efectuada"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {cons.status === "efectuada"
                      ? "✓ Sesión Finalizada"
                      : "📅 Sesión Programada"}
                  </span>
                </div>
              ))}

              {loadMpTransactions().map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#836DAD]/20 bg-white p-3.5 text-xs"
                >
                  <div>
                    <p className="font-bold text-[#2B1F42]">
                      {tx.therapyName} · Terapeuta: {tx.therapistName} ↔
                      Consultante: {tx.consultanteName}
                    </p>
                    <p className="text-[11px] text-[#2B1F42]/70">
                      {ATTENTION_MODALITY_LABELS[tx.attentionModality]} ·{" "}
                      {BOOKING_TIMING_LABELS[tx.bookingTiming]} (
                      {tx.scheduledSlotLabel})
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-extrabold text-[#836DAD]">
                      {formatArs(tx.sessionPriceArs)}
                    </p>
                    <span className="text-[10px] font-bold text-emerald-700">
                      Comisión Reiki: {formatArs(tx.marketplaceFeeArs)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ================================================================
            MÓDULO 7: WHATSAPP OFICIAL (TWILIO VERIFY E.164)
           ================================================================ */}
        {activeSection === "sec-whatsapp" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-5 text-[#2B1F42] shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-4">
              <div>
                <h2 className="text-lg font-extrabold text-[#2B1F42]">
                  WhatsApp Oficial (Twilio Verify · Formato E.164)
                </h2>
                <p className="text-xs text-[#2B1F42]/70">
                  El número de WhatsApp de consultantes y terapeutas es estrictamente confidencial y no publicable; solo es auditado internamente por Administración.
                </p>
              </div>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                {metrics.whatsappVerificados} números verificados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[#836DAD]/20 bg-[#F6F3FA] text-[#836DAD]">
                  <tr>
                    <th className="p-3">Usuario</th>
                    <th className="p-3">Rol</th>
                    <th className="p-3">WhatsApp E.164 (Confidencial)</th>
                    <th className="p-3">Estado Twilio Verify</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#836DAD]/10">
                  {uniqueProfiles.map((prof) => {
                    const isTer = Boolean(
                      prof.soyTerapeuta || prof.role === "terapeuta"
                    );
                    return (
                      <tr key={prof.id} className="hover:bg-[#FAF8FC]">
                        <td className="p-3 font-bold">
                          {prof.nombre} {prof.apellido}
                        </td>
                        <td className="p-3">
                          {isTer ? "Terapeuta" : "Consultante"}
                        </td>
                        <td className="p-3 font-mono">
                          {prof.whatsappE164 ||
                            `${prof.prefijoTelefono || ""}${
                              prof.telefono || ""
                            }` ||
                            "Sin cargar"}
                        </td>
                        <td className="p-3">
                          {prof.whatsappVerified ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              <CheckCircle2 className="h-3 w-3" />
                              WhatsApp Verificado
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                              Sin verificar
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ================================================================
            MÓDULO 8: ESTADÍSTICAS Y REPORTES
           ================================================================ */}
        {activeSection === "sec-estadisticas" && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-[#836DAD]/35 bg-gradient-to-br from-[#F6F3FA] to-white p-4 shadow-xs">
                <span className="block text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Usuarios Registrados
                </span>
                <span className="mt-1 block text-2xl font-extrabold text-[#2B1F42]">
                  {metrics.totalUsers}
                </span>
                <span className="text-xs text-[#64748b]">
                  {metrics.terapeutas} Terapeutas · {metrics.consultantes}{" "}
                  Consultantes
                </span>
              </div>

              <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-xs">
                <span className="block text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Identidades y WhatsApp
                </span>
                <span className="mt-1 block text-2xl font-extrabold text-emerald-700">
                  {metrics.bioVerificados} Bio / {metrics.whatsappVerificados}{" "}
                  WA
                </span>
                <span className="text-xs text-[#64748b]">
                  Perfiles suspendidos: {metrics.suspendidos}
                </span>
              </div>

              <div className="rounded-xl border border-[#e2e8f0] bg-white p-4 shadow-xs">
                <span className="block text-xs font-bold uppercase tracking-wider text-[#64748b]">
                  Academia y Cursos
                </span>
                <span className="mt-1 block text-2xl font-extrabold text-[#836DAD]">
                  {metrics.coursesCount} Cursos
                </span>
                <span className="text-xs text-[#64748b]">
                  {metrics.enrollmentsCount} inscripciones ·{" "}
                  {metrics.certificatesCount} certificados
                </span>
              </div>

              <div className="rounded-xl border border-[#F3D791] bg-gradient-to-br from-[#fef9e7] to-white p-4 shadow-xs">
                <span className="block text-xs font-bold uppercase tracking-wider text-[#8a6108]">
                  Comisiones Reiki Online
                </span>
                <span className="mt-1 block text-2xl font-extrabold text-[#8a6108]">
                  {formatArs(metrics.totalCommissionArs)}
                </span>
                <span className="text-xs text-[#64748b]">
                  Volumen bruto: {formatArs(metrics.totalVolumeArs)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            MÓDULO 10: PERFIL DE USUARIO Y NÓMINA DE ADMINISTRADORES
           ================================================================ */}
        {activeSection === "sec-perfil-usuario" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-6 text-[#2B1F42] shadow-sm space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#836DAD]/15 pb-4">
              <div className="flex items-center gap-3.5">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#836DAD] text-xl font-extrabold text-[#F3D791]">
                  {adminInitial}
                </div>
                <div>
                  <h2 className="text-lg font-extrabold text-[#2B1F42]">
                    {adminFullName}
                  </h2>
                  <p className="text-xs font-semibold text-[#836DAD]">
                    Usuario Administrador: @{activeAdmin.username} ·{" "}
                    {activeAdmin.email}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-3.5 py-1 text-xs font-bold text-emerald-800">
                ✓ Sesión Administrativa Activa
              </span>
            </div>

            <div>
              <h3 className="mb-3 text-sm font-extrabold text-[#2B1F42]">
                Nómina de Usuarios de Administración Habilitados en{" "}
                <code>/sistema</code>
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {ADMIN_ACCOUNTS.map((acc) => {
                  const isCurrent = acc.username === activeAdmin.username;
                  return (
                    <div
                      key={acc.username}
                      className={`rounded-xl border p-4 text-xs ${
                        isCurrent
                          ? "border-[#836DAD] bg-[#F6F3FA]"
                          : "border-[#dbe3ee] bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <strong className="text-sm text-[#2B1F42]">
                          {acc.nombre} {acc.apellido}
                        </strong>
                        {isCurrent && (
                          <span className="rounded-full bg-[#836DAD] px-2 py-0.5 text-[10px] font-bold text-white">
                            En sesión
                          </span>
                        )}
                      </div>
                      <p className="mt-1 font-mono text-[#836DAD]">
                        Usuario: <strong>{acc.username}</strong>
                      </p>
                      <p className="mt-0.5 text-[#64748b]">{acc.email}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ================================================================
            MÓDULO 11: SUBMENÚ DE AYUDA (ESTILO CASANUEVAERP)
           ================================================================ */}
        {activeSection === "sec-menu-ayuda" && (
          <section aria-label="Submódulos de Ayuda">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-atajos")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-atajos")
                }
                className={`flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD]">
                  <Keyboard className="h-5 w-5" />
                </div>
                <h3 className="m-0 text-[1.05rem] font-extrabold">Atajos</h3>
              </article>

              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-manual-usuario")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-manual-usuario")
                }
                className={`flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD]">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Manual del Usuario
                </h3>
              </article>

              <article
                role="button"
                tabIndex={0}
                onClick={() => setActiveSection("sec-estado-sistema")}
                onKeyDown={(e) =>
                  (e.key === "Enter" || e.key === " ") &&
                  setActiveSection("sec-estado-sistema")
                }
                className={`flex cursor-pointer flex-col gap-3.5 rounded-[14px] border p-6 shadow-[0_10px_26px_rgba(15,23,42,0.11)] transition-all hover:-translate-y-1 hover:border-[#836DAD] ${
                  isDark
                    ? "border-slate-700 bg-slate-800 text-white"
                    : "border-[#dbe3ee] bg-white text-[#1e293b]"
                }`}
              >
                <div className="inline-flex h-11 w-11 items-center justify-center rounded-[11px] border border-[#836DAD]/30 bg-[#F6F3FA] text-[#836DAD]">
                  <Activity className="h-5 w-5" />
                </div>
                <h3 className="m-0 text-[1.05rem] font-extrabold">
                  Estado de Integraciones
                </h3>
              </article>
            </div>
          </section>
        )}

        {activeSection === "sec-atajos" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-6 text-[#2B1F42] shadow-sm space-y-3 text-xs">
            <h2 className="text-base font-extrabold text-[#2B1F42]">
              Atajos Rápidos del Sistema ERP
            </h2>
            <p>
              <strong>CTRL + K:</strong> Enfocar el buscador inteligente Omnibox desde cualquier módulo.
            </p>
            <p>
              <strong>ESC:</strong> Cerrar el desplegable de búsqueda inteligente.
            </p>
            <p>
              <strong>Clic en Logo Superior REIKI ONLINE ERP:</strong> Volver de inmediato a la Pantalla Principal de módulos.
            </p>
          </div>
        )}

        {activeSection === "sec-manual-usuario" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-6 text-[#2B1F42] shadow-sm space-y-3 text-xs leading-relaxed">
            <h2 className="text-base font-extrabold text-[#2B1F42]">
              Manual del Administrador — Reiki Online ERP
            </h2>
            <p>
              <strong>1. Consultantes y Terapeutas:</strong> Permite inspeccionar la ficha completa de cada usuario (incluyendo domicilio, coordenadas GPS satelitales y estado de verificaciones), aplicar suspensiones temporales o definitivas por normas de la comunidad y exportar el padrón completo en CSV.
            </p>
            <p>
              <strong>2. Terapias y Categorías Propuestas:</strong> Permite aprobar o descartar nuevas especialidades sugeridas por terapeutas mediante la opción «Otra → ¿Cuál?».
            </p>
            <p>
              <strong>3. Comisiones y Pagos Split 1:1:</strong> Configura los porcentajes de comisión de Reiki Online por modalidad (Presencial, Virtual con turno, Virtual ahora) y audita las operaciones y devoluciones con Mercado Pago.
            </p>
            <p>
              <strong>4. Academia y Capacitaciones:</strong> Supervisa todos los cursos publicados por terapeutas, alumnos inscriptos, comisiones de formación y certificados digitales emitidos.
            </p>
          </div>
        )}

        {activeSection === "sec-estado-sistema" && (
          <div className="rounded-2xl border border-[#dbe3ee] bg-white p-6 text-[#2B1F42] shadow-sm space-y-3 text-xs">
            <h2 className="text-base font-extrabold text-[#2B1F42]">
              Estado de Integraciones de Plataforma
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                <strong className="text-emerald-900">
                  ✓ Mercado Pago Split 1:1 (OAuth + Webhooks)
                </strong>
                <p className="mt-1 text-emerald-800">
                  Operativo · Rutas /api/mp/oauth, /api/mp/preference y /api/mp/webhook activas.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                <strong className="text-emerald-900">
                  ✓ Videollamadas Daily.co (Salas 1:1 y Aulas)
                </strong>
                <p className="mt-1 text-emerald-800">
                  Operativo · Ruta /api/video/room activa para turnos y Online ahora.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                <strong className="text-emerald-900">
                  ✓ Verificación Biométrica & RENAPER
                </strong>
                <p className="mt-1 text-emerald-800">
                  Operativo · Rutas /api/biometric/session, /api/biometric/verify y /api/biometric/webhook activas.
                </p>
              </div>
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3.5">
                <strong className="text-emerald-900">
                  ✓ Twilio Verify WhatsApp E.164
                </strong>
                <p className="mt-1 text-emerald-800">
                  Operativo · Rutas /api/verify/send y /api/verify/check activas.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
