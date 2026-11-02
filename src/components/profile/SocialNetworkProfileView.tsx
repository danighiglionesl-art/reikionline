"use client";

import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import {
  Star,
  CheckCircle2,
  MapPin,
  Sparkles,
  Share2,
  Copy,
  Check,
  ShieldCheck,
  CalendarCheck,
  MessageSquareHeart,
  ExternalLink,
  UserPlus,
  UserCheck,
  Users,
  HeartHandshake,
  QrCode,
} from "lucide-react";
import {
  DEMO_SOCIAL_PROFILES,
  getFollowersForNickname,
  getFollowingForNickname,
  isFollowingProfile,
  loadConsultations,
  loadSocialFollows,
  loadSocialReviews,
  PROFILES_STORAGE_KEY,
  PublicSocialProfile,
  ReikiConsultationRecord,
  resolvePublicProfileByNickname,
  saveConsultations,
  saveSocialReviews,
  SocialFollowRecord,
  SYNC_EVENT_NAME,
  TherapistReview,
  toggleSocialFollow,
} from "@/lib/socialNetwork";
import { ReikiUserProfile, sanitizeNickname } from "@/lib/geoData";

interface SocialNetworkProfileViewProps {
  nickname: string;
  overrideProfile?: Partial<PublicSocialProfile>;
  currentUserEmail?: string;
  currentUserName?: string;
  currentUserNickname?: string;
  currentUserPhotoUrl?: string;
  compact?: boolean;
}

export default function SocialNetworkProfileView({
  nickname,
  overrideProfile,
  currentUserEmail = "danighiglione@gmail.com",
  currentUserName = "Consultante Verificado",
  currentUserNickname,
  currentUserPhotoUrl,
  compact = false,
}: SocialNetworkProfileViewProps) {
  const [resolvedProfile, setResolvedProfile] =
    useState<PublicSocialProfile | null>(null);
  const [reviews, setReviews] = useState<TherapistReview[]>([]);
  const [consultations, setConsultations] = useState<ReikiConsultationRecord[]>(
    []
  );
  const [followsList, setFollowsList] = useState<SocialFollowRecord[]>([]);
  const [socialTab, setSocialTab] = useState<
    "seguidores" | "siguiendo" | "explorar"
  >("seguidores");
  const [detectedViewer, setDetectedViewer] = useState<{
    nickname: string;
    name: string;
    role: "Consultante" | "Terapeuta";
    fotoUrl?: string;
  }>({
    nickname: currentUserNickname || "danielghiglione",
    name: currentUserName || "Daniel Alejandro Ghiglione",
    role: "Terapeuta",
    fotoUrl: currentUserPhotoUrl || "",
  });
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");

  // Estado del formulario de calificación (1 a 5 estrellas) y reseña (hasta 150 caracteres)
  const [selectedRating, setSelectedRating] = useState<1 | 2 | 3 | 4 | 5>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [selectedConsultationId, setSelectedConsultationId] =
    useState<string>("");
  const [reviewerNameInput, setReviewerNameInput] = useState(currentUserName);
  const [feedbackMsg, setFeedbackMsg] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  const cleanNick = nickname.trim().toLowerCase();
  const fullPublicUrl = `https://www.reikionline.com.ar/${
    overrideProfile?.nickname || resolvedProfile?.nickname || nickname
  }`;

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(fullPublicUrl, {
      width: 240,
      margin: 1,
      color: {
        dark: "#2B1F42",
        light: "#FFFFFF",
      },
    })
      .then((dataUrl) => {
        if (active) setQrDataUrl(dataUrl);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [fullPublicUrl]);

  const syncData = () => {
    const prof = resolvePublicProfileByNickname(cleanNick);
    setResolvedProfile(prof);
    const loadedReviews = loadSocialReviews();
    setReviews(loadedReviews);
    const loadedCons = loadConsultations();
    setConsultations(loadedCons);
    const loadedFollows = loadSocialFollows();
    setFollowsList(loadedFollows);

    if (typeof window !== "undefined") {
      try {
        const rawSession = window.localStorage.getItem(
          "reiki_online_session_v1"
        );
        const rawProfiles = window.localStorage.getItem(PROFILES_STORAGE_KEY);
        const rawRole = window.localStorage.getItem(
          "reiki_online_selected_role_v1"
        );
        if (rawSession && rawProfiles) {
          const ses = JSON.parse(rawSession) as { email?: string; name?: string };
          const profMap = JSON.parse(rawProfiles) as Record<
            string,
            ReikiUserProfile
          >;
          const key = (ses.email || "").toLowerCase();
          const matched = profMap[key];
          if (matched) {
            const vNick =
              sanitizeNickname(
                matched.nickname ||
                  matched.username ||
                  `${matched.nombre}${matched.apellido}`
              ).toLowerCase() || "danielghiglione";
            setDetectedViewer({
              nickname: currentUserNickname || vNick,
              name:
                currentUserName ||
                `${matched.nombre} ${matched.apellido}`.trim() ||
                vNick,
              role:
                rawRole === "Consultante"
                  ? "Consultante"
                  : matched.role === "consultante"
                  ? "Consultante"
                  : "Terapeuta",
              fotoUrl: currentUserPhotoUrl || matched.fotoUrl || "",
            });
          }
        }
      } catch {
        // Ignore
      }
    }
  };

  useEffect(() => {
    syncData();
    if (typeof window === "undefined") return;
    const handler = () => syncData();
    window.addEventListener(SYNC_EVENT_NAME, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handler);
      window.removeEventListener("storage", handler);
    };
  }, [cleanNick]);

  useEffect(() => {
    if (currentUserName) {
      setReviewerNameInput(currentUserName);
    }
  }, [currentUserName]);

  const profileData: PublicSocialProfile = useMemo(() => {
    const base: PublicSocialProfile = resolvedProfile || {
      nickname: nickname || "usuario",
      displayName: overrideProfile?.displayName || nickname || "Usuario Reiki",
      role: "Terapeuta",
      fotoUrl: "",
      localidad: "Alcira Gigena",
      provincia: "Córdoba",
      pais: "Argentina",
      therapies: ["Reiki Usui", "Alineación de chakras"],
      bio: `Red Social en Reiki Online (${fullPublicUrl})`,
      whatsappVerified: true,
    };
    return {
      ...base,
      ...overrideProfile,
      nickname: overrideProfile?.nickname || base.nickname,
      displayName: overrideProfile?.displayName || base.displayName,
      fotoUrl:
        overrideProfile?.fotoUrl !== undefined
          ? overrideProfile.fotoUrl
          : base.fotoUrl,
      therapies:
        overrideProfile?.therapies && overrideProfile.therapies.length > 0
          ? overrideProfile.therapies
          : base.therapies,
    };
  }, [resolvedProfile, overrideProfile, nickname, fullPublicUrl]);

  // Reseñas de este terapeuta
  const profileReviews = useMemo(() => {
    return reviews.filter(
      (r) => r.therapistNickname.toLowerCase() === cleanNick
    );
  }, [reviews, cleanNick]);

  // Promedio de estrellas (1 a 5)
  const averageRating = useMemo(() => {
    if (profileReviews.length === 0) return 5.0;
    const sum = profileReviews.reduce((acc, item) => acc + item.rating, 0);
    return Math.round((sum / profileReviews.length) * 10) / 10;
  }, [profileReviews]);

  // Consultas efectuadas con este terapeuta (habilitan dejar 1 a 5 estrellas y reseña de hasta 150 caracteres)
  const completedConsultationsForTherapist = useMemo(() => {
    return consultations.filter(
      (c) =>
        c.therapistNickname.toLowerCase() === cleanNick &&
        c.status === "efectuada"
    );
  }, [consultations, cleanNick]);

  const unreviewedCompletedConsultations = useMemo(() => {
    return completedConsultationsForTherapist.filter((c) => !c.reviewed);
  }, [completedConsultationsForTherapist]);

  useEffect(() => {
    if (
      unreviewedCompletedConsultations.length > 0 &&
      !unreviewedCompletedConsultations.some(
        (c) => c.id === selectedConsultationId
      )
    ) {
      setSelectedConsultationId(unreviewedCompletedConsultations[0].id);
    } else if (unreviewedCompletedConsultations.length === 0) {
      setSelectedConsultationId("");
    }
  }, [unreviewedCompletedConsultations, selectedConsultationId]);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(fullPublicUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    } catch {
      // Ignore
    }
  };

  // Permite registrar una consulta efectuada de prueba o confirmar una consulta pendiente para habilitar la reseña
  const handleMarkConsultationCompleted = () => {
    const newCons: ReikiConsultationRecord = {
      id: `cons-ef-${Date.now()}`,
      therapistNickname: cleanNick,
      therapistName: profileData.displayName,
      consultanteEmail: currentUserEmail || "consultante@reikionline.com.ar",
      consultanteName: reviewerNameInput.trim() || currentUserName || "Consultante",
      consultanteNickname: currentUserNickname,
      therapyName: profileData.therapies[0] || "Reiki Usui",
      modality: "Online con turno",
      scheduledAt: new Date().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
      status: "efectuada",
      reviewed: false,
    };
    const nextList = [newCons, ...consultations];
    setConsultations(nextList);
    saveConsultations(nextList);
    setSelectedConsultationId(newCons.id);
    setFeedbackMsg({
      type: "ok",
      text: "Consulta efectuada verificada. Ya podés calificar de 1 a 5 estrellas y dejar tu reseña de hasta 150 caracteres.",
    });
  };

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedbackMsg(null);

    if (unreviewedCompletedConsultations.length === 0) {
      setFeedbackMsg({
        type: "err",
        text: "Solo podés calificar y dejar una reseña luego de haber efectuado una consulta con el terapeuta.",
      });
      return;
    }

    const trimmedComment = reviewComment.trim();
    if (!trimmedComment) {
      setFeedbackMsg({
        type: "err",
        text: "Por favor escribí una breve reseña sobre el terapeuta (máximo 150 caracteres).",
      });
      return;
    }

    if (trimmedComment.length > 150) {
      setFeedbackMsg({
        type: "err",
        text: "La reseña no puede superar los 150 caracteres.",
      });
      return;
    }

    const targetCons =
      unreviewedCompletedConsultations.find(
        (c) => c.id === selectedConsultationId
      ) || unreviewedCompletedConsultations[0];

    const newReview: TherapistReview = {
      id: `rev-${Date.now()}`,
      therapistNickname: cleanNick,
      authorEmail: currentUserEmail,
      authorName: reviewerNameInput.trim() || currentUserName || "Consultante",
      authorNickname: currentUserNickname,
      authorPhotoUrl: currentUserPhotoUrl,
      rating: selectedRating,
      comment: trimmedComment.slice(0, 150),
      therapyName: targetCons.therapyName,
      consultationId: targetCons.id,
      createdAt: new Date().toISOString(),
    };

    const nextReviews = [newReview, ...reviews];
    setReviews(nextReviews);
    saveSocialReviews(nextReviews);

    const nextConsultations = consultations.map((c) =>
      c.id === targetCons.id
        ? { ...c, reviewed: true, ratingGiven: selectedRating }
        : c
    );
    setConsultations(nextConsultations);
    saveConsultations(nextConsultations);

    setReviewComment("");
    setSelectedRating(5);
    setFeedbackMsg({
      type: "ok",
      text: `¡Gracias! Tu calificación de ${selectedRating} ${
        selectedRating === 1 ? "estrella" : "estrellas"
      } y reseña fueron publicadas en la Red Social de ${profileData.displayName}.`,
    });
  };

  const initials = useMemo(() => {
    const parts = profileData.displayName.trim().split(/\s+/);
    const first = parts[0]?.[0] || "R";
    const second = parts[1]?.[0] || "";
    return (first + second).toUpperCase();
  }, [profileData.displayName]);

  const effectiveViewerNick = useMemo(() => {
    const candidate = sanitizeNickname(
      currentUserNickname || detectedViewer.nickname || "danielghiglione"
    ).toLowerCase();
    // Si está viendo el perfil público de danielghiglione sin sesión distinta, permite simular como sofiavillalba para probar el botón Seguir en su propio perfil si quiere
    if (candidate === cleanNick && !compact) {
      return "sofiavillalba";
    }
    return candidate || "danielghiglione";
  }, [currentUserNickname, detectedViewer.nickname, cleanNick, compact]);

  const effectiveViewerName = useMemo(() => {
    if (effectiveViewerNick === "sofiavillalba") return "Sofía Villalba";
    return currentUserName || detectedViewer.name || effectiveViewerNick;
  }, [effectiveViewerNick, currentUserName, detectedViewer.name]);

  const effectiveViewerRole: "Consultante" | "Terapeuta" = useMemo(() => {
    if (effectiveViewerNick === "sofiavillalba") return "Consultante";
    return detectedViewer.role;
  }, [effectiveViewerNick, detectedViewer.role]);

  const profileFollowers = useMemo(
    () => getFollowersForNickname(cleanNick, followsList),
    [cleanNick, followsList]
  );

  const profileFollowing = useMemo(
    () => getFollowingForNickname(cleanNick, followsList),
    [cleanNick, followsList]
  );

  const viewerIsFollowingThisProfile = useMemo(
    () => isFollowingProfile(effectiveViewerNick, cleanNick, followsList),
    [effectiveViewerNick, cleanNick, followsList]
  );

  const suggestedProfiles = useMemo(() => {
    return Object.values(DEMO_SOCIAL_PROFILES).filter(
      (p) => p.nickname.toLowerCase() !== cleanNick
    );
  }, [cleanNick]);

  const handleToggleFollowCurrentProfile = () => {
    const res = toggleSocialFollow({
      followerNickname: effectiveViewerNick,
      followerName: effectiveViewerName,
      followerRole: effectiveViewerRole,
      followerFotoUrl: currentUserPhotoUrl || detectedViewer.fotoUrl || "",
      targetNickname: cleanNick,
      targetName: profileData.displayName,
      targetRole: profileData.role,
      targetFotoUrl: profileData.fotoUrl || "",
    });
    setFollowsList(res.list);
  };

  const handleToggleFollowOther = (target: {
    nickname: string;
    name: string;
    role: "Consultante" | "Terapeuta";
    fotoUrl?: string;
  }) => {
    const actorNick = compact ? cleanNick : effectiveViewerNick;
    const actorName = compact ? profileData.displayName : effectiveViewerName;
    const actorRole = compact ? profileData.role : effectiveViewerRole;
    const actorFoto = compact
      ? profileData.fotoUrl
      : currentUserPhotoUrl || detectedViewer.fotoUrl || "";

    const res = toggleSocialFollow({
      followerNickname: actorNick,
      followerName: actorName,
      followerRole: actorRole,
      followerFotoUrl: actorFoto,
      targetNickname: target.nickname,
      targetName: target.name,
      targetRole: target.role,
      targetFotoUrl: target.fotoUrl || "",
    });
    setFollowsList(res.list);
  };

  return (
    <div className="rounded-3xl border border-[#836DAD]/25 bg-white shadow-md overflow-hidden">
      {/* Portada superior de la Red Social con colores e Isologotipo del Manual de Marca */}
      <div className="bg-[#836DAD] px-5 py-6 text-white">
        <div className="mb-4 flex items-center justify-between border-b border-white/15 pb-3">
          <img
            src="/brand/Reiki_Online_Lavanda_Unificado.png"
            alt="Reiki online — CONECTANDO BIENESTAR"
            className="h-12 sm:h-14 w-auto object-contain"
          />
          <span className="text-[11px] font-bold tracking-widest uppercase text-[#F3D791]">
            Credencial Oficial
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Avatar del usuario/terapeuta */}
            <div className="relative h-20 w-20 shrink-0 rounded-full border-3 border-[#F3D791] bg-[#F6F3FA] overflow-hidden shadow-lg flex items-center justify-center">
              {profileData.fotoUrl ? (
                <img
                  src={profileData.fotoUrl}
                  alt={profileData.displayName}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-[#836DAD]">
                  {initials}
                </span>
              )}
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3D791] px-2.5 py-0.5 text-[11px] font-bold text-[#2E2344]">
                  <Sparkles className="h-3 w-3" />
                  Red Social • {profileData.role}
                </span>
                {(profileData.identityVerified ?? profileData.whatsappVerified) && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[#F3D791]/60 bg-white/15 px-2.5 py-0.5 text-[11px] font-bold text-[#F3D791]">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#F3D791]" />
                    ✓ Identidad verificada
                  </span>
                )}
              </div>

              <h3 className="text-xl sm:text-2xl font-bold text-white">
                {profileData.displayName}
              </h3>

              <div className="flex flex-wrap items-center gap-3 text-xs text-white/90">
                <span className="font-mono font-semibold text-[#F3D791]">
                  @{profileData.nickname}
                </span>
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 text-[#F3D791]" />
                  {profileData.localidad}, {profileData.provincia},{" "}
                  {profileData.pais}
                </span>
              </div>

              {/* Contadores interactivos de Seguidores y Siguiendo + Botón Seguir */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSocialTab("seguidores")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/25"
                >
                  <Users className="h-3.5 w-3.5 text-[#F3D791]" />
                  <span>
                    <strong className="text-[#F3D791]">
                      {profileFollowers.length}
                    </strong>{" "}
                    {profileFollowers.length === 1 ? "seguidor" : "seguidores"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSocialTab("siguiendo")}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-3 py-1 text-xs font-semibold text-white transition hover:bg-white/25"
                >
                  <UserCheck className="h-3.5 w-3.5 text-[#F3D791]" />
                  <span>
                    <strong className="text-[#F3D791]">
                      {profileFollowing.length}
                    </strong>{" "}
                    siguiendo
                  </span>
                </button>

                {effectiveViewerNick !== cleanNick && (
                  <button
                    type="button"
                    onClick={handleToggleFollowCurrentProfile}
                    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-4 py-1 text-xs font-bold shadow-xs transition-all ${
                      viewerIsFollowingThisProfile
                        ? "bg-white text-[#836DAD] hover:bg-[#F6F3FA]"
                        : "bg-[#F3D791] text-[#2B1F42] hover:bg-white"
                    }`}
                  >
                    {viewerIsFollowingThisProfile ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Siguiendo</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3.5 w-3.5 text-[#836DAD]" />
                        <span>Seguir {profileData.role}</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Resumen de estrellas (1 a 5) + Código QR oficial */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-col sm:items-end justify-center rounded-2xl bg-white/10 backdrop-blur-xs border border-[#F3D791]/40 px-4 py-3">
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-4 w-4 ${
                      star <= Math.round(averageRating)
                        ? "fill-[#F3D791] text-[#F3D791]"
                        : "text-white/35"
                    }`}
                  />
                ))}
                <span className="ml-1 text-base font-extrabold text-[#F3D791]">
                  {averageRating.toFixed(1)}
                </span>
              </div>
              <span className="text-[11px] text-white/80 mt-0.5">
                {profileReviews.length}{" "}
                {profileReviews.length === 1
                  ? "reseña de consulta efectuada"
                  : "reseñas de consultas efectuadas"}
              </span>
            </div>

            <div className="flex items-center gap-2 rounded-2xl border-2 border-[#F3D791] bg-white p-1.5 shadow-sm">
              {qrDataUrl ? (
                <img
                  src={qrDataUrl}
                  alt={`QR ${fullPublicUrl}`}
                  className="h-14 w-14 rounded-lg object-contain"
                />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-[#FAF8FC]">
                  <QrCode className="h-7 w-7 text-[#836DAD]" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra con el enlace público https://www.reikionline.com.ar/nickname */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-black/25 px-3.5 py-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <Share2 className="h-3.5 w-3.5 text-[#F3D791] shrink-0" />
            <span className="font-mono text-white/95 truncate">
              {fullPublicUrl}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-white/25 transition cursor-pointer"
            >
              {copiedUrl ? (
                <>
                  <Check className="h-3.5 w-3.5 text-[#F3D791]" />
                  Copiado
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Copiar enlace
                </>
              )}
            </button>
            {compact && (
              <a
                href={`/${profileData.nickname}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-lg bg-[#F3D791] px-2.5 py-1 text-[11px] font-bold text-[#2E2344] hover:bg-[#e7c875] transition"
              >
                Abrir perfil (usuarios registrados)
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Cuerpo de la Red Social */}
      <div className="p-5 sm:p-6 space-y-6 bg-[#FAF8FC]">
        {/* RED SOCIAL DE SEGUIDORES (Consultantes y Terapeutas) */}
        <div className="rounded-2xl border border-[#836DAD]/25 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-3.5">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#836DAD] text-[#F3D791]">
                <Users className="h-4 w-4" />
              </span>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-[#2B1F42]">
                  Red de Seguidores en Reiki Online
                </h4>
                <p className="text-xs text-[#2B1F42]/70">
                  Seguí a Consultantes y Terapeutas de la comunidad.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSocialTab("seguidores")}
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  socialTab === "seguidores"
                    ? "bg-[#836DAD] text-white shadow-xs"
                    : "border border-[#836DAD]/25 bg-[#FAF8FC] text-[#2B1F42] hover:border-[#836DAD]"
                }`}
              >
                Seguidores ({profileFollowers.length})
              </button>
              <button
                type="button"
                onClick={() => setSocialTab("siguiendo")}
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  socialTab === "siguiendo"
                    ? "bg-[#836DAD] text-white shadow-xs"
                    : "border border-[#836DAD]/25 bg-[#FAF8FC] text-[#2B1F42] hover:border-[#836DAD]"
                }`}
              >
                Siguiendo ({profileFollowing.length})
              </button>
              <button
                type="button"
                onClick={() => setSocialTab("explorar")}
                className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                  socialTab === "explorar"
                    ? "bg-[#836DAD] text-[#F3D791] shadow-xs"
                    : "border border-[#836DAD]/25 bg-[#FAF8FC] text-[#836DAD] hover:border-[#836DAD]"
                }`}
              >
                + Seguir perfiles
              </button>
            </div>
          </div>

          {socialTab === "seguidores" && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {profileFollowers.length > 0 ? (
                profileFollowers.map((fol) => {
                  const actorNick = compact ? cleanNick : effectiveViewerNick;
                  const iFollowBack = isFollowingProfile(
                    actorNick,
                    fol.followerNickname,
                    followsList
                  );
                  const folPhoto =
                    fol.followerFotoUrl ||
                    DEMO_SOCIAL_PROFILES[fol.followerNickname.toLowerCase()]
                      ?.fotoUrl ||
                    "";
                  const folInitials = fol.followerName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={fol.id}
                      className="flex items-center justify-between gap-2.5 rounded-2xl border-2 border-[#F3D791] bg-[#836DAD] p-3 text-white shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#F3D791] bg-[#F6F3FA] text-xs font-bold text-[#836DAD]">
                          {folPhoto ? (
                            <img
                              src={folPhoto}
                              alt={fol.followerName}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            folInitials
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <a
                              href={`/${fol.followerNickname}`}
                              className="truncate text-xs sm:text-sm font-bold text-white hover:text-[#F3D791] hover:underline"
                            >
                              {fol.followerName}
                            </a>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#F3D791] px-2 py-0.5 text-[10px] font-bold text-[#2B1F42]">
                              {fol.followerRole === "Terapeuta" ? (
                                <UserCheck className="h-2.5 w-2.5" />
                              ) : (
                                <HeartHandshake className="h-2.5 w-2.5" />
                              )}
                              {fol.followerRole}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] font-semibold text-[#F3D791]">
                            @{fol.followerNickname}
                          </p>
                        </div>
                      </div>

                      {fol.followerNickname.toLowerCase() !== actorNick && (
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleFollowOther({
                              nickname: fol.followerNickname,
                              name: fol.followerName,
                              role: fol.followerRole,
                              fotoUrl: folPhoto,
                            })
                          }
                          className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            iFollowBack
                              ? "border border-[#F3D791] bg-white text-[#836DAD] hover:bg-[#F6F3FA]"
                              : "bg-[#F3D791] text-[#2B1F42] hover:bg-white"
                          }`}
                        >
                          {iFollowBack ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Siguiendo</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5 text-[#836DAD]" />
                              <span>Seguir</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="col-span-2 py-3 text-center text-xs text-[#2B1F42]/65">
                  Aún no hay seguidores registrados en esta lista.
                </p>
              )}
            </div>
          )}

          {socialTab === "siguiendo" && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {profileFollowing.length > 0 ? (
                profileFollowing.map((fol) => {
                  const actorNick = compact ? cleanNick : effectiveViewerNick;
                  const isFollowingItem = isFollowingProfile(
                    actorNick,
                    fol.targetNickname,
                    followsList
                  );
                  const targetPhoto =
                    fol.targetFotoUrl ||
                    DEMO_SOCIAL_PROFILES[fol.targetNickname.toLowerCase()]
                      ?.fotoUrl ||
                    "";
                  const targetInitials = fol.targetName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <div
                      key={fol.id}
                      className="flex items-center justify-between gap-2.5 rounded-2xl border-2 border-[#F3D791] bg-[#836DAD] p-3 text-white shadow-xs"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#F3D791] bg-[#F6F3FA] text-xs font-bold text-[#836DAD]">
                          {targetPhoto ? (
                            <img
                              src={targetPhoto}
                              alt={fol.targetName}
                              referrerPolicy="no-referrer"
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            targetInitials
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <a
                              href={`/${fol.targetNickname}`}
                              className="truncate text-xs sm:text-sm font-bold text-white hover:text-[#F3D791] hover:underline"
                            >
                              {fol.targetName}
                            </a>
                            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#F3D791] px-2 py-0.5 text-[10px] font-bold text-[#2B1F42]">
                              {fol.targetRole}
                            </span>
                          </div>
                          <p className="font-mono text-[11px] font-semibold text-[#F3D791]">
                            @{fol.targetNickname}
                          </p>
                        </div>
                      </div>

                      {fol.targetNickname.toLowerCase() !== actorNick && (
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleFollowOther({
                              nickname: fol.targetNickname,
                              name: fol.targetName,
                              role: fol.targetRole,
                              fotoUrl: targetPhoto,
                            })
                          }
                          className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                            isFollowingItem
                              ? "border border-[#F3D791] bg-white text-[#836DAD] hover:bg-[#F6F3FA]"
                              : "bg-[#F3D791] text-[#2B1F42] hover:bg-white"
                          }`}
                        >
                          {isFollowingItem ? (
                            <>
                              <Check className="h-3.5 w-3.5" />
                              <span>Siguiendo</span>
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-3.5 w-3.5 text-[#836DAD]" />
                              <span>Seguir</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  );
                })
              ) : (
                <p className="col-span-2 py-3 text-center text-xs text-[#2B1F42]/65">
                  Aún no sigue a otros perfiles. Usá la pestaña «+ Seguir perfiles» para conectar.
                </p>
              )}
            </div>
          )}

          {socialTab === "explorar" && (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {suggestedProfiles.map((sug) => {
                const actorNick = compact ? cleanNick : effectiveViewerNick;
                const isFollowingSug = isFollowingProfile(
                  actorNick,
                  sug.nickname,
                  followsList
                );
                const sugInitials = sug.displayName
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={sug.nickname}
                    className="flex items-center justify-between gap-2.5 rounded-2xl border-2 border-[#F3D791] bg-[#836DAD] p-3 text-white shadow-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[#F3D791] bg-[#F6F3FA] text-xs font-bold text-[#836DAD]">
                        {sug.fotoUrl ? (
                          <img
                            src={sug.fotoUrl}
                            alt={sug.displayName}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          sugInitials
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <a
                            href={`/${sug.nickname}`}
                            className="truncate text-xs sm:text-sm font-bold text-white hover:text-[#F3D791] hover:underline"
                          >
                            {sug.displayName}
                          </a>
                          <span className="inline-flex items-center gap-0.5 rounded-full bg-[#F3D791] px-2 py-0.5 text-[10px] font-bold text-[#2B1F42]">
                            {sug.role}
                          </span>
                        </div>
                        <p className="font-mono text-[11px] font-semibold text-[#F3D791]">
                          @{sug.nickname} · {sug.localidad}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        handleToggleFollowOther({
                          nickname: sug.nickname,
                          name: sug.displayName,
                          role: sug.role,
                          fotoUrl: sug.fotoUrl,
                        })
                      }
                      className={`inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                        isFollowingSug
                          ? "border border-[#F3D791] bg-white text-[#836DAD] hover:bg-[#F6F3FA]"
                          : "bg-[#F3D791] text-[#2B1F42] hover:bg-white"
                      }`}
                    >
                      {isFollowingSug ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Siguiendo</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5 text-[#836DAD]" />
                          <span>Seguir</span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Terapias que ofrece / busca */}
        {profileData.therapies && profileData.therapies.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5E4B8B]">
              Terapias en Reiki Online
            </h4>
            <div className="flex flex-wrap gap-2">
              {profileData.therapies.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#836DAD]/25 bg-white px-3 py-1 text-xs font-semibold text-[#2E2344] shadow-2xs"
                >
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#836DAD]" />
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* SECCIÓN DE CALIFICACIÓN (1 A 5 ESTRELLAS) Y RESEÑA (MÁX 150 CARACTERES) SOLO LUEGO DE CONSULTAS EFECTUADAS */}
        <div className="rounded-2xl border border-[#836DAD]/30 bg-white p-4 sm:p-5 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm sm:text-base font-bold text-[#2E2344] flex items-center gap-2">
                <MessageSquareHeart className="h-4 w-4 text-[#836DAD]" />
                Calificar al Terapeuta (1 a 5 estrellas) y dejar Reseña
              </h4>
              <p className="text-xs text-[#2E2344]/70">
                Habilitado exclusivamente luego de las consultas efectuadas.
                Reseña de hasta 150 caracteres.
              </p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F0FA] px-3 py-1 text-xs font-semibold text-[#5E4B8B]">
              <CalendarCheck className="h-3.5 w-3.5 text-[#836DAD]" />
              {unreviewedCompletedConsultations.length > 0
                ? `${unreviewedCompletedConsultations.length} consulta(s) efectuada(s) para calificar`
                : "Requiere consulta efectuada"}
            </span>
          </div>

          {feedbackMsg && (
            <div
              role="status"
              aria-live="polite"
              className={`rounded-xl px-3.5 py-2.5 text-xs font-semibold border ${
                feedbackMsg.type === "ok"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {feedbackMsg.text}
            </div>
          )}

          {unreviewedCompletedConsultations.length > 0 ? (
            <form onSubmit={handleSubmitReview} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor={`cons-select-${cleanNick}`}
                    className="block text-xs font-bold text-[#2E2344] mb-1"
                  >
                    Consulta efectuada verificada *
                  </label>
                  <select
                    id={`cons-select-${cleanNick}`}
                    name="consultationId"
                    value={selectedConsultationId}
                    onChange={(e) => setSelectedConsultationId(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD8EE] bg-[#FAF8FC] px-3 py-2 text-xs font-semibold text-[#2E2344] focus:border-[#836DAD] focus:outline-none"
                  >
                    {unreviewedCompletedConsultations.map((c) => (
                      <option key={c.id} value={c.id}>
                        ✓ {c.therapyName} ({c.modality} • {c.scheduledAt})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor={`reviewer-name-${cleanNick}`}
                    className="block text-xs font-bold text-[#2E2344] mb-1"
                  >
                    Tu nombre de consultante *
                  </label>
                  <input
                    id={`reviewer-name-${cleanNick}`}
                    name="reviewerName"
                    type="text"
                    required
                    value={reviewerNameInput}
                    onChange={(e) => setReviewerNameInput(e.target.value)}
                    className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3 py-2 text-xs text-[#2E2344] focus:border-[#836DAD] focus:outline-none"
                  />
                </div>
              </div>

              {/* Selección de 1 a 5 estrellas con radio buttons accesibles */}
              <fieldset className="space-y-1.5">
                <legend className="text-xs font-bold text-[#2E2344]">
                  Tu calificación (1 a 5 estrellas) *
                </legend>
                <div className="flex flex-wrap items-center gap-2">
                  {([1, 2, 3, 4, 5] as const).map((starValue) => {
                    const activeStar = (hoverRating ?? selectedRating) >= starValue;
                    return (
                      <label
                        key={starValue}
                        onMouseEnter={() => setHoverRating(starValue)}
                        onMouseLeave={() => setHoverRating(null)}
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition select-none ${
                          selectedRating === starValue
                            ? "border-[#836DAD] bg-[#836DAD] text-white shadow-xs"
                            : "border-[#E6E0F0] bg-[#FAF8FC] text-[#2E2344] hover:border-[#836DAD]/50"
                        }`}
                      >
                        <input
                          type="radio"
                          name={`rating-${cleanNick}`}
                          value={starValue}
                          checked={selectedRating === starValue}
                          onChange={() => setSelectedRating(starValue)}
                          className="sr-only"
                        />
                        <Star
                          className={`h-4 w-4 ${
                            activeStar
                              ? "fill-[#F3D791] text-[#F3D791]"
                              : "text-[#94A3B8]"
                          }`}
                        />
                        <span>
                          {starValue} {starValue === 1 ? "estrella" : "estrellas"}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              {/* Reseña de hasta 150 caracteres sobre el terapeuta */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label
                    htmlFor={`review-comment-${cleanNick}`}
                    className="block text-xs font-bold text-[#2E2344]"
                  >
                    Reseña sobre el terapeuta (máximo 150 caracteres) *
                  </label>
                  <span
                    id={`review-counter-${cleanNick}`}
                    className={`text-[11px] font-bold ${
                      reviewComment.length >= 145
                        ? "text-amber-700"
                        : "text-[#5E4B8B]"
                    }`}
                  >
                    {reviewComment.length} / 150 caracteres
                  </span>
                </div>
                <textarea
                  id={`review-comment-${cleanNick}`}
                  name="comment"
                  rows={2}
                  maxLength={150}
                  required
                  aria-describedby={`review-counter-${cleanNick}`}
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value.slice(0, 150))}
                  placeholder="Contá brevemente tu experiencia en la consulta con el terapeuta (hasta 150 caracteres)..."
                  className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-[#836DAD] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#5E4B8B] transition cursor-pointer"
                >
                  <Star className="h-4 w-4 fill-[#F3D791] text-[#F3D791]" />
                  Publicar calificación y reseña
                </button>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-[#836DAD]/20 bg-[#F6F3FA] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-bold text-[#2E2344]">
                  Solo se puede calificar (1 a 5 estrellas) y dejar reseña luego
                  de las consultas efectuadas.
                </p>
                <p className="text-[11px] text-[#2E2344]/70">
                  Cuando finalices una sesión con {profileData.displayName}, se
                  habilitará automáticamente tu reseña de hasta 150 caracteres.
                </p>
              </div>
              <button
                type="button"
                onClick={handleMarkConsultationCompleted}
                className="shrink-0 rounded-xl border border-[#836DAD] bg-white px-3.5 py-2 text-xs font-bold text-[#836DAD] hover:bg-[#836DAD] hover:text-white transition cursor-pointer"
              >
                + Marcar consulta efectuada para calificar
              </button>
            </div>
          )}
        </div>

        {/* Listado de reseñas verificadas sobre el terapeuta */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#5E4B8B]">
              Reseñas verificadas de Consultas Efectuadas ({profileReviews.length})
            </h4>
          </div>

          {profileReviews.length === 0 ? (
            <div className="rounded-2xl border border-[#E6E0F0] bg-white p-5 text-center text-xs text-[#2E2344]/65">
              Todavía no hay reseñas publicadas para este perfil.
            </div>
          ) : (
            <div className="space-y-2.5">
              {profileReviews.map((rev) => (
                <article
                  key={rev.id}
                  className="rounded-2xl border border-[#E6E0F0] bg-white p-4 shadow-2xs space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs sm:text-sm text-[#2E2344]">
                        {rev.authorName}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                        Consulta efectuada: {rev.therapyName}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star
                          key={s}
                          className={`h-3.5 w-3.5 ${
                            s <= rev.rating
                              ? "fill-[#F3D791] text-[#D4A72C]"
                              : "text-[#CBD5E1]"
                          }`}
                        />
                      ))}
                      <span className="ml-1 text-xs font-bold text-[#2E2344]">
                        {rev.rating}/5
                      </span>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-[#2E2344]/90 leading-relaxed">
                    “{rev.comment}”
                  </p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
