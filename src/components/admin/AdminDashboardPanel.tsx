"use client";

import React, { useMemo, useState } from "react";
import {
  Users,
  UserCheck,
  HeartHandshake,
  ShieldCheck,
  ShieldAlert,
  Ban,
  Clock,
  CheckCircle2,
  Search,
  MapPin,
  ExternalLink,
  Download,
  Sparkles,
  Wallet,
  PlusCircle,
  Trash2,
  RefreshCw,
} from "lucide-react";
import {
  buildGoogleMapsExternalUrl,
  getEffectiveNickname,
  isProfileCurrentlySuspended,
  ReikiUserProfile,
} from "@/lib/geoData";
import {
  BiometricVerificationStatus,
  createInitialBiometricRecord,
} from "@/lib/biometricIdentity";
import { ROLE_THERAPY_CATEGORIES } from "@/lib/reiki-data";
import type { PendingAdminCategoryAlert } from "@/components/auth/TerapiasAccessPanel";
import AdminPaymentsCommissionsPanel from "@/components/payments/AdminPaymentsCommissionsPanel";

interface AdminDashboardPanelProps {
  adminEmail: string;
  profilesByEmail: Record<string, ReikiUserProfile>;
  onSaveUserProfile: (updated: ReikiUserProfile) => void;
  pendingAdminAlerts: PendingAdminCategoryAlert[];
  approvedCustomOptions: Record<string, string[]>;
  adminFeedback: string | null;
  onApproveAlert: (alertItem: PendingAdminCategoryAlert) => void;
  onDismissAlert: (alertId: string) => void;
  onRemoveCustomOption?: (categoryId: string, optionLabel: string) => void;
}

type AdminSectionTab = "usuarios" | "terapias" | "comisiones";
type RoleFilter = "todos" | "consultantes" | "terapeutas" | "suspendidos";

const SUSPENSION_DURATION_OPTIONS = [
  { value: "1", label: "24 horas (1 día)" },
  { value: "3", label: "3 días" },
  { value: "7", label: "7 días" },
  { value: "15", label: "15 días" },
  { value: "30", label: "30 días" },
  { value: "90", label: "90 días" },
  { value: "custom", label: "Personalizado (días)..." },
];

const DEFAULT_COMMUNITY_REASONS = [
  "Incumplimiento de las normas de convivencia de la comunidad Reiki Online",
  "Conducta inapropiada o falta de respeto reportada por usuarios",
  "Publicación de datos o contenidos no permitidos en la red social",
  "Incumplimiento reiterado de compromisos de sesiones confirmadas",
  "Identidad o información profesional inconsistente",
];

export default function AdminDashboardPanel({
  adminEmail,
  profilesByEmail,
  onSaveUserProfile,
  pendingAdminAlerts,
  approvedCustomOptions,
  adminFeedback,
  onApproveAlert,
  onDismissAlert,
  onRemoveCustomOption,
}: AdminDashboardPanelProps) {
  const [activeTab, setActiveTab] = useState<AdminSectionTab>("usuarios");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("todos");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [noticeMsg, setNoticeMsg] = useState<string | null>(null);

  // Estado local por usuario para configurar la suspensión (duración y motivo)
  const [durationByUserId, setDurationByUserId] = useState<
    Record<string, string>
  >({});
  const [customDaysByUserId, setCustomDaysByUserId] = useState<
    Record<string, string>
  >({});
  const [reasonByUserId, setReasonByUserId] = useState<Record<string, string>>(
    {}
  );

  const showNotice = (msg: string) => {
    setNoticeMsg(msg);
    setTimeout(() => {
      setNoticeMsg((prev) => (prev === msg ? null : prev));
    }, 5000);
  };

  // Unificar perfiles únicos por ID / nickname (excluyendo duplicados de claves en profilesByEmail)
  const uniqueProfiles = useMemo<ReikiUserProfile[]>(() => {
    const mapById = new Map<string, ReikiUserProfile>();
    Object.entries(profilesByEmail).forEach(([key, prof]) => {
      if (!prof) return;
      // Evitar duplicar el perfil de admin bajo la clave genérica "reikionline"
      if (key === "reikionline" && mapById.has(prof.id)) return;
      const uniqueKey = prof.id || prof.email || key;
      mapById.set(uniqueKey, prof);
    });
    return Array.from(mapById.values()).sort((a, b) => {
      const nameA = `${a.nombre || ""} ${a.apellido || ""}`.trim();
      const nameB = `${b.nombre || ""} ${b.apellido || ""}`.trim();
      return nameA.localeCompare(nameB, "es");
    });
  }, [profilesByEmail]);

  const counts = useMemo(() => {
    let consultantes = 0;
    let terapeutas = 0;
    let suspendidos = 0;
    for (const p of uniqueProfiles) {
      const isTer = Boolean(p.soyTerapeuta || p.role === "terapeuta");
      if (isTer) terapeutas++;
      else consultantes++;
      if (isProfileCurrentlySuspended(p)) suspendidos++;
    }
    return {
      total: uniqueProfiles.length,
      consultantes,
      terapeutas,
      suspendidos,
    };
  }, [uniqueProfiles]);

  const filteredProfiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return uniqueProfiles.filter((prof) => {
      const isTer = Boolean(prof.soyTerapeuta || prof.role === "terapeuta");
      const isSusp = isProfileCurrentlySuspended(prof);

      if (roleFilter === "consultantes" && isTer) return false;
      if (roleFilter === "terapeutas" && !isTer) return false;
      if (roleFilter === "suspendidos" && !isSusp) return false;

      if (!q) return true;

      const nick = getEffectiveNickname(prof);
      const haystack = [
        prof.nombre,
        prof.apellido,
        nick,
        prof.dni,
        prof.email,
        prof.telefono,
        prof.whatsappE164,
        prof.pais,
        prof.provincia,
        prof.localidad,
        prof.codigoPostal,
        prof.barrio,
        prof.calle,
        prof.numeroCalle,
        ...(prof.therapiesOffered || []),
        ...(prof.therapiesSought || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(q);
    });
  }, [uniqueProfiles, roleFilter, searchQuery]);

  // Suspender temporalmente por determinado tiempo
  const handleSuspendTemporarily = (prof: ReikiUserProfile) => {
    const selectedDur = durationByUserId[prof.id] || "7";
    const days =
      selectedDur === "custom"
        ? Math.max(1, parseInt(customDaysByUserId[prof.id] || "7", 10) || 7)
        : Math.max(1, parseInt(selectedDur, 10) || 7);

    const now = new Date();
    const untilDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const reason =
      (reasonByUserId[prof.id] || "").trim() || DEFAULT_COMMUNITY_REASONS[0];

    const updated: ReikiUserProfile = {
      ...prof,
      visibleEnRed: false,
      suspension: {
        status: "temporal",
        reason,
        suspendedAt: now.toISOString(),
        suspendedUntil: untilDate.toISOString(),
        suspendedBy: adminEmail,
      },
      updatedAt: now.toISOString(),
    };

    onSaveUserProfile(updated);
    showNotice(
      `Perfil de ${prof.nombre} ${prof.apellido} (@${getEffectiveNickname(
        prof
      )}) suspendido temporalmente por ${days} ${
        days === 1 ? "día" : "días"
      } (hasta el ${untilDate.toLocaleDateString("es-AR")}).`
    );
  };

  // Suspender definitivamente
  const handleSuspendPermanently = (prof: ReikiUserProfile) => {
    const now = new Date();
    const reason =
      (reasonByUserId[prof.id] || "").trim() || DEFAULT_COMMUNITY_REASONS[0];

    const updated: ReikiUserProfile = {
      ...prof,
      visibleEnRed: false,
      suspension: {
        status: "definitiva",
        reason,
        suspendedAt: now.toISOString(),
        suspendedUntil: null,
        suspendedBy: adminEmail,
      },
      updatedAt: now.toISOString(),
    };

    onSaveUserProfile(updated);
    showNotice(
      `Perfil de ${prof.nombre} ${prof.apellido} (@${getEffectiveNickname(
        prof
      )}) suspendido DEFINITIVAMENTE por incumplimiento de las normas de la comunidad.`
    );
  };

  // Levantar suspensión / Reactivar perfil
  const handleLiftSuspension = (prof: ReikiUserProfile) => {
    const nowIso = new Date().toISOString();
    const updated: ReikiUserProfile = {
      ...prof,
      visibleEnRed: true,
      suspension: {
        status: "activa",
        reason: "",
        suspendedAt: null,
        suspendedUntil: null,
        suspendedBy: adminEmail,
      },
      updatedAt: nowIso,
    };

    onSaveUserProfile(updated);
    showNotice(
      `Suspensión levantada: el perfil de ${prof.nombre} ${prof.apellido} (@${getEffectiveNickname(
        prof
      )}) se encuentra nuevamente ACTIVO.`
    );
  };

  // Exportar CSV con todos los datos de Consultantes y Terapeutas
  const handleExportProfilesCsv = () => {
    const headers = [
      "ID",
      "Rol",
      "Estado_Cuenta",
      "Suspendido_Hasta",
      "Motivo_Suspension",
      "Nombre",
      "Apellido",
      "Nickname",
      "Enlace_Red_Social",
      "Visible_En_Red",
      "DNI",
      "Fecha_Nacimiento",
      "Genero",
      "Email",
      "WhatsApp_E164",
      "WhatsApp_Verificado",
      "Identidad_Biometrica",
      "Pais",
      "Provincia",
      "Localidad",
      "Codigo_Postal",
      "Barrio",
      "Calle",
      "Numero",
      "Edificio",
      "Torre",
      "Piso",
      "Dpto",
      "Observaciones_Domicilio",
      "Latitud_GPS",
      "Longitud_GPS",
      "Terapias",
    ];

    const rows = filteredProfiles.map((prof) => {
      const nick = getEffectiveNickname(prof);
      const isTer = Boolean(prof.soyTerapeuta || prof.role === "terapeuta");
      const isSusp = isProfileCurrentlySuspended(prof);
      const suspStatus = !isSusp
        ? "ACTIVO"
        : prof.suspension?.status === "definitiva"
        ? "SUSPENDIDO_DEFINITIVO"
        : "SUSPENDIDO_TEMPORAL";
      const bioStatus =
        prof.biometricVerification?.status ||
        (prof.isAdmin ? "verificada" : "no_iniciada");
      const therapiesList = [
        ...(prof.therapiesOffered || []),
        ...(prof.therapiesSought || []),
      ].join(" | ");

      return [
        prof.id,
        isTer ? "Terapeuta" : "Consultante",
        suspStatus,
        prof.suspension?.suspendedUntil || "",
        prof.suspension?.reason || "",
        prof.nombre,
        prof.apellido,
        `@${nick}`,
        `https://www.reikionline.com.ar/${nick}`,
        prof.visibleEnRed !== false ? "SI" : "NO",
        prof.dni,
        prof.fechaNacimiento,
        prof.genero,
        prof.email,
        prof.whatsappE164 || `${prof.prefijoTelefono}${prof.telefono}`,
        prof.whatsappVerified ? "VERIFICADO" : "SIN_VERIFICAR",
        bioStatus,
        prof.pais,
        prof.provincia,
        prof.localidad,
        prof.codigoPostal,
        prof.barrio,
        prof.calle,
        prof.numeroCalle,
        prof.edificio,
        prof.torre,
        prof.piso,
        prof.dpto,
        prof.observacionesDomicilio,
        String(prof.geo?.lat ?? ""),
        String(prof.geo?.lng ?? ""),
        therapiesList,
      ];
    });

    const csvContent =
      "\uFEFF" +
      [headers, ...rows]
        .map((r) =>
          r.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(";")
        )
        .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `reiki_online_padron_consultantes_terapeutas_${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showNotice("Padrón completo de Consultantes y Terapeutas exportado en CSV.");
  };

  return (
    <div className="space-y-6">
      {/* Navegación principal exclusiva del Administrador (3 funciones centrales) */}
      <div className="grid grid-cols-1 gap-2.5 rounded-2xl bg-[#F6F3FA] p-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={() => setActiveTab("usuarios")}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "usuarios"
              ? "bg-[#836DAD] text-white shadow-sm"
              : "bg-white text-[#2B1F42] hover:bg-[#836DAD]/12"
          }`}
        >
          <Users className="h-4 w-4 shrink-0" />
          <span>1. Consultantes y Terapeutas ({counts.total})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("terapias")}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "terapias"
              ? "bg-[#836DAD] text-white shadow-sm"
              : "bg-white text-[#2B1F42] hover:bg-[#836DAD]/12"
          }`}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>
            2. Terapias Propuestas
            {pendingAdminAlerts.length > 0
              ? ` (${pendingAdminAlerts.length})`
              : ""}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("comisiones")}
          className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-xs sm:text-sm font-bold transition-all ${
            activeTab === "comisiones"
              ? "bg-[#836DAD] text-white shadow-sm"
              : "bg-white text-[#2B1F42] hover:bg-[#836DAD]/12"
          }`}
        >
          <Wallet className="h-4 w-4 shrink-0" />
          <span>3. Comisiones y Pagos Split</span>
        </button>
      </div>

      {(noticeMsg || adminFeedback) && (
        <div className="flex items-center gap-2 rounded-2xl border border-[#836DAD]/35 bg-[#F6F3FA] px-4 py-3 text-xs font-bold text-[#836DAD]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{noticeMsg || adminFeedback}</span>
        </div>
      )}

      {/* =====================================================================
          SECCIÓN 1: LISTADO COMPLETO DE CONSULTANTES Y TERAPEUTAS + SUSPENSIÓN
         ===================================================================== */}
      {activeTab === "usuarios" && (
        <div className="space-y-5">
          {/* Resumen y filtros por tipo de perfil */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <button
              type="button"
              onClick={() => setRoleFilter("todos")}
              className={`cursor-pointer rounded-2xl border p-3.5 text-left transition ${
                roleFilter === "todos"
                  ? "border-[#836DAD] bg-[#836DAD] text-white shadow-sm"
                  : "border-[#836DAD]/20 bg-[#F6F3FA] text-[#2B1F42] hover:border-[#836DAD]"
              }`}
            >
              <span className="block text-[11px] font-bold uppercase opacity-80">
                Total Registrados
              </span>
              <span className="mt-1 block text-2xl font-extrabold">
                {counts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("consultantes")}
              className={`cursor-pointer rounded-2xl border p-3.5 text-left transition ${
                roleFilter === "consultantes"
                  ? "border-[#836DAD] bg-[#836DAD] text-white shadow-sm"
                  : "border-[#836DAD]/20 bg-[#F6F3FA] text-[#2B1F42] hover:border-[#836DAD]"
              }`}
            >
              <span className="block text-[11px] font-bold uppercase opacity-80">
                Consultantes
              </span>
              <span className="mt-1 block text-2xl font-extrabold">
                {counts.consultantes}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("terapeutas")}
              className={`cursor-pointer rounded-2xl border p-3.5 text-left transition ${
                roleFilter === "terapeutas"
                  ? "border-[#836DAD] bg-[#836DAD] text-white shadow-sm"
                  : "border-[#836DAD]/20 bg-[#F6F3FA] text-[#2B1F42] hover:border-[#836DAD]"
              }`}
            >
              <span className="block text-[11px] font-bold uppercase opacity-80">
                Terapeutas
              </span>
              <span className="mt-1 block text-2xl font-extrabold">
                {counts.terapeutas}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setRoleFilter("suspendidos")}
              className={`cursor-pointer rounded-2xl border p-3.5 text-left transition ${
                roleFilter === "suspendidos"
                  ? "border-rose-600 bg-rose-600 text-white shadow-sm"
                  : "border-rose-300 bg-rose-50 text-rose-900 hover:border-rose-500"
              }`}
            >
              <span className="block text-[11px] font-bold uppercase opacity-80">
                Perfiles Suspendidos
              </span>
              <span className="mt-1 block text-2xl font-extrabold">
                {counts.suspendidos}
              </span>
            </button>
          </div>

          {/* Buscador y Exportar CSV */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#836DAD]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, apellido, @nickname, DNI, email, WhatsApp, localidad o provincia..."
                className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] py-2.5 pr-4 pl-10 text-xs sm:text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/45 focus:border-[#836DAD] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="button"
              onClick={handleExportProfilesCsv}
              className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#836DAD] px-4 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-[#6F599B]"
            >
              <Download className="h-4 w-4 text-[#F3D791]" />
              <span>Exportar todos los datos (CSV)</span>
            </button>
          </div>

          {/* Listado detallado de todos los datos de Consultantes y Terapeutas */}
          <div className="space-y-4">
            {filteredProfiles.length === 0 ? (
              <div className="rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-6 text-center text-xs text-[#2B1F42]/70">
                No se encontraron perfiles de Consultantes o Terapeutas con ese criterio de búsqueda.
              </div>
            ) : (
              filteredProfiles.map((prof) => {
                const nick = getEffectiveNickname(prof) || "sin-nickname";
                const isTerapeuta = Boolean(
                  prof.soyTerapeuta || prof.role === "terapeuta"
                );
                const isSuspended = isProfileCurrentlySuspended(prof);
                const suspType = prof.suspension?.status || "activa";
                const bioRec =
                  prof.biometricVerification ||
                  createInitialBiometricRecord(prof.id, Boolean(prof.isAdmin));

                const fullName =
                  `${prof.nombre || ""} ${prof.apellido || ""}`.trim() ||
                  "Sin nombre cargado";
                const initials = fullName
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                const selectedDuration = durationByUserId[prof.id] || "7";
                const customDays = customDaysByUserId[prof.id] || "7";
                const currentReason =
                  reasonByUserId[prof.id] ??
                  prof.suspension?.reason ??
                  DEFAULT_COMMUNITY_REASONS[0];

                const therapies =
                  isTerapeuta && (prof.therapiesOffered || []).length > 0
                    ? prof.therapiesOffered || []
                    : prof.therapiesSought || [];

                return (
                  <div
                    key={prof.id}
                    className={`rounded-3xl border-2 p-5 shadow-sm transition ${
                      isSuspended
                        ? "border-rose-400 bg-rose-50/40"
                        : "border-[#836DAD]/25 bg-white"
                    }`}
                  >
                    {/* Cabecera de la ficha del perfil */}
                    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#836DAD]/15 pb-4">
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-15 w-15 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#836DAD] bg-[#F6F3FA] text-base font-bold text-[#836DAD]">
                          {prof.fotoUrl ? (
                            <img
                              src={prof.fotoUrl}
                              alt={fullName}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            initials
                          )}
                        </div>

                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <h5 className="text-base sm:text-lg font-bold text-[#2B1F42]">
                              {fullName}
                            </h5>
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                                isTerapeuta
                                  ? "bg-[#F3D791] text-[#2B1F42]"
                                  : "bg-[#836DAD]/15 text-[#836DAD]"
                              }`}
                            >
                              {isTerapeuta ? (
                                <UserCheck className="h-3 w-3" />
                              ) : (
                                <HeartHandshake className="h-3 w-3" />
                              )}
                              {isTerapeuta ? "Terapeuta" : "Consultante"}
                            </span>

                            {isSuspended ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-600 px-3 py-0.5 text-[11px] font-bold text-white">
                                <Ban className="h-3 w-3" />
                                {suspType === "definitiva"
                                  ? "SUSPENDIDO DEFINITIVAMENTE"
                                  : `SUSPENDIDO HASTA ${new Date(
                                      prof.suspension?.suspendedUntil || ""
                                    ).toLocaleDateString("es-AR")}`}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                <CheckCircle2 className="h-3 w-3" />
                                Perfil Activo
                              </span>
                            )}
                          </div>

                          <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#2B1F42]/80">
                            <a
                              href={`/${nick}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-[#836DAD] hover:underline"
                            >
                              <span>@{nick}</span>
                              <span className="text-[#2B1F42]/60">
                                (reikionline.com.ar/{nick})
                              </span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                            <span>•</span>
                            <span>
                              Visibilidad en Red:{" "}
                              <strong>
                                {prof.visibleEnRed !== false && !isSuspended
                                  ? "Visible"
                                  : "Oculto"}
                              </strong>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Selector de estado de Identidad Biométrica para el Administrador */}
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="rounded-xl border border-[#836DAD]/25 bg-[#F6F3FA] px-3 py-1.5 text-xs">
                          <span className="block text-[10px] font-bold uppercase text-[#836DAD]">
                            Identidad Biométrica
                          </span>
                          <select
                            aria-label={`Estado biométrico de ${fullName}`}
                            value={bioRec.status}
                            onChange={(e) => {
                              const nextSt = e.target
                                .value as BiometricVerificationStatus;
                              const nowIso = new Date().toISOString();
                              onSaveUserProfile({
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
                              showNotice(
                                `Identidad biométrica de ${fullName} actualizada a "${nextSt}".`
                              );
                            }}
                            className="mt-0.5 cursor-pointer rounded-lg border border-[#836DAD]/30 bg-white px-2 py-1 text-xs font-bold text-[#2B1F42]"
                          >
                            <option value="verificada">
                              ✓ Identidad verificada
                            </option>
                            <option value="pendiente">Pendiente</option>
                            <option value="no_iniciada">No iniciada</option>
                            <option value="revision_requerida">
                              Revisión requerida
                            </option>
                            <option value="rechazada">Rechazada</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Grilla con TODOS los datos del Consultante / Terapeuta */}
                    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 text-xs">
                      {/* Columna 1: Datos Personales */}
                      <div className="rounded-2xl border border-[#836DAD]/15 bg-[#FAF8FC] p-3.5 space-y-1.5">
                        <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#836DAD]">
                          Datos Personales
                        </span>
                        <p>
                          <strong>Nombre y Apellido:</strong> {fullName}
                        </p>
                        <p>
                          <strong>DNI / Documento:</strong>{" "}
                          {prof.dni || "Sin cargar"}
                        </p>
                        <p>
                          <strong>Fecha de Nacimiento:</strong>{" "}
                          {prof.fechaNacimiento || "Sin cargar"}
                        </p>
                        <p>
                          <strong>Género:</strong> {prof.genero || "Sin cargar"}
                        </p>
                      </div>

                      {/* Columna 2: Contacto y Verificación */}
                      <div className="rounded-2xl border border-[#836DAD]/15 bg-[#FAF8FC] p-3.5 space-y-1.5">
                        <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#836DAD]">
                          Contacto y Verificaciones (Privado Admin)
                        </span>
                        <p className="break-all">
                          <strong>Email:</strong> {prof.email || "Sin cargar"}
                        </p>
                        <p>
                          <strong>WhatsApp (E.164):</strong>{" "}
                          {prof.whatsappE164 ||
                            `${prof.prefijoTelefono || ""}${
                              prof.telefono || ""
                            }` ||
                            "Sin cargar"}
                        </p>
                        <p>
                          <strong>Estado WhatsApp:</strong>{" "}
                          {prof.whatsappVerified ? (
                            <span className="font-bold text-emerald-700">
                              ✓ Verificado
                            </span>
                          ) : (
                            <span className="font-bold text-amber-700">
                              Sin verificar
                            </span>
                          )}
                        </p>
                        <p>
                          <strong>Nickname Red Social:</strong> @{nick}
                        </p>
                      </div>

                      {/* Columna 3: Domicilio Completo y Geoposición */}
                      <div className="rounded-2xl border border-[#836DAD]/15 bg-[#FAF8FC] p-3.5 space-y-1.5">
                        <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#836DAD]">
                          Domicilio y Geoposición Satelital
                        </span>
                        <p>
                          <strong>País / Provincia:</strong>{" "}
                          {prof.pais || "Argentina"} ·{" "}
                          {prof.provincia || "Sin cargar"}
                        </p>
                        <p>
                          <strong>Localidad y CP:</strong>{" "}
                          {prof.localidad || "Sin cargar"} (CP{" "}
                          {prof.codigoPostal || "-"})
                        </p>
                        <p>
                          <strong>Barrio y Calle:</strong> Barrio{" "}
                          {prof.barrio || "-"} · {prof.calle || "-"}{" "}
                          {prof.numeroCalle || ""}
                          {prof.piso ? `, Piso ${prof.piso}` : ""}
                          {prof.dpto ? `, Dpto ${prof.dpto}` : ""}
                          {prof.edificio ? ` (${prof.edificio})` : ""}
                        </p>
                        {prof.geo && (
                          <p className="pt-0.5">
                            <a
                              href={buildGoogleMapsExternalUrl(
                                prof.geo.lat,
                                prof.geo.lng
                              )}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-bold text-[#836DAD] underline hover:text-[#5E4B8B]"
                            >
                              <MapPin className="h-3.5 w-3.5" />
                              <span>
                                GPS: {prof.geo.lat.toFixed(5)},{" "}
                                {prof.geo.lng.toFixed(5)} (Ver en Maps ↗)
                              </span>
                            </a>
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Terapias asociadas al perfil */}
                    {therapies.length > 0 && (
                      <div className="mt-3 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-[#2B1F42]">
                          {isTerapeuta
                            ? "Terapias ofrecidas:"
                            : "Terapias de interés:"}
                        </span>
                        {therapies.map((th) => (
                          <span
                            key={th}
                            className="rounded-full border border-[#836DAD]/25 bg-[#F6F3FA] px-2.5 py-0.5 text-[11px] font-semibold text-[#836DAD]"
                          >
                            {th}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* =========================================================
                        PANEL DE SUSPENSIÓN POR NORMAS DE LA COMUNIDAD
                        (Temporal por determinado tiempo o Definitiva)
                       ========================================================= */}
                    <div
                      className={`mt-4 rounded-2xl border p-4 ${
                        isSuspended
                          ? "border-rose-300 bg-rose-100/60"
                          : "border-[#836DAD]/20 bg-[#F6F3FA]"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <ShieldAlert
                            className={`h-4 w-4 shrink-0 ${
                              isSuspended ? "text-rose-700" : "text-[#836DAD]"
                            }`}
                          />
                          <span className="text-xs font-bold text-[#2B1F42]">
                            Moderación y Normas de la Comunidad
                          </span>
                        </div>

                        {isSuspended && (
                          <button
                            type="button"
                            onClick={() => handleLiftSuspension(prof)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-800"
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Levantar suspensión / Reactivar perfil</span>
                          </button>
                        )}
                      </div>

                      {isSuspended && prof.suspension && (
                        <div className="mt-2 rounded-xl border border-rose-300 bg-white px-3.5 py-2 text-xs text-rose-900">
                          <p>
                            <strong>Estado actual:</strong>{" "}
                            {prof.suspension.status === "definitiva"
                              ? "Suspensión DEFINITIVA"
                              : `Suspensión TEMPORAL vigente hasta el ${new Date(
                                  prof.suspension.suspendedUntil || ""
                                ).toLocaleString("es-AR")}`}
                          </p>
                          <p className="mt-0.5">
                            <strong>Motivo registrado:</strong>{" "}
                            {prof.suspension.reason ||
                              "Incumplimiento de las normas de la comunidad"}
                          </p>
                        </div>
                      )}

                      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
                        {/* Motivo de incumplimiento */}
                        <div className="lg:col-span-5">
                          <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                            Motivo (Normas de la comunidad)
                          </label>
                          <input
                            type="text"
                            list={`reasons-${prof.id}`}
                            value={currentReason}
                            onChange={(e) =>
                              setReasonByUserId((prev) => ({
                                ...prev,
                                [prof.id]: e.target.value,
                              }))
                            }
                            placeholder="Motivo de la suspensión..."
                            className="w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
                          />
                          <datalist id={`reasons-${prof.id}`}>
                            {DEFAULT_COMMUNITY_REASONS.map((r) => (
                              <option key={r} value={r} />
                            ))}
                          </datalist>
                        </div>

                        {/* Plazo de suspensión temporal */}
                        <div className="lg:col-span-3">
                          <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                            Tiempo de suspensión temporal
                          </label>
                          <div className="flex items-center gap-1.5">
                            <select
                              aria-label="Seleccionar duración de suspensión temporal"
                              value={selectedDuration}
                              onChange={(e) =>
                                setDurationByUserId((prev) => ({
                                  ...prev,
                                  [prof.id]: e.target.value,
                                }))
                              }
                              className="w-full rounded-xl border border-[#836DAD]/30 bg-white px-2.5 py-2 text-xs font-semibold text-[#2B1F42]"
                            >
                              {SUSPENSION_DURATION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>

                            {selectedDuration === "custom" && (
                              <input
                                type="number"
                                min={1}
                                max={3650}
                                value={customDays}
                                onChange={(e) =>
                                  setCustomDaysByUserId((prev) => ({
                                    ...prev,
                                    [prof.id]: e.target.value,
                                  }))
                                }
                                placeholder="Días"
                                className="w-20 shrink-0 rounded-xl border border-[#836DAD]/30 bg-white px-2.5 py-2 text-xs font-bold text-[#2B1F42]"
                              />
                            )}
                          </div>
                        </div>

                        {/* Botones de acción: Suspender por tiempo determinado | Suspender definitivamente */}
                        <div className="lg:col-span-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSuspendTemporarily(prof)}
                            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-amber-500 bg-amber-500 px-3 py-2 text-xs font-bold text-[#2B1F42] shadow-xs transition hover:bg-amber-400"
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0" />
                            <span>Suspender por tiempo</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleSuspendPermanently(prof)}
                            className="inline-flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-rose-700"
                          >
                            <Ban className="h-3.5 w-3.5 shrink-0" />
                            <span>Suspender definitivo</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* =====================================================================
          SECCIÓN 2: GESTIÓN DE NUEVAS TERAPIAS PROPUESTAS («OTRA -> ¿CUÁL?»)
         ===================================================================== */}
      {activeTab === "terapias" && (
        <div className="space-y-5">
          <div className="rounded-3xl border border-[#836DAD]/25 bg-[#F6F3FA] p-5 space-y-4">
            <div>
              <h4 className="text-base font-bold text-[#2B1F42]">
                Propuestas de Nuevas Terapias («Otra → ¿Cuál?»)
              </h4>
              <p className="text-xs text-[#2B1F42]/75">
                Cuando un Terapeuta propone una terapia que no está en las 6 categorías oficiales, podés aprobarla para sumarla al listado general o descartarla.
              </p>
            </div>

            {pendingAdminAlerts.length > 0 ? (
              <ul className="space-y-2.5">
                {pendingAdminAlerts.map((alertItem) => (
                  <li
                    key={alertItem.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-[#836DAD]/25 bg-white p-4 shadow-2xs"
                  >
                    <div className="space-y-0.5">
                      <span className="inline-block rounded-full bg-[#836DAD]/12 px-2.5 py-0.5 text-[11px] font-bold text-[#836DAD]">
                        Categoría {alertItem.categoryNumber}:{" "}
                        {alertItem.categoryTitle}
                      </span>
                      <p className="text-sm font-bold text-[#2B1F42]">
                        Nueva terapia propuesta: «{alertItem.proposedOption}»
                      </p>
                      <p className="text-[11px] text-[#2B1F42]/65">
                        Propuesta por: {alertItem.proposedBy}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => onApproveAlert(alertItem)}
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#6F599B]"
                      >
                        <PlusCircle className="h-3.5 w-3.5 text-[#F3D791]" />
                        <span>Agregar a la lista existente</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onDismissAlert(alertItem.id)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] px-3 py-2 text-xs font-bold text-[#2B1F42]/75 transition-colors hover:bg-[#836DAD]/10 hover:text-[#2B1F42]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Descartar</span>
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="rounded-2xl border border-[#836DAD]/15 bg-white p-4 text-xs text-[#2B1F42]/70">
                No hay propuestas pendientes de nuevas terapias en este momento.
              </div>
            )}
          </div>

          {/* Listado de las 6 categorías oficiales y terapias agregadas */}
          <div className="rounded-3xl border border-[#836DAD]/25 bg-white p-5 space-y-4">
            <h5 className="text-sm font-bold text-[#2B1F42]">
              Catálogo Vigente de las 6 Categorías de Terapias
            </h5>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {ROLE_THERAPY_CATEGORIES.map((cat) => {
                const customForCat = approvedCustomOptions[cat.id] || [];
                return (
                  <div
                    key={cat.id}
                    className="rounded-2xl border border-[#836DAD]/20 bg-[#FAF8FC] p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-[#836DAD]">
                        {cat.number}. {cat.title}
                      </span>
                      <span className="rounded-full bg-[#836DAD]/15 px-2 py-0.5 text-[10px] font-bold text-[#836DAD]">
                        {cat.options.length + customForCat.length} terapias
                      </span>
                    </div>
                    {customForCat.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {customForCat.map((opt) => (
                          <span
                            key={opt}
                            className="inline-flex items-center gap-1 rounded-full bg-[#836DAD] px-2.5 py-0.5 text-[11px] font-semibold text-white"
                          >
                            <span>+ {opt}</span>
                            {onRemoveCustomOption && (
                              <button
                                type="button"
                                onClick={() =>
                                  onRemoveCustomOption(cat.id, opt)
                                }
                                title="Quitar terapia agregada"
                                className="ml-1 cursor-pointer text-[#F3D791] hover:text-white"
                              >
                                ×
                              </button>
                            )}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-[#2B1F42]/60">
                        {cat.options.slice(0, 4).join(", ")}...
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          SECCIÓN 3: COMISIONES Y PAGOS (MERCADO PAGO SPLIT)
         ===================================================================== */}
      {activeTab === "comisiones" && (
        <AdminPaymentsCommissionsPanel adminUser={adminEmail} />
      )}
    </div>
  );
}
