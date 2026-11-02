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
  const [maxTherapiesPerFlyer, setMaxTherapiesPerFlyer] = useState<4 | 6>(4);
  const [activeFlyerIndex, setActiveFlyerIndex] = useState<number>(0);
  const credentialRole: CredentialRole =
    profile.soyTerapeuta || profile.role === "terapeuta"
      ? "Terapeuta"
      : "Consultante";
  const [nickname, setNickname] = useState<string>(defaultNick);
  const [photoDataUrl, setPhotoDataUrl] = useState<string>(
    profile.fotoUrl || ""
  );
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  // Dividir las terapias en múltiples Flyers (máximo 4 o 6 por Flyer) para no distorsionar la imagen
  const flyerChunks = useMemo<string[][]>(() => {
    if (credentialRole !== "Terapeuta" || therapiesToShow.length === 0) {
      return [[]];
    }
    const chunks: string[][] = [];
    for (let i = 0; i < therapiesToShow.length; i += maxTherapiesPerFlyer) {
      chunks.push(therapiesToShow.slice(i, i + maxTherapiesPerFlyer));
    }
    return chunks.length > 0 ? chunks : [[]];
  }, [credentialRole, therapiesToShow, maxTherapiesPerFlyer]);

  useEffect(() => {
    if (activeFlyerIndex >= flyerChunks.length) {
      setActiveFlyerIndex(0);
    }
  }, [flyerChunks.length, activeFlyerIndex]);

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
  const handleDownloadPng = async (
    targetFormat: CredentialFormat,
    flyerIdx = activeFlyerIndex
  ) => {
    setExporting(true);
    setFeedbackMsg(null);
    try {
      const chunkForThisFlyer =
        flyerChunks[flyerIdx] || flyerChunks[0] || [];
      const totalFlyers = flyerChunks.length;

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
      let cursorY = isFeed ? 68 : 104;

      // 2. Cabecera horizontal: Isologotipo Oficial de Reiki Online a la izquierda + CREDENCIAL OFICIAL (en 2 líneas equiparadas) a la derecha
      const headerInnerPad = pad + (isFeed ? 44 : 52);
      const logoW = isFeed ? 340 : 400;
      const logoH = logoW / 2;
      if (logoImg) {
        ctx.drawImage(logoImg, headerInnerPad, cursorY, logoW, logoH);
      }

      ctx.save();
      ctx.fillStyle = "#F3D791";
      ctx.textAlign = "right";
      const headerFontSize = isFeed ? 44 : 50;
      ctx.font = `800 ${headerFontSize}px sans-serif`;
      const rightX = width - headerInnerPad;
      const centerLogoY = cursorY + logoH / 2;
      ctx.fillText("CREDENCIAL", rightX, centerLogoY - (isFeed ? 8 : 10));
      ctx.fillText(
        "OFICIAL",
        rightX,
        centerLogoY + headerFontSize - (isFeed ? 4 : 4)
      );
      ctx.restore();

      cursorY += logoH + (isFeed ? 24 : 56);

      // 3. Foto del usuario circular con aro Champán (#F3D791)
      const avatarRadius = isFeed ? 76 : 126;
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
        ctx.font = `700 ${isFeed ? 54 : 84}px sans-serif`;
        ctx.textAlign = "center";
        const initials = fullName
          .split(" ")
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        ctx.fillText(initials, centerX, avatarCenterY + (isFeed ? 20 : 30));
      }
      ctx.restore();

      cursorY = avatarCenterY + avatarRadius + (isFeed ? 34 : 58);

      // 4. Insignia de Rol: Consultante o Terapeuta (colores del Manual)
      ctx.textAlign = "center";
      const roleText = credentialRole.toUpperCase();
      const badgeW = isFeed ? 240 : 300;
      const badgeH = isFeed ? 40 : 52;
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
      ctx.font = `700 ${isFeed ? 19 : 24}px sans-serif`;
      ctx.fillText(roleText, centerX, cursorY - badgeH / 2 + 17);

      cursorY += isFeed ? 42 : 68;

      // 5. Nombre y Apellido (sin duplicar el nickname debajo del nombre, ya que figura al pie debajo del QR)
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 ${isFeed ? 36 : 48}px sans-serif`;
      ctx.fillText(fullName, centerX, cursorY);

      cursorY += isFeed ? 34 : 54;

      // 6. En el caso del Terapeuta: terapias correspondientes a este Flyer (máx 4 o 6)
      if (credentialRole === "Terapeuta" && chunkForThisFlyer.length > 0) {
        const summaryLine = chunkForThisFlyer.join("  •  ");
        ctx.fillStyle = "#FFFFFF";
        ctx.font = `600 ${isFeed ? 19 : 25}px sans-serif`;

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

        for (const l of lines.slice(0, 3)) {
          ctx.fillText(l, centerX, cursorY);
          cursorY += isFeed ? 26 : 38;
        }
      }

      // 7. Bloque QR inferior vinculado a https://www.reikionline.com.ar/nickname
      const qrBoxSize = isFeed ? 168 : 250;
      const qrY = height - pad - qrBoxSize - (isFeed ? 68 : 116);

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
      const flyerSuffix = totalFlyers > 1 ? `-flyer-${flyerIdx + 1}` : "";
      a.download = `credencial-reikionline-${cleanNickname}-${targetFormat}${flyerSuffix}.png`;
      a.click();
      setFeedbackMsg(
        totalFlyers > 1
          ? `Flyer ${flyerIdx + 1} de ${totalFlyers} descargado en Tamaño ${
              targetFormat === "feed" ? "Feed" : "Estados"
            }.`
          : `Credencial descargada en Tamaño ${
              targetFormat === "feed" ? "Feed" : "Estados"
            }.`
      );
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadAllFlyers = async (targetFormat: CredentialFormat) => {
    for (let i = 0; i < flyerChunks.length; i++) {
      await handleDownloadPng(targetFormat, i);
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
          </div>
        </div>
      </div>

      {/* Selector de los 2 tipos de credenciales: Tamaño Feed | Tamaño Estados + Límite de terapias por Flyer (4 o 6) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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

          {credentialRole === "Terapeuta" && therapiesToShow.length > 4 && (
            <div className="inline-flex items-center gap-1 rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-1 text-xs">
              <span className="px-2.5 font-semibold text-[#2B1F42]/75">
                Máx. por Flyer:
              </span>
              {([4, 6] as const).map((limitVal) => (
                <button
                  key={limitVal}
                  type="button"
                  onClick={() => {
                    setMaxTherapiesPerFlyer(limitVal);
                    setActiveFlyerIndex(0);
                  }}
                  className={`cursor-pointer rounded-xl px-3 py-1.5 font-bold transition ${
                    maxTherapiesPerFlyer === limitVal
                      ? "bg-[#836DAD] text-white shadow-2xs"
                      : "text-[#2B1F42] hover:bg-white/70"
                  }`}
                >
                  {limitVal} terapias
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={exporting}
            onClick={() =>
              flyerChunks.length > 1
                ? handleDownloadAllFlyers(format)
                : handleDownloadPng(format, 0)
            }
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#6F599B] disabled:opacity-50"
          >
            <Download className="h-4 w-4 text-[#F3D791]" />
            <span>
              {flyerChunks.length > 1
                ? `Descargar los ${flyerChunks.length} Flyers (${
                    format === "feed" ? "Feed" : "Estados"
                  })`
                : `Descargar ${
                    format === "feed" ? "Tamaño Feed" : "Tamaño Estados"
                  }`}
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

      {flyerChunks.length > 1 && (
        <div className="rounded-xl border border-[#836DAD]/25 bg-[#F6F3FA] px-4 py-2.5 text-xs text-[#2B1F42] flex flex-wrap items-center justify-between gap-2">
          <span>
            Tus <strong>{therapiesToShow.length} terapias</strong> se dividieron automáticamente en{" "}
            <strong>{flyerChunks.length} Flyers</strong> (máximo{" "}
            {maxTherapiesPerFlyer} terapias por Flyer) para mantener intacto el diseño sin distorsiones.
          </span>
        </div>
      )}

      {/* PREVISUALIZACIÓN EN VIVO DE LOS FLYERS (SI HAY MÁS DE 4 O 6 TERAPIAS, PASA EL RESTO A OTRO FLYER) */}
      <div
        className={`grid gap-6 py-2 justify-items-center ${
          flyerChunks.length > 1
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {flyerChunks.map((chunkTherapies, flyerIdx) => (
          <div
            key={`flyer-${flyerIdx}`}
            className="flex w-full flex-col items-center space-y-2.5"
          >
            {flyerChunks.length > 1 && (
              <div className="flex w-full max-w-[360px] items-center justify-end px-1">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => handleDownloadPng(format, flyerIdx)}
                  className="inline-flex cursor-pointer items-center gap-1 text-xs font-bold text-[#836DAD] underline hover:text-[#5E4B8B]"
                >
                  <Download className="h-3.5 w-3.5" />
                  Descargar esta imagen
                </button>
              </div>
            )}

            <div
              className={`relative flex flex-col items-center justify-between overflow-hidden rounded-[2rem] border-2 border-[#F3D791] bg-[#836DAD] text-center text-white shadow-2xl transition-all ${
                format === "feed"
                  ? "aspect-square w-full max-w-[440px] px-6 py-5 sm:px-7 sm:py-6"
                  : "aspect-[9/16] w-full max-w-[360px] px-5 py-6 sm:px-6 sm:py-7"
              }`}
            >
              {/* Marco interno sutil con los colores del Manual de Marca */}
              <div className="pointer-events-none absolute inset-3 rounded-[1.5rem] border border-[#F3D791]/45" />

              {/* 1. Cabecera rediseñada: Isologotipo de Reiki Online a la izquierda y CREDENCIAL OFICIAL (en 2 líneas equiparadas) a la derecha */}
              <div className="relative z-10 flex w-full items-center justify-between gap-3 px-2 pt-0.5">
                <img
                  src="/brand/Reiki_Online_Lavanda_Unificado.png"
                  alt="Reiki online — CONECTANDO BIENESTAR"
                  className={
                    format === "feed"
                      ? "h-12 sm:h-14 w-auto object-contain shrink-0"
                      : "h-14 sm:h-16 w-auto object-contain shrink-0"
                  }
                />
                <div
                  className={`flex flex-col items-end justify-center text-right font-extrabold uppercase tracking-[0.14em] text-[#F3D791] leading-[1.12] ${
                    format === "feed"
                      ? "text-sm sm:text-base"
                      : "text-base sm:text-lg"
                  }`}
                >
                  <span>CREDENCIAL</span>
                  <span>OFICIAL</span>
                </div>
              </div>

              {/* 2. Foto aportada por usuario + Rol + Nombre y Apellido + Terapias de este Flyer */}
              <div className="relative z-10 flex w-full flex-col items-center">
                <div className="relative">
                  <div
                    className={`overflow-hidden rounded-full border-[3px] border-[#F3D791] bg-[#F6F3FA] shadow-lg ${
                      format === "feed"
                        ? "h-15 w-15 sm:h-17 sm:w-17"
                        : "h-20 w-20 sm:h-22 sm:w-22"
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
                    isBiometricVerifiedAndValid(
                      profile.biometricVerification
                    )) && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#F3D791]/70 bg-white/15 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-bold text-[#F3D791]">
                      <span>✓ Identidad verificada</span>
                    </span>
                  )}
                </div>

                {/* Nombre y Apellido (sin duplicar @nickname aquí, ya que figura debajo del QR) */}
                <h3
                  className={`mt-1.5 font-bold text-white leading-tight ${
                    format === "feed"
                      ? "text-base sm:text-lg"
                      : "text-lg sm:text-xl"
                  }`}
                >
                  {fullName}
                </h3>

                {/* En el caso del Terapeuta: muestra hasta 4 (o 6) terapias en este Flyer */}
                {credentialRole === "Terapeuta" &&
                  chunkTherapies.length > 0 && (
                    <div className="mt-2 flex max-w-[310px] flex-wrap justify-center gap-1">
                      {chunkTherapies.map((therapy) => (
                        <span
                          key={therapy}
                          className="rounded-full border border-[#F3D791]/50 bg-white/15 px-2.5 py-0.5 text-[9px] sm:text-[10px] font-medium text-white"
                        >
                          {therapy}
                        </span>
                      ))}
                    </div>
                  )}
              </div>

              {/* 3. Código QR vinculado a https://www.reikionline.com.ar/nickname + URL única al pie */}
              <div className="relative z-10 flex w-full shrink-0 flex-col items-center pb-1">
                <div
                  className={`shrink-0 rounded-2xl bg-white shadow-lg ${
                    format === "feed" ? "p-1.5" : "p-2"
                  }`}
                >
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt={`QR ${publicCredentialUrl}`}
                      width={format === "feed" ? 76 : 100}
                      height={format === "feed" ? 76 : 100}
                      className={
                        format === "feed"
                          ? "block h-[72px] w-[72px] sm:h-[78px] sm:w-[78px] min-h-[72px] min-w-[72px] shrink-0 object-contain"
                          : "block h-[96px] w-[96px] sm:h-[104px] sm:w-[104px] min-h-[96px] min-w-[96px] shrink-0 object-contain"
                      }
                    />
                  ) : (
                    <div className="flex h-[72px] w-[72px] items-center justify-center text-xs font-bold text-[#2B1F42]">
                      QR...
                    </div>
                  )}
                </div>

                <a
                  href={`/${cleanNickname}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-[#F3D791] hover:underline"
                >
                  <span>{displayShortUrl}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
