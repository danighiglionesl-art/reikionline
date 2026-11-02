"use client";

import React, { useState, useEffect, useMemo } from "react";
import QRCode from "qrcode";
import {
  Calendar,
  Clock,
  MapPin,
  Navigation,
  CheckCircle2,
  Sparkles,
  Radio,
  MessageCircle,
  SlidersHorizontal,
  ArrowLeftRight,
  UserCheck,
  UserPlus,
  Users,
  Check,
  Search,
  Maximize2,
  ExternalLink,
} from "lucide-react";
import {
  PROVINCIAS_ARGENTINA,
  getLocalidadesParaProvincia,
  ReikiUserProfile,
  sanitizeNickname,
} from "@/lib/geoData";
import {
  DEMO_SOCIAL_PROFILES,
  getFollowersForNickname,
  getFollowingForNickname,
  isFollowingProfile,
  loadSocialFollows,
  SocialFollowRecord,
  toggleSocialFollow,
} from "@/lib/socialNetwork";
import {
  AttentionModality,
  BookingTimingType,
  formatArs,
  loadMpAccounts,
  MP_SYNC_EVENT,
} from "@/lib/mercadoPagoSplit";
import ConsultanteCheckoutModal from "@/components/payments/ConsultanteCheckoutModal";
import TherapistMercadoPagoSection from "@/components/payments/TherapistMercadoPagoSection";

export type ModalityType =
  | "Presencial con turno"
  | "Online con turno"
  | "Online ahora";

interface ModalityWorkflowPanelProps {
  role: "Consultante" | "Terapeuta";
  modality: ModalityType;
  userProfile: ReikiUserProfile;
  selectedTherapies: string[];
  onChangeModality: (next: ModalityType | null) => void;
}

export interface TherapistAvailabilityConfig {
  therapistId: string;
  therapistName: string;
  nickname?: string;
  fotoUrl?: string;
  provincia: string;
  localidad: string;
  lat: number;
  lng: number;
  therapies: string[];
  // Keys: `${dayIndex}-${hour}` e.g. "0-12" = Lunes 12:00 hs (turno de 1 hora)
  presencialSlots: Record<string, boolean>;
  presencialConvertibleToOnline: boolean;
  onlineSlots: Record<string, boolean>;
  onlineConvertibleToPresencial: boolean;
  onlineNowActive: boolean;
  onlineNowWhatsappAlerts: boolean;
  updatedAt: string;
}

export interface MatchAlertItem {
  id: string;
  consultanteName: string;
  consultanteLocalidad: string;
  therapistId: string;
  therapistName: string;
  therapies: string[];
  distanceKm: number;
  status?: "pendiente" | "aceptado";
  createdAt: string;
}

const AVAILABILITY_STORAGE_KEY = "reiki_online_therapist_availability_v1";
const MATCH_ALERTS_STORAGE_KEY = "reiki_online_match_alerts_v1";
const SYNC_EVENT_NAME = "reiki-online-catalog-sync";

const DAYS_OF_WEEK = [
  { index: 0, short: "Lun", label: "Lunes" },
  { index: 1, short: "Mar", label: "Martes" },
  { index: 2, short: "Mié", label: "Miércoles" },
  { index: 3, short: "Jue", label: "Jueves" },
  { index: 4, short: "Vie", label: "Viernes" },
  { index: 5, short: "Sáb", label: "Sábado" },
  { index: 6, short: "Dom", label: "Domingo" },
];

// 24 horas exactas, turnos de 1 hora en punto (00:00, 01:00 ... 12:00, 13:00, 14:00 ... 23:00)
const HOURS_24 = Array.from({ length: 24 }, (_, i) => i);

function formatHourSlot(hour: number): string {
  const start = String(hour).padStart(2, "0");
  return `${start}:00 hs`;
}

function formatHourRange(hour: number): string {
  const start = String(hour).padStart(2, "0");
  const end = String((hour + 1) % 24).padStart(2, "0");
  return `${start}:00 a ${end}:00 hs (1 h)`;
}

function calculateDistanceKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

const DEMO_THERAPISTS: TherapistAvailabilityConfig[] = [
  {
    therapistId: "demo-terapeuta-1",
    therapistName: "Valeria Méndez",
    nickname: "valeriamendez",
    fotoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    provincia: "Córdoba",
    localidad: "Córdoba",
    lat: -31.4201,
    lng: -64.1888,
    therapies: [
      "Reiki Usui",
      "Alineación de chakras",
      "Limpieza y armonización energética",
      "Meditación guiada",
    ],
    presencialSlots: {
      "0-12": true,
      "0-13": true,
      "0-14": true,
      "1-12": true,
      "1-13": true,
      "2-15": true,
      "2-16": true,
      "3-12": true,
      "3-13": true,
      "4-14": true,
      "4-15": true,
    },
    presencialConvertibleToOnline: true,
    onlineSlots: {
      "0-12": true,
      "0-13": true,
      "0-18": true,
      "1-12": true,
      "1-19": true,
      "2-14": true,
      "3-12": true,
      "4-16": true,
      "5-12": true,
    },
    onlineConvertibleToPresencial: true,
    onlineNowActive: true,
    onlineNowWhatsappAlerts: true,
    updatedAt: "2026-11-01T15:00:00.000Z",
  },
  {
    therapistId: "demo-terapeuta-2",
    therapistName: "Martín Arrieta",
    nickname: "martinarrieta",
    fotoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    provincia: "Córdoba",
    localidad: "Río Cuarto",
    lat: -33.1232,
    lng: -64.3493,
    therapies: [
      "Reiki Karuna",
      "Tarot",
      "Lectura de registros akáshicos",
      "Constelaciones individuales",
    ],
    presencialSlots: {
      "0-13": true,
      "0-14": true,
      "1-14": true,
      "2-12": true,
      "2-13": true,
      "4-12": true,
      "4-13": true,
      "5-12": true,
    },
    presencialConvertibleToOnline: true,
    onlineSlots: {
      "0-13": true,
      "1-14": true,
      "2-12": true,
      "3-15": true,
      "4-12": true,
      "5-13": true,
      "6-12": true,
    },
    onlineConvertibleToPresencial: false,
    onlineNowActive: true,
    onlineNowWhatsappAlerts: true,
    updatedAt: "2026-11-01T15:00:00.000Z",
  },
  {
    therapistId: "demo-terapeuta-3",
    therapistName: "Lucía Peralta",
    nickname: "luciaperalta",
    fotoUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    provincia: "Ciudad Autónoma de Buenos Aires",
    localidad: "Palermo",
    lat: -34.5889,
    lng: -58.4305,
    therapies: [
      "Flores de Bach",
      "Biodescodificación",
      "Sonoterapia con cuencos tibetanos",
      "Reiki con cristales",
    ],
    presencialSlots: {
      "1-12": true,
      "1-13": true,
      "3-14": true,
      "3-15": true,
      "4-12": true,
      "5-14": true,
    },
    presencialConvertibleToOnline: false,
    onlineSlots: {
      "0-14": true,
      "1-12": true,
      "2-16": true,
      "3-14": true,
      "4-12": true,
      "5-15": true,
    },
    onlineConvertibleToPresencial: true,
    onlineNowActive: true,
    onlineNowWhatsappAlerts: true,
    updatedAt: "2026-11-01T15:00:00.000Z",
  },
];

export default function ModalityWorkflowPanel({
  role,
  modality,
  userProfile,
  selectedTherapies,
}: ModalityWorkflowPanelProps) {
  const [therapistsMap, setTherapistsMap] = useState<
    Record<string, TherapistAvailabilityConfig>
  >({});
  const [matchAlerts, setMatchAlerts] = useState<MatchAlertItem[]>([]);
  const [followsList, setFollowsList] = useState<SocialFollowRecord[]>([]);
  const [qrByNick, setQrByNick] = useState<Record<string, string>>({});
  const [savedNotice, setSavedNotice] = useState<string | null>(null);
  const [bookingNotice, setBookingNotice] = useState<string | null>(null);
  const [mpAccounts, setMpAccounts] = useState(() => loadMpAccounts());
  const [checkoutTarget, setCheckoutTarget] = useState<{
    therapist: TherapistAvailabilityConfig;
    distanceKm: number;
    bookingTiming: BookingTimingType;
    attentionModality: AttentionModality;
    scheduledSlotLabel: string;
    slotKey: string;
  } | null>(null);

  useEffect(() => {
    const syncMp = () => setMpAccounts(loadMpAccounts());
    window.addEventListener(MP_SYNC_EVENT, syncMp);
    window.addEventListener("storage", syncMp);
    return () => {
      window.removeEventListener(MP_SYNC_EVENT, syncMp);
      window.removeEventListener("storage", syncMp);
    };
  }, []);

  const viewerNickname = useMemo(() => {
    return (
      sanitizeNickname(
        userProfile.nickname ||
          userProfile.username ||
          `${userProfile.nombre}${userProfile.apellido}`
      ).toLowerCase() || "danielghiglione"
    );
  }, [
    userProfile.nickname,
    userProfile.username,
    userProfile.nombre,
    userProfile.apellido,
  ]);

  const viewerDisplayName = useMemo(() => {
    return (
      `${userProfile.nombre || ""} ${userProfile.apellido || ""}`.trim() ||
      viewerNickname
    );
  }, [userProfile.nombre, userProfile.apellido, viewerNickname]);

  const handleToggleFollowPerson = (target: {
    nickname: string;
    name: string;
    role: "Consultante" | "Terapeuta";
  }) => {
    const res = toggleSocialFollow({
      followerNickname: viewerNickname,
      followerName: viewerDisplayName,
      followerRole: role,
      followerFotoUrl: userProfile.fotoUrl || "",
      targetNickname: target.nickname,
      targetName: target.name,
      targetRole: target.role,
    });
    setFollowsList(res.list);
  };

  // Filtros del Consultante para Presencial / Online con turno
  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [searchDate, setSearchDate] = useState<string>(todayIso);
  const [searchHour, setSearchHour] = useState<number | "all">(12);
  const [expandedSearch, setExpandedSearch] = useState<boolean>(false);
  const [locationFilterMode, setLocationFilterMode] = useState<
    "geoposicion" | "localidad"
  >("geoposicion");
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(100);
  const [filterProvincia, setFilterProvincia] = useState<string>(
    userProfile.provincia || "Córdoba"
  );
  const [filterLocalidad, setFilterLocalidad] = useState<string>("Todas");

  // Vista compacta u horaria completa (24 hs) en la grilla del Terapeuta
  const [showFull24Hours, setShowFull24Hours] = useState<boolean>(true);

  const loadStorage = () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(AVAILABILITY_STORAGE_KEY);
      const parsed = raw
        ? (JSON.parse(raw) as Record<string, TherapistAvailabilityConfig>)
        : {};
      const merged: Record<string, TherapistAvailabilityConfig> = {};
      for (const demo of DEMO_THERAPISTS) {
        merged[demo.therapistId] = demo;
      }
      for (const [key, val] of Object.entries(parsed)) {
        const baseDemo = merged[key];
        const nick =
          val.nickname ||
          baseDemo?.nickname ||
          sanitizeNickname(val.therapistName || "").toLowerCase();
        merged[key] = {
          ...baseDemo,
          ...val,
          nickname: nick,
          fotoUrl:
            val.fotoUrl ||
            baseDemo?.fotoUrl ||
            DEMO_SOCIAL_PROFILES[nick]?.fotoUrl ||
            "",
        };
      }
      setTherapistsMap(merged);
    } catch {
      const fallback: Record<string, TherapistAvailabilityConfig> = {};
      for (const demo of DEMO_THERAPISTS) {
        fallback[demo.therapistId] = demo;
      }
      setTherapistsMap(fallback);
    }

    try {
      const rawAlerts = window.localStorage.getItem(MATCH_ALERTS_STORAGE_KEY);
      if (rawAlerts) {
        setMatchAlerts(JSON.parse(rawAlerts) as MatchAlertItem[]);
      }
    } catch {
      // Ignore
    }

    setFollowsList(loadSocialFollows());
  };

  useEffect(() => {
    loadStorage();
    const handleSync = () => loadStorage();
    window.addEventListener(SYNC_EVENT_NAME, handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  useEffect(() => {
    let active = true;
    const allTherapists = Object.values(therapistsMap);
    if (allTherapists.length === 0) return;

    Promise.all(
      allTherapists.map(async (th) => {
        const nick =
          th.nickname || sanitizeNickname(th.therapistName).toLowerCase();
        const url = `https://www.reikionline.com.ar/${nick}`;
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 180,
            margin: 1,
            color: { dark: "#2B1F42", light: "#FFFFFF" },
          });
          return [nick, dataUrl] as const;
        } catch {
          return [nick, ""] as const;
        }
      })
    ).then((entries) => {
      if (!active) return;
      const next: Record<string, string> = {};
      for (const [k, v] of entries) {
        if (v) next[k] = v;
      }
      setQrByNick(next);
    });

    return () => {
      active = false;
    };
  }, [therapistsMap]);

  const currentTherapistConfig: TherapistAvailabilityConfig = useMemo(() => {
    const existing = therapistsMap[userProfile.id];
    if (existing) {
      return {
        ...existing,
        therapistName: `${userProfile.nombre} ${userProfile.apellido}`.trim(),
        provincia: userProfile.provincia,
        localidad: userProfile.localidad,
        lat: userProfile.geo.lat,
        lng: userProfile.geo.lng,
        therapies:
          selectedTherapies.length > 0 ? selectedTherapies : existing.therapies,
      };
    }
    return {
      therapistId: userProfile.id,
      therapistName: `${userProfile.nombre} ${userProfile.apellido}`.trim(),
      provincia: userProfile.provincia || "Córdoba",
      localidad: userProfile.localidad || "Alcira Gigena",
      lat: userProfile.geo?.lat ?? -32.75472,
      lng: userProfile.geo?.lng ?? -64.33648,
      therapies: selectedTherapies,
      presencialSlots: {
        "0-12": true,
        "0-13": true,
        "0-14": true,
        "2-12": true,
        "2-13": true,
        "4-12": true,
        "4-13": true,
      },
      presencialConvertibleToOnline: true,
      onlineSlots: {
        "0-12": true,
        "0-13": true,
        "1-14": true,
        "3-12": true,
        "4-14": true,
      },
      onlineConvertibleToPresencial: true,
      onlineNowActive: true,
      onlineNowWhatsappAlerts: true,
      updatedAt: new Date().toISOString(),
    };
  }, [therapistsMap, userProfile, selectedTherapies]);

  const persistTherapistConfig = (
    updated: TherapistAvailabilityConfig,
    feedbackMessage?: string
  ) => {
    const nextMap = {
      ...therapistsMap,
      [updated.therapistId]: {
        ...updated,
        updatedAt: new Date().toISOString(),
      },
    };
    setTherapistsMap(nextMap);
    if (feedbackMessage) {
      setSavedNotice(feedbackMessage);
    }
    try {
      window.localStorage.setItem(
        AVAILABILITY_STORAGE_KEY,
        JSON.stringify(nextMap)
      );
      window.dispatchEvent(new Event(SYNC_EVENT_NAME));
    } catch {
      // Ignore
    }
  };

  const toggleSlot = (dayIndex: number, hour: number) => {
    setSavedNotice(null);
    const key = `${dayIndex}-${hour}`;
    if (modality === "Presencial con turno") {
      const nextSlots = {
        ...currentTherapistConfig.presencialSlots,
        [key]: !currentTherapistConfig.presencialSlots[key],
      };
      persistTherapistConfig({
        ...currentTherapistConfig,
        presencialSlots: nextSlots,
      });
    } else if (modality === "Online con turno") {
      const nextSlots = {
        ...currentTherapistConfig.onlineSlots,
        [key]: !currentTherapistConfig.onlineSlots[key],
      };
      persistTherapistConfig({
        ...currentTherapistConfig,
        onlineSlots: nextSlots,
      });
    }
  };

  const toggleDayColumn = (dayIndex: number) => {
    setSavedNotice(null);
    const activeSlots =
      modality === "Presencial con turno"
        ? currentTherapistConfig.presencialSlots
        : currentTherapistConfig.onlineSlots;
    const allSelected = HOURS_24.every((h) => activeSlots[`${dayIndex}-${h}`]);
    const nextSlots = { ...activeSlots };
    for (const h of HOURS_24) {
      nextSlots[`${dayIndex}-${h}`] = !allSelected;
    }
    if (modality === "Presencial con turno") {
      persistTherapistConfig({
        ...currentTherapistConfig,
        presencialSlots: nextSlots,
      });
    } else {
      persistTherapistConfig({
        ...currentTherapistConfig,
        onlineSlots: nextSlots,
      });
    }
  };

  // Día de la semana (0 = Lunes ... 6 = Domingo) para la fecha buscada por el Consultante
  const selectedDayIndex = useMemo(() => {
    if (!searchDate) return 0;
    const parts = searchDate.split("-").map(Number);
    if (parts.length !== 3) return 0;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    const jsDay = d.getDay(); // 0 Domingo .. 6 Sábado
    return jsDay === 0 ? 6 : jsDay - 1;
  }, [searchDate]);

  const localidadesDisponibles = useMemo(
    () => getLocalidadesParaProvincia(filterProvincia),
    [filterProvincia]
  );

  // Lista filtrada de Terapeutas para el Consultante en Presencial con turno / Online con turno
  const matchingScheduledTherapists = useMemo(() => {
    const list = Object.values(therapistsMap);
    return list
      .map((t) => {
        const distanceKm = calculateDistanceKm(
          userProfile.geo?.lat ?? -32.75472,
          userProfile.geo?.lng ?? -64.33648,
          t.lat,
          t.lng
        );

        const slotsMap =
          modality === "Presencial con turno"
            ? t.presencialSlots
            : t.onlineSlots;

        // Buscar turnos disponibles de 1 hora en punto
        const availableHoursOnDay: { dayLabel: string; hour: number }[] = [];
        const daysToCheck = expandedSearch
          ? DAYS_OF_WEEK
          : [DAYS_OF_WEEK[selectedDayIndex]];

        for (const dayObj of daysToCheck) {
          for (const h of HOURS_24) {
            if (slotsMap[`${dayObj.index}-${h}`]) {
              if (
                expandedSearch ||
                searchHour === "all" ||
                Number(searchHour) === h
              ) {
                availableHoursOnDay.push({
                  dayLabel: dayObj.label,
                  hour: h,
                });
              }
            }
          }
        }

        return {
          therapist: t,
          distanceKm,
          availableHoursOnDay,
        };
      })
      .filter((item) => {
        if (item.availableHoursOnDay.length === 0) return false;

        if (!expandedSearch) {
          if (locationFilterMode === "geoposicion") {
            if (item.distanceKm > maxDistanceKm) return false;
          } else {
            if (
              filterProvincia &&
              item.therapist.provincia.toLowerCase() !==
                filterProvincia.toLowerCase()
            ) {
              return false;
            }
            if (
              filterLocalidad !== "Todas" &&
              item.therapist.localidad.toLowerCase() !==
                filterLocalidad.toLowerCase()
            ) {
              return false;
            }
          }
        }

        return true;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [
    therapistsMap,
    userProfile.geo,
    modality,
    expandedSearch,
    selectedDayIndex,
    searchHour,
    locationFilterMode,
    maxDistanceKm,
    filterProvincia,
    filterLocalidad,
  ]);

  // Terapeutas conectados en este momento para "Online ahora" (estilo Grindr por cercanía)
  const onlineNowTherapists = useMemo(() => {
    return Object.values(therapistsMap)
      .filter((t) => t.onlineNowActive)
      .map((t) => {
        const distanceKm = calculateDistanceKm(
          userProfile.geo?.lat ?? -32.75472,
          userProfile.geo?.lng ?? -64.33648,
          t.lat,
          t.lng
        );
        return {
          therapist: t,
          distanceKm,
        };
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [therapistsMap, userProfile.geo]);

  const handleTriggerMatchNow = (target: TherapistAvailabilityConfig, distanceKm: number) => {
    const newMatch: MatchAlertItem = {
      id: `match-${Date.now()}`,
      consultanteName: `${userProfile.nombre} ${userProfile.apellido}`.trim(),
      consultanteLocalidad: `${userProfile.localidad}, ${userProfile.provincia}`,
      therapistId: target.therapistId,
      therapistName: target.therapistName,
      therapies:
        selectedTherapies.length > 0
          ? selectedTherapies
          : target.therapies.slice(0, 2),
      distanceKm,
      status: "pendiente",
      createdAt: new Date().toISOString(),
    };
    const nextAlerts = [newMatch, ...matchAlerts];
    setMatchAlerts(nextAlerts);
    setBookingNotice(
      `¡Match enviado a ${target.therapistName}! El sistema notificó de forma interna a su cuenta verificada (los números de WhatsApp de consultantes y terapeutas no son publicables bajo ningún concepto).`
    );
    try {
      window.localStorage.setItem(
        MATCH_ALERTS_STORAGE_KEY,
        JSON.stringify(nextAlerts)
      );
      window.dispatchEvent(new Event(SYNC_EVENT_NAME));
    } catch {
      // Ignore
    }
  };

  // ============================================================================
  // 1. VISTA TERAPEUTA: PRESENCIAL CON TURNO / ONLINE CON TURNO (Grilla 24x7)
  // ============================================================================
  if (
    role === "Terapeuta" &&
    (modality === "Presencial con turno" || modality === "Online con turno")
  ) {
    const isPresencial = modality === "Presencial con turno";
    const activeSlots = isPresencial
      ? currentTherapistConfig.presencialSlots
      : currentTherapistConfig.onlineSlots;
    const totalSelectedSlots = Object.values(activeSlots).filter(Boolean).length;
    const hoursToRender = showFull24Hours
      ? HOURS_24
      : HOURS_24.filter((h) => h >= 8 && h <= 22);

    return (
      <div className="rounded-2xl border border-[#836DAD]/25 bg-[#FAF8FC] p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#836DAD]/15 px-3 py-0.5 text-xs font-semibold text-[#836DAD]">
              <Clock className="h-3.5 w-3.5" />
              <span>Agenda de Terapeuta · Turnos de 1 hora exacta</span>
            </span>
            <h4 className="mt-1 text-base sm:text-lg font-bold text-[#2B1F42]">
              {modality} — Grilla 24 hs × 7 días
            </h4>
            <p className="text-xs text-[#2B1F42]/70">
              Todos los turnos son de 1 hora y comienzan en punto (12:00, 13:00, 14:00 hs sucesivamente). Tildá tus horarios disponibles.
            </p>
          </div>

          <span className="rounded-xl bg-[#836DAD] px-3.5 py-1.5 text-xs font-semibold text-white">
            {totalSelectedSlots} turno{totalSelectedSlots === 1 ? "" : "s"} de 1 h activo
            {totalSelectedSlots === 1 ? "" : "s"}
          </span>
        </div>

        {/* Opción de conversión Presencial ⇄ Online */}
        <label className="ro-choice-label flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-[#836DAD]/30 bg-white p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={
                isPresencial
                  ? currentTherapistConfig.presencialConvertibleToOnline
                  : currentTherapistConfig.onlineConvertibleToPresencial
              }
              onChange={(e) => {
                const checked = e.target.checked;
                if (isPresencial) {
                  persistTherapistConfig(
                    {
                      ...currentTherapistConfig,
                      presencialConvertibleToOnline: checked,
                    },
                    "Preferencia de conversión a Online actualizada."
                  );
                } else {
                  persistTherapistConfig(
                    {
                      ...currentTherapistConfig,
                      onlineConvertibleToPresencial: checked,
                    },
                    "Preferencia de conversión a Presencial actualizada."
                  );
                }
              }}
              className="h-5 w-5 shrink-0 cursor-pointer rounded border-[#836DAD]"
            />
            <div>
              <span className="block text-sm font-bold text-[#2B1F42]">
                {isPresencial
                  ? "Online (Permitir convertir mi consulta presencial en Online)"
                  : "Presencial (Permitir convertir mi consulta online en Presencial)"}
              </span>
              <span className="text-xs text-[#2B1F42]/70">
                {isPresencial
                  ? "Tildá esta opción si podés convertir el turno presencial en sesión online cuando el consultante lo solicite."
                  : "Tildá esta opción si ofrecés convertir el turno online en atención presencial."}
              </span>
            </div>
          </div>
          <ArrowLeftRight className="h-5 w-5 shrink-0 text-[#836DAD]" />
        </label>

        {/* Controles rápidos de vista 24 hs */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-[#2B1F42]/80">
            Geoposición declarada: {userProfile.localidad}, {userProfile.provincia}
          </span>
          <button
            type="button"
            onClick={() => setShowFull24Hours((prev) => !prev)}
            className="cursor-pointer rounded-xl border border-[#836DAD]/30 bg-white px-3 py-1.5 text-xs font-semibold text-[#836DAD] hover:bg-[#836DAD] hover:text-white"
          >
            {showFull24Hours
              ? "Ver franja 08:00 a 22:00 hs"
              : "Ver las 24 horas completas (00:00 a 23:00 hs)"}
          </button>
        </div>

        {/* Grilla 24 horas x 7 días */}
        <div className="max-h-96 overflow-auto rounded-2xl border border-[#836DAD]/20 bg-white shadow-inner">
          <table className="w-full border-collapse text-center text-xs">
            <thead className="sticky top-0 z-10 bg-[#836DAD] text-white">
              <tr>
                <th className="border-r border-white/15 px-2.5 py-2.5 text-left font-semibold">
                  Inicio (1 h)
                </th>
                {DAYS_OF_WEEK.map((d) => (
                  <th
                    key={d.index}
                    className="border-r border-white/15 px-2 py-2 font-semibold last:border-r-0"
                  >
                    <button
                      type="button"
                      onClick={() => toggleDayColumn(d.index)}
                      title={`Marcar o desmarcar todo el ${d.label}`}
                      className="cursor-pointer hover:text-[#F3D791]"
                    >
                      {d.short}
                    </button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#836DAD]/10">
              {hoursToRender.map((hour) => (
                <tr key={hour} className="hover:bg-[#F6F3FA]/70">
                  <td className="border-r border-[#836DAD]/15 bg-[#FAF8FC] px-2.5 py-2 text-left font-mono font-semibold text-[#2B1F42]">
                    {formatHourSlot(hour)}
                  </td>
                  {DAYS_OF_WEEK.map((d) => {
                    const key = `${d.index}-${hour}`;
                    const checked = Boolean(activeSlots[key]);
                    return (
                      <td
                        key={key}
                        className="border-r border-[#836DAD]/10 p-1 last:border-r-0"
                      >
                        <label
                          className={`flex h-8 w-full cursor-pointer items-center justify-center rounded-lg border transition-colors ${
                            checked
                              ? "border-[#836DAD] bg-[#836DAD] text-[#F3D791] font-bold"
                              : "border-transparent bg-[#FAF8FC] text-[#2B1F42]/35 hover:border-[#836DAD]/30"
                          }`}
                          title={`${d.label} de ${formatHourRange(hour)}`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleSlot(d.index, hour)}
                            className="sr-only"
                          />
                          <span>{checked ? "✓" : "—"}</span>
                        </label>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-[#836DAD]/25 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#836DAD]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() =>
              persistTherapistConfig(
                currentTherapistConfig,
                `Disponibilidad de ${modality} guardada (${totalSelectedSlots} turnos de 1 hora).`
              )
            }
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#836DAD] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-[#6F599B]"
          >
            <CheckCircle2 className="h-4 w-4 text-[#F3D791]" />
            <span>Guardar disponibilidad</span>
          </button>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. VISTA CONSULTANTE: PRESENCIAL CON TURNO / ONLINE CON TURNO
  // ============================================================================
  if (
    role === "Consultante" &&
    (modality === "Presencial con turno" || modality === "Online con turno")
  ) {
    return (
      <div className="rounded-2xl border border-[#836DAD]/25 bg-[#FAF8FC] p-4 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#836DAD]/15 px-3 py-0.5 text-xs font-semibold text-[#836DAD]">
              <Search className="h-3.5 w-3.5" />
              <span>Búsqueda de Turnos (1 hora exacta)</span>
            </span>
            <h4 className="mt-1 text-base sm:text-lg font-bold text-[#2B1F42]">
              {modality}
            </h4>
          </div>

          <button
            type="button"
            onClick={() => {
              setExpandedSearch((prev) => !prev);
              if (!expandedSearch) {
                setSearchHour("all");
                setMaxDistanceKm(500);
              }
            }}
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-all ${
              expandedSearch
                ? "border-[#836DAD] bg-[#836DAD] text-white shadow-xs"
                : "border-[#836DAD]/35 bg-white text-[#836DAD] hover:bg-[#836DAD] hover:text-white"
            }`}
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>
              {expandedSearch ? "Búsqueda ampliada activa" : "Ampliar búsqueda"}
            </span>
          </button>
        </div>

        {/* Filtros de Fecha, Hora (12, 13, 14 hs...) y Geoposición / Localidad */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="block text-xs font-semibold text-[#2B1F42]">
              Fecha del turno
            </label>
            <div className="relative mt-1">
              <Calendar className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#836DAD]" />
              <input
                type="date"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="w-full rounded-xl border border-[#836DAD]/30 bg-white py-2 pr-3 pl-9 text-xs sm:text-sm text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B1F42]">
              Hora de inicio (1 h)
            </label>
            <div className="relative mt-1">
              <Clock className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#836DAD]" />
              <select
                value={searchHour}
                onChange={(e) =>
                  setSearchHour(
                    e.target.value === "all" ? "all" : Number(e.target.value)
                  )
                }
                className="w-full rounded-xl border border-[#836DAD]/30 bg-white py-2 pr-3 pl-9 text-xs sm:text-sm text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
              >
                <option value="all">Todas las horas (24 hs)</option>
                {HOURS_24.map((h) => (
                  <option key={h} value={h}>
                    {formatHourSlot(h)} (1 hora)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#2B1F42]">
              Criterio de ubicación
            </label>
            <div className="mt-1 grid grid-cols-2 gap-1.5 rounded-xl border border-[#836DAD]/25 bg-white p-1">
              <button
                type="button"
                onClick={() => setLocationFilterMode("geoposicion")}
                className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  locationFilterMode === "geoposicion"
                    ? "bg-[#836DAD] text-white"
                    : "text-[#2B1F42] hover:bg-[#F6F3FA]"
                }`}
              >
                Cercanía GPS
              </button>
              <button
                type="button"
                onClick={() => setLocationFilterMode("localidad")}
                className={`cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
                  locationFilterMode === "localidad"
                    ? "bg-[#836DAD] text-white"
                    : "text-[#2B1F42] hover:bg-[#F6F3FA]"
                }`}
              >
                Por localidad
              </button>
            </div>
          </div>

          {locationFilterMode === "geoposicion" ? (
            <div>
              <label className="block text-xs font-semibold text-[#2B1F42]">
                Radio desde tu geoposición
              </label>
              <select
                value={maxDistanceKm}
                onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs sm:text-sm text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
              >
                <option value={15}>Hasta 15 km</option>
                <option value={50}>Hasta 50 km</option>
                <option value={100}>Hasta 100 km</option>
                <option value={300}>Hasta 300 km</option>
                <option value={2000}>Sin límite de distancia</option>
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              <div>
                <label className="block text-xs font-semibold text-[#2B1F42]">
                  Provincia
                </label>
                <select
                  value={filterProvincia}
                  onChange={(e) => {
                    setFilterProvincia(e.target.value);
                    setFilterLocalidad("Todas");
                  }}
                  className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-2 py-2 text-xs text-[#2B1F42]"
                >
                  {PROVINCIAS_ARGENTINA.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#2B1F42]">
                  Localidad
                </label>
                <select
                  value={filterLocalidad}
                  onChange={(e) => setFilterLocalidad(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#836DAD]/30 bg-white px-2 py-2 text-xs text-[#2B1F42]"
                >
                  <option value="Todas">Todas</option>
                  {localidadesDisponibles.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Referencia de geoposición declarada del Consultante */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#836DAD]/20 bg-white px-3.5 py-2 text-xs text-[#2B1F42]/80">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <Navigation className="h-3.5 w-3.5 text-[#836DAD]" />
            <span>
              Tu geoposición declarada:{" "}
              <strong>
                {userProfile.localidad}, {userProfile.provincia}
              </strong>
            </span>
          </span>
          <span className="text-[11px] font-semibold text-[#836DAD]">
            Día seleccionado: {DAYS_OF_WEEK[selectedDayIndex]?.label}
          </span>
        </div>

        {bookingNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-[#836DAD] bg-white px-4 py-3 text-xs font-semibold text-[#836DAD]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{bookingNotice}</span>
          </div>
        )}

        {/* Listado de Terapeutas disponibles con la misma Identidad Visual de la Credencial Oficial */}
        <div>
          {matchingScheduledTherapists.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {matchingScheduledTherapists.map(
                ({ therapist, distanceKm, availableHoursOnDay }) => {
                  const canConvert =
                    modality === "Presencial con turno"
                      ? therapist.presencialConvertibleToOnline
                      : therapist.onlineConvertibleToPresencial;
                  const tNick = (
                    therapist.nickname ||
                    sanitizeNickname(therapist.therapistName)
                  ).toLowerCase();
                  const photoUrl =
                    therapist.fotoUrl ||
                    DEMO_SOCIAL_PROFILES[tNick]?.fotoUrl ||
                    "";
                  const initials = therapist.therapistName
                    .split(" ")
                    .filter(Boolean)
                    .map((p) => p[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();
                  const qrUrl = qrByNick[tNick];
                  const isFollowing = isFollowingProfile(
                    viewerNickname,
                    tNick,
                    followsList
                  );
                  const followsMe = isFollowingProfile(
                    tNick,
                    viewerNickname,
                    followsList
                  );
                  const followersCount = getFollowersForNickname(
                    tNick,
                    followsList
                  ).length;
                  const followingCount = getFollowingForNickname(
                    tNick,
                    followsList
                  ).length;

                  return (
                    <div
                      key={therapist.therapistId}
                      className="relative flex flex-col items-center justify-between overflow-hidden rounded-3xl border-2 border-[#F3D791] bg-[#836DAD] p-5 text-center text-white shadow-xl"
                    >
                      {/* 1. Cabecera Credencial con Isologotipo Oficial de Reiki Online */}
                      <div className="relative flex w-full flex-col items-center pt-1">
                        {followsMe && tNick !== viewerNickname && (
                          <span className="absolute top-0 left-0 inline-flex items-center gap-1 rounded-full bg-[#F3D791] px-2.5 py-0.5 text-[10px] font-bold text-[#2B1F42]">
                            Te sigue
                          </span>
                        )}
                        <span className="absolute top-0 right-0 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#F3D791]">
                          <MapPin className="h-3 w-3" />
                          {distanceKm} km
                        </span>
                        <img
                          src="/brand/Reiki_Online_Lavanda_Unificado.png"
                          alt="Reiki online — CONECTANDO BIENESTAR"
                          className="h-18 sm:h-20 w-auto max-w-[82%] object-contain"
                        />
                      </div>

                      {/* 2. Fotografía circular con aro Champán + Rol + Nombre + @nickname + Seguidores + Terapias */}
                      <div className="my-3 flex flex-col items-center">
                        <div className="h-18 w-18 overflow-hidden rounded-full border-2 border-[#F3D791] bg-[#F6F3FA] shadow-md flex items-center justify-center">
                          {photoUrl ? (
                            <img
                              src={photoUrl}
                              alt={therapist.therapistName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span className="text-xl font-bold text-[#836DAD]">
                              {initials}
                            </span>
                          )}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3D791] px-3 py-0.5 text-[10px] font-bold uppercase text-[#2B1F42]">
                            <UserCheck className="h-3 w-3" />
                            <span>Terapeuta</span>
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full border border-[#F3D791]/70 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-[#F3D791]">
                            ✓ Identidad verificada
                          </span>
                        </div>

                        <h5 className="mt-1.5 text-base font-bold text-white">
                          {therapist.therapistName}
                        </h5>
                        <p className="font-mono text-xs font-semibold text-[#F3D791]">
                          @{tNick}
                        </p>
                        <p className="mt-0.5 text-[11px] text-white/90">
                          {therapist.localidad}, {therapist.provincia}
                        </p>

                        <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                          <span>
                            <strong className="text-[#F3D791]">
                              {followersCount}
                            </strong>{" "}
                            {followersCount === 1 ? "seguidor" : "seguidores"}
                          </span>
                          <span className="text-white/40">•</span>
                          <span>
                            <strong className="text-[#F3D791]">
                              {followingCount}
                            </strong>{" "}
                            siguiendo
                          </span>
                        </div>

                        {canConvert && (
                          <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#F3D791]">
                            <ArrowLeftRight className="h-3 w-3" />
                            {modality === "Presencial con turno"
                              ? "Acepta convertir a Online"
                              : "Acepta convertir a Presencial"}
                          </span>
                        )}

                        <div className="mt-2.5 flex flex-wrap justify-center gap-1">
                          {therapist.therapies.slice(0, 3).map((th) => (
                            <span
                              key={th}
                              className="rounded-full border border-[#F3D791]/50 bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white"
                            >
                              {th}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* 3. Código QR + Link + Seguir + Turnos disponibles de 1 hora */}
                      <div className="w-full space-y-2.5 border-t border-white/15 pt-3.5">
                        <div className="flex flex-col items-center gap-1.5">
                          {qrUrl ? (
                            <div className="shrink-0 rounded-2xl bg-white p-2 shadow-md">
                              <img
                                src={qrUrl}
                                alt={`QR ${tNick}`}
                                width={76}
                                height={76}
                                className="block h-[76px] w-[76px] shrink-0 object-contain"
                              />
                            </div>
                          ) : (
                            <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-2xl bg-white p-2 text-[10px] font-bold text-[#2B1F42] shadow-md">
                              QR...
                            </div>
                          )}
                          <a
                            href={`/${tNick}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F3D791] hover:underline break-all"
                          >
                            <span>reikionline.com.ar/{tNick}</span>
                            <ExternalLink className="h-3 w-3 shrink-0" />
                          </a>
                        </div>

                        {tNick !== viewerNickname && (
                          <button
                            type="button"
                            onClick={() =>
                              handleToggleFollowPerson({
                                nickname: tNick,
                                name: therapist.therapistName,
                                role: "Terapeuta",
                              })
                            }
                            className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                              isFollowing
                                ? "border border-white bg-white text-[#836DAD] hover:bg-[#F6F3FA]"
                                : "border border-[#F3D791] bg-white/15 text-white hover:bg-[#F3D791] hover:text-[#2B1F42]"
                            }`}
                          >
                            {isFollowing ? (
                              <>
                                <Check className="h-3.5 w-3.5" />
                                <span>Siguiendo</span>
                              </>
                            ) : (
                              <>
                                <UserPlus className="h-3.5 w-3.5 text-[#F3D791]" />
                                <span>Seguir Terapeuta</span>
                              </>
                            )}
                          </button>
                        )}

                        <div className="space-y-1.5 pt-1">
                          <span className="block text-[10px] font-bold uppercase tracking-wider text-[#F3D791]">
                            Turnos disponibles (1 h):
                          </span>
                          <div className="flex flex-wrap justify-center gap-1.5">
                            {availableHoursOnDay.slice(0, 6).map((slot, idx) => (
                              <button
                                key={`${slot.dayLabel}-${slot.hour}-${idx}`}
                                type="button"
                                onClick={() =>
                                  setCheckoutTarget({
                                    therapist,
                                    distanceKm,
                                    bookingTiming: "con_turno",
                                    attentionModality:
                                      modality === "Presencial con turno"
                                        ? "presencial"
                                        : "distancia_con_video",
                                    scheduledSlotLabel: `${slot.dayLabel} · ${formatHourRange(
                                      slot.hour
                                    )}`,
                                    slotKey: `${slot.dayLabel}-${slot.hour}`,
                                  })
                                }
                                className="cursor-pointer rounded-xl bg-[#F3D791] px-2.5 py-1.5 text-[11px] font-bold text-[#2B1F42] transition-colors hover:bg-white"
                              >
                                {slot.dayLabel} · {formatHourSlot(slot.hour)}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#836DAD]/20 bg-white p-6 text-center space-y-3">
              <p className="text-sm font-semibold text-[#2B1F42]">
                No encontramos turnos exactos con ese filtro.
              </p>
              <button
                type="button"
                onClick={() => {
                  setExpandedSearch(true);
                  setSearchHour("all");
                  setMaxDistanceKm(2000);
                }}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-4 py-2 text-xs font-semibold text-white hover:bg-[#6F599B]"
              >
                <Maximize2 className="h-3.5 w-3.5 text-[#F3D791]" />
                <span>Ampliar búsqueda automáticamente</span>
              </button>
            </div>
          )}
        </div>

        {checkoutTarget && (
          <ConsultanteCheckoutModal
            isOpen={Boolean(checkoutTarget)}
            onClose={() => setCheckoutTarget(null)}
            consultanteProfile={userProfile}
            therapistId={checkoutTarget.therapist.therapistId}
            therapistName={checkoutTarget.therapist.therapistName}
            therapistNickname={sanitizeNickname(
              checkoutTarget.therapist.therapistName
            ).toLowerCase()}
            therapistLocalidad={checkoutTarget.therapist.localidad}
            therapistProvincia={checkoutTarget.therapist.provincia}
            availableTherapies={checkoutTarget.therapist.therapies}
            initialBookingTiming={checkoutTarget.bookingTiming}
            initialAttentionModality={checkoutTarget.attentionModality}
            scheduledSlotLabel={checkoutTarget.scheduledSlotLabel}
            slotKey={checkoutTarget.slotKey}
            onPaymentConfirmed={(tx) => {
              setBookingNotice(
                `¡Contratación confirmada con ${
                  tx.therapistName
                }! Pago único aprobado (${formatArs(
                  tx.sessionPriceArs
                )}) con Split 1:1 Mercado Pago. Turno: ${tx.scheduledSlotLabel}.`
              );
            }}
          />
        )}
      </div>
    );
  }

  // ============================================================================
  // 3. VISTA ONLINE AHORA (Consultante: grilla en vivo estilo Grindr | Terapeuta: En línea + Alertas WhatsApp)
  // ============================================================================
  if (role === "Terapeuta" && modality === "Online ahora") {
    const myAlerts = matchAlerts.filter(
      (a) =>
        a.therapistId === userProfile.id ||
        a.therapistName.toLowerCase() ===
          `${userProfile.nombre} ${userProfile.apellido}`.trim().toLowerCase()
    );

    return (
      <div className="rounded-2xl border border-[#836DAD]/25 bg-[#FAF8FC] p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#836DAD]/15 pb-4">
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl ${
                currentTherapistConfig.onlineNowActive
                  ? "bg-[#836DAD] text-[#F3D791]"
                  : "bg-[#836DAD]/15 text-[#2B1F42]"
              }`}
            >
              <Radio className="h-5 w-5" />
            </span>
            <div>
              <h4 className="text-base sm:text-lg font-bold text-[#2B1F42]">
                Online ahora — Estado en vivo y Alertas de Match
              </h4>
              <p className="text-xs text-[#2B1F42]/70">
                Aparecé conectado en tiempo real para consultantes que buscan sesión inmediata.
              </p>
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
              currentTherapistConfig.onlineNowActive
                ? "bg-[#836DAD] text-[#F3D791]"
                : "bg-[#836DAD]/12 text-[#2B1F42]/70"
            }`}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                currentTherapistConfig.onlineNowActive
                  ? "bg-[#F3D791]"
                  : "bg-[#836DAD]/45"
              }`}
            />
            {currentTherapistConfig.onlineNowActive
              ? "CONECTADO EN LÍNEA"
              : "DESCONECTADO"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="ro-choice-label flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-[#836DAD]/30 bg-white p-4">
            <div>
              <span className="block text-sm font-bold text-[#2B1F42]">
                Permanecer en línea ahora
              </span>
              <span className="text-xs text-[#2B1F42]/70">
                Visible en el radar en vivo de consultantes cercanos.
              </span>
            </div>
            <input
              type="checkbox"
              checked={currentTherapistConfig.onlineNowActive}
              onChange={(e) =>
                persistTherapistConfig(
                  {
                    ...currentTherapistConfig,
                    onlineNowActive: e.target.checked,
                  },
                  e.target.checked
                    ? "Ya estás en línea para recibir Match en vivo."
                    : "Saliste del radar en vivo."
                )
              }
              className="h-5 w-5 cursor-pointer rounded border-[#836DAD]"
            />
          </label>

          <label className="ro-choice-label flex cursor-pointer items-center justify-between gap-3 rounded-2xl border-2 border-[#836DAD]/30 bg-white p-4">
            <div>
              <span className="block text-sm font-bold text-[#2B1F42]">
                Alertas internas a mi WhatsApp verificado
              </span>
              <span className="text-xs text-[#2B1F42]/70">
                Tu número es estrictamente confidencial y no será publicable bajo ningún concepto.
              </span>
            </div>
            <input
              type="checkbox"
              checked={currentTherapistConfig.onlineNowWhatsappAlerts}
              onChange={(e) =>
                persistTherapistConfig(
                  {
                    ...currentTherapistConfig,
                    onlineNowWhatsappAlerts: e.target.checked,
                  },
                  "Configuración de alertas de WhatsApp actualizada."
                )
              }
              className="h-5 w-5 cursor-pointer rounded border-[#836DAD]"
            />
          </label>
        </div>

        {savedNotice && (
          <div className="flex items-center gap-2 rounded-xl border border-[#836DAD]/25 bg-white px-3.5 py-2.5 text-xs font-semibold text-[#836DAD]">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{savedNotice}</span>
          </div>
        )}

        {/* Solicitudes de Match entrantes */}
        <div className="rounded-2xl border border-[#836DAD]/20 bg-white p-4 space-y-2.5">
          <div className="flex items-center justify-between">
            <h5 className="text-xs sm:text-sm font-bold text-[#2B1F42]">
              Alertas de Match en tiempo real ({myAlerts.length})
            </h5>
            <MessageCircle className="h-4 w-4 text-[#836DAD]" />
          </div>
          {myAlerts.length > 0 ? (
            <ul className="space-y-2">
              {myAlerts.map((alert) => (
                <li
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-3 text-xs"
                >
                  <div>
                    <span className="font-bold text-[#2B1F42]">
                      {alert.consultanteName}
                    </span>{" "}
                    <span className="text-[#836DAD] font-semibold">
                      ({alert.distanceKm} km · {alert.consultanteLocalidad})
                    </span>
                    <p className="text-[11px] text-[#2B1F42]/75">
                      Busca: {alert.therapies.join(", ")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = matchAlerts.map((item) =>
                        item.id === alert.id
                          ? { ...item, status: "aceptado" as const }
                          : item
                      );
                      setMatchAlerts(updated);
                      setSavedNotice(
                        `Match confirmado en plataforma con ${alert.consultanteName}. Por privacidad y transparencia, los números de WhatsApp nunca se exponen.`
                      );
                      try {
                        window.localStorage.setItem(
                          MATCH_ALERTS_STORAGE_KEY,
                          JSON.stringify(updated)
                        );
                        window.dispatchEvent(new Event(SYNC_EVENT_NAME));
                      } catch {
                        // Ignore
                      }
                    }}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-[#836DAD] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#6F599B]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#F3D791]" />
                    <span>
                      {alert.status === "aceptado"
                        ? "Match confirmado"
                        : "Confirmar Match en plataforma"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-[#2B1F42]/65">
              Cuando un consultante toque «Match ahora» con tu perfil en línea, el sistema te enviará una alerta interna a tu WhatsApp verificado (sin publicar jamás tu número ni el del consultante).
            </p>
          )}
        </div>
      </div>
    );
  }

  // Consultante -> Online ahora (Radar estilo Grindr de Terapeutas conectados en el momento con la paleta oficial Reiki Online)
  return (
    <div className="rounded-2xl border border-[#836DAD]/25 bg-[#FAF8FC] p-4 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#836DAD]/15 pb-3.5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#836DAD]/15 px-3 py-0.5 text-xs font-bold text-[#836DAD]">
            <span className="h-2 w-2 rounded-full bg-[#836DAD]" />
            <span>{onlineNowTherapists.length} Terapeutas en línea ahora</span>
          </span>
          <h4 className="mt-1 text-base sm:text-lg font-bold text-[#2B1F42]">
            Conectados en este momento por cercanía
          </h4>
        </div>
        <span className="text-xs font-medium text-[#836DAD]">
          Ordenados desde tu geoposición ({userProfile.localidad})
        </span>
      </div>

      {bookingNotice && (
        <div className="flex items-center gap-2 rounded-xl border border-[#836DAD] bg-white px-4 py-3 text-xs font-semibold text-[#836DAD]">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{bookingNotice}</span>
        </div>
      )}

      {/* Grilla en vivo con la Identidad Visual exacta de la Credencial Oficial (colores #836DAD y #F3D791, fotografía, isologotipo agrandado y QR) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {onlineNowTherapists.map(({ therapist, distanceKm }) => {
          const initials = therapist.therapistName
            .split(" ")
            .filter(Boolean)
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const tNick = (
            therapist.nickname || sanitizeNickname(therapist.therapistName)
          ).toLowerCase();
          const photoUrl =
            therapist.fotoUrl || DEMO_SOCIAL_PROFILES[tNick]?.fotoUrl || "";
          const qrUrl = qrByNick[tNick];
          const isFollowing = isFollowingProfile(
            viewerNickname,
            tNick,
            followsList
          );
          const followsMe = isFollowingProfile(
            tNick,
            viewerNickname,
            followsList
          );
          const followersCount = getFollowersForNickname(
            tNick,
            followsList
          ).length;
          const followingCount = getFollowingForNickname(
            tNick,
            followsList
          ).length;

          return (
            <div
              key={therapist.therapistId}
              className="relative flex flex-col items-center justify-between overflow-hidden rounded-3xl border-2 border-[#F3D791] bg-[#836DAD] p-5 text-center text-white shadow-xl"
            >
              {/* 1. Cabecera Reiki Online con Isologotipo Oficial agrandado + Online + Distancia */}
              <div className="relative flex w-full flex-col items-center pt-1">
                <span className="absolute top-0 left-0 inline-flex items-center gap-1 rounded-full bg-[#F3D791] px-2.5 py-0.5 text-[10px] font-bold text-[#2B1F42]">
                  <span className="h-2 w-2 rounded-full bg-[#836DAD]" />
                  Online
                </span>
                <span className="absolute top-0 right-0 inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[10px] font-semibold text-[#F3D791]">
                  <MapPin className="h-3 w-3" />
                  {distanceKm} km
                </span>
                <img
                  src="/brand/Reiki_Online_Lavanda_Unificado.png"
                  alt="Reiki online — CONECTANDO BIENESTAR"
                  className="h-18 sm:h-20 w-auto max-w-[82%] object-contain"
                />
              </div>

              {/* 2. Fotografía circular con aro Champán + Rol + Nombre + @nickname + Seguidores + Terapias */}
              <div className="my-3 flex flex-col items-center">
                <div className="h-18 w-18 overflow-hidden rounded-full border-2 border-[#F3D791] bg-[#F6F3FA] shadow-md flex items-center justify-center">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={therapist.therapistName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-[#836DAD]">
                      {initials}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#F3D791] px-3 py-0.5 text-[10px] font-bold uppercase text-[#2B1F42]">
                    <UserCheck className="h-3 w-3" />
                    <span>Terapeuta</span>
                  </span>
                  {followsMe && tNick !== viewerNickname && (
                    <span className="inline-flex items-center rounded-full border border-[#F3D791] bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-[#F3D791]">
                      Te sigue
                    </span>
                  )}
                </div>

                <h5 className="mt-1.5 text-base font-bold text-white">
                  {therapist.therapistName}
                </h5>
                <p className="font-mono text-xs font-semibold text-[#F3D791]">
                  @{tNick}
                </p>
                <p className="mt-0.5 text-[11px] text-white/90">
                  {therapist.localidad}, {therapist.provincia}
                </p>

                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                  <span>
                    <strong className="text-[#F3D791]">
                      {followersCount}
                    </strong>{" "}
                    {followersCount === 1 ? "seguidor" : "seguidores"}
                  </span>
                  <span className="text-white/40">•</span>
                  <span>
                    <strong className="text-[#F3D791]">
                      {followingCount}
                    </strong>{" "}
                    siguiendo
                  </span>
                </div>

                <div className="mt-2.5 flex flex-wrap justify-center gap-1">
                  {therapist.therapies.slice(0, 3).map((th) => (
                    <span
                      key={th}
                      className="rounded-full border border-[#F3D791]/50 bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white"
                    >
                      {th}
                    </span>
                  ))}
                </div>
              </div>

              {/* 3. Código QR + Link + Seguir + Match ahora */}
              <div className="w-full space-y-2.5 border-t border-white/15 pt-3.5">
                <div className="flex flex-col items-center gap-1.5">
                  {qrUrl ? (
                    <div className="shrink-0 rounded-2xl bg-white p-2 shadow-md">
                      <img
                        src={qrUrl}
                        alt={`QR ${tNick}`}
                        width={84}
                        height={84}
                        className="block h-[84px] w-[84px] shrink-0 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-2xl bg-white p-2 text-[10px] font-bold text-[#2B1F42] shadow-md">
                      QR...
                    </div>
                  )}

                  <div className="text-center">
                    <a
                      href={`/${tNick}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#F3D791] hover:underline break-all"
                    >
                      <span>reikionline.com.ar/{tNick}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                    <span className="block text-[10px] font-bold text-[#F3D791]">
                      ✓ Identidad verificada
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {tNick !== viewerNickname && (
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleFollowPerson({
                          nickname: tNick,
                          name: therapist.therapistName,
                          role: "Terapeuta",
                        })
                      }
                      className={`inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition-all ${
                        isFollowing
                          ? "border border-white bg-white text-[#836DAD] hover:bg-[#F6F3FA]"
                          : "border border-[#F3D791] bg-white/15 text-white hover:bg-[#F3D791] hover:text-[#2B1F42]"
                      }`}
                    >
                      {isFollowing ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>Siguiendo</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="h-3.5 w-3.5 text-[#F3D791]" />
                          <span>Seguir Terapeuta</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() =>
                      setCheckoutTarget({
                        therapist,
                        distanceKm,
                        bookingTiming: "inmediata",
                        attentionModality: "distancia_con_video",
                        scheduledSlotLabel: "Contratación inmediata online",
                        slotKey: "inmediata",
                      })
                    }
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#F3D791] px-3.5 py-2 text-xs font-bold text-[#2B1F42] transition-colors hover:bg-white"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-[#836DAD]" />
                    <span>
                      Match ahora ·{" "}
                      {formatArs(
                        mpAccounts[therapist.therapistId]?.sessionPriceArs ||
                          mpAccounts[tNick]?.sessionPriceArs ||
                          30000
                      )}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {checkoutTarget && (
        <ConsultanteCheckoutModal
          isOpen={Boolean(checkoutTarget)}
          onClose={() => setCheckoutTarget(null)}
          consultanteProfile={userProfile}
          therapistId={checkoutTarget.therapist.therapistId}
          therapistName={checkoutTarget.therapist.therapistName}
          therapistNickname={sanitizeNickname(
            checkoutTarget.therapist.therapistName
          ).toLowerCase()}
          therapistLocalidad={checkoutTarget.therapist.localidad}
          therapistProvincia={checkoutTarget.therapist.provincia}
          availableTherapies={checkoutTarget.therapist.therapies}
          initialBookingTiming={checkoutTarget.bookingTiming}
          initialAttentionModality={checkoutTarget.attentionModality}
          scheduledSlotLabel={checkoutTarget.scheduledSlotLabel}
          slotKey={checkoutTarget.slotKey}
          onPaymentConfirmed={(tx) => {
            handleTriggerMatchNow(
              checkoutTarget.therapist,
              checkoutTarget.distanceKm
            );
            setBookingNotice(
              `¡Match inmediato y pago confirmado con ${
                tx.therapistName
              } (${formatArs(
                tx.sessionPriceArs
              )})! Acceso habilitado a la sesión online.`
            );
          }}
        />
      )}
    </div>
  );
}
