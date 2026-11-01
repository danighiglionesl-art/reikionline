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
  Calendar,
  Wallet,
  Loader2,
} from "lucide-react";

export type AccessTab = "login" | "register" | "recover" | "role-select";
export type ActiveRole = "Consultante" | "Terapeuta";
export type PersistentSection = "Mi Perfil" | "Mis consultas" | "Mi Billetera";

interface TerapiasAccessPanelProps {
  idPrefix?: string;
  initialMode?: "login" | "register" | "recover";
  preselectedContext?: string | null;
}

interface AuthenticatedUser {
  name: string;
  email: string;
  picture?: string;
  provider: "Google" | "Correo";
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

  const [authenticatedUser, setAuthenticatedUser] = useState<AuthenticatedUser | null>(null);
  const [selectedRole, setSelectedRole] = useState<ActiveRole | null>(null);
  const [activeSection, setActiveSection] = useState<PersistentSection | null>(null);

  // Cargar script oficial de Google Identity Services y restaurar sesión activa
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const saved = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as AuthenticatedUser;
        if (parsed && parsed.email) {
          setAuthenticatedUser(parsed);
          setMode("role-select");
        }
      }
    } catch {
      // Ignore storage read errors
    }

    const existingScript = document.getElementById("google-gsi-client-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "google-gsi-client-script";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  const persistUserSession = (user: AuthenticatedUser) => {
    setAuthenticatedUser(user);
    setSelectedRole(null);
    setActiveSection(null);
    setAuthError(null);
    setMode("role-select");
    try {
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(user));
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
        el.setAttribute("aria-invalid", el.matches(":user-invalid") ? "true" : "false");
      } catch {
        el.setAttribute("aria-invalid", !el.validity.valid ? "true" : "false");
      }
    }
  };

  const handleLoginSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail) return;
    const derivedName = cleanEmail.split("@")[0].replace(/[._-]/g, " ");
    persistUserSession({
      name: derivedName.charAt(0).toUpperCase() + derivedName.slice(1),
      email: cleanEmail,
      provider: "Correo",
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
      setAuthError("Cargando servicios de Google, intentá nuevamente en un segundo.");
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
            const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
              headers: {
                Authorization: `Bearer ${tokenResponse.access_token}`,
              },
            });

            if (!res.ok) {
              throw new Error("No se pudo verificar el perfil de Google");
            }

            const profile = (await res.json()) as {
              name?: string;
              email?: string;
              picture?: string;
            };

            persistUserSession({
              name: profile.name || profile.email || "Usuario Google",
              email: profile.email || "",
              picture: profile.picture,
              provider: "Google",
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
  };

  const handleResetSession = () => {
    setAuthenticatedUser(null);
    setSelectedRole(null);
    setActiveSection(null);
    setPassword("");
    setAuthError(null);
    setMode("login");
    try {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <div className="rounded-3xl border border-[#836DAD]/25 bg-white p-6 sm:p-8 text-[#2B1F42] shadow-xl shadow-[#836DAD]/10">
      {/* Cabecera limpia y simple */}
      <div className="flex items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-4">
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
          <h3 className="text-lg sm:text-xl font-semibold text-[#2B1F42]">
            {authenticatedUser
              ? "¿Cómo Ingresas?"
              : mode === "register"
              ? "Registrarme"
              : mode === "recover"
              ? "Recuperar contraseña"
              : "Ingresar"}
          </h3>
        </div>

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

      {/* BARRA SIEMPRE VISIBLE: Mi Perfil · Mis consultas · Mi Billetera */}
      {authenticatedUser && (
        <nav
          aria-label="Accesos permanentes del usuario"
          className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[#F6F3FA] p-1.5"
        >
          {(
            [
              { label: "Mi Perfil", icon: User },
              { label: "Mis consultas", icon: Calendar },
              { label: "Mi Billetera", icon: Wallet },
            ] as const
          ).map(({ label, icon: Icon }) => {
            const isActive = activeSection === label;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setActiveSection(label)}
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
                type="email"
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
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
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
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
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

      {/* 4. PRIMERA PANTALLA POST-LOGIN:
          Pregunta: «¿Cómo Ingresas?»
          Opciones: «Consultante» | «Terapeuta» (Sin ningún tipo de explicación) */}
      {authenticatedUser && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleChooseRole("Consultante")}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 text-center transition-all ${
                selectedRole === "Consultante"
                  ? "border-[#836DAD] bg-[#836DAD] text-white shadow-md"
                  : "border-[#836DAD]/30 bg-white text-[#2B1F42] hover:border-[#836DAD] hover:bg-[#F6F3FA]"
              }`}
            >
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
                  selectedRole === "Consultante"
                    ? "bg-white/20 text-[#F3D791]"
                    : "bg-[#836DAD] text-[#F3D791]"
                }`}
              >
                <HeartHandshake className="h-6 w-6" />
              </span>
              <span className="text-lg font-semibold">Consultante</span>
            </button>

            <button
              type="button"
              onClick={() => handleChooseRole("Terapeuta")}
              className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 p-6 text-center transition-all ${
                selectedRole === "Terapeuta"
                  ? "border-[#836DAD] bg-[#836DAD] text-white shadow-md"
                  : "border-[#836DAD]/30 bg-white text-[#2B1F42] hover:border-[#836DAD] hover:bg-[#F6F3FA]"
              }`}
            >
              <span
                className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${
                  selectedRole === "Terapeuta"
                    ? "bg-[#F3D791] text-[#2B1F42]"
                    : "bg-[#F3D791] text-[#836DAD]"
                }`}
              >
                <UserCheck className="h-6 w-6" />
              </span>
              <span className="text-lg font-semibold">Terapeuta</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
