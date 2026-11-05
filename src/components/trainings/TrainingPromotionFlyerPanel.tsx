"use client";

import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Copy,
  Download,
  ExternalLink,
  QrCode,
  Share2,
  Smartphone,
  Square,
  UserCheck,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  CertificateType,
  getTrainingDisplayUrl,
  getTrainingPromoSlug,
  getTrainingPromoUrl,
} from "@/lib/trainingsData";
import { formatArs } from "@/lib/mercadoPagoSplit";

export type TrainingFlyerFormat = "feed" | "estados";

export interface TrainingPromotionFlyerPanelProps {
  courseId?: string;
  promoSlug?: string;
  title: string;
  discipline: string;
  level: string;
  modality: string;
  startDate: string;
  startTime: string;
  sessionsCount: number;
  durationHoursTotal: number;
  isFree: boolean;
  priceArs: number;
  certificateType: CertificateType;
  therapistName: string;
  therapistNickname: string;
  therapistPhotoUrl?: string;
  therapistBiometricVerified: boolean;
  compact?: boolean;
}

function formatDateReadable(dateStr: string): string {
  if (!dateStr) return "A confirmar";
  const parts = dateStr.split("-");
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  return dateStr;
}

export default function TrainingPromotionFlyerPanel({
  courseId,
  promoSlug,
  title,
  discipline,
  level,
  modality,
  startDate,
  startTime,
  sessionsCount,
  durationHoursTotal,
  isFree,
  priceArs,
  certificateType,
  therapistName,
  therapistNickname,
  therapistPhotoUrl,
  therapistBiometricVerified,
  compact = false,
}: TrainingPromotionFlyerPanelProps) {
  const [format, setFormat] = useState<TrainingFlyerFormat>("feed");
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [qrHighResDataUrl, setQrHighResDataUrl] = useState<string>("");
  const [exportingFlyer, setExportingFlyer] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const effectiveTitle =
    title.trim() || "Capacitación en Academia Reiki Online";
  const effectiveSlug = useMemo(
    () =>
      getTrainingPromoSlug({
        id: courseId,
        title: effectiveTitle,
        promoSlug,
      }),
    [courseId, effectiveTitle, promoSlug]
  );

  const promoUrl = useMemo(
    () =>
      getTrainingPromoUrl({
        id: courseId,
        title: effectiveTitle,
        promoSlug,
      }),
    [courseId, effectiveTitle, promoSlug]
  );

  const displayShortUrl = useMemo(
    () =>
      getTrainingDisplayUrl({
        id: courseId,
        title: effectiveTitle,
        promoSlug,
      }),
    [courseId, effectiveTitle, promoSlug]
  );

  // Generar QR escaneable hacia el link promocional de la capacitación
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(promoUrl, {
      width: 380,
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
      .catch(() => {});

    // QR de 1000x1000 con margen óptimo para que el Terapeuta descargue solo el QR y arme su propio Flyer
    QRCode.toDataURL(promoUrl, {
      width: 1000,
      margin: 2,
      color: {
        dark: "#2B1F42",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "H",
    })
      .then((url) => {
        if (active) setQrHighResDataUrl(url);
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [promoUrl]);

  const readableDate = formatDateReadable(startDate);
  const priceLabel =
    isFree || priceArs <= 0 ? "CAPACITACIÓN GRATUITA" : `Arancel: ${formatArs(priceArs)}`;
  const certLabel =
    certificateType === "aprobacion"
      ? "Certificado digital de aprobación"
      : certificateType === "participacion"
      ? "Certificado digital de participación"
      : null;

  const flyerPills = useMemo(() => {
    const list: string[] = [
      `${discipline || "Reiki"} • Nivel ${level || "Inicial"}`,
      `Inicio: ${readableDate} • ${startTime || "19:00"} hs`,
      `${sessionsCount || 1} ${
        (sessionsCount || 1) === 1 ? "encuentro" : "encuentros"
      } (${durationHoursTotal || 2} hs) • Online en vivo`,
    ];
    if (certLabel) {
      list.push(certLabel);
    }
    return list;
  }, [
    discipline,
    level,
    readableDate,
    startTime,
    sessionsCount,
    durationHoursTotal,
    certLabel,
  ]);

  const initials = useMemo(() => {
    return (therapistName || "TR")
      .split(" ")
      .filter(Boolean)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [therapistName]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(promoUrl);
      setFeedbackMsg(`Link de la capacitación copiado: ${promoUrl}`);
    } catch {
      setFeedbackMsg(promoUrl);
    }
  };

  const handleShareWhatsApp = () => {
    const shareText = `✨ Te invito a mi capacitación online en Reiki Online: «${effectiveTitle}» (${discipline} • Nivel ${level}).\n📅 Inicio: ${readableDate} a las ${startTime} hs.\n🔗 Conocé el temario e inscribite aquí: ${promoUrl}`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Descargar SOLO el código QR en alta resolución (1000x1000 px) para que el Terapeuta arme su propio Flyer
  const handleDownloadStandaloneQr = () => {
    const source = qrHighResDataUrl || qrDataUrl;
    if (!source) return;
    const a = document.createElement("a");
    a.href = source;
    a.download = `qr-capacitacion-${effectiveSlug}.png`;
    a.click();
    setFeedbackMsg(
      "Código QR individual (1000×1000 px) descargado. Ya podés incluirlo en tu propio diseño o Flyer."
    );
  };

  // Descargar Flyer Oficial de Capacitación al estilo de las Credenciales (1080x1080 Feed o 1080x1920 Estados)
  const handleDownloadFlyerPng = async (targetFormat: TrainingFlyerFormat) => {
    setExportingFlyer(true);
    setFeedbackMsg(null);
    try {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        await document.fonts.ready;
      }

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
        loadImg(therapistPhotoUrl || ""),
        loadImg(qrHighResDataUrl || qrDataUrl),
      ]);

      // 1. Fondo Lavanda institucional (#836DAD) y doble marco dorado (#F3D791) idéntico a la Credencial Oficial
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

      // 2. CABECERA: Isologotipo Reiki Online + CAPACITACIÓN OFICIAL
      const padX = isFeed ? 74 : 86;
      const topY = isFeed ? 54 : 92;
      const logoH = isFeed ? 130 : 168;
      const logoW = logoH * 2;

      if (logoImg) {
        ctx.drawImage(logoImg, padX, topY, logoW, logoH);
      }

      ctx.save();
      ctx.fillStyle = "#F3D791";
      const headerFontSize = isFeed ? 34 : 42;
      ctx.font = `800 ${headerFontSize}px ${computedFont}`;
      const rightEdgeX = width - padX;
      const logoMidY = topY + logoH / 2;
      const tracking = isFeed ? 4.5 : 5.5;
      drawTrackedTextRight(
        "CAPACITACIÓN",
        rightEdgeX,
        logoMidY - (isFeed ? 7 : 10),
        tracking
      );
      drawTrackedTextRight(
        "OFICIAL",
        rightEdgeX,
        logoMidY + headerFontSize - 2,
        tracking
      );
      ctx.restore();

      const headerBottomY = topY + logoH;

      // 3. Pre-calcular BLOQUE INFERIOR (QR + Link)
      const qrImgSize = isFeed ? 174 : 264;
      const qrCardPad = isFeed ? 16 : 22;
      const qrCardSize = qrImgSize + qrCardPad * 2;
      const urlFontSize = isFeed ? 24 : 30;
      const urlGapTop = isFeed ? 32 : 46;
      const bottomY = height - (isFeed ? 58 : 102);
      const urlBaselineY = bottomY;
      const qrCardTopY = urlBaselineY - urlGapTop - qrCardSize;

      // 4. Envuelva de líneas para el Título de la Capacitación (máx 2 líneas)
      const centerX = width / 2;
      const maxContentW = width - padX * 2 - 20;
      const titleFontSize = isFeed ? 38 : 48;
      ctx.font = `800 ${titleFontSize}px ${computedFont}`;

      const words = effectiveTitle.split(/\s+/);
      const titleLines: string[] = [];
      let currentLine = "";
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (ctx.measureText(testLine).width > maxContentW && currentLine) {
          titleLines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) titleLines.push(currentLine);
      const clampedTitleLines = titleLines.slice(0, 2);

      // 5. Pre-calcular filas de pastillas (pills)
      const pillFontSize = isFeed ? 22 : 28;
      const pillHeight = isFeed ? 44 : 56;
      const pillPadX = isFeed ? 24 : 32;
      const pillGapX = isFeed ? 12 : 16;
      const pillGapY = isFeed ? 11 : 16;

      ctx.font = `600 ${pillFontSize}px ${computedFont}`;
      const pillItems = flyerPills.map((label) => ({
        label,
        w: Math.min(
          maxContentW,
          Math.ceil(ctx.measureText(label).width + pillPadX * 2)
        ),
      }));

      const pillRows: { label: string; w: number }[][] = [];
      let currRow: { label: string; w: number }[] = [];
      let currRowW = 0;
      for (const item of pillItems) {
        const nextW =
          currRow.length === 0 ? item.w : currRowW + pillGapX + item.w;
        if (
          currRow.length > 0 &&
          (nextW > maxContentW || currRow.length >= 2)
        ) {
          pillRows.push(currRow);
          currRow = [item];
          currRowW = item.w;
        } else {
          currRow.push(item);
          currRowW = nextW;
        }
      }
      if (currRow.length > 0) pillRows.push(currRow);

      // Dimensiones del bloque central
      const avatarRadius = isFeed ? 68 : 104;
      const avatarDiameter = avatarRadius * 2;
      const gapAvatarToBadges = isFeed ? 14 : 24;
      const badgeHeight = isFeed ? 44 : 56;
      const gapBadgesToTherapist = isFeed ? 12 : 20;
      const therapistFontSize = isFeed ? 26 : 34;
      const gapTherapistToTitle = isFeed ? 14 : 24;
      const titleLineHeight = isFeed ? 44 : 56;
      const totalTitleH = clampedTitleLines.length * titleLineHeight;
      const gapTitleToPills = isFeed ? 16 : 26;
      const totalPillsH =
        pillRows.length * pillHeight +
        Math.max(0, pillRows.length - 1) * pillGapY;
      const gapPillsToPrice = isFeed ? 14 : 22;
      const priceBadgeH = isFeed ? 48 : 60;

      const centerBlockHeight =
        avatarDiameter +
        gapAvatarToBadges +
        badgeHeight +
        gapBadgesToTherapist +
        therapistFontSize +
        gapTherapistToTitle +
        totalTitleH +
        gapTitleToPills +
        totalPillsH +
        gapPillsToPrice +
        priceBadgeH;

      const availableMiddleSpace = qrCardTopY - headerBottomY;
      let cursorY =
        headerBottomY +
        Math.max(10, (availableMiddleSpace - centerBlockHeight) / 2);

      // 6. Dibujar Foto circular del Terapeuta con aro dorado (#F3D791)
      const avatarCenterY = cursorY + avatarRadius;
      ctx.save();
      ctx.shadowColor = "rgba(25, 14, 43, 0.28)";
      ctx.shadowBlur = 22;
      ctx.shadowOffsetY = 6;
      ctx.beginPath();
      ctx.arc(centerX, avatarCenterY, avatarRadius + 6, 0, Math.PI * 2);
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
        ctx.font = `700 ${isFeed ? 48 : 72}px ${computedFont}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(initials, centerX, avatarCenterY);
      }
      ctx.restore();

      cursorY += avatarDiameter + gapAvatarToBadges;

      // 7. Insignias: [ TERAPEUTA ] + [ ✓ Identidad verificada ]
      const badgeFontSize = isFeed ? 21 : 26;
      ctx.font = `700 ${badgeFontSize}px ${computedFont}`;
      const roleLabel = "TERAPEUTA";
      const rolePadX = isFeed ? 24 : 30;
      const rolePillW = Math.ceil(ctx.measureText(roleLabel).width) + rolePadX * 2;
      const verifiedLabel = "✓ Identidad verificada";
      const verPadX = isFeed ? 22 : 28;
      const verPillW = therapistBiometricVerified
        ? Math.ceil(ctx.measureText(verifiedLabel).width) + verPadX * 2
        : 0;
      const badgesGap = therapistBiometricVerified ? (isFeed ? 12 : 16) : 0;
      const totalBadgesW = rolePillW + badgesGap + verPillW;
      const rolePillX = centerX - totalBadgesW / 2;

      ctx.save();
      ctx.fillStyle = "#F3D791";
      ctx.beginPath();
      ctx.roundRect(rolePillX, cursorY, rolePillW, badgeHeight, badgeHeight / 2);
      ctx.fill();
      ctx.fillStyle = "#2B1F42";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(roleLabel, rolePillX + rolePillW / 2, cursorY + badgeHeight / 2 + 1);
      ctx.restore();

      if (therapistBiometricVerified) {
        const verX = rolePillX + rolePillW + badgesGap;
        ctx.save();
        ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
        ctx.strokeStyle = "rgba(243, 215, 145, 0.75)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.roundRect(verX, cursorY, verPillW, badgeHeight, badgeHeight / 2);
        ctx.fill();
        ctx.stroke();
        ctx.fillStyle = "#F3D791";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(verifiedLabel, verX + verPillW / 2, cursorY + badgeHeight / 2 + 1);
        ctx.restore();
      }

      cursorY += badgeHeight + gapBadgesToTherapist;

      // 8. Nombre del Terapeuta
      ctx.save();
      ctx.fillStyle = "#F3D791";
      ctx.font = `700 ${therapistFontSize}px ${computedFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText(
        `Dicta: ${therapistName} (@${therapistNickname})`,
        centerX,
        cursorY
      );
      ctx.restore();

      cursorY += therapistFontSize + gapTherapistToTitle;

      // 9. Título de la Capacitación
      ctx.save();
      ctx.fillStyle = "#FFFFFF";
      ctx.font = `800 ${titleFontSize}px ${computedFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      for (const line of clampedTitleLines) {
        ctx.fillText(line, centerX, cursorY);
        cursorY += titleLineHeight;
      }
      ctx.restore();

      cursorY += gapTitleToPills;

      // 10. Pastillas de información de la capacitación
      ctx.save();
      ctx.font = `600 ${pillFontSize}px ${computedFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      for (const row of pillRows) {
        const rowW =
          row.reduce((acc, it) => acc + it.w, 0) +
          pillGapX * Math.max(0, row.length - 1);
        let pillX = centerX - rowW / 2;
        for (const item of row) {
          ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
          ctx.strokeStyle = "rgba(243, 215, 145, 0.55)";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.roundRect(pillX, cursorY, item.w, pillHeight, pillHeight / 2);
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

      cursorY += gapPillsToPrice - pillGapY;

      // 11. Insignia dorada destacada de Arancel / Gratuita
      ctx.save();
      const priceFontSize = isFeed ? 24 : 30;
      ctx.font = `800 ${priceFontSize}px ${computedFont}`;
      const pricePillW =
        Math.ceil(ctx.measureText(priceLabel).width) + (isFeed ? 56 : 72);
      const pricePillX = centerX - pricePillW / 2;
      ctx.fillStyle = "#F3D791";
      ctx.beginPath();
      ctx.roundRect(
        pricePillX,
        cursorY,
        pricePillW,
        priceBadgeH,
        priceBadgeH / 2
      );
      ctx.fill();
      ctx.fillStyle = "#2B1F42";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(priceLabel, centerX, cursorY + priceBadgeH / 2 + 1);
      ctx.restore();

      // 12. BLOQUE INFERIOR: Tarjeta blanca del QR + URL limpia en sans-serif
      if (qrImg) {
        ctx.save();
        ctx.shadowColor = "rgba(25, 14, 43, 0.25)";
        ctx.shadowBlur = 24;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = "#FFFFFF";
        ctx.beginPath();
        ctx.roundRect(
          centerX - qrCardSize / 2,
          qrCardTopY,
          qrCardSize,
          qrCardSize,
          isFeed ? 32 : 42
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

      ctx.save();
      ctx.fillStyle = "#F3D791";
      ctx.font = `600 ${urlFontSize}px ${computedFont}`;
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(displayShortUrl, centerX, urlBaselineY);
      ctx.restore();

      const pngUrl = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = pngUrl;
      a.download = `flyer-capacitacion-${effectiveSlug}-${targetFormat}.png`;
      a.click();
      setFeedbackMsg(
        `Flyer de capacitación descargado en Tamaño ${
          targetFormat === "feed" ? "Feed (1:1)" : "Estados (9:16)"
        }.`
      );
    } finally {
      setExportingFlyer(false);
    }
  };

  return (
    <div className="rounded-3xl border-2 border-[#836DAD]/35 bg-[#F6F3FA] p-4 sm:p-5 space-y-4 shadow-xs">
      {/* Cabecera del Kit de Promoción */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#836DAD] text-[#F3D791] shadow-2xs">
            <QrCode className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h5 className="text-sm sm:text-base font-extrabold text-[#2B1F42]">
                Kit de Promoción: Link, Código QR y Flyer Oficial
              </h5>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#836DAD] px-2.5 py-0.5 text-[10px] font-bold text-[#F3D791]">
                <Sparkles className="h-3 w-3" />
                Estilo Credencial Reiki Online
              </span>
            </div>
            <p className="text-xs text-[#2B1F42]/75">
              Compartí el enlace directo de inscripción, descargá el Flyer listo para redes o bajá solo el código QR para armar tu propio diseño.
            </p>
          </div>
        </div>
      </div>

      {/* Feedback de descarga o copiado */}
      {feedbackMsg && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-900"
        >
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-700" />
            {feedbackMsg}
          </span>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="cursor-pointer text-[11px] underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* 1. LINK DIRECTO DE PROMOCIÓN E INSCRIPCIÓN + DESCARGA DE SOLO EL QR */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
        {/* Link directo */}
        <div className="lg:col-span-7 rounded-2xl border border-[#836DAD]/25 bg-white p-4 space-y-2.5 flex flex-col justify-between">
          <div className="space-y-1">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#836DAD]">
              1. Link directo para promocionar la Capacitación
            </span>
            <p className="text-xs text-[#2B1F42]/75">
              Cualquier persona que ingrese a este enlace o escanee el QR verá la ficha oficial de tu capacitación para inscribirse.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3.5 py-2.5">
            <span className="text-xs sm:text-sm font-bold text-[#2B1F42] break-all">
              {promoUrl}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#6D5898] transition"
            >
              <Copy className="h-3.5 w-3.5 text-[#F3D791]" />
              <span>Copiar Link</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#F3D791] px-3.5 py-2 text-xs font-extrabold text-[#2B1F42] shadow-2xs hover:bg-[#e7c878] transition"
            >
              <Share2 className="h-3.5 w-3.5 text-[#836DAD]" />
              <span>Compartir por WhatsApp</span>
            </button>

            <a
              href={`/capacitaciones/${effectiveSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#836DAD]/35 bg-white px-3.5 py-2 text-xs font-bold text-[#836DAD] hover:bg-[#F6F3FA] transition"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Abrir página</span>
            </a>
          </div>
        </div>

        {/* Bloque para descargar SOLO el Código QR para armar su propio Flyer */}
        <div className="lg:col-span-5 rounded-2xl border border-[#836DAD]/25 bg-white p-4 flex items-center justify-between gap-4">
          <div className="space-y-2 flex-1">
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#836DAD]">
              2. Solo Código QR (para tu propio Flyer)
            </span>
            <p className="text-xs text-[#2B1F42]/75 leading-relaxed">
              Si preferís diseñar tu propio Flyer, descargá únicamente el Código QR en alta resolución (<code className="font-bold">1000×1000 px</code>).
            </p>
            <button
              type="button"
              onClick={handleDownloadStandaloneQr}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border-2 border-[#836DAD] bg-[#FAF8FC] px-3.5 py-2 text-xs font-extrabold text-[#836DAD] hover:bg-[#836DAD] hover:text-white transition"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Descargar solo el QR (PNG)</span>
            </button>
          </div>

          <div className="shrink-0 flex flex-col items-center gap-1">
            <div className="rounded-2xl border-2 border-[#836DAD]/30 bg-white p-2 shadow-xs">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR de ${effectiveTitle}`}
                  className="h-24 w-24 sm:h-28 sm:w-28 object-contain"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center text-[11px] text-[#836DAD]">
                  Generando QR...
                </div>
              )}
            </div>
            <span className="text-[10px] font-bold text-[#5E4B8B]">
              Escaneable
            </span>
          </div>
        </div>
      </div>

      {/* 2. FLYER OFICIAL DE LA CAPACITACIÓN AL ESTILO CREDENCIAL */}
      <div className="rounded-2xl border border-[#836DAD]/25 bg-white p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="block text-[11px] font-extrabold uppercase tracking-wider text-[#836DAD]">
              3. Flyer Oficial de Capacitación (Estilo Credencial Reiki Online)
            </span>
            <p className="text-xs text-[#2B1F42]/75">
              Elegí entre Tamaño Feed (1:1) o Tamaño Estados / Historias (9:16) y descargalo listo para publicar.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-1">
              <button
                type="button"
                onClick={() => setFormat("feed")}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  format === "feed"
                    ? "bg-[#836DAD] text-white shadow-2xs"
                    : "text-[#2B1F42] hover:bg-white/70"
                }`}
              >
                <Square className="h-3.5 w-3.5" />
                <span>Tamaño Feed (1:1)</span>
              </button>
              <button
                type="button"
                onClick={() => setFormat("estados")}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  format === "estados"
                    ? "bg-[#836DAD] text-white shadow-2xs"
                    : "text-[#2B1F42] hover:bg-white/70"
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                <span>Tamaño Estados (9:16)</span>
              </button>
            </div>

            <button
              type="button"
              disabled={exportingFlyer}
              onClick={() => handleDownloadFlyerPng(format)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#6D5898] disabled:opacity-50 transition"
            >
              <Download className="h-4 w-4 text-[#F3D791]" />
              <span>
                {exportingFlyer
                  ? "Generando Flyer..."
                  : `Descargar Flyer (${
                      format === "feed" ? "Feed 1:1" : "Estados 9:16"
                    })`}
              </span>
            </button>
          </div>
        </div>

        {/* VISTA PREVIA EN VIVO DEL FLYER DE CAPACITACIÓN (IDÉNTICO A LA CREDENCIAL OFICIAL) */}
        <div className="flex justify-center">
          <div
            className={`relative w-full overflow-hidden rounded-[2rem] border-2 border-[#F3D791] bg-[#836DAD] text-white shadow-xl transition-all ${
              format === "feed"
                ? compact
                  ? "max-w-[430px] aspect-square p-5 sm:p-6"
                  : "max-w-[460px] aspect-square p-6 sm:p-7"
                : "max-w-[360px] aspect-[9/16] p-6 sm:p-7"
            }`}
          >
            {/* Marco interno dorado sutil igual a Mi Credencial */}
            <div className="pointer-events-none absolute inset-3 rounded-[1.5rem] border border-[#F3D791]/45" />

            <div className="relative z-10 flex h-full flex-col justify-between text-center">
              {/* Cabecera: Isologotipo Reiki Online a la izquierda + CAPACITACIÓN OFICIAL a la derecha */}
              <div className="flex items-center justify-between gap-2 pt-1 px-1">
                <img
                  src="/brand/Reiki_Online_Lavanda_Unificado.png"
                  alt="Reiki Online"
                  className={`${
                    format === "feed" ? "h-12 sm:h-14" : "h-13 sm:h-15"
                  } w-auto object-contain`}
                />
                <div className="text-right leading-tight">
                  <span className="block text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-[#F3D791]">
                    CAPACITACIÓN
                  </span>
                  <span className="block text-[11px] sm:text-xs font-extrabold uppercase tracking-[0.18em] text-[#F3D791]">
                    OFICIAL
                  </span>
                </div>
              </div>

              {/* Bloque central: Foto del Terapeuta + Insignias + Título + Pastillas + Valor */}
              <div className="my-auto flex flex-col items-center space-y-2 py-1">
                {/* Foto circular del Terapeuta con aro dorado */}
                <div
                  className={`overflow-hidden rounded-full border-[3px] border-[#F3D791] bg-[#F6F3FA] shadow-md ${
                    format === "feed"
                      ? "h-16 w-16 sm:h-18 sm:w-18"
                      : "h-20 w-20 sm:h-24 sm:w-24"
                  }`}
                >
                  {therapistPhotoUrl ? (
                    <img
                      src={therapistPhotoUrl}
                      alt={therapistName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-lg font-extrabold text-[#836DAD]">
                      {initials}
                    </div>
                  )}
                </div>

                {/* Insignias estilo Credencial: [ TERAPEUTA ] + [ ✓ Identidad verificada ] */}
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F3D791] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#2B1F42]">
                    <UserCheck className="h-3 w-3" />
                    TERAPEUTA
                  </span>
                  {therapistBiometricVerified && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#F3D791]/70 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-[#F3D791]">
                      ✓ Identidad verificada
                    </span>
                  )}
                </div>

                {/* Terapeuta que dicta */}
                <p className="text-[11px] sm:text-xs font-bold text-[#F3D791]">
                  Dicta: {therapistName} (@{therapistNickname})
                </p>

                {/* Título de la Capacitación */}
                <h4
                  className={`font-extrabold text-white leading-snug px-2 line-clamp-2 ${
                    format === "feed"
                      ? "text-sm sm:text-base"
                      : "text-base sm:text-lg"
                  }`}
                >
                  {effectiveTitle}
                </h4>

                {/* Pastillas redondeadas de información del curso */}
                <div className="flex flex-wrap items-center justify-center gap-1.5 px-1">
                  {flyerPills.map((pill) => (
                    <span
                      key={pill}
                      className="rounded-full border border-[#F3D791]/55 bg-white/15 px-2.5 py-0.5 text-[10px] sm:text-[11px] font-medium text-white"
                    >
                      {pill}
                    </span>
                  ))}
                </div>

                {/* Insignia destacada de Arancel / Gratuita */}
                <div className="pt-0.5">
                  <span className="inline-block rounded-full bg-[#F3D791] px-3.5 py-1 text-[11px] sm:text-xs font-extrabold text-[#2B1F42] shadow-2xs">
                    {priceLabel}
                  </span>
                </div>
              </div>

              {/* Bloque inferior: QR escaneable + URL limpia en sans-serif */}
              <div className="flex flex-col items-center space-y-1.5 pb-0.5">
                <div className="rounded-2xl bg-white p-2 shadow-lg">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Código QR de la Capacitación"
                      className={`${
                        format === "feed"
                          ? "h-20 w-20 sm:h-22 sm:w-22"
                          : "h-28 w-28 sm:h-32 sm:w-32"
                      } object-contain`}
                    />
                  ) : (
                    <div className="h-20 w-20 bg-white" />
                  )}
                </div>

                <a
                  href={`/capacitaciones/${effectiveSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-[#F3D791] hover:underline"
                >
                  <span className="truncate max-w-[310px]">
                    {displayShortUrl}
                  </span>
                  <ExternalLink className="h-3 w-3 shrink-0" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
