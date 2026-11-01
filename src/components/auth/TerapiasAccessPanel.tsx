"use client";

import React, { useState, useId } from "react";
import {
  Eye,
  EyeOff,
  CheckCircle2,
  Sparkles,
  UserCheck,
  HeartHandshake,
  ArrowLeft,
  Calendar,
  Clock,
  ShieldCheck,
  LogOut,
  Lock,
} from "lucide-react";

export type AccessTab = "login" | "register" | "recover" | "role-select" | "workspace" | "admin";
export type ActiveRole = "Consultante" | "Terapeuta";

interface TerapiasAccessPanelProps {
  idPrefix?: string;
  initialMode?: "login" | "register" | "recover";
  preselectedContext?: string | null;
}

export function TerapiasAccessPanel({
  idPrefix = "inline",
  initialMode = "login",
  preselectedContext = null,
}: TerapiasAccessPanelProps) {
  const uniqueId = useId();
  const baseId = `${idPrefix}-${uniqueId}`;

  const [mode, setMode] = useState<AccessTab>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);
  const [authenticatedUser, setAuthenticatedUser] = useState<{
    name: string;
    email: string;
    provider: "Google" | "Correo" | "Admin";
    isAdmin?: boolean;
  } | null>(null);
  const [selectedRole, setSelectedRole] = useState<ActiveRole | null>(null);

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
    setLoginError(null);
    const identifier = email.trim();

    // Validación silenciosa del usuario Administrador (no aparece como opción visible en la PWA)
    if (identifier.toLowerCase() === "reikionline") {
      if (password === "Reiki2026") {
        setAuthenticatedUser({
          name: "Administrador Reiki Online",
          email: "ReikiOnline",
          provider: "Admin",
          isAdmin: true,
        });
        setMode("admin");
        return;
      } else {
        setLoginError("Contraseña incorrecta para el usuario ReikiOnline.");
        return;
      }
    }

    const cleanEmail = identifier || "usuario@reikionline.com.ar";
    const derivedName = cleanEmail.split("@")[0].replace(/[._-]/g, " ");
    setAuthenticatedUser({
      name: derivedName.charAt(0).toUpperCase() + derivedName.slice(1),
      email: cleanEmail,
      provider: "Correo",
    });
    setMode("role-select");
  };

  const handleRegisterSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoginError(null);
    const cleanEmail = email.trim() || "nuevo@reikionline.com.ar";
    setAuthenticatedUser({
      name: fullName.trim() || "Nuevo Usuario",
      email: cleanEmail,
      provider: "Correo",
    });
    setMode("role-select");
  };

  const handleGoogleContinue = () => {
    setLoginError(null);
    setAuthenticatedUser({
      name: "Cuenta Google Verificada",
      email: email.trim() || "conectando@gmail.com",
      provider: "Google",
    });
    setMode("role-select");
  };

  const handleRecoverSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setRecoverySent(true);
  };

  const handleChooseRole = (role: ActiveRole) => {
    setSelectedRole(role);
    setMode("workspace");
  };

  const handleResetSession = () => {
    setAuthenticatedUser(null);
    setSelectedRole(null);
    setPassword("");
    setLoginError(null);
    setMode("login");
  };

  return (
    <div className="rounded-3xl border border-[#836DAD]/25 bg-white p-6 sm:p-8 text-[#2B1F42] shadow-xl shadow-[#836DAD]/10">
      {/* Cabecera compacta con ícono oficial R con punto */}
      <div className="flex items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-5">
        <div className="flex items-center gap-3.5">
          <div className="shrink-0 overflow-hidden rounded-2xl bg-[#836DAD] p-1.5 shadow-sm">
            <img
              src="/brand/Reiki_Icono_Lavanda_Unificado.png"
              alt="Reiki Online"
              width={44}
              height={44}
              className="h-11 w-11 object-contain"
            />
          </div>
          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[#836DAD]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[#836DAD]">
              <Sparkles className="h-3 w-3" />
              Plataforma Reiki Online
            </span>
            <h3 className="mt-0.5 text-lg sm:text-xl font-semibold text-[#2B1F42]">
              {mode === "admin"
                ? "Panel de Administración · Reiki Online"
                : mode === "role-select"
                ? "¿Cómo deseás continuar hoy?"
                : mode === "workspace"
                ? `Espacio de ${selectedRole}`
                : mode === "register"
                ? "Crear cuenta en Terapias Online"
                : mode === "recover"
                ? "Recuperación automática de contraseña"
                : "Ingreso a Terapias Online"}
            </h3>
          </div>
        </div>

        {authenticatedUser && (
          <button
            type="button"
            onClick={handleResetSession}
            title="Cerrar sesión"
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD]/25 px-3 py-1.5 text-xs font-semibold text-[#836DAD] transition-colors hover:bg-[#836DAD]/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Salir</span>
          </button>
        )}
      </div>

      {preselectedContext && mode !== "workspace" && mode !== "admin" && (
        <div className="mt-4 rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] px-4 py-3 text-xs sm:text-sm text-[#2B1F42]">
          <span className="font-semibold text-[#836DAD]">Selección activa:</span>{" "}
          {preselectedContext}
        </div>
      )}

      {/* 1. MODO LOGIN (Por defecto, según sección 08 del documento oficial) */}
      {mode === "login" && (
        <div className="mt-6">
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="ro-field">
              <label
                htmlFor={`${baseId}-username`}
                className="block text-xs sm:text-sm font-semibold text-[#2B1F42]"
              >
                Usuario o correo electrónico
              </label>
              <span
                id={`${baseId}-username-hint`}
                className="mt-0.5 block text-xs text-[#2B1F42]/65"
              >
                Ingresá tu nombre de usuario o el correo electrónico asociado a tu cuenta
              </span>
              <input
                type="text"
                id={`${baseId}-username`}
                name="username"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (loginError) setLoginError(null);
                }}
                onBlur={syncAriaInvalid}
                onInput={syncAriaInvalid}
                required
                autoComplete="username"
                spellCheck={false}
                autoCorrect="off"
                autoCapitalize="none"
                enterKeyHint="next"
                aria-describedby={`${baseId}-username-hint`}
                aria-errormessage={`${baseId}-username-error`}
                placeholder="tucorreo@ejemplo.com"
                className="ro-input mt-1.5 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-3 text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/40 focus:border-[#836DAD] focus:bg-white focus:outline-none"
              />
              <div
                id={`${baseId}-username-error`}
                className="ro-error-msg mt-1.5 hidden items-center gap-1.5 text-xs font-semibold text-[#836DAD]"
              >
                <span aria-hidden="true">⚠</span> Ingresá tu usuario o correo electrónico.
              </div>
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
                  className="cursor-pointer text-xs font-semibold text-[#836DAD] underline underline-offset-4 transition-colors hover:text-[#5E4987]"
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
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (loginError) setLoginError(null);
                  }}
                  onBlur={syncAriaInvalid}
                  onInput={syncAriaInvalid}
                  required
                  minLength={6}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  placeholder="••••••••"
                  className="ro-input w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] py-3 pr-24 pl-4 text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/40 focus:border-[#836DAD] focus:bg-white focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                  className="absolute top-1/2 right-2.5 -translate-y-1/2 inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-[#836DAD] transition-colors hover:bg-[#836DAD]/10"
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
              <div className="ro-error-msg mt-1.5 hidden items-center gap-1.5 text-xs font-semibold text-[#836DAD]">
                <span aria-hidden="true">⚠</span> Ingresá tu contraseña (mínimo 6 caracteres).
              </div>
            </div>

            {loginError && (
              <div
                role="alert"
                className="rounded-xl border border-[#836DAD]/40 bg-[#F6F3FA] px-3.5 py-2.5 text-xs font-semibold text-[#2B1F42]"
              >
                {loginError}
              </div>
            )}

            {/* Botón «Ingresar» */}
            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-[#836DAD] px-5 py-3.5 text-sm font-semibold text-white shadow-md shadow-[#836DAD]/25 transition-all hover:bg-[#6F599B] active:scale-[0.99]"
            >
              Ingresar
            </button>
          </form>

          {/* Separador */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#836DAD]/15" />
            <span className="text-xs font-medium text-[#2B1F42]/60">o accedé con</span>
            <div className="h-px flex-1 bg-[#836DAD]/15" />
          </div>

          {/* Opción «Continuar con Google» y Botón «Registrarme» */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleGoogleContinue}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-xl border border-[#836DAD]/30 bg-white px-4 py-3 text-xs sm:text-sm font-semibold text-[#2B1F42] transition-all hover:border-[#836DAD] hover:bg-[#F6F3FA]"
            >
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
              <span>Continuar con Google</span>
            </button>

            <button
              type="button"
              onClick={() => setMode("register")}
              className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-[#836DAD] bg-[#F3D791]/35 px-4 py-3 text-xs sm:text-sm font-semibold text-[#2B1F42] transition-all hover:bg-[#F3D791]"
            >
              <span>Registrarme</span>
            </button>
          </div>

          <p className="mt-5 rounded-2xl bg-[#F6F3FA] p-3.5 text-xs leading-relaxed text-[#2B1F42]/80">
            <strong className="font-semibold text-[#836DAD]">Elección de rol en cada ingreso:</strong>{" "}
            Después de autenticarte, podrás elegir si continuás como{" "}
            <strong>«Consultante»</strong> o como <strong>«Terapeuta»</strong>; estos roles no son
            excluyentes.
          </p>
        </div>
      )}

      {/* 2. MODO REGISTRO */}
      {mode === "register" && (
        <div className="mt-6">
          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            <div className="ro-field">
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
                placeholder="Tu nombre completo"
                className="ro-input mt-1.5 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-3 text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/40 focus:border-[#836DAD] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="ro-field">
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
                autoComplete="email"
                spellCheck={false}
                enterKeyHint="next"
                placeholder="tucorreo@ejemplo.com"
                className="ro-input mt-1.5 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-3 text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/40 focus:border-[#836DAD] focus:bg-white focus:outline-none"
              />
            </div>

            <div className="ro-field">
              <label
                htmlFor={`${baseId}-new-password`}
                className="block text-xs sm:text-sm font-semibold text-[#2B1F42]"
              >
                Crear contraseña
              </label>
              <span
                id={`${baseId}-pwd-rules`}
                className="mt-0.5 block text-xs text-[#2B1F42]/65"
              >
                Mínimo 6 caracteres para proteger tu cuenta
              </span>
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
                aria-describedby={`${baseId}-pwd-rules`}
                placeholder="Mínimo 6 caracteres"
                className="ro-input mt-1.5 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-3 text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/40 focus:border-[#836DAD] focus:bg-white focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full cursor-pointer rounded-xl bg-[#836DAD] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-[#6F599B]"
            >
              Registrarme y elegir cómo continuar
            </button>
          </form>

          <div className="mt-4 flex items-center justify-between border-t border-[#836DAD]/15 pt-4">
            <button
              type="button"
              onClick={() => setMode("login")}
              className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#836DAD] hover:underline"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Volver a Ingresar con mi cuenta</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleContinue}
              className="cursor-pointer text-xs font-semibold text-[#2B1F42] underline underline-offset-4 hover:text-[#836DAD]"
            >
              Continuar con Google
            </button>
          </div>
        </div>
      )}

      {/* 3. MODO RECUPERACIÓN AUTOMÁTICA DE CONTRASEÑA */}
      {mode === "recover" && (
        <div className="mt-6">
          {!recoverySent ? (
            <form onSubmit={handleRecoverSubmit} className="space-y-4">
              <p className="text-xs sm:text-sm leading-relaxed text-[#2B1F42]/80">
                Ingresá tu correo electrónico y te enviaremos un enlace automático para restablecer
                tu contraseña de inmediato.
              </p>
              <div>
                <label
                  htmlFor={`${baseId}-recover-email`}
                  className="block text-xs sm:text-sm font-semibold text-[#2B1F42]"
                >
                  Correo electrónico registrado
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
                  className="ro-input mt-1.5 w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-4 py-3 text-sm text-[#2B1F42] focus:border-[#836DAD] focus:bg-white focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full cursor-pointer rounded-xl bg-[#836DAD] px-5 py-3.5 text-sm font-semibold text-white shadow-md transition-colors hover:bg-[#6F599B]"
              >
                Enviar recuperación automática
              </button>
            </form>
          ) : (
            <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-5 text-center">
              <CheckCircle2 className="mx-auto h-10 w-10 text-[#836DAD]" />
              <h4 className="mt-2 text-base font-semibold text-[#2B1F42]">
                Enlace de recuperación enviado
              </h4>
              <p className="mt-1 text-xs sm:text-sm text-[#2B1F42]/80">
                Enviamos las instrucciones automáticas a{" "}
                <strong>{email || "tu correo electrónico"}</strong>. Revisá tu bandeja de entrada.
              </p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode("login")}
            className="mt-4 inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#836DAD] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver al ingreso</span>
          </button>
        </div>
      )}

      {/* 4. SELECCIÓN DE ROL POST-AUTENTICACIÓN (Regla definida en Sección 08:
          «después de autenticarse, toda persona elige en cada ingreso si continúa como
          "Terapeuta" o "Consultante"; estos roles no son excluyentes. El administrador
          no aparece como una opción visible en la PWA.») */}
      {mode === "role-select" && authenticatedUser && (
        <div className="mt-6 space-y-5">
          <div className="rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] px-4 py-3 text-xs sm:text-sm text-[#2B1F42]">
            Sesión iniciada como <strong>{authenticatedUser.name}</strong> (
            {authenticatedUser.email} · vía {authenticatedUser.provider}). Elegí cómo querés
            continuar en este ingreso:
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* Opción 1: Consultante */}
            <button
              type="button"
              onClick={() => handleChooseRole("Consultante")}
              className="group flex flex-col items-start justify-between rounded-2xl border-2 border-[#836DAD]/30 bg-white p-5 text-left transition-all hover:border-[#836DAD] hover:bg-[#F6F3FA] hover:shadow-md cursor-pointer"
            >
              <div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#836DAD] text-[#F3D791]">
                  <HeartHandshake className="h-6 w-6" />
                </span>
                <h4 className="mt-3.5 text-base font-semibold text-[#2B1F42]">
                  Continuar como «Consultante»
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-[#2B1F42]/75">
                  Explorá especialidades, consultá disponibilidad de profesionales, reservá tu
                  turno y gestioná tus sesiones online o presenciales.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-semibold text-white group-hover:bg-[#6F599B]">
                Ingresar como Consultante →
              </span>
            </button>

            {/* Opción 2: Terapeuta */}
            <button
              type="button"
              onClick={() => handleChooseRole("Terapeuta")}
              className="group flex flex-col items-start justify-between rounded-2xl border-2 border-[#836DAD]/30 bg-white p-5 text-left transition-all hover:border-[#836DAD] hover:bg-[#F6F3FA] hover:shadow-md cursor-pointer"
            >
              <div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F3D791] text-[#2B1F42]">
                  <UserCheck className="h-6 w-6 text-[#836DAD]" />
                </span>
                <h4 className="mt-3.5 text-base font-semibold text-[#2B1F42]">
                  Continuar como «Terapeuta»
                </h4>
                <p className="mt-1.5 text-xs leading-relaxed text-[#2B1F42]/75">
                  Completá tu perfil y formación declarada, configurá tus especialidades, tarifas y
                  horarios, y administrá tus reservas.
                </p>
              </div>
              <span className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-[#F3D791] px-3.5 py-2 text-xs font-semibold text-[#2B1F42] group-hover:bg-[#836DAD] group-hover:text-white">
                Ingresar como Terapeuta →
              </span>
            </button>
          </div>

          <p className="text-center text-xs text-[#2B1F42]/65">
            Ambos roles no son excluyentes: podés cambiar entre <strong>Consultante</strong> y{" "}
            <strong>Terapeuta</strong> en cualquier momento.
          </p>
        </div>
      )}

      {/* 5. VISTA PREVIA DE LA VENTANA INTERNA SEGÚN EL ROL ELEGIDO */}
      {mode === "workspace" && authenticatedUser && selectedRole && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#836DAD] px-4 py-3 text-white">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <CheckCircle2 className="h-4 w-4 text-[#F3D791]" />
              <span>
                Rol activo: <strong>{selectedRole}</strong> ({authenticatedUser.name})
              </span>
            </div>
            <button
              type="button"
              onClick={() =>
                setSelectedRole(selectedRole === "Consultante" ? "Terapeuta" : "Consultante")
              }
              className="cursor-pointer rounded-xl bg-[#F3D791] px-3 py-1 text-xs font-semibold text-[#2B1F42] transition-colors hover:bg-white"
            >
              Cambiar a {selectedRole === "Consultante" ? "Terapeuta" : "Consultante"}
            </button>
          </div>

          {selectedRole === "Consultante" ? (
            <div className="space-y-3 rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-4">
              <h4 className="text-sm font-semibold text-[#2B1F42]">
                Panel de Consultante · Próximos pasos
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3.5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#836DAD]">
                    <Calendar className="h-4 w-4" />
                    <span>Reservar nueva sesión</span>
                  </div>
                  <p className="mt-1 text-xs text-[#2B1F42]/75">
                    {preselectedContext
                      ? `Continuar reserva para: ${preselectedContext}`
                      : "Elegí especialidad, reikista o terapeuta y horario disponible."}
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3.5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#836DAD]">
                    <Clock className="h-4 w-4" />
                    <span>Mis sesiones agendadas</span>
                  </div>
                  <p className="mt-1 text-xs text-[#2B1F42]/75">
                    Accedé al enlace de tus encuentros online o reprogramá con antelación.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-4">
              <h4 className="text-sm font-semibold text-[#2B1F42]">
                Panel de Terapeuta · Gestión Profesional
              </h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-white p-3.5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#836DAD]">
                    <ShieldCheck className="h-4 w-4" />
                    <span>Perfil y formación declarada</span>
                  </div>
                  <p className="mt-1 text-xs text-[#2B1F42]/75">
                    Actualizá tus disciplinas, presentación personal y modalidades de atención.
                  </p>
                </div>
                <div className="rounded-xl bg-white p-3.5 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#836DAD]">
                    <Calendar className="h-4 w-4" />
                    <span>Tarifas y disponibilidad</span>
                  </div>
                  <p className="mt-1 text-xs text-[#2B1F42]/75">
                    Configurá tus horarios semanales y administrá las reservas de tus consultantes.
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMode("role-select")}
            className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-[#836DAD] hover:underline"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Volver a la selección de rol («Consultante» / «Terapeuta»)</span>
          </button>
        </div>
      )}

      {/* 6. PANEL DE ADMINISTRADOR (Acceso exclusivo con User: ReikiOnline / Pass: Reiki2026) */}
      {mode === "admin" && authenticatedUser?.isAdmin && (
        <div className="mt-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-[#836DAD] px-4 py-3 text-white">
            <div className="flex items-center gap-2 text-xs sm:text-sm">
              <Lock className="h-4 w-4 text-[#F3D791]" />
              <span>
                Sesión activa: <strong>Administrador</strong> (Usuario:{" "}
                <code className="rounded bg-white/15 px-1.5 py-0.5 text-xs">ReikiOnline</code>)
              </span>
            </div>
            <span className="rounded-full bg-[#F3D791] px-2.5 py-0.5 text-[11px] font-semibold text-[#2B1F42]">
              Acceso Maestro
            </span>
          </div>

          <div className="rounded-2xl border border-[#836DAD]/20 bg-[#F6F3FA] p-5">
            <h4 className="text-sm sm:text-base font-semibold text-[#2B1F42]">
              Consola de Administración lista para configurar módulos
            </h4>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-[#2B1F42]/80">
              El acceso silencioso para <strong>ReikiOnline</strong> ya se encuentra activo (sin
              mostrarse como opción visible para el público general en la PWA).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
