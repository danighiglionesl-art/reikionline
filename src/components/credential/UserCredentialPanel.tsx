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

  // Renderizado en Canvas de alta resolución para descargar PNG idéntico a la previsualización (Tamaño Feed 1080x1080 o Tamaño Estados 1080x1920)
  const handleDownloadPng = async (
    targetFormat: CredentialFormat,
    flyerIdx = activeFlyerIndex
  ) => {
    setExporting(true);
    setFeedbackMsg(null);
    try {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
      }

      const chunkForThisFlyer =
        flyerChunks[flyerIdx] || flyerChunks[0] || [];
      const totalFlyers = flyerChunks.length;

      const isFeed = targetFormat === "feed";
      const width = 1080;
      const height = isFeed ? 1080 : 1920;
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const computedFont =
        typeof window !== "undefined"
          ? window.getComputedStyle(document.body).fontFamily || "sans-serif"
          : "sans-serif";

      const isVerified =
        Boolean(profile.isAdmin) ||
        isBiometricVerifiedAndValid(profile.biometricVerification);

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

      // 1. Fondo y contenedor redondeado exterior idéntico a la vista previa (rounded-[2rem] border-2 border-[#F3D791] bg-[#836DAD])
      ctx.fillStyle = "#836DAD";
      ctx.fillRect(0, 0, width, height);

      const outerInset = 4;
      const outerRadius = isFeed ? 74 : 84;
      ctx.save();
      ctx.strokeStyle = "#F3D791";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.roundRect(
        outerInset,
        outerInset,
        width - outerInset * 2,
        height - outerInset * 2,
        outerRadius
      );
      ctx.stroke();
      ctx.restore();

      // Marco interno sutil idéntico a `inset-3 rounded-[1.5rem] border border-[#F3D791]/45`
      const innerInset = isFeed ? 30 : 38;
      const innerRadius = isFeed ? 54 : 64;
      ctx.save();
      ctx.strokeStyle = "rgba(243, 215, 145, 0.45)";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(
        innerInset,
        innerInset,
        width - innerInset * 2,
        height - innerInset * 2,
        innerRadius
      );
      ctx.stroke();
      ctx.restore();

      // Función auxiliar para dibujar texto con espaciado de letras (tracking)
      const drawTrackedTextRight = (
        text: string,
        rightX: number,
        y: number,
        trackingPx: number
      ) => {
        const chars = text.split("");
        let totalW = 0;
        const widths = chars.map((ch) => {
          const w = ctx.measureText(ch).width;
          totalW += w;
          return w;
        });
        totalW += trackingPx * Math.max(0, chars.length - 1);
        let currX = rightX - totalW;
        ctx.textAlign = "left";
        chars.forEach((ch, idx) => {
          ctx.fillText(ch, currX, y);
          currX += widths[idx] + trackingPx;
        });
      };

      // 2. BLOQUE SUPERIOR (Cabecera): Isologotipo a la izquierda + CREDENCIAL OFICIAL a la derecha
      const padX = isFeed ? 76 : 86;
      const topY = isFeed ? 62 : 98;
      const logoH = isFeed ? 142 : 176;
      const logoW = logoH * 2;

      if (logoImg) {
        ctx.drawImage(logoImg, padX, topY, logoW, logoH);
      }

      ctx.save();
      ctx.fillStyle = "#F3D791";
      const headerFontSize = isFeed ? 38 : 46;
      ctx.font = `800 ${headerFontSize}px ${computedFont}`;
      const rightEdgeX = width - padX;
      const logoMidY = topY + logoH / 2;
      const tracking = isFeed ? 5.2 : 6.2;
      drawTrackedTextRight(
        "CREDENCIAL",
        rightEdgeX,
        logoMidY - (isFeed ? 8 : 10),
        tracking
      );
      drawTrackedTextRight(
        "OFICIAL",
        rightEdgeX,
        logoMidY + headerFontSize - (isFeed ? 2 : 2),
        tracking
      );
      ctx.restore();

      const headerBottomY = topY + logoH;

      // 3. Pre-calcular el BLOQUE INFERIOR (QR + URL) para centrar el bloque del medio exactamente como `justify-between`
      const qrImgSize = isFeed ? 196 : 280;
      const qrCardPad = isFeed ? 18 : 24;
      const qrCardSize = qrImgSize + qrCardPad * 2;
      const urlFontSize = isFeed ? 27 : 33;
      const urlGapTop = isFeed ? 38 : 50;
      const bottomY = height - (isFeed ? 66 : 108);
      const urlBaselineY = bottomY;
      const qrCardTopY = urlBaselineY - urlGapTop - qrCardSize;

      // 4. Pre-calcular las filas de pastillas (pills) de terapias para el BLOQUE CENTRAL
      const pillFontSize = isFeed ? 24 : 30;
      const pillHeight = isFeed ? 48 : 60;
      const pillPadX = isFeed ? 28 : 34;
      const pillGapX = isFeed ? 14 : 18;
      const pillGapY = isFeed ? 14 : 18;
      const maxRowWidth = width - padX * 2 - (isFeed ? 20 : 10);

      ctx.font = `500 ${pillFontSize}px ${computedFont}`;
      interface PillItem {
        label: string;
        w: number;
      }
      const pillItems: PillItem[] =
        credentialRole === "Terapeuta"
          ? chunkForThisFlyer.map((t) => ({
              label: t,
              w: Math.min(
                maxRowWidth,
                Math.ceil(ctx.measureText(t).width + pillPadX * 2)
              ),
            }))
          : [];

      const pillRows: PillItem[][] = [];
      if (pillItems.length > 0) {
        // Agrupar de a 2 por fila cuando entran cómodamente (igual que max-w-[310px] en la vista previa)
        let currentRow: PillItem[] = [];
        let currentRowW = 0;
        for (const item of pillItems) {
          const nextW =
            currentRow.length === 0
              ? item.w
              : currentRowW + pillGapX + item.w;
          if (
            currentRow.length > 0 &&
            (nextW > maxRowWidth || currentRow.length >= 2)
          ) {
            pillRows.push(currentRow);
            currentRow = [item];
            currentRowW = item.w;
          } else {
            currentRow.push(item);
            currentRowW = nextW;
          }
        }
        if (currentRow.length > 0) {
          pillRows.push(currentRow);
        }
      }

      // Dimensiones del BLOQUE CENTRAL (Foto + Insignias + Nombre + Pastillas de terapias)
      const avatarRadius = isFeed ? 88 : 124;
      const avatarDiameter = avatarRadius * 2;
      const gapAvatarToBadges = isFeed ? 20 : 32;
      const badgeHeight = isFeed ? 54 : 66;
      const gapBadgesToName = isFeed ? 20 : 30;
      const nameFontSize = isFeed ? 45 : 56;
      const nameHeight = nameFontSize;
      const gapNameToPills = pillRows.length > 0 ? (isFeed ? 22 : 34) : 0;
      const totalPillsHeight =
        pillRows.length > 0
          ? pillRows.length * pillHeight + (pillRows.length - 1) * pillGapY
          : 0;

      const centerBlockHeight =
        avatarDiameter +
        gapAvatarToBadges +
        badgeHeight +
        gapBadgesToName +
        nameHeight +
        gapNameToPills +
        totalPillsHeight;

      const availableMiddleSpace = qrCardTopY - headerBottomY;
      let cursorY =
        headerBottomY +
        Math.max(isFeed ? 16 : 36, (availableMiddleSpace - centerBlockHeight) / 2);

      // 5. Dibujar Foto circular con aro dorado (#F3D791) y sombra suave
      const centerX = width / 2;
      const avatarCenterY = cursorY + avatarRadius;

      ctx.save();
      ctx.shadowColor = "rgba(25, 14, 43, 0.28)";
      ctx.shadowBlur = 24;
      ctx.shadowOffsetY = 8;
      ctx.beginPath();
      ctx.arc(centerX, avatarCenterY, avatarRadius + 7, 0, Math.PI * 2);
      ctx.fillStyle = "#F3D791";
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, avatarCenterY, avatarRadius, 0, Math.PI * 2);
      ctx.clip();

      if (userImg) {
        ctx.drawImage(
          userImg,
          centerX - avatarRadius,
          avatarCenterY - avatarRadius,
          avatarDiameter,
          avatarDiameter
        );
      } else {
        ctx.fillStyle = "#F6F3FA";
        ctx.fillRect(
          centerX - avatarRadius,
          avatarCenterY - avatarRadius,
          avatarDiameter,
          avatarDiameter
        );
        ctx.fillStyle = "#836DAD";
        ctx.font = `700 ${isFeed ? 62 : 84}px ${computedFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const initialsText = fullName
          .split(" ")
          .filter(Boolean)
          .map((n) => n[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        ctx.fillText(initialsText, centerX, avatarCenterY);
      }
      ctx.restore();

      cursorY += avatarDiameter + gapAvatarToBadges;

      // 6. Dibujar fila de Insignias: [ 👤✓ TERAPEUTA ] + [ ✓ Identidad verificada ]
      const badgeFontSize = isFeed ? 25 : 30;
      ctx.font = `700 ${badgeFontSize}px ${computedFont}`;
      const roleLabel = credentialRole.toUpperCase();
      const roleIconSpace = isFeed ? 36 : 42;
      const rolePadX = isFeed ? 30 : 36;
      const rolePillW =
        Math.ceil(ctx.measureText(roleLabel).width) +
        rolePadX * 2 +
        roleIconSpace;

      const verifiedLabel = "✓ Identidad verificada";
      const verifiedPadX = isFeed ? 28 : 34;
      const verifiedPillW = isVerified
        ? Math.ceil(ctx.measureText(verifiedLabel).width) + verifiedPadX * 2
        : 0;
      const badgesGap = isVerified ? (isFeed ? 14 : 18) : 0;
      const totalBadgesRowW = rolePillW + badgesGap + verifiedPillW;
      const rolePillX = centerX - totalBadgesRowW / 2;

      // Pastilla de Rol (Terapeuta / Consultante)
      ctx.save();
      ctx.fillStyle =
        credentialRole === "Terapeuta"
          ? "#F3D791"
          : "rgba(255, 255, 255, 0.16)";
      ctx.strokeStyle = "#F3D791";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(
        rolePillX,
        cursorY,
        rolePillW,
        badgeHeight,
        badgeHeight / 2
      );
      ctx.fill();
      if (credentialRole !== "Terapeuta") {
        ctx.stroke();
      }

      // Ícono UserCheck minimalista dentro de la pastilla de rol
      const iconColor =
        credentialRole === "Terapeuta" ? "#2B1F42" : "#F3D791";
      ctx.strokeStyle = iconColor;
      ctx.lineWidth = 2.6;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      const iconCenterX = rolePillX + rolePadX + (isFeed ? 10 : 12);
      const iconCenterY = cursorY + badgeHeight / 2;
      // Cabeza del ícono
      ctx.beginPath();
      ctx.arc(iconCenterX - 3, iconCenterY - 6, isFeed ? 5.5 : 6.5, 0, Math.PI * 2);
      ctx.stroke();
      // Hombros del ícono
      ctx.beginPath();
      ctx.arc(
        iconCenterX - 3,
        iconCenterY + (isFeed ? 9 : 11),
        isFeed ? 9 : 11,
        Math.PI * 1.15,
        Math.PI * 1.85
      );
      ctx.stroke();
      // Tilde (check) del ícono
      ctx.beginPath();
      ctx.moveTo(iconCenterX + 7, iconCenterY - 1);
      ctx.lineTo(iconCenterX + 10.5, iconCenterY + 2.5);
      ctx.lineTo(iconCenterX + 16, iconCenterY - 4);
      ctx.stroke();

      ctx.fillStyle = credentialRole === "Terapeuta" ? "#2B1F42" : "#FFFFFF";
      ctx.font = `700 ${badgeFontSize}px ${computedFont}`;
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(
        roleLabel,
        rolePillX + rolePadX + roleIconSpace,
        cursorY + badgeHeight / 2 + 1
      );
      ctx.restore();

      // Pastilla ✓ Identidad verificada (al lado derecho del rol, igual que en la previsualización)
      if (isVerified) {
        const verPillX = rolePillX + rolePillW + badgesGap;
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.strokeStyle = "rgba(243, 215, 145, 0.72)";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.roundRect(
          verPillX,
          cursorY,
          verifiedPillW,
          badgeHeight,
          badgeHeight / 2
        );
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = "#F3D791";
        ctx.font = `700 ${badgeFontSize}px ${computedFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(
          verifiedLabel,
          verPillX + verifiedPillW / 2,
          cursorY + badgeHeight / 2 + 1
        );
        ctx.restore();
      }

      cursorY += badgeHeight + gapBadgesToName;

      // 7. Dibujar Nombre y Apellido
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `700 ${nameFontSize}px ${computedFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(fullName, centerX, cursorY);
      ctx.restore();

      cursorY += nameHeight + gapNameToPills;

      // 8. Dibujar cada terapia como una Pastilla Redondeada (pill) idéntica a la previsualización
      if (pillRows.length > 0) {
        ctx.save();
        ctx.font = `500 ${pillFontSize}px ${computedFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        for (const row of pillRows) {
          const rowTotalW =
            row.reduce((acc, it) => acc + it.w, 0) +
            pillGapX * Math.max(0, row.length - 1);
          let pillX = centerX - rowTotalW / 2;

          for (const item of row) {
            ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
            ctx.strokeStyle = "rgba(243, 215, 145, 0.55)";
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.roundRect(
              pillX,
              cursorY,
              item.w,
              pillHeight,
              pillHeight / 2
            );
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = "#FFFFFF";
            ctx.fillText(
              item.label,
              pillX + item.w / 2,
              cursorY + pillHeight / 2 + 1
            );
            pillX += item.w + pillGapX;
          }
          cursorY += pillHeight + pillGapY;
        }
        ctx.restore();
      }

      // 9. Dibujar BLOQUE INFERIOR: Tarjeta blanca redondeada del QR con sombra + URL dorada al pie
      if (qrImg) {
        ctx.save();
        ctx.shadowColor = "rgba(25, 14, 43, 0.25)";
        ctx.shadowBlur = 26;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(
          centerX - qrCardSize / 2,
          qrCardTopY,
          qrCardSize,
          qrCardSize,
          isFeed ? 36 : 44
        );
        ctx.fill();
        ctx.restore();

        ctx.drawImage(
          qrImg,
          centerX - qrImgSize / 2,
          qrCardTopY + qrCardPad,
          qrImgSize,
          qrImgSize
        );
      }

      // URL inferior + pequeño ícono de enlace externo igual que en la previsualización
      ctx.save();
      ctx.fillStyle = "#F3D791";
      ctx.font = `600 ${urlFontSize}px ${computedFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      const urlTextW = ctx.measureText(displayShortUrl).width;
      const extIconSize = isFeed ? 20 : 24;
      const extGap = 10;
      const totalUrlRowW = urlTextW + extGap + extIconSize;
      const urlStartX = centerX - totalUrlRowW / 2;

      ctx.textAlign = "left";
      ctx.fillText(displayShortUrl, urlStartX, urlBaselineY);

      // Dibujar ícono ExternalLink al lado del dominio
      const extX = urlStartX + urlTextW + extGap;
      const extY = urlBaselineY - extIconSize + 3;
      ctx.strokeStyle = "#F3D791";
      ctx.lineWidth = 2.4;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(extX + extIconSize * 0.55, extY);
      ctx.lineTo(extX + extIconSize, extY);
      ctx.lineTo(extX + extIconSize, extY + extIconSize * 0.45);
      ctx.moveTo(extX + extIconSize, extY);
      ctx.lineTo(extX + extIconSize * 0.4, extY + extIconSize * 0.6);
      ctx.moveTo(extX + extIconSize * 0.85, extY + extIconSize * 0.58);
      ctx.lineTo(extX + extIconSize * 0.85, extY + extIconSize * 0.92);
      ctx.lineTo(extX, extY + extIconSize * 0.92);
      ctx.lineTo(extX, extY + extIconSize * 0.15);
      ctx.lineTo(extX + extIconSize * 0.42, extY + extIconSize * 0.15);
      ctx.stroke();
      ctx.restore();

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

      {/* PREVISUALIZACIÓN EN VIVO DE LOS FLYERS */}
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
