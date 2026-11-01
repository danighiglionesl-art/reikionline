"use client";

import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  DEFAULT_ADMIN_PROFILE,
  ReikiUserProfile,
} from "@/lib/geoData";
import WhatsAppVerificationStep from "@/components/auth/WhatsAppVerificationStep";
import UserProfilePanel from "@/components/profile/UserProfilePanel";

type AuthMode = "login" | "register" | "recover";
type UserRole = "consultante" | "terapeuta";

const STORAGE_KEY_ADMIN_PROFILE = "reikionline_admin_profile_v1";
const STORAGE_KEY_USERS_LIST = "reikionline_registered_users_v1";
const STORAGE_KEY_ACTIVE_SESSION = "reikionline_active_session_v1";

const INITIAL_DEMO_USERS: ReikiUserProfile[] = [
  DEFAULT_ADMIN_PROFILE,
  {
    id: "usr-mariana-paz",
    role: "terapeuta",
    nombre: "Mariana",
    apellido: "Paz",
    dni: "31458920",
    fechaNacimiento: "1985-04-18",
    genero: "Mujer",
    prefijoTelefono: "+54",
    telefono: "3516123456",
    whatsappE164: "+543516123456",
    whatsappVerified: true,
    whatsappVerifiedAt: "2026-10-30T18:20:00.000Z",
    whatsappChannel: "whatsapp",
    email: "mariana.paz@reikionline.com.ar",
    pais: "Argentina",
    provincia: "Córdoba",
    localidad: "Córdoba",
    codigoPostal: "5000",
    barrio: "Nueva Córdoba",
    calle: "Bv. Chacabuco",
    numeroCalle: "640",
    edificio: "Torre Luz",
    torre: "A",
    piso: "4",
    dpto: "B",
    observacionesDomicilio: "",
    fotoUrl: "",
    geo: {
      lat: -31.42415,
      lng: -64.18392,
      accuracyMeters: 15,
      captureMode: "auto-gps-mobile",
      osDetected: "Android",
      capturedAt: "2026-10-30T18:20:00.000Z",
      formattedAddress:
        "Bv. Chacabuco 640, Barrio Nueva Córdoba, Córdoba (CP 5000), Córdoba, Argentina",
    },
    consents: {
      turnosYRecordatorios: true,
      notificacionesComerciales: true,
      updatedAt: "2026-10-30T18:20:00.000Z",
    },
    updatedAt: "2026-10-30T18:20:00.000Z",
  },
  {
    id: "usr-lucas-ferreyra",
    role: "pendiente",
    nombre: "Lucas",
    apellido: "Ferreyra",
    dni: "38901234",
    fechaNacimiento: "1995-09-12",
    genero: "Hombre",
    prefijoTelefono: "+54",
    telefono: "1145678901",
    whatsappE164: "+541145678901",
    whatsappVerified: false,
    whatsappVerifiedAt: null,
    email: "lucas.ferreyra@gmail.com",
    pais: "Argentina",
    provincia: "Buenos Aires",
    localidad: "La Plata",
    codigoPostal: "1900",
    barrio: "Centro",
    calle: "Calle 50",
    numeroCalle: "720",
    edificio: "",
    torre: "",
    piso: "",
    dpto: "",
    observacionesDomicilio: "",
    fotoUrl: "",
    geo: {
      lat: -34.92049,
      lng: -57.95356,
      captureMode: "manual-windows",
      osDetected: "Windows",
      capturedAt: "2026-10-31T12:10:00.000Z",
      formattedAddress:
        "Calle 50 720, Barrio Centro, La Plata (CP 1900), Buenos Aires, Argentina",
    },
    consents: {
      turnosYRecordatorios: true,
      notificacionesComerciales: false,
      updatedAt: "2026-10-31T12:10:00.000Z",
    },
    updatedAt: "2026-10-31T12:10:00.000Z",
  },
];

export default function TerapiasAccessPanel() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [selectedRole, setSelectedRole] = useState<UserRole>("consultante");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [specialty, setSpecialty] = useState("Reiki Usui y Armonización");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Perfiles persistidos en el navegador (Admin + Usuarios registrados)
  const [usersList, setUsersList] = useState<ReikiUserProfile[]>(
    INITIAL_DEMO_USERS
  );
  const [activeUser, setActiveUser] = useState<ReikiUserProfile | null>(null);

  // Vistas internas para Administrador y para Usuario
  const [adminTab, setAdminTab] = useState<
    "mi-perfil" | "verificaciones" | "plataforma"
  >("mi-perfil");
  const [userTab, setUserTab] = useState<
    "verificacion-wa" | "eleccion-rol" | "mi-perfil" | "panel-terapias"
  >("verificacion-wa");

  // Cargar datos guardados en localStorage al iniciar
  useEffect(() => {
    try {
      const savedUsersRaw = window.localStorage.getItem(STORAGE_KEY_USERS_LIST);
      let loadedUsers = INITIAL_DEMO_USERS;
      if (savedUsersRaw) {
        const parsed = JSON.parse(savedUsersRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          loadedUsers = parsed;
        }
      }
      const savedAdminRaw = window.localStorage.getItem(
        STORAGE_KEY_ADMIN_PROFILE
      );
      if (savedAdminRaw) {
        const parsedAdmin = JSON.parse(savedAdminRaw) as ReikiUserProfile;
        loadedUsers = loadedUsers.map((u) =>
          u.id === DEFAULT_ADMIN_PROFILE.id ? parsedAdmin : u
        );
      }
      setUsersList(loadedUsers);

      const savedSessionId = window.localStorage.getItem(
        STORAGE_KEY_ACTIVE_SESSION
      );
      if (savedSessionId) {
        const found = loadedUsers.find((u) => u.id === savedSessionId);
        if (found) {
          setActiveUser(found);
          if (!found.isAdmin) {
            if (!found.whatsappVerified) {
              setUserTab("verificacion-wa");
            } else if (found.role === "pendiente") {
              setUserTab("eleccion-rol");
            } else {
              setUserTab("panel-terapias");
            }
          }
        }
      }
    } catch {
      // Ignore storage parse errors
    }
  }, []);

  function persistUsersAndActive(
    updatedUser: ReikiUserProfile,
    allUsers = usersList
  ) {
    const exists = allUsers.some((u) => u.id === updatedUser.id);
    const nextList = exists
      ? allUsers.map((u) => (u.id === updatedUser.id ? updatedUser : u))
      : [updatedUser, ...allUsers];

    setUsersList(nextList);
    setActiveUser(updatedUser);

    try {
      window.localStorage.setItem(
        STORAGE_KEY_USERS_LIST,
        JSON.stringify(nextList)
      );
      window.localStorage.setItem(STORAGE_KEY_ACTIVE_SESSION, updatedUser.id);
      if (updatedUser.id === DEFAULT_ADMIN_PROFILE.id) {
        window.localStorage.setItem(
          STORAGE_KEY_ADMIN_PROFILE,
          JSON.stringify(updatedUser)
        );
      }
    } catch {
      // Ignore storage write errors
    }
  }

  const openPanel = (initialRole?: UserRole, initialMode: AuthMode = "login") => {
    if (initialRole) setSelectedRole(initialRole);
    setAuthMode(initialMode);
    setStatusMessage(null);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
      setIsOpen(true);
    }
  };

  const closePanel = () => {
    const dialog = dialogRef.current;
    if (dialog && dialog.open) {
      dialog.close();
    }
    setIsOpen(false);
    setStatusMessage(null);
  };

  useEffect(() => {
    const handleCustomOpen = (e: Event) => {
      const customEvent = e as CustomEvent<{
        role?: UserRole;
        mode?: AuthMode;
      }>;
      openPanel(customEvent.detail?.role, customEvent.detail?.mode || "login");
    };
    window.addEventListener("open-terapias-panel", handleCustomOpen);
    return () =>
      window.removeEventListener("open-terapias-panel", handleCustomOpen);
  }, []);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDialogElement>) => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const rect = dialog.getBoundingClientRect();
    const clickedInDialog =
      rect.top <= e.clientY &&
      e.clientY <= rect.top + rect.height &&
      rect.left <= e.clientX &&
      e.clientX <= rect.left + rect.width;
    if (!clickedInDialog) {
      closePanel();
    }
  };

  function loginOrRegisterRegularUser(
    userEmailInput: string,
    userNameInput?: string
  ) {
    const cleanEmail = userEmailInput.trim().toLowerCase();
    const existing = usersList.find(
      (u) => !u.isAdmin && u.email.toLowerCase() === cleanEmail
    );

    if (existing) {
      persistUsersAndActive(existing);
      // Regla: "No repetir la verificación en cada inicio de sesión" si ya está verificado
      if (!existing.whatsappVerified) {
        setUserTab("verificacion-wa");
      } else if (existing.role === "pendiente") {
        setUserTab("eleccion-rol");
      } else {
        setUserTab("panel-terapias");
      }
      return;
    }

    // Nuevo usuario registrado -> Estado inicial obligatorio: «WhatsApp sin verificar»
    const nameParts = (userNameInput || cleanEmail.split("@")[0] || "Usuario")
      .trim()
      .split(" ");
    const firstName = nameParts[0] || "Usuario";
    const lastName = nameParts.slice(1).join(" ") || "";

    const newUser: ReikiUserProfile = {
      id: `usr-${Date.now()}`,
      role: "pendiente",
      nombre: firstName,
      apellido: lastName,
      dni: "",
      fechaNacimiento: "",
      genero: "Prefiero no decirlo",
      prefijoTelefono: "+54",
      telefono: "",
      whatsappE164: "",
      whatsappVerified: false,
      whatsappVerifiedAt: null,
      email: cleanEmail,
      pais: "Argentina",
      provincia: "Córdoba",
      localidad: "Alcira Gigena",
      codigoPostal: "5813",
      barrio: "",
      calle: "",
      numeroCalle: "",
      edificio: "",
      torre: "",
      piso: "",
      dpto: "",
      observacionesDomicilio: "",
      fotoUrl: "",
      geo: {
        lat: -32.75472,
        lng: -64.33648,
        captureMode: "manual-windows",
        osDetected: "Windows",
        capturedAt: new Date().toISOString(),
        formattedAddress: "Alcira Gigena, Córdoba, Argentina",
      },
      consents: {
        turnosYRecordatorios: true,
        notificacionesComerciales: false,
        updatedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    };

    persistUsersAndActive(newUser);
    setUserTab("verificacion-wa");
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = email.trim();

    // Credenciales silenciosas del Administrador (ReikiOnline / Reiki2026)
    if (
      authMode === "login" &&
      trimmedUser.toLowerCase() === "reikionline" &&
      password === "Reiki2026"
    ) {
      const adminProfile =
        usersList.find((u) => u.id === DEFAULT_ADMIN_PROFILE.id) ||
        DEFAULT_ADMIN_PROFILE;
      persistUsersAndActive(adminProfile);
      setAdminTab("mi-perfil");
      setStatusMessage(null);
      return;
    }

    if (authMode === "recover") {
      setStatusMessage(
        `Enviamos un enlace de recuperación a ${trimmedUser || "tu correo"}.`
      );
      return;
    }

    loginOrRegisterRegularUser(
      trimmedUser || "usuario@reikionline.com.ar",
      fullName
    );
  };

  const handleGoogleAccess = () => {
    const googleEmail = email.trim().includes("@")
      ? email.trim()
      : "consultante.google@gmail.com";
    loginOrRegisterRegularUser(googleEmail, fullName || "Usuario Google");
  };

  const handleLogout = () => {
    setActiveUser(null);
    setEmail("");
    setPassword("");
    setStatusMessage(null);
    try {
      window.localStorage.removeItem(STORAGE_KEY_ACTIVE_SESSION);
    } catch {
      // Ignore
    }
  };

  const isAdminSession = Boolean(activeUser?.isAdmin);

  return (
    <>
      {/* Botón flotante fijo (estilo WhatsApp) siempre visible */}
      <div className="fixed bottom-5 right-5 z-40 flex items-center">
        <button
          type="button"
          onClick={() => openPanel("consultante", "login")}
          aria-label="Acceso a Terapias online"
          className="fixed-cta-pulse group flex items-center gap-3 rounded-full bg-[#836DAD] hover:bg-[#5E4B8B] text-white pl-3.5 pr-5 py-3 shadow-xl border-2 border-[#F3D791] transition-transform duration-200 hover:scale-[1.03] active:scale-[0.98] cursor-pointer"
        >
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15 ring-1 ring-[#F3D791]/70 overflow-hidden">
            <Image
              src="/brand/Reiki_Icono_Lavanda_Unificado.png"
              alt=" Símbolo Reiki Online"
              width={40}
              height={40}
              className="h-full w-full object-cover"
            />
          </span>
          <span className="flex flex-col text-left leading-tight">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#F3D791]">
              Plataforma Online
            </span>
            <span className="text-sm sm:text-base font-semibold tracking-tight text-white">
              Acceso a Terapias online
            </span>
          </span>
        </button>
      </div>

      {/* Modal nativo <dialog> */}
      <dialog
        ref={dialogRef}
        onClick={handleBackdropClick}
        onClose={() => setIsOpen(false)}
        aria-labelledby="terapias-dialog-title"
        className={`m-auto w-[calc(100%-1.25rem)] rounded-3xl bg-white text-[#2E2344] shadow-2xl border border-[#E6E0F0] p-0 overflow-hidden backdrop:bg-[#2E2344]/65 backdrop:backdrop-blur-xs ${
          activeUser ? "max-w-4xl" : "max-w-lg"
        }`}
      >
        {/* Cabecera lavanda con logotipo oficial intacto */}
        <div className="relative bg-[#836DAD] px-6 py-5 text-white flex items-center justify-between border-b border-[#F3D791]/30">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl overflow-hidden border border-[#F3D791]/50 bg-[#836DAD] shrink-0">
              <Image
                src="/brand/Reiki_Icono_Lavanda_Unificado.png"
                alt="Reiki Online"
                width={44}
                height={44}
                className="h-full w-full object-cover"
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-[#F3D791] font-semibold">
                {isAdminSession
                  ? "Panel de Administración • ReikiOnline"
                  : activeUser
                  ? `Cuenta Activa • ${
                      activeUser.whatsappVerified
                        ? "WhatsApp Verificado"
                        : "WhatsApp Sin Verificar"
                    }`
                  : "Conectando Bienestar"}
              </p>
              <h3
                id="terapias-dialog-title"
                className="text-lg sm:text-xl font-bold tracking-tight text-white"
              >
                {isAdminSession
                  ? `${activeUser?.nombre} ${activeUser?.apellido}`
                  : activeUser
                  ? "Acceso a Terapias Online y Mi Perfil"
                  : "Acceso a Terapias online"}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeUser && (
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-full bg-white/15 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition cursor-pointer"
              >
                Cerrar sesión
              </button>
            )}
            <button
              type="button"
              onClick={closePanel}
              aria-label="Cerrar ventana de acceso"
              className="rounded-full p-2 text-white/85 hover:bg-white/15 hover:text-white transition cursor-pointer"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Cuerpo del diálogo */}
        <div className="p-5 sm:p-7 max-h-[84dvh] overflow-y-auto space-y-5">
          {isAdminSession && activeUser ? (
            /* ==============================================================
               MODO ADMINISTRADOR (User: ReikiOnline / Pass: Reiki2026)
               ============================================================== */
            <div className="space-y-5">
              {/* Pestañas de Administración */}
              <div className="flex flex-wrap gap-2 border-b border-[#E6E0F0] pb-3">
                <button
                  type="button"
                  onClick={() => setAdminTab("mi-perfil")}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    adminTab === "mi-perfil"
                      ? "bg-[#836DAD] text-white shadow-sm"
                      : "bg-[#F4F0FA] text-[#5E4B8B] hover:bg-[#E6E0F0]"
                  }`}
                >
                  Mi Perfil ({activeUser.nombre} {activeUser.apellido})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab("verificaciones")}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    adminTab === "verificaciones"
                      ? "bg-[#836DAD] text-white shadow-sm"
                      : "bg-[#F4F0FA] text-[#5E4B8B] hover:bg-[#E6E0F0]"
                  }`}
                >
                  Usuarios y Verificación WhatsApp ({usersList.length})
                </button>
                <button
                  type="button"
                  onClick={() => setAdminTab("plataforma")}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition cursor-pointer ${
                    adminTab === "plataforma"
                      ? "bg-[#836DAD] text-white shadow-sm"
                      : "bg-[#F4F0FA] text-[#5E4B8B] hover:bg-[#E6E0F0]"
                  }`}
                >
                  Estado Twilio Verify & Reglas
                </button>
              </div>

              {adminTab === "mi-perfil" && (
                <UserProfilePanel
                  profile={activeUser}
                  onSaveProfile={(updated) => persistUsersAndActive(updated)}
                />
              )}

              {adminTab === "verificaciones" && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h4 className="text-base font-bold text-[#2E2344]">
                        Control de Verificación de WhatsApp de Usuarios
                      </h4>
                      <p className="text-xs text-[#2E2344]/70">
                        Números almacenados en formato internacional E.164,
                        fecha de validación y estado de habilitación de terapias.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 text-xs font-semibold">
                      <span className="rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-emerald-800">
                        Verificados:{" "}
                        {usersList.filter((u) => u.whatsappVerified).length}
                      </span>
                      <span className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-amber-800">
                        Sin verificar:{" "}
                        {usersList.filter((u) => !u.whatsappVerified).length}
                      </span>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-[#E6E0F0]">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F4F0FA] text-[#5E4B8B] uppercase tracking-wider">
                        <tr>
                          <th className="px-3.5 py-3 font-bold">Usuario</th>
                          <th className="px-3.5 py-3 font-bold">Rol</th>
                          <th className="px-3.5 py-3 font-bold">
                            WhatsApp (E.164)
                          </th>
                          <th className="px-3.5 py-3 font-bold">Estado</th>
                          <th className="px-3.5 py-3 font-bold">
                            Fecha Verificación
                          </th>
                          <th className="px-3.5 py-3 font-bold">Ubicación</th>
                          <th className="px-3.5 py-3 font-bold">Acción Admin</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6E0F0] bg-white">
                        {usersList.map((u) => (
                          <tr key={u.id} className="hover:bg-[#FAF8FC]">
                            <td className="px-3.5 py-3">
                              <div className="font-bold text-[#2E2344]">
                                {u.nombre} {u.apellido}
                              </div>
                              <div className="text-[11px] text-[#2E2344]/65">
                                {u.email} • DNI {u.dni || "S/D"}
                              </div>
                            </td>
                            <td className="px-3.5 py-3 font-semibold capitalize text-[#5E4B8B]">
                              {u.isAdmin ? "Administrador" : u.role}
                            </td>
                            <td className="px-3.5 py-3 font-mono font-semibold text-[#2E2344]">
                              {u.whatsappE164 || "Pendiente"}
                            </td>
                            <td className="px-3.5 py-3">
                              {u.whatsappVerified ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                  WhatsApp verificado
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                                  WhatsApp sin verificar
                                </span>
                              )}
                            </td>
                            <td className="px-3.5 py-3 text-[#2E2344]/75">
                              {u.whatsappVerifiedAt
                                ? new Date(u.whatsappVerifiedAt).toLocaleString(
                                    "es-AR"
                                  )
                                : "—"}
                            </td>
                            <td className="px-3.5 py-3 text-[#2E2344]/75">
                              <div>
                                {u.localidad}, {u.provincia}
                              </div>
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${u.geo.lat},${u.geo.lng}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] font-semibold text-[#836DAD] underline"
                              >
                                Ver Maps ({u.geo.osDetected}) ↗
                              </a>
                            </td>
                            <td className="px-3.5 py-3">
                              <button
                                type="button"
                                onClick={() => {
                                  const toggled: ReikiUserProfile = {
                                    ...u,
                                    whatsappVerified: !u.whatsappVerified,
                                    whatsappVerifiedAt: !u.whatsappVerified
                                      ? new Date().toISOString()
                                      : null,
                                  };
                                  const next = usersList.map((item) =>
                                    item.id === u.id ? toggled : item
                                  );
                                  setUsersList(next);
                                  window.localStorage.setItem(
                                    STORAGE_KEY_USERS_LIST,
                                    JSON.stringify(next)
                                  );
                                }}
                                className="rounded-lg border border-[#836DAD]/30 bg-[#FAF8FC] px-2.5 py-1 text-[11px] font-semibold text-[#5E4B8B] hover:bg-[#F4F0FA] cursor-pointer"
                              >
                                {u.whatsappVerified
                                  ? "Solicitar reverificación"
                                  : "Marcar verificado"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminTab === "plataforma" && (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-[#E6E0F0] bg-[#FAF8FC] p-5 space-y-3">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-[#836DAD]">
                      Arquitectura de Verificación de WhatsApp (Twilio Verify)
                    </h4>
                    <ul className="space-y-2 text-xs text-[#2E2344]/85">
                      <li>
                        • <strong>Operación 1 (Solicitar código):</strong>{" "}
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[#5E4B8B]">
                          POST /api/verify/send
                        </code>{" "}
                        — Envía OTP de 6 dígitos por canal{" "}
                        <code className="font-mono">whatsapp</code> o
                        alternativa <code className="font-mono">sms</code> con
                        tiempo de espera configurable y límite de intentos.
                      </li>
                      <li>
                        • <strong>Operación 2 (Comprobar código):</strong>{" "}
                        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-[#5E4B8B]">
                          POST /api/verify/check
                        </code>{" "}
                        — Valida el código en el backend mediante Twilio Verify
                        sin almacenar jamás códigos OTP en la base de datos de
                        Reiki Online.
                      </li>
                      <li>
                        • <strong>Variables de entorno seguras en Vercel:</strong>{" "}
                        <code className="font-mono">TWILIO_ACCOUNT_SID</code>,{" "}
                        <code className="font-mono">TWILIO_AUTH_TOKEN</code> y{" "}
                        <code className="font-mono">
                          TWILIO_VERIFY_SERVICE_SID
                        </code>
                        .
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : activeUser ? (
            /* ==============================================================
               FLUJO DE USUARIO REGISTRADO (Verificación WhatsApp -> Elección de Rol -> Mi Perfil / Terapias)
               ============================================================== */
            <div className="space-y-5">
              {/* Navegación interna del usuario (bloquea Terapias si WhatsApp está sin verificar) */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6E0F0] pb-3">
                <div className="flex flex-wrap gap-2">
                  {!activeUser.whatsappVerified ? (
                    <span className="rounded-full bg-amber-100 border border-amber-300 px-3.5 py-1.5 text-xs font-bold text-amber-900">
                      1. Verificación obligatoria de WhatsApp
                    </span>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setUserTab("eleccion-rol")}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                          userTab === "eleccion-rol"
                            ? "bg-[#836DAD] text-white"
                            : "bg-[#F4F0FA] text-[#5E4B8B]"
                        }`}
                      >
                        Rol ({activeUser.role === "pendiente" ? "Elegir" : activeUser.role})
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserTab("mi-perfil")}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                          userTab === "mi-perfil"
                            ? "bg-[#836DAD] text-white"
                            : "bg-[#F4F0FA] text-[#5E4B8B]"
                        }`}
                      >
                        Mi Perfil y Ubicación Maps
                      </button>
                      <button
                        type="button"
                        onClick={() => setUserTab("panel-terapias")}
                        className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                          userTab === "panel-terapias"
                            ? "bg-[#836DAD] text-white"
                            : "bg-[#F4F0FA] text-[#5E4B8B]"
                        }`}
                      >
                        Terapias Online
                      </button>
                    </>
                  )}
                </div>

                {activeUser.whatsappVerified && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-800">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    WhatsApp verificado ({activeUser.whatsappE164})
                  </span>
                )}
              </div>

              {!activeUser.whatsappVerified || userTab === "verificacion-wa" ? (
                <WhatsAppVerificationStep
                  initialPrefijo={activeUser.prefijoTelefono}
                  initialTelefono={activeUser.telefono}
                  initialConsents={activeUser.consents}
                  userEmail={activeUser.email}
                  onVerified={(res) => {
                    const updated: ReikiUserProfile = {
                      ...activeUser,
                      prefijoTelefono: res.prefijoTelefono,
                      telefono: res.telefono,
                      whatsappE164: res.whatsappE164,
                      whatsappVerified: true,
                      whatsappVerifiedAt: res.whatsappVerifiedAt,
                      whatsappChannel: res.channel,
                      consents: res.consents,
                      updatedAt: new Date().toISOString(),
                    };
                    persistUsersAndActive(updated);
                    setUserTab(
                      updated.role === "pendiente"
                        ? "eleccion-rol"
                        : "mi-perfil"
                    );
                  }}
                />
              ) : userTab === "eleccion-rol" ? (
                <div className="space-y-5 py-2">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 text-xs text-emerald-900">
                    <strong>¡WhatsApp verificado correctamente!</strong> Número{" "}
                    <span className="font-mono font-bold">
                      {activeUser.whatsappE164}
                    </span>{" "}
                    validado el{" "}
                    {activeUser.whatsappVerifiedAt
                      ? new Date(activeUser.whatsappVerifiedAt).toLocaleString(
                          "es-AR"
                        )
                      : "hoy"}
                    . Ahora podés elegir tu rol en la plataforma:
                  </div>

                  <h4 className="text-lg font-bold text-[#2E2344] text-center">
                    Seleccioná tu rol en Reiki Online
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => {
                        const updated: ReikiUserProfile = {
                          ...activeUser,
                          role: "consultante",
                          updatedAt: new Date().toISOString(),
                        };
                        persistUsersAndActive(updated);
                        setUserTab("mi-perfil");
                      }}
                      className="rounded-2xl border-2 border-[#E6E0F0] bg-[#FAF8FC] p-5 text-left hover:border-[#836DAD] hover:bg-[#F4F0FA] transition cursor-pointer space-y-2"
                    >
                      <span className="inline-block rounded-full bg-[#836DAD] px-3 py-1 text-[11px] font-bold uppercase text-white">
                        Consultante
                      </span>
                      <h5 className="text-base font-bold text-[#2E2344]">
                        Busco Bienestar y Sesiones
                      </h5>
                      <p className="text-xs text-[#2E2344]/75 leading-relaxed">
                        Quiero explorar prácticas holísticas, reservar sesiones
                        online y conectar con profesionales.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        const updated: ReikiUserProfile = {
                          ...activeUser,
                          role: "terapeuta",
                          updatedAt: new Date().toISOString(),
                        };
                        persistUsersAndActive(updated);
                        setUserTab("mi-perfil");
                      }}
                      className="rounded-2xl border-2 border-[#E6E0F0] bg-[#FAF8FC] p-5 text-left hover:border-[#836DAD] hover:bg-[#F4F0FA] transition cursor-pointer space-y-2"
                    >
                      <span className="inline-block rounded-full bg-[#F3D791] px-3 py-1 text-[11px] font-bold uppercase text-[#2E2344]">
                        Terapeuta / Profesional
                      </span>
                      <h5 className="text-base font-bold text-[#2E2344]">
                        Ofrezco Terapias y Acompañamiento
                      </h5>
                      <p className="text-xs text-[#2E2344]/75 leading-relaxed">
                        Quiero presentar mis disciplinas, gestionar mi agenda de
                        turnos y atender consultantes online.
                      </p>
                    </button>
                  </div>

                  <p className="text-center text-[11px] text-[#2E2344]/70">
                    La verificación de WhatsApp demuestra el control del número
                    telefónico, pero no acredita por sí sola la identidad ni las
                    competencias profesionales de un terapeuta.
                  </p>
                </div>
              ) : userTab === "mi-perfil" ? (
                <UserProfilePanel
                  profile={activeUser}
                  onSaveProfile={(updated) => {
                    persistUsersAndActive(updated);
                    if (!updated.whatsappVerified) {
                      setUserTab("verificacion-wa");
                    }
                  }}
                />
              ) : (
                <div className="rounded-2xl border border-[#E6E0F0] bg-[#FAF8FC] p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-[#836DAD]">
                        Rol activo: {activeUser.role}
                      </span>
                      <h4 className="text-lg font-bold text-[#2E2344]">
                        Bienvenido/a, {activeUser.nombre} {activeUser.apellido}
                      </h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setUserTab("mi-perfil")}
                      className="rounded-full bg-[#836DAD] px-4 py-2 text-xs font-semibold text-white hover:bg-[#5E4B8B] transition cursor-pointer"
                    >
                      Editar Mi Perfil y Mapa Satelital
                    </button>
                  </div>
                  <p className="text-xs text-[#2E2344]/80 leading-relaxed">
                    Tu número de WhatsApp (
                    <strong className="font-mono">
                      {activeUser.whatsappE164}
                    </strong>
                    ) se encuentra verificado y tus funcionalidades de terapias
                    online están habilitadas. No necesitarás repetir la
                    verificación en tus próximos inicios de sesión salvo que
                    modifiques tu número en Mi Perfil.
                  </p>
                </div>
              )}
            </div>
          ) : (
            /* ==============================================================
               PANTALLA DE INICIO DE SESIÓN / REGISTRO (Google o Correo)
               ============================================================== */
            <>
              {/* Selector de perfil inicial (Consultante / Terapeuta) */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#5E4B8B] mb-2">
                  Seleccioná tu perfil de ingreso
                </p>
                <div className="grid grid-cols-2 gap-2.5 rounded-2xl bg-[#F4F0FA] p-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("consultante")}
                    className={`rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      selectedRole === "consultante"
                        ? "bg-[#836DAD] text-white shadow-sm"
                        : "text-[#2E2344]/75 hover:text-[#2E2344]"
                    }`}
                  >
                    Soy Consultante
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRole("terapeuta")}
                    className={`rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold transition cursor-pointer ${
                      selectedRole === "terapeuta"
                        ? "bg-[#836DAD] text-white shadow-sm"
                        : "text-[#2E2344]/75 hover:text-[#2E2344]"
                    }`}
                  >
                    Soy Profesional
                  </button>
                </div>
              </div>

              {/* Pestañas Ingresar / Crear cuenta */}
              <div className="flex border-b border-[#E6E0F0] text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("login");
                    setStatusMessage(null);
                  }}
                  className={`flex-1 pb-2.5 text-center border-b-2 transition cursor-pointer ${
                    authMode === "login"
                      ? "border-[#836DAD] text-[#836DAD]"
                      : "border-transparent text-[#2E2344]/60 hover:text-[#2E2344]"
                  }`}
                >
                  Iniciar sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("register");
                    setStatusMessage(null);
                  }}
                  className={`flex-1 pb-2.5 text-center border-b-2 transition cursor-pointer ${
                    authMode === "register"
                      ? "border-[#836DAD] text-[#836DAD]"
                      : "border-transparent text-[#2E2344]/60 hover:text-[#2E2344]"
                  }`}
                >
                  Crear cuenta
                </button>
              </div>

              {statusMessage && (
                <div
                  role="status"
                  className="rounded-2xl bg-[#F4F0FA] border border-[#836DAD]/30 p-4 text-xs sm:text-sm text-[#2E2344] leading-relaxed"
                >
                  {statusMessage}
                </div>
              )}

              {/* Botón de acceso rápido con Google */}
              <button
                type="button"
                onClick={handleGoogleAccess}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-[#E6E0F0] bg-white py-3 px-4 text-sm font-semibold text-[#2E2344] shadow-xs hover:bg-[#FAF8FC] transition cursor-pointer"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                  />
                </svg>
                <span>Continuar con Google</span>
              </button>

              <div className="relative flex py-1 items-center">
                <div className="grow border-t border-[#E6E0F0]" />
                <span className="shrink mx-3 text-[11px] uppercase tracking-wider text-[#2E2344]/50 font-semibold">
                  o con tu correo / usuario
                </span>
                <div className="grow border-t border-[#E6E0F0]" />
              </div>

              {/* Formulario semántico con soporte de autocompletado */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label
                      htmlFor="ro-fullname"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#5E4B8B] mb-1.5"
                    >
                      Nombre y apellido
                    </label>
                    <input
                      id="ro-fullname"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ej. María Laura Gómez"
                      className="w-full rounded-xl border border-[#E6E0F0] bg-[#FAF8FC] px-4 py-3 text-base text-[#2E2344] placeholder:text-[#2E2344]/40 focus:border-[#836DAD] focus:bg-white focus:outline-none"
                    />
                  </div>
                )}

                {authMode === "register" && selectedRole === "terapeuta" && (
                  <div>
                    <label
                      htmlFor="ro-specialty"
                      className="block text-xs font-semibold uppercase tracking-wider text-[#5E4B8B] mb-1.5"
                    >
                      Disciplina o práctica principal
                    </label>
                    <select
                      id="ro-specialty"
                      name="specialty"
                      value={specialty}
                      onChange={(e) => setSpecialty(e.target.value)}
                      className="w-full rounded-xl border border-[#E6E0F0] bg-[#FAF8FC] px-4 py-3 text-base text-[#2E2344] focus:border-[#836DAD] focus:bg-white focus:outline-none"
                    >
                      <option value="Reiki Usui y Armonización">
                        Energía y armonización (Reiki, chakras, cristales)
                      </option>
                      <option value="Meditación y Mindfulness">
                        Meditación, mindfulness y bienestar
                      </option>
                      <option value="Tarot, Astrología y Oráculos">
                        Espiritualidad y orientación (Tarot, astrología,
                        oráculos)
                      </option>
                      <option value="Constelaciones y Autoconocimiento">
                        Autoconocimiento (Constelaciones, registros, vidas
                        pasadas)
                      </option>
                      <option value="Terapias Holísticas y Vibracionales">
                        Terapias holísticas (Sonoterapia, aromaterapia, Flores
                        de Bach)
                      </option>
                      <option value="Feng Shui y Armonización de Espacios">
                        Armonización de espacios y Feng Shui
                      </option>
                    </select>
                  </div>
                )}

                <div>
                  <label
                    htmlFor="ro-email"
                    className="block text-xs font-semibold uppercase tracking-wider text-[#5E4B8B] mb-1.5"
                  >
                    Correo electrónico o usuario
                  </label>
                  <input
                    id="ro-email"
                    name="username"
                    type="text"
                    autoCapitalize="none"
                    autoCorrect="off"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full rounded-xl border border-[#E6E0F0] bg-[#FAF8FC] px-4 py-3 text-base text-[#2E2344] placeholder:text-[#2E2344]/40 focus:border-[#836DAD] focus:bg-white focus:outline-none"
                  />
                </div>

                {authMode !== "recover" && (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="ro-password"
                        className="block text-xs font-semibold uppercase tracking-wider text-[#5E4B8B]"
                      >
                        Contraseña
                      </label>
                      {authMode === "login" && (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode("recover");
                            setStatusMessage(null);
                          }}
                          className="text-xs font-medium text-[#836DAD] hover:text-[#5E4B8B] cursor-pointer"
                        >
                          ¿Olvidaste tu clave?
                        </button>
                      )}
                    </div>
                    <input
                      id="ro-password"
                      name="password"
                      type="password"
                      autoComplete={
                        authMode === "login"
                          ? "current-password"
                          : "new-password"
                      }
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-[#E6E0F0] bg-[#FAF8FC] px-4 py-3 text-base text-[#2E2344] placeholder:text-[#2E2344]/40 focus:border-[#836DAD] focus:bg-white focus:outline-none"
                    />
                  </div>
                )}

                <button
                  type="submit"
                  className="w-full rounded-full bg-[#836DAD] hover:bg-[#5E4B8B] text-white font-semibold py-3.5 px-6 shadow-md transition cursor-pointer text-sm sm:text-base"
                >
                  {authMode === "login" &&
                    `Ingresar y Continuar`}
                  {authMode === "register" &&
                    `Registrarme y Verificar WhatsApp`}
                  {authMode === "recover" && "Enviar enlace de recuperación"}
                </button>
              </form>
            </>
          )}
        </div>
      </dialog>
    </>
  );
}
