"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Camera,
  Download,
  Share2,
  Sparkles,
  UserCheck,
  HeartHandshake,
  QrCode,
  CheckCircle2,
  ExternalLink,
  Copy,
  Square,
  Smartphone,
} from "lucide-react";
import {
  getEffectiveNickname,
  ReikiUserProfile,
  sanitizeNickname,
} from "@/lib/geoData";
import { isBiometricVerifiedAndValid } from "@/lib/biometricIdentity";

export type CredentialFormat = "feed" | "estados";
export type CredentialRole = "Consultante" | "Terapeuta";

interface UserCredentialPanelProps {
  profile: ReikiUserProfile;
  activeRole: CredentialRole;
  terapeutaSelections: string[];
  onSaveProfile: (updated: ReikiUserProfile) => void;
  onChangeRole?: (role: CredentialRole) => void;
  onBack?: () => void;
}

export default function UserCredentialPanel({
  profile,
  activeRole,
  terapeutaSelections,
  onSaveProfile,
  onChangeRole,
  onBack,
}: UserCredentialPanelProps) {
  const defaultNick = useMemo(() => {
    return getEffectiveNickname(profile);
  }, [profile]);

  const [format, setFormat] = useState<CredentialFormat>("feed");
  const [credentialRole, setCredentialRole] = useState<CredentialRole>(
    activeRole || (profile.role === "terapeuta" ? "Terapeuta" : "Consultante")
  );
  const [nickname, setNickname] = useState<string>(defaultNick);
  const [photoDataUrl, setPhotoDataUrl] = useState<string>(
    profile.fotoUrl || ""
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (activeRole) {
      setCredentialRole(activeRole);
    }
  }, [activeRole]);

  useEffect(() => {
    setNickname(getEffectiveNickname(profile));
  }, [profile.nickname, profile.username, profile.nombre, profile.apellido]);

  useEffect(() => {
    if (profile.fotoUrl && profile.fotoUrl !== photoDataUrl) {
      setPhotoDataUrl(profile.fotoUrl);
    }
  }, [profile.fotoUrl]);

  const cleanNickname =
    sanitizeNickname(nickname).toLowerCase() || defaultNick || "danielghiglione";
  const publicCredentialUrl = `https://www.reikionline.com.ar/${cleanNickname}`;
  const displayShortUrl = `www.reikionline.com.ar/${cleanNickname}`;

  const fullName =
    `${profile.nombre || ""} ${profile.apellido || ""}`.trim() ||
    "Usuario Reiki Online";

  const therapiesToShow = useMemo(() => {
    if (credentialRole !== "Terapeuta") return [];
    if (terapeutaSelections.length > 0) return terapeutaSelections;
    return ["Reiki Usui", "Alineación de chakras", "Armonización energética"];
  }, [credentialRole, terapeutaSelections]);

  // Generar código QR escaneable hacia https://www.reikionline.com.ar/nickname
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(publicCredentialUrl, {
      width: 360,
      margin: 1,
      color: {
        dark: "#2B1F42",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => {
        if (active) setQrDataUrl(url);
      })
      .catch(() => {
        // Ignore QR generation errors
      });
    return () => {
      active = false;
    };
  }, [publicCredentialUrl]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) return;

      // Redimensionar en canvas a 600x600 cuadrado para liviandad en localStorage
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = 600;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const minSide = Math.min(img.width, img.height);
          const sx = (img.width - minSide) / 2;
          const sy = (img.height - minSide) / 2;
          ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
          const compressed = canvas.toDataURL("image/jpeg", 0.86);
          setPhotoDataUrl(compressed);
          onSaveProfile({
            ...profile,
            fotoUrl: compressed,
            nickname: cleanNickname,
            username: cleanNickname,
            updatedAt: new Date().toISOString(),
          });
          setFeedbackMsg("Foto actualizada en tu Credencial y Perfil.");
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveNickname = () => {
    const updated: ReikiUserProfile = {
      ...profile,
      nickname: cleanNickname,
      username: cleanNickname,
      fotoUrl: photoDataUrl,
      role: credentialRole === "Terapeuta" ? "terapeuta" : "consultante",
      updatedAt: new Date().toISOString(),
    };
    onSaveProfile(updated);
    setFeedbackMsg(
      `Credencial vinculada a https://www.reikionline.com.ar/${cleanNickname}`
    );
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicCredentialUrl);
      setFeedbackMsg(`Enlace copiado: ${publicCredentialUrl}`);
    } catch {
      setFeedbackMsg(publicCredentialUrl);
    }
  };

  // Renderizado en Canvas de alta resolución para descargar PNG (Tamaño Feed 1080x1080 o Tamaño Estados 1080x1920)
  const handleDownloadPng = async (targetFormat: CredentialFormat) => {
    setExporting(true);
    setFeedbackMsg(null);
    try {
      const width = 1080;
      const height = targetFormat === "feed" ? 1080 : 1920;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // 1. Fondo institucional con el color Lavanda oficial del Manual de Marca (#836DAD)
      ctx.fillStyle = "#836DAD";
      ctx.fillRect(0, 0, width, height);

      // Marco interior elegante en Champán (#F3D791)
      const pad = targetFormat === "feed" ? 44 : 60;
      ctx.strokeStyle = "rgba(243, 215, 145, 0.55)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(pad, pad, width - pad * 2, height - pad * 2, 44);
      ctx.stroke();

      // Helper para cargar imágenes locales o dataURL
      const loadImg = (src: string): Promise<HTMLImageElement | null> =>
        new Promise((resolve) => {
          if (!src) return resolve(null);
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = src;
        });

      const [logoImg, userImg, qrImg] = await Promise.all([
        loadImg("/brand/Reiki_Online_Lavanda_Unificado.png"),
        loadImg(photoDataUrl),
        loadImg(qrDataUrl),
      ]);

      const isFeed = targetFormat === "feed";
      let cursorY = isFeed ? 54 : 88;

      // 2. Cabecera con el Isologotipo Oficial completo de Reiki Online integrado al fondo #836DAD (proporción 2:1)
      if (logoImg) {
        const logoW = isFeed ? 380 : 560;
        const logoH = logoW / 2;
        ctx.drawImage(
          logoImg,
          width / 2 - logoW / 2,
          cursorY,
          logoW,
          logoH
        );
        cursorY += logoH + (isFeed ? 8 : 18);
      }

      ctx.fillStyle = "#F3D791";
      ctx.font = `700 ${isFeed ? 18 : 24}px sans-serif`;
      ctx.textAlign = "center";
      ctx.fillText("CREDENCIAL OFICIAL", width / 2, cursorY);
      cursorY += isFeed ? 22 : 46;

      // 3. Foto del usuario circular con aro Champán (#F3D791)
      const avatarRadius = isFeed ? 76 : 130;
      const centerX = width / 2;
      const avatarCenterY = cursorY + avatarRadius;

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, avatarCenterY, avatarRadius + 6, 0, Math.PI * 2);
      ctx.fillStyle = "#F3D791";
      ctx.fill();

      ctx.beginPath();
      ctx.arc(centerX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      ctx.clip();

      if (userImg) {
        ctx.drawImage(
          userImg,
          centerX - avatarRadius,
          avatarCenterY - avatarRadius,
          avatarRadius * 2,
          avatarRadius * 2
        );
      } else {
        ctx.fillStyle = "#F6F3FA";
        ctx.fillRect(
          centerX - avatarRadius,
          avatarCenterY - avatarRadius,
          avatarRadius * 2,
          avatarRadius * 2
        );
        ctx.fillStyle = "#836DAD";
        ctx.font = `700 ${isFeed ? 56 : 88}px sans-serif`;
        const initials = fullName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        ctx.fillText(initials, centerX, avatarCenterY + (isFeed ? 20 : 30));
      }
      ctx.restore();

      cursorY = avatarCenterY + avatarRadius + (isFeed ? 36 : 62);

      // 4. Insignia de Rol: Consultante o Terapeuta (colores del Manual)
      const roleText = credentialRole.toUpperCase();
      const badgeW = isFeed ? 240 : 300;
      const badgeH = isFeed ? 40 : 54;
      ctx.save();
      ctx.fillStyle =
        credentialRole === "Terapeuta"
          ? "#F3D791"
          : "rgba(255, 255, 255, 0.18)";
      ctx.strokeStyle = "#F3D791";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(
        centerX - badgeW / 2,
        cursorY - badgeH + 10,
        badgeW,
        badgeH,
        badgeH / 2
      );
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      ctx.fillStyle = credentialRole === "Terapeuta" ? "#2B1F42" : "#FFFFFF";
      ctx.font = `700 ${isFeed ? 19 : 25}px sans-serif`;
      ctx.fillText(roleText, centerX, cursorY - badgeH / 2 + 17);

      cursorY += isFeed ? 40 : 68;

      // 5. Nombre y Apellido + Nickname
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 ${isFeed ? 38 : 52}px sans-serif`;
      ctx.fillText(fullName, centerX, cursorY);

      cursorY += isFeed ? 32 : 50;
      ctx.fillStyle = "#F3D791";
      ctx.font = `600 ${isFeed ? 24 : 34}px monospace`;
      ctx.fillText(`@${cleanNickname}`, centerX, cursorY);

      cursorY += isFeed ? 28 : 52;

      // 6. En el caso del Terapeuta: terapias que ofrece
      if (credentialRole === "Terapeuta" && therapiesToShow.length > 0) {
        const shown = therapiesToShow.slice(0, isFeed ? 4 : 8);
        const summaryLine = shown.join("  •  ");
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `600 ${isFeed ? 19 : 26}px sans-serif`;

        // Wrap text nicely within width - 180
        const maxTextWidth = width - 180;
        const words = summaryLine.split(" ");
        let line = "";
        const lines: string[] = [];
        for (const w of words) {
          const test = line ? `${line} ${w}` : w;
          if (ctx.measureText(test).width > maxTextWidth && line) {
            lines.push(line);
            line = w;
          } else {
            line = test;
          }
        }
        if (line) lines.push(line);

        for (const l of lines.slice(0, isFeed ? 2 : 4)) {
          ctx.fillText(l, centerX, cursorY);
          cursorY += isFeed ? 25 : 38;
        }
      }

      // 7. Bloque QR inferior vinculado a https://www.reikionline.com.ar/nickname
      const qrBoxSize = isFeed ? 168 : 270;
      const qrY = height - pad - qrBoxSize - (isFeed ? 62 : 114);

      if (qrImg) {
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(
          centerX - qrBoxSize / 2 - 14,
          qrY - 14,
          qrBoxSize + 28,
          qrBoxSize + 28,
          26
        );
        ctx.fill();
        ctx.drawImage(
          qrImg,
          centerX - qrBoxSize / 2,
          qrY,
          qrBoxSize,
          qrBoxSize
        );
      }

      ctx.fillStyle = "#F3D791";
      ctx.font = `700 ${isFeed ? 22 : 28}px sans-serif`;
      ctx.fillText(
        displayShortUrl,
        centerX,
        qrY + qrBoxSize + (isFeed ? 44 : 62)
      );

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `credencial-reikionline-${cleanNickname}-${targetFormat}.png`;
      a.click();
      setFeedbackMsg(
        `Credencial descargada en Tamaño ${
          targetFormat === "feed" ? "Feed" : "Estados"
        }.`
      );
    } finally {
      setExporting(false);
    }
  };

  const initials = useMemo(() => {
    return fullName
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [fullName]);

  return (
    <div className="space-y-5">
      {/* Cabecera simple de Mi Credencial */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#836DAD] text-[#F3D791]">
            <QrCode className="h-5 w-5" />
          </span>
          <div>
            <h4 className="text-base font-bold text-[#2B1F42]">
              Mi Credencial Oficial · Reiki Online
            </h4>
            <p className="text-xs text-[#2B1F42]/70">
              Disponible en Tamaño Feed (1:1) y Tamaño Estados (9:16) con código QR personal.
            </p>
          </div>
        </div>
      </div>

      {/* Barra de configuración rápida: Foto, Nickname, Rol y Tamaño */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-[#836DAD]/20 bg-white p-4 sm:grid-cols-3 shadow-xs">
        {/* 1. Foto aportada por usuario */}
        <div>
          <label className="block text-xs font-bold text-[#2B1F42] mb-1.5">
            Foto en tu credencial
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handlePhotoUpload}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#836DAD]/35 bg-[#FAF8FC] px-3.5 py-2.5 text-xs font-semibold text-[#2B1F42] transition-colors hover:border-[#836DAD] hover:bg-[#836DAD] hover:text-white"
          >
            <Camera className="h-4 w-4 text-[#836DAD] group-hover:text-white" />
            <span>{photoDataUrl ? "Cambiar foto" : "Subir foto"}</span>
          </button>
        </div>

        {/* 2. Nickname para el QR */}
        <div>
          <label
            htmlFor="ro-credential-nickname"
            className="block text-xs font-bold text-[#2B1F42] mb-1.5"
          >
            Nickname (URL del QR)
          </label>
          <div className="flex gap-1.5">
            <div className="relative flex-1">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-xs font-bold text-[#836DAD]">
                @
              </span>
              <input
                id="ro-credential-nickname"
                type="text"
                value={nickname}
                onChange={(e) => setNickname(sanitizeNickname(e.target.value))}
                placeholder="tunickname"
                className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] py-2 pr-2.5 pl-7 text-xs font-semibold text-[#2B1F42] focus:border-[#836DAD] focus:bg-white focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveNickname}
              className="cursor-pointer rounded-xl bg-[#836DAD] px-3 py-2 text-xs font-semibold text-white hover:bg-[#6F599B]"
            >
              Guardar
            </button>
          </div>
        </div>

        {/* 3. Rol mostrado en la credencial */}
        <div>
          <label className="block text-xs font-bold text-[#2B1F42] mb-1.5">
            Rol en la credencial
          </label>
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] p-1">
            {(["Consultante", "Terapeuta"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setCredentialRole(r);
                  onChangeRole?.(r);
                }}
                className={`cursor-pointer rounded-lg py-1.5 text-xs font-semibold transition-colors ${
                  credentialRole === r
                    ? "bg-[#836DAD] text-white shadow-xs"
                    : "text-[#2B1F42] hover:bg-white"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selector de los 2 tipos de credenciales: Tamaño Feed | Tamaño Estados */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-1">
          <button
            type="button"
            onClick={() => setFormat("feed")}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
              format === "feed"
                ? "bg-[#836DAD] text-white shadow-sm"
                : "text-[#2B1F42] hover:bg-white/70"
            }`}
          >
            <Square className="h-4 w-4" />
            <span>Tamaño Feed (1:1)</span>
          </button>

          <button
            type="button"
            onClick={() => setFormat("estados")}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs sm:text-sm font-semibold transition-all ${
              format === "estados"
                ? "bg-[#836DAD] text-white shadow-sm"
                : "text-[#2B1F42] hover:bg-white/70"
            }`}
          >
            <Smartphone className="h-4 w-4" />
            <span>Tamaño Estados (9:16)</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={() => handleDownloadPng(format)}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6F599B] disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-[#F3D791]" />
            <span>
              Descargar {format === "feed" ? "Tamaño Feed" : "Tamaño Estados"}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD]/30 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#2B1F42] hover:bg-[#F6F3FA]"
          >
            <Copy className="h-3.5 w-3.5 text-[#836DAD]" />
            <span>Copiar link QR</span>
          </button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="flex items-center gap-2 rounded-xl border border-[#836DAD]/30 bg-[#F6F3FA] px-3.5 py-2.5 text-xs font-semibold text-[#836DAD]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* PREVISUALIZACIÓN EN VIVO DE LA CREDENCIAL (TAMAÑO FEED O TAMAÑO ESTADOS) */}
      <div className="flex justify-center py-2">
        <div
          className={`relative flex flex-col items-center justify-between overflow-hidden rounded-[2rem] border-2 border-[#F3D791] bg-[#836DAD] text-center text-white shadow-2xl transition-all ${
            format === "feed"
              ? "aspect-square w-full max-w-[440px] px-5 py-4 sm:px-6 sm:py-5"
              : "aspect-[9/16] w-full max-w-[360px] p-6 sm:p-7"
          }`}
        >
          {/* Marco interno sutil con los colores del Manual de Marca */}
          <div className="pointer-events-none absolute inset-3 rounded-[1.5rem] border border-[#F3D791]/45" />

          {/* 1. Cabecera con el Isologotipo Oficial de Reiki Online integrado al fondo sin recuadro */}
          <div className="relative z-10 flex w-full flex-col items-center">
            <img
              src="/brand/Reiki_Online_Lavanda_Unificado.png"
              alt="Reiki online — CONECTANDO BIENESTAR"
              className={
                format === "feed"
                  ? "h-15 sm:h-17 w-auto object-contain"
                  : "h-24 sm:h-28 w-auto object-contain"
              }
            />
            <span className="-mt-0.5 block text-[9px] sm:text-[10px] font-bold tracking-[0.2em] uppercase text-[#F3D791]">
              Credencial Oficial
            </span>
          </div>

          {/* 2. Foto aportada por usuario + Rol + Nombre y Apellido + Nickname + Terapias */}
          <div className="relative z-10 flex w-full flex-col items-center">
            <div className="relative">
              <div
                className={`overflow-hidden rounded-full border-[3px] border-[#F3D791] bg-[#F6F3FA] shadow-lg ${
                  format === "feed" ? "h-16 w-16 sm:h-18 sm:w-18" : "h-26 w-26"
                }`}
              >
                {photoDataUrl ? (
                  <img
                    src={photoDataUrl}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xl sm:text-2xl font-bold text-[#836DAD]">
                    {initials}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Subir o cambiar foto"
                className="absolute -right-1 -bottom-1 flex h-6 w-6 sm:h-7 sm:w-7 cursor-pointer items-center justify-center rounded-full bg-[#F3D791] text-[#2B1F42] shadow-md hover:bg-white"
              >
                <Camera className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>
            </div>

            {/* Insignia Consultante / Terapeuta + Distintivo ✓ Identidad verificada */}
            <div className="mt-1.5 flex flex-wrap items-center justify-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10px] sm:text-[11px] font-bold tracking-wide uppercase shadow-xs ${
                  credentialRole === "Terapeuta"
                    ? "bg-[#F3D791] text-[#2B1F42]"
                    : "border border-[#F3D791] bg-white/15 text-white"
                }`}
              >
                {credentialRole === "Terapeuta" ? (
                  <UserCheck className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                ) : (
                  <HeartHandshake className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-[#F3D791]" />
                )}
                <span>{credentialRole}</span>
              </span>
              {(profile.isAdmin ||
                isBiometricVerifiedAndValid(profile.biometricVerification)) && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[#F3D791]/70 bg-white/15 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#F3D791]">
                  <span>✓ Identidad verificada</span>
                </span>
              )}
            </div>

            {/* Nombre y Apellido */}
            <h3
              className={`mt-1 font-bold text-white leading-snug ${
                format === "feed" ? "text-base sm:text-lg" : "text-xl sm:text-2xl"
              }`}
            >
              {fullName}
            </h3>

            {/* Nickname */}
            <p className="font-mono text-xs sm:text-sm font-semibold text-[#F3D791]">
              @{cleanNickname}
            </p>

            {/* En el caso del Terapeuta: agrega las terapias que ofrece */}
            {credentialRole === "Terapeuta" && therapiesToShow.length > 0 && (
              <div className="mt-1.5 flex max-w-xs flex-wrap justify-center gap-1">
                {therapiesToShow
                  .slice(0, format === "feed" ? 3 : 7)
                  .map((therapy) => (
                    <span
                      key={therapy}
                      className="rounded-full border border-[#F3D791]/50 bg-white/15 px-2 py-0.5 text-[9px] sm:text-[10px] font-medium text-white"
                    >
                      {therapy}
                    </span>
                  ))}
                {therapiesToShow.length > (format === "feed" ? 3 : 7) && (
                  <span className="rounded-full bg-[#F3D791] px-2 py-0.5 text-[9px] sm:text-[10px] font-bold text-[#2B1F42]">
                    +{therapiesToShow.length - (format === "feed" ? 3 : 7)} más
                  </span>
                )}
              </div>
            )}
          </div>

          {/* 3. Código QR vinculado a https://www.reikionline.com.ar/nickname */}
          <div className="relative z-10 flex w-full shrink-0 flex-col items-center">
            <div
              className={`shrink-0 rounded-2xl bg-white shadow-lg ${
                format === "feed" ? "p-2" : "p-2.5"
              }`}
            >
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${publicCredentialUrl}`}
                  width={format === "feed" ? 88 : 120}
                  height={format === "feed" ? 88 : 120}
                  className={
                    format === "feed"
                      ? "block h-[80px] w-[80px] sm:h-[88px] sm:w-[88px] min-h-[80px] min-w-[80px] shrink-0 object-contain"
                      : "block h-[112px] w-[112px] sm:h-[124px] sm:w-[124px] min-h-[112px] min-w-[112px] shrink-0 object-contain"
                  }
                />
              ) : (
                <div className="flex h-[80px] w-[80px] items-center justify-center text-xs font-bold text-[#2B1F42]">
                  QR...
                </div>
              )}
            </div>

            <a
              href={`/${cleanNickname}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-[#F3D791] hover:underline"
            >
              <span>{displayShortUrl}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
