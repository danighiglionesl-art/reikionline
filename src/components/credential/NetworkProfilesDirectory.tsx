"use client";

import React, { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  Search,
  UserCheck,
  UserPlus,
  Users,
  HeartHandshake,
  MapPin,
  ExternalLink,
  CalendarCheck,
  Check,
} from "lucide-react";
import {
  getEffectiveNickname,
  ReikiUserProfile,
} from "@/lib/geoData";
import {
  getFollowersForNickname,
  getFollowingForNickname,
  isFollowingProfile,
  loadSocialFollows,
  SocialFollowRecord,
  SYNC_EVENT_NAME,
  toggleSocialFollow,
} from "@/lib/socialNetwork";

interface NetworkProfileCardItem {
  id: string;
  nombreCompleto: string;
  nickname: string;
  role: "Terapeuta" | "Consultante";
  fotoUrl: string;
  localidad: string;
  provincia: string;
  lat: number;
  lng: number;
  therapies: string[];
  visibleEnRed: boolean;
}

interface NetworkProfilesDirectoryProps {
  viewerRole: "Consultante" | "Terapeuta";
  viewerProfile: ReikiUserProfile;
  allStoredProfiles: Record<string, ReikiUserProfile>;
  onToggleViewerVisibility: (visible: boolean) => void;
  onSelectProfileToConnect: (item: NetworkProfileCardItem) => void;
}

const DEMO_NETWORK_PROFILES: NetworkProfileCardItem[] = [
  {
    id: "net-terapeuta-1",
    nombreCompleto: "Valeria Méndez",
    nickname: "valeriamendez",
    role: "Terapeuta",
    fotoUrl:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    localidad: "Córdoba",
    provincia: "Córdoba",
    lat: -31.4201,
    lng: -64.1888,
    therapies: [
      "Reiki Usui",
      "Alineación de chakras",
      "Limpieza y armonización energética",
      "Meditación guiada",
    ],
    visibleEnRed: true,
  },
  {
    id: "net-terapeuta-2",
    nombreCompleto: "Martín Arrieta",
    nickname: "martinarrieta",
    role: "Terapeuta",
    fotoUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    localidad: "Río Cuarto",
    provincia: "Córdoba",
    lat: -33.1232,
    lng: -64.3493,
    therapies: [
      "Reiki Karuna",
      "Tarot",
      "Lectura de registros akáshicos",
      "Constelaciones individuales",
    ],
    visibleEnRed: true,
  },
  {
    id: "net-terapeuta-3",
    nombreCompleto: "Lucía Peralta",
    nickname: "luciaperalta",
    role: "Terapeuta",
    fotoUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80",
    localidad: "Palermo",
    provincia: "Ciudad Autónoma de Buenos Aires",
    lat: -34.5889,
    lng: -58.4305,
    therapies: [
      "Flores de Bach",
      "Biodescodificación",
      "Sonoterapia con cuencos tibetanos",
    ],
    visibleEnRed: true,
  },
  {
    id: "net-consultante-1",
    nombreCompleto: "Sofía Villalba",
    nickname: "sofiavillalba",
    role: "Consultante",
    fotoUrl:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80",
    localidad: "Villa María",
    provincia: "Córdoba",
    lat: -32.4075,
    lng: -63.2402,
    therapies: ["Reiki Usui", "Meditación mindfulness", "Flores de Bach"],
    visibleEnRed: true,
  },
  {
    id: "net-consultante-2",
    nombreCompleto: "Nicolás Ferreyra",
    nickname: "nicoferreyra",
    role: "Consultante",
    fotoUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=400&q=80",
    localidad: "Rosario",
    provincia: "Santa Fe",
    lat: -32.9442,
    lng: -60.6505,
    therapies: ["Alineación de chakras", "Carta natal", "Biodescodificación"],
    visibleEnRed: true,
  },
  {
    id: "net-consultante-3",
    nombreCompleto: "Camila Quiroga",
    nickname: "camilaquiroga",
    role: "Consultante",
    fotoUrl:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80",
    localidad: "Mendoza",
    provincia: "Mendoza",
    lat: -32.8895,
    lng: -68.8458,
    therapies: ["Constelaciones familiares", "Reiki con cristales"],
    visibleEnRed: true,
  },
];

function calcDistanceKm(
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

export default function NetworkProfilesDirectory({
  viewerRole,
  viewerProfile,
  allStoredProfiles,
  onSelectProfileToConnect,
}: NetworkProfilesDirectoryProps) {
  const defaultRoleFilter: "Terapeuta" | "Consultante" =
    viewerRole === "Consultante" ? "Terapeuta" : "Consultante";

  const [roleFilter, setRoleFilter] = useState<
    "Terapeuta" | "Consultante" | "Todos"
  >(defaultRoleFilter);
  const [socialFilter, setSocialFilter] = useState<
    "todos" | "siguiendo" | "seguidores"
  >("todos");
  const [query, setQuery] = useState("");
  const [qrByNick, setQrByNick] = useState<Record<string, string>>({});
  const [followsList, setFollowsList] = useState<SocialFollowRecord[]>([]);

  const viewerNickname = useMemo(
    () => getEffectiveNickname(viewerProfile),
    [viewerProfile]
  );

  const viewerDisplayName = useMemo(() => {
    return (
      `${viewerProfile.nombre || ""} ${viewerProfile.apellido || ""}`.trim() ||
      viewerNickname
    );
  }, [viewerProfile.nombre, viewerProfile.apellido, viewerNickname]);

  useEffect(() => {
    setRoleFilter(viewerRole === "Consultante" ? "Terapeuta" : "Consultante");
  }, [viewerRole]);

  useEffect(() => {
    const syncFollows = () => {
      setFollowsList(loadSocialFollows());
    };
    syncFollows();
    if (typeof window === "undefined") return;
    window.addEventListener(SYNC_EVENT_NAME, syncFollows);
    window.addEventListener("storage", syncFollows);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, syncFollows);
      window.removeEventListener("storage", syncFollows);
    };
  }, []);

  const myFollowers = useMemo(
    () => getFollowersForNickname(viewerNickname, followsList),
    [viewerNickname, followsList]
  );
  const myFollowing = useMemo(
    () => getFollowingForNickname(viewerNickname, followsList),
    [viewerNickname, followsList]
  );

  const combinedProfiles = useMemo(() => {
    const map = new Map<string, NetworkProfileCardItem>();
    for (const demo of DEMO_NETWORK_PROFILES) {
      map.set(demo.nickname.toLowerCase(), demo);
    }

    for (const prof of Object.values(allStoredProfiles)) {
      const nick = getEffectiveNickname(prof);
      const mappedRole: "Terapeuta" | "Consultante" =
        prof.role === "consultante" && !prof.soyTerapeuta
          ? "Consultante"
          : "Terapeuta";

      map.set(nick, {
        id: prof.id,
        nombreCompleto: `${prof.nombre} ${prof.apellido}`.trim(),
        nickname: nick,
        role: mappedRole,
        fotoUrl: prof.fotoUrl || "",
        localidad: prof.localidad || "Córdoba",
        provincia: prof.provincia || "Córdoba",
        lat: prof.geo?.lat ?? -32.75472,
        lng: prof.geo?.lng ?? -64.33648,
        therapies: ["Reiki Usui", "Alineación de chakras", "Armonización energética"],
        visibleEnRed: prof.visibleEnRed ?? true,
      });
    }

    const q = query.trim().toLowerCase();
    return Array.from(map.values())
      .filter((item) => {
        // Si es Consultante y eligió NO ser visible en la red, no aparece
        if (item.role === "Consultante" && !item.visibleEnRed) return false;

        if (socialFilter === "siguiendo") {
          const iFollow = isFollowingProfile(
            viewerNickname,
            item.nickname,
            followsList
          );
          if (!iFollow) return false;
        } else if (socialFilter === "seguidores") {
          const followsMe = isFollowingProfile(
            item.nickname,
            viewerNickname,
            followsList
          );
          if (!followsMe) return false;
        } else {
          if (roleFilter !== "Todos" && item.role !== roleFilter) return false;
        }

        if (!q) return true;
        return (
          item.nombreCompleto.toLowerCase().includes(q) ||
          item.nickname.toLowerCase().includes(q) ||
          item.localidad.toLowerCase().includes(q) ||
          item.provincia.toLowerCase().includes(q) ||
          item.therapies.some((t) => t.toLowerCase().includes(q))
        );
      })
      .map((item) => ({
        item,
        distanceKm: calcDistanceKm(
          viewerProfile.geo?.lat ?? -32.75472,
          viewerProfile.geo?.lng ?? -64.33648,
          item.lat,
          item.lng
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [
    allStoredProfiles,
    roleFilter,
    socialFilter,
    query,
    viewerProfile.geo,
    viewerNickname,
    followsList,
  ]);

  useEffect(() => {
    let active = true;
    Promise.all(
      combinedProfiles.map(async ({ item }) => {
        const url = `https://www.reikionline.com.ar/${item.nickname}`;
        try {
          const dataUrl = await QRCode.toDataURL(url, {
            width: 180,
            margin: 1,
            color: { dark: "#2B1F42", light: "#FFFFFF" },
          });
          return [item.nickname, dataUrl] as const;
        } catch {
          return [item.nickname, ""] as const;
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
  }, [combinedProfiles]);

  const handleToggleFollow = (target: NetworkProfileCardItem) => {
    const res = toggleSocialFollow({
      followerNickname: viewerNickname,
      followerName: viewerDisplayName,
      followerRole: viewerRole,
      followerFotoUrl: viewerProfile.fotoUrl || "",
      targetNickname: target.nickname,
      targetName: target.nombreCompleto,
      targetRole: target.role,
      targetFotoUrl: target.fotoUrl || "",
    });
    setFollowsList(res.list);
  };

  return (
    <div className="space-y-4">
      {/* Barra superior: Buscador + Filtros de Red Social (Terapeutas / Consultantes / Siguiendo / Mis Seguidores) */}
      <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] p-4 space-y-3">
        <div className="relative w-full">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[#836DAD]" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar Terapeuta o Consultante por nombre, @nickname, localidad o terapia..."
            className="w-full rounded-xl border border-[#836DAD]/30 bg-white py-2.5 pr-3.5 pl-9 text-xs sm:text-sm text-[#2B1F42] placeholder:text-[#2B1F42]/45 focus:border-[#836DAD] focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Selector de Rol en la Red */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(["Terapeuta", "Consultante", "Todos"] as const).map((r) => {
              const active = socialFilter === "todos" && roleFilter === r;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    setSocialFilter("todos");
                    setRoleFilter(r);
                  }}
                  className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? "bg-[#836DAD] text-white shadow-xs"
                      : "border border-[#836DAD]/25 bg-white text-[#2B1F42] hover:border-[#836DAD]"
                  }`}
                >
                  {r === "Terapeuta"
                    ? "Terapeutas"
                    : r === "Consultante"
                    ? "Consultantes"
                    : "Toda la Red"}
                </button>
              );
            })}
          </div>

          {/* Filtros de Seguidores / Siguiendo */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setSocialFilter((prev) =>
                  prev === "siguiendo" ? "todos" : "siguiendo"
                )
              }
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                socialFilter === "siguiendo"
                  ? "bg-[#836DAD] text-[#F3D791] shadow-xs"
                  : "border border-[#836DAD]/25 bg-white text-[#836DAD] hover:border-[#836DAD]"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Siguiendo ({myFollowing.length})</span>
            </button>

            <button
              type="button"
              onClick={() =>
                setSocialFilter((prev) =>
                  prev === "seguidores" ? "todos" : "seguidores"
                )
              }
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                socialFilter === "seguidores"
                  ? "bg-[#836DAD] text-[#F3D791] shadow-xs"
                  : "border border-[#836DAD]/25 bg-white text-[#836DAD] hover:border-[#836DAD]"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Mis Seguidores ({myFollowers.length})</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grilla de Perfiles con formato similar a la Credencial */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {combinedProfiles.map(({ item, distanceKm }) => {
          const initials = item.nombreCompleto
            .split(" ")
            .filter(Boolean)
            .map((p) => p[0])
            .join("")
            .slice(0, 2)
            .toUpperCase();
          const qrUrl = qrByNick[item.nickname];
          const isSelf = item.nickname.toLowerCase() === viewerNickname;
          const isFollowing = isFollowingProfile(
            viewerNickname,
            item.nickname,
            followsList
          );
          const followsMe = isFollowingProfile(
            item.nickname,
            viewerNickname,
            followsList
          );
          const itemFollowersCount = getFollowersForNickname(
            item.nickname,
            followsList
          ).length;
          const itemFollowingCount = getFollowingForNickname(
            item.nickname,
            followsList
          ).length;

          return (
            <div
              key={item.id}
              className="relative flex flex-col items-center justify-between overflow-hidden rounded-3xl border-2 border-[#F3D791] bg-[#836DAD] p-5 text-center text-white shadow-xl"
            >
              {/* 1. Cabecera Reiki Online con Isologotipo Oficial agrandado para mayor presencia */}
              <div className="relative flex w-full flex-col items-center pt-1">
                {followsMe && !isSelf && (
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

              {/* 2. Foto + Rol + Nombre y Apellido + Nickname + Seguidores */}
              <div className="my-3 flex flex-col items-center">
                <div className="h-18 w-18 overflow-hidden rounded-full border-2 border-[#F3D791] bg-[#F6F3FA] shadow-md flex items-center justify-center">
                  {item.fotoUrl ? (
                    <img
                      src={item.fotoUrl}
                      alt={item.nombreCompleto}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-xl font-bold text-[#836DAD]">
                      {initials}
                    </span>
                  )}
                </div>

                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase ${
                    item.role === "Terapeuta"
                      ? "bg-[#F3D791] text-[#2B1F42]"
                      : "border border-[#F3D791] bg-white/15 text-white"
                  }`}
                >
                  {item.role === "Terapeuta" ? (
                    <UserCheck className="h-3 w-3" />
                  ) : (
                    <HeartHandshake className="h-3 w-3 text-[#F3D791]" />
                  )}
                  <span>{item.role}</span>
                </span>

                <h5 className="mt-1.5 text-base font-bold text-white">
                  {item.nombreCompleto}
                </h5>
                <p className="text-xs font-semibold text-[#F3D791]">
                  @{item.nickname}
                </p>
                <p className="mt-0.5 text-[11px] text-white/90">
                  {item.localidad}, {item.provincia}
                </p>

                {/* Contadores de Red Social: Seguidores y Siguiendo */}
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                  <span>
                    <strong className="text-[#F3D791]">
                      {itemFollowersCount}
                    </strong>{" "}
                    {itemFollowersCount === 1 ? "seguidor" : "seguidores"}
                  </span>
                  <span className="text-white/40">•</span>
                  <span>
                    <strong className="text-[#F3D791]">
                      {itemFollowingCount}
                    </strong>{" "}
                    siguiendo
                  </span>
                </div>

                {item.role === "Terapeuta" && item.therapies.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap justify-center gap-1">
                    {item.therapies.slice(0, 3).map((th) => (
                      <span
                        key={th}
                        className="rounded-full border border-[#F3D791]/50 bg-white/15 px-2 py-0.5 text-[10px] font-medium text-white"
                      >
                        {th}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Código QR visible + Link + Botón Seguir + Botón Conectar */}
              <div className="w-full space-y-2.5 border-t border-white/15 pt-3.5">
                <div className="flex flex-col items-center gap-2">
                  {qrUrl ? (
                    <div className="shrink-0 rounded-2xl bg-white p-2 shadow-md">
                      <img
                        src={qrUrl}
                        alt={`QR ${item.nickname}`}
                        width={84}
                        height={84}
                        className="block h-[84px] w-[84px] min-h-[84px] min-w-[84px] shrink-0 object-contain"
                      />
                    </div>
                  ) : (
                    <div className="flex h-[84px] w-[84px] shrink-0 items-center justify-center rounded-2xl bg-white p-2 text-[10px] font-bold text-[#2B1F42] shadow-md">
                      QR...
                    </div>
                  )}

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => onSelectProfileToConnect(item)}
                      className="inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold text-[#F3D791] hover:underline break-all"
                    >
                      <span>reikionline.com.ar/{item.nickname}</span>
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </button>
                    <span className="block text-[10px] font-bold text-[#F3D791]">
                      ✓ Identidad verificada
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  {!isSelf && (
                    <button
                      type="button"
                      onClick={() => handleToggleFollow(item)}
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
                          <span>Seguir {item.role}</span>
                        </>
                      )}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => onSelectProfileToConnect(item)}
                    className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl bg-[#F3D791] px-3.5 py-2 text-xs font-bold text-[#2B1F42] transition-colors hover:bg-white"
                  >
                    <CalendarCheck className="h-3.5 w-3.5 text-[#836DAD]" />
                    <span>
                      {item.role === "Terapeuta"
                        ? "Elegir Terapeuta"
                        : "Conectar con Consultante"}
                    </span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
