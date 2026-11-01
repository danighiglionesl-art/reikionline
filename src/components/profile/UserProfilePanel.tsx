"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildGoogleMapsEmbedUrl,
  buildGoogleMapsExternalUrl,
  formatToE164,
  getLocalidadesParaProvincia,
  PAISES,
  PROVINCIAS_ARGENTINA,
  ReikiUserProfile,
} from "@/lib/geoData";
import WhatsAppVerificationStep from "@/components/auth/WhatsAppVerificationStep";

interface UserProfilePanelProps {
  profile: ReikiUserProfile;
  onSaveProfile: (updated: ReikiUserProfile) => void;
}

function detectDeviceOS(): "Android" | "iOS" | "Windows" | "Other" {
  if (typeof window === "undefined") return "Windows";
  const ua = window.navigator.userAgent || "";
  if (/android/i.test(ua)) return "Android";
  if (/iPad|iPhone|iPod/i.test(ua)) return "iOS";
  if (/Win/i.test(ua)) return "Windows";
  return "Other";
}

export default function UserProfilePanel({
  profile,
  onSaveProfile,
}: UserProfilePanelProps) {
  const [nombre, setNombre] = useState(profile.nombre);
  const [apellido, setApellido] = useState(profile.apellido);
  const [dni, setDni] = useState(profile.dni);
  const [fechaNacimiento, setFechaNacimiento] = useState(
    profile.fechaNacimiento
  );
  const [genero, setGenero] = useState<ReikiUserProfile["genero"]>(
    profile.genero || "Hombre"
  );

  const [prefijoTelefono, setPrefijoTelefono] = useState(
    profile.prefijoTelefono || "+54"
  );
  const [telefono, setTelefono] = useState(profile.telefono);
  const [whatsappVerified, setWhatsappVerified] = useState(
    profile.whatsappVerified
  );
  const [whatsappVerifiedAt, setWhatsappVerifiedAt] = useState<string | null>(
    profile.whatsappVerifiedAt
  );
  const [verifiedE164, setVerifiedE164] = useState(profile.whatsappE164);

  const [pais, setPais] = useState(profile.pais || "Argentina");
  const [provincia, setProvincia] = useState(profile.provincia || "Córdoba");

  const localidadesDisponibles = useMemo(() => {
    if (pais !== "Argentina") return [];
    return getLocalidadesParaProvincia(provincia);
  }, [pais, provincia]);

  const initialIsCustomLoc = useMemo(() => {
    if (pais !== "Argentina") return true;
    return (
      Boolean(profile.localidad) &&
      !localidadesDisponibles.includes(profile.localidad)
    );
  }, [pais, profile.localidad, localidadesDisponibles]);

  const [usarLocalidadManual, setUsarLocalidadManual] =
    useState(initialIsCustomLoc);
  const [localidad, setLocalidad] = useState(
    profile.localidad || "Alcira Gigena"
  );
  const [localidadManual, setLocalidadManual] = useState(
    initialIsCustomLoc ? profile.localidad : ""
  );

  const [codigoPostal, setCodigoPostal] = useState(
    profile.codigoPostal || "5813"
  );
  const [barrio, setBarrio] = useState(profile.barrio || "Centro");
  const [calle, setCalle] = useState(profile.calle || "San Martin");
  const [numeroCalle, setNumeroCalle] = useState(profile.numeroCalle || "362");

  const [edificio, setEdificio] = useState(profile.edificio || "");
  const [torre, setTorre] = useState(profile.torre || "");
  const [piso, setPiso] = useState(profile.piso || "");
  const [dpto, setDpto] = useState(profile.dpto || "");
  const [observacionesDomicilio, setObservacionesDomicilio] = useState(
    profile.observacionesDomicilio || ""
  );

  // Geoposición satelital e Imagen de Maps
  const [osDetected, setOsDetected] = useState<
    "Android" | "iOS" | "Windows" | "Other"
  >(profile.geo?.osDetected || "Windows");
  const [latInput, setLatInput] = useState(
    String(profile.geo?.lat ?? -32.75472)
  );
  const [lngInput, setLngInput] = useState(
    String(profile.geo?.lng ?? -64.33648)
  );
  const [accuracyMeters, setAccuracyMeters] = useState<number | undefined>(
    profile.geo?.accuracyMeters
  );
  const [captureMode, setCaptureMode] = useState<
    "auto-gps-mobile" | "manual-windows" | "geocoded-address"
  >(profile.geo?.captureMode || "manual-windows");
  const [mapLayer, setMapLayer] = useState<"h" | "k" | "m">("h");
  const [geoStatusMsg, setGeoStatusMsg] = useState<string | null>(null);
  const [geoLoading, setGeoLoading] = useState(false);

  // Control de reverificación si cambia el número de WhatsApp
  const [showReverifyModal, setShowReverifyModal] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{
    type: "ok" | "err" | "warn";
    text: string;
  } | null>(null);

  const currentE164 = formatToE164(prefijoTelefono, telefono);
  const phoneChangedSinceVerification =
    currentE164 !== verifiedE164 || !whatsappVerified;

  const localidadFinal =
    pais !== "Argentina" || usarLocalidadManual ? localidadManual : localidad;

  const formattedAddress = useMemo(() => {
    const parts = [
      `${calle} ${numeroCalle}`.trim(),
      barrio ? `Barrio ${barrio}` : "",
      localidadFinal
        ? `${localidadFinal}${codigoPostal ? ` (CP ${codigoPostal})` : ""}`
        : "",
      provincia,
      pais,
    ].filter(Boolean);
    return parts.join(", ");
  }, [calle, numeroCalle, barrio, localidadFinal, codigoPostal, provincia, pais]);

  // Solicitar geoposición satelital del dispositivo (automática en Android / iOS previa autorización)
  const requestSatelliteGps = useCallback(
    (isAutoMobileTrigger = false) => {
      if (typeof window === "undefined" || !("geolocation" in navigator)) {
        setGeoStatusMsg(
          "Este navegador no soporta geolocalización satelital directa. Utilice el ajuste manual."
        );
        return;
      }

      setGeoLoading(true);
      setGeoStatusMsg(
        isAutoMobileTrigger
          ? "Dispositivo móvil detectado (Android/iOS): solicitando autorización para geoposición satelital automática..."
          : "Consultando señal GPS / ubicación del dispositivo..."
      );

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newLat = Number(pos.coords.latitude.toFixed(6));
          const newLng = Number(pos.coords.longitude.toFixed(6));
          const acc = Math.round(pos.coords.accuracy || 10);
          setLatInput(String(newLat));
          setLngInput(String(newLng));
          setAccuracyMeters(acc);
          setCaptureMode(
            isAutoMobileTrigger ? "auto-gps-mobile" : "manual-windows"
          );
          setGeoLoading(false);
          setGeoStatusMsg(
            `Geoposición satelital capturada con éxito (${newLat}, ${newLng} • precisión ±${acc}m).`
          );
        },
        (err) => {
          setGeoLoading(false);
          if (err.code === err.PERMISSION_DENIED) {
            setGeoStatusMsg(
              "Autorización de ubicación denegada en el dispositivo. Podés habilitar el permiso o ajustar tu ubicación manualmente debajo."
            );
          } else {
            setGeoStatusMsg(
              "No se pudo obtener señal satelital en este momento. Se mantiene la ubicación del domicilio en el mapa."
            );
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 12000,
          maximumAge: 0,
        }
      );
    },
    []
  );

  // Detectar SO al montar: si es Android o iOS, disparar geoposición satelital automática previa autorización
  useEffect(() => {
    const detected = detectDeviceOS();
    setOsDetected(detected);
    if (detected === "Android" || detected === "iOS") {
      requestSatelliteGps(true);
    }
  }, [requestSatelliteGps]);

  // En Windows (o cualquier dispositivo): geocodificar manualmente a partir de la dirección cargada
  async function geocodeAddressManually() {
    setGeoLoading(true);
    setGeoStatusMsg("Buscando coordenadas satelitales del domicilio cargado...");
    try {
      const query = `${calle} ${numeroCalle}, ${localidadFinal}, ${provincia}, ${pais}`;
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
        query
      )}`;
      const res = await fetch(url, {
        headers: { "Accept-Language": "es" },
      });
      const data = await res.json();

      if (Array.isArray(data) && data.length > 0 && data[0].lat && data[0].lon) {
        const foundLat = Number(parseFloat(data[0].lat).toFixed(6));
        const foundLng = Number(parseFloat(data[0].lon).toFixed(6));
        setLatInput(String(foundLat));
        setLngInput(String(foundLng));
        setCaptureMode("geocoded-address");
        setGeoStatusMsg(
          `Ubicación localizada en el mapa satelital para: ${query} (${foundLat}, ${foundLng}).`
        );
        setGeoLoading(false);
        return;
      }

      // Fallback search by locality + province + country
      const fallbackQuery = `${localidadFinal}, ${provincia}, ${pais}`;
      const resFallback = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          fallbackQuery
        )}`,
        { headers: { "Accept-Language": "es" } }
      );
      const dataFallback = await resFallback.json();
      if (
        Array.isArray(dataFallback) &&
        dataFallback.length > 0 &&
        dataFallback[0].lat &&
        dataFallback[0].lon
      ) {
        const foundLat = Number(parseFloat(dataFallback[0].lat).toFixed(6));
        const foundLng = Number(parseFloat(dataFallback[0].lon).toFixed(6));
        setLatInput(String(foundLat));
        setLngInput(String(foundLng));
        setCaptureMode("geocoded-address");
        setGeoStatusMsg(
          `Mapa centrado en ${localidadFinal}, ${provincia} (${foundLat}, ${foundLng}). Podés ajustar el punto exacto con las flechas o coordenadas.`
        );
      } else {
        setGeoStatusMsg(
          "No se encontraron coordenadas automáticas para esa calle; podés ajustar latitud y longitud manualmente."
        );
      }
    } catch {
      setGeoStatusMsg(
        "Se actualizará el mapa con las coordenadas manuales ingresadas."
      );
    } finally {
      setGeoLoading(false);
    }
  }

  function nudgeCoordinates(dLat: number, dLng: number) {
    const curLat = parseFloat(latInput) || -32.75472;
    const curLng = parseFloat(lngInput) || -64.33648;
    setLatInput((curLat + dLat).toFixed(6));
    setLngInput((curLng + dLng).toFixed(6));
    setCaptureMode("manual-windows");
    setGeoStatusMsg("Coordenadas ajustadas manualmente en el mapa satelital.");
  }

  function handleProvinciaChange(nuevaProv: string) {
    setProvincia(nuevaProv);
    const nuevasLocs = getLocalidadesParaProvincia(nuevaProv);
    setUsarLocalidadManual(false);
    setLocalidad(nuevasLocs[0] || "");
  }

  function handlePaisChange(nuevoPais: string) {
    setPais(nuevoPais);
    const foundPais = PAISES.find((p) => p.nombre === nuevoPais);
    if (foundPais) {
      setPrefijoTelefono(foundPais.prefijo);
    }
    if (nuevoPais === "Argentina") {
      const provDefault = "Córdoba";
      setProvincia(provDefault);
      const locs = getLocalidadesParaProvincia(provDefault);
      setUsarLocalidadManual(false);
      setLocalidad(locs.includes("Alcira Gigena") ? "Alcira Gigena" : locs[0]);
    } else {
      setProvincia("");
      setUsarLocalidadManual(true);
      setLocalidadManual("");
    }
  }

  function handleSaveSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaveMessage(null);

    if (
      !nombre.trim() ||
      !apellido.trim() ||
      !dni.trim() ||
      !fechaNacimiento.trim() ||
      !genero ||
      !telefono.trim() ||
      !pais.trim() ||
      !provincia.trim() ||
      !localidadFinal.trim() ||
      !codigoPostal.trim() ||
      !barrio.trim() ||
      !calle.trim() ||
      !numeroCalle.trim()
    ) {
      setSaveMessage({
        type: "err",
        text: "Por favor completá todos los campos obligatorios marcados con asterisco (*).",
      });
      return;
    }

    const parsedLat = parseFloat(latInput) || -32.75472;
    const parsedLng = parseFloat(lngInput) || -64.33648;

    // Regla obligatoria: "Volver a verificar si el usuario cambia su número"
    const isNowVerified = !phoneChangedSinceVerification && whatsappVerified;

    const updatedProfile: ReikiUserProfile = {
      ...profile,
      nombre: nombre.trim(),
      apellido: apellido.trim(),
      dni: dni.trim(),
      fechaNacimiento,
      genero,
      prefijoTelefono,
      telefono: telefono.replace(/\D/g, ""),
      whatsappE164: currentE164,
      whatsappVerified: isNowVerified,
      whatsappVerifiedAt: isNowVerified ? whatsappVerifiedAt : null,
      pais,
      provincia: provincia.trim(),
      localidad: localidadFinal.trim(),
      codigoPostal: codigoPostal.trim(),
      barrio: barrio.trim(),
      calle: calle.trim(),
      numeroCalle: numeroCalle.trim(),
      edificio: edificio.trim(),
      torre: torre.trim(),
      piso: piso.trim(),
      dpto: dpto.trim(),
      observacionesDomicilio: observacionesDomicilio.trim(),
      geo: {
        lat: parsedLat,
        lng: parsedLng,
        accuracyMeters,
        captureMode,
        osDetected,
        capturedAt: new Date().toISOString(),
        formattedAddress,
      },
      updatedAt: new Date().toISOString(),
    };

    onSaveProfile(updatedProfile);

    if (!isNowVerified) {
      setWhatsappVerified(false);
      setWhatsappVerifiedAt(null);
      setShowReverifyModal(true);
      setSaveMessage({
        type: "warn",
        text: "Detectamos un cambio en tu número de WhatsApp. Por seguridad, verificá el nuevo número para mantener habilitadas las terapias.",
      });
    } else {
      setSaveMessage({
        type: "ok",
        text: "Datos de Mi Perfil y ubicación satelital de Maps guardados correctamente.",
      });
    }
  }

  const parsedLat = parseFloat(latInput) || -32.75472;
  const parsedLng = parseFloat(lngInput) || -64.33648;
  const mapEmbedUrl = buildGoogleMapsEmbedUrl(
    parsedLat,
    parsedLng,
    18,
    mapLayer
  );
  const mapExternalUrl = buildGoogleMapsExternalUrl(parsedLat, parsedLng);

  return (
    <div className="space-y-6">
      {/* Encabezado de Mi Perfil con estado de verificación WhatsApp */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#E6E0F0] bg-[#FAF8FC] px-4 py-3.5">
        <div>
          <h4 className="text-base font-bold text-[#2E2344]">
            Mi Perfil Institucional • Reiki Online
          </h4>
          <p className="text-xs text-[#2E2344]/70">
            Mismos campos obligatorios y padrón oficial de localidades que{" "}
            <span className="font-semibold text-[#5E4B8B]">
              bibliotecaroncedo.ar
            </span>{" "}
            + Geoposición Satelital Maps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {!phoneChangedSinceVerification && whatsappVerified ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-800">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              WhatsApp verificado ({verifiedE164})
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setShowReverifyModal(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 hover:bg-amber-200 transition cursor-pointer"
            >
              <span className="h-2 w-2 rounded-full bg-amber-600 animate-ping" />
              WhatsApp sin verificar • Clic para verificar
            </button>
          )}
        </div>
      </div>

      {/* Modal/Sección de reverificación de WhatsApp cuando cambia el número */}
      {showReverifyModal && (
        <div className="rounded-2xl border-2 border-[#836DAD] bg-[#FAF8FC] p-4 shadow-lg">
          <WhatsAppVerificationStep
            initialPrefijo={prefijoTelefono}
            initialTelefono={telefono}
            initialConsents={profile.consents}
            userEmail={profile.email}
            reasonMessage="Cambiaste tu número de WhatsApp o aún se encuentra pendiente de validación. Verificalo mediante Twilio Verify para habilitar las funciones de terapias."
            onVerified={(res) => {
              setPrefijoTelefono(res.prefijoTelefono);
              setTelefono(res.telefono);
              setVerifiedE164(res.whatsappE164);
              setWhatsappVerified(true);
              setWhatsappVerifiedAt(res.whatsappVerifiedAt);
              setShowReverifyModal(false);

              const updatedAfterVerify: ReikiUserProfile = {
                ...profile,
                nombre: nombre.trim(),
                apellido: apellido.trim(),
                dni: dni.trim(),
                fechaNacimiento,
                genero,
                prefijoTelefono: res.prefijoTelefono,
                telefono: res.telefono,
                whatsappE164: res.whatsappE164,
                whatsappVerified: true,
                whatsappVerifiedAt: res.whatsappVerifiedAt,
                whatsappChannel: res.channel,
                consents: res.consents,
                pais,
                provincia,
                localidad: localidadFinal,
                codigoPostal,
                barrio,
                calle,
                numeroCalle,
                edificio,
                torre,
                piso,
                dpto,
                observacionesDomicilio,
                geo: {
                  lat: parsedLat,
                  lng: parsedLng,
                  accuracyMeters,
                  captureMode,
                  osDetected,
                  capturedAt: new Date().toISOString(),
                  formattedAddress,
                },
                updatedAt: new Date().toISOString(),
              };
              onSaveProfile(updatedAfterVerify);
              setSaveMessage({
                type: "ok",
                text: `¡Número ${res.whatsappE164} verificado con éxito! Perfil actualizado.`,
              });
            }}
            onCancel={() => setShowReverifyModal(false)}
          />
        </div>
      )}

      {saveMessage && (
        <div
          role="status"
          className={`rounded-xl px-4 py-3 text-xs font-semibold border ${
            saveMessage.type === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : saveMessage.type === "warn"
              ? "border-amber-300 bg-amber-50 text-amber-900"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {saveMessage.text}
        </div>
      )}

      {/* Formulario principal idéntico a la captura de bibliotecaroncedo.ar */}
      <form onSubmit={handleSaveSubmit} className="space-y-4">
        <div className="rounded-2xl border border-[#DCE6F5] bg-[#F2F7FF] p-4 sm:p-5 space-y-4 shadow-inner">
          {/* Fila 1: Nombre * | Apellido * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ro-perfil-nombre"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Nombre *
              </label>
              <input
                id="ro-perfil-nombre"
                name="given-name"
                type="text"
                autoComplete="given-name"
                required
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ro-perfil-apellido"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Apellido *
              </label>
              <input
                id="ro-perfil-apellido"
                name="family-name"
                type="text"
                autoComplete="family-name"
                required
                value={apellido}
                onChange={(e) => setApellido(e.target.value)}
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 2: DNI / Documento * | Fecha de Nacimiento * | Género * */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="ro-perfil-dni"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                DNI / Documento *
              </label>
              <input
                id="ro-perfil-dni"
                name="dni"
                type="text"
                inputMode="numeric"
                required
                value={dni}
                onChange={(e) => setDni(e.target.value)}
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ro-perfil-nacimiento"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Fecha de Nacimiento *
              </label>
              <input
                id="ro-perfil-nacimiento"
                name="bday"
                type="date"
                autoComplete="bday"
                required
                value={fechaNacimiento}
                onChange={(e) => setFechaNacimiento(e.target.value)}
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ro-perfil-genero"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Género *
              </label>
              <select
                id="ro-perfil-genero"
                name="sex"
                autoComplete="sex"
                required
                value={genero}
                onChange={(e) =>
                  setGenero(e.target.value as ReikiUserProfile["genero"])
                }
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
              >
                <option value="Hombre">Hombre</option>
                <option value="Mujer">Mujer</option>
                <option value="No binario">No binario</option>
                <option value="Prefiero no decirlo">Prefiero no decirlo</option>
              </select>
            </div>
          </div>

          {/* Fila 3: WhatsApp / Celular de Contacto * | Correo Electrónico (No modificable) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ro-perfil-telefono"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                WhatsApp / Celular de Contacto *
              </label>
              <div className="grid grid-cols-[125px_1fr] gap-2">
                <select
                  aria-label="Prefijo de país"
                  value={prefijoTelefono}
                  onChange={(e) => setPrefijoTelefono(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD8EE] bg-white px-2.5 py-2.5 text-sm font-semibold text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
                >
                  {PAISES.map((p) => (
                    <option key={p.codigo} value={p.prefijo}>
                      {p.prefijo} ({p.nombre})
                    </option>
                  ))}
                </select>
                <input
                  id="ro-perfil-telefono"
                  name="tel-national"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  required
                  value={telefono}
                  onChange={(e) =>
                    setTelefono(e.target.value.replace(/[^\d\s-]/g, ""))
                  }
                  className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
                />
              </div>
              <p className="mt-1 text-[11px] text-[#64748B]">
                Número activo para notificaciones y avisos de Reiki Online (E.164:{" "}
                <span className="font-mono font-semibold text-[#5E4B8B]">
                  {currentE164}
                </span>
                ).
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label
                  htmlFor="ro-perfil-email"
                  className="block text-xs font-bold text-[#2B3A55]"
                >
                  Correo Electrónico
                </label>
                <span className="rounded-md bg-[#E2E8F0] px-2 py-0.5 text-[10px] font-semibold text-[#475569]">
                  No modificable
                </span>
              </div>
              <input
                id="ro-perfil-email"
                name="email"
                type="email"
                autoComplete="email"
                readOnly
                value={profile.email}
                className="w-full rounded-xl border border-[#CBD8EE] bg-[#F1F5F9] px-3.5 py-2.5 text-sm text-[#475569] cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-[#64748B]">
                Asociado a tu cuenta de acceso institucional.
              </p>
            </div>
          </div>

          {/* Fila 4: País * | Provincia * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ro-perfil-pais"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                País *
              </label>
              <select
                id="ro-perfil-pais"
                name="country-name"
                autoComplete="country-name"
                required
                value={pais}
                onChange={(e) => handlePaisChange(e.target.value)}
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
              >
                {PAISES.map((p) => (
                  <option key={p.codigo} value={p.nombre}>
                    {p.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="ro-perfil-provincia"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Provincia *
              </label>
              {pais === "Argentina" ? (
                <select
                  id="ro-perfil-provincia"
                  name="address-level1"
                  autoComplete="address-level1"
                  required
                  value={provincia}
                  onChange={(e) => handleProvinciaChange(e.target.value)}
                  className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
                >
                  {PROVINCIAS_ARGENTINA.map((prov) => (
                    <option key={prov} value={prov}>
                      {prov}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="ro-perfil-provincia"
                  name="address-level1"
                  type="text"
                  autoComplete="address-level1"
                  required
                  value={provincia}
                  onChange={(e) => setProvincia(e.target.value)}
                  placeholder="Estado / Provincia / Región"
                  className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* Fila 5: Localidad * | Código Postal * */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="ro-perfil-localidad"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Localidad *
              </label>
              {pais === "Argentina" && !usarLocalidadManual ? (
                <>
                  <select
                    id="ro-perfil-localidad"
                    name="address-level2"
                    autoComplete="address-level2"
                    required
                    value={localidad}
                    onChange={(e) => {
                      if (e.target.value === "__MANUAL__") {
                        setUsarLocalidadManual(true);
                        setLocalidadManual("");
                      } else {
                        setLocalidad(e.target.value);
                      }
                    }}
                    className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
                  >
                    {localidadesDisponibles.map((loc) => (
                      <option key={loc} value={loc}>
                        {loc}
                      </option>
                    ))}
                    <option value="__MANUAL__">
                      Otra localidad (escribir manualmente)...
                    </option>
                  </select>
                  <p className="mt-1 text-[11px] text-[#64748B]">
                    Localidades desplegadas de {provincia} (
                    {localidadesDisponibles.length} en padrón oficial).
                  </p>
                </>
              ) : (
                <div className="space-y-1">
                  <input
                    id="ro-perfil-localidad"
                    name="address-level2"
                    type="text"
                    autoComplete="address-level2"
                    required
                    value={localidadManual}
                    onChange={(e) => setLocalidadManual(e.target.value)}
                    placeholder="Escribí tu localidad"
                    className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
                  />
                  {pais === "Argentina" && (
                    <button
                      type="button"
                      onClick={() => {
                        setUsarLocalidadManual(false);
                        setLocalidad(localidadesDisponibles[0] || "");
                      }}
                      className="text-[11px] font-semibold text-[#836DAD] underline cursor-pointer"
                    >
                      Volver al listado oficial de {provincia}
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="ro-perfil-cp"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Código Postal *
              </label>
              <input
                id="ro-perfil-cp"
                name="postal-code"
                type="text"
                autoComplete="postal-code"
                required
                value={codigoPostal}
                onChange={(e) => setCodigoPostal(e.target.value)}
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-[#64748B]">
                Código postal de tu localidad (ej: 5813 para Alcira Gigena).
              </p>
            </div>
          </div>

          {/* Fila 6: Barrio * | Calle * | Número / Altura * */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label
                htmlFor="ro-perfil-barrio"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Barrio *
              </label>
              <input
                id="ro-perfil-barrio"
                name="barrio"
                type="text"
                required
                value={barrio}
                onChange={(e) => setBarrio(e.target.value)}
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ro-perfil-calle"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Calle *
              </label>
              <input
                id="ro-perfil-calle"
                name="address-line1"
                type="text"
                autoComplete="address-line1"
                required
                value={calle}
                onChange={(e) => setCalle(e.target.value)}
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ro-perfil-numero"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Número / Altura *
              </label>
              <input
                id="ro-perfil-numero"
                name="street-number"
                type="text"
                required
                value={numeroCalle}
                onChange={(e) => setNumeroCalle(e.target.value)}
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3.5 py-2.5 text-sm text-[#1E293B] focus:border-[#836DAD] focus:outline-none"
              />
            </div>
          </div>

          {/* Fila 7: Edificio | Torre | Piso | Dpto */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label
                htmlFor="ro-perfil-edificio"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Edificio
              </label>
              <input
                id="ro-perfil-edificio"
                type="text"
                value={edificio}
                onChange={(e) => setEdificio(e.target.value)}
                placeholder="Ej: Alborada..."
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3 py-2 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#836DAD] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ro-perfil-torre"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Torre
              </label>
              <input
                id="ro-perfil-torre"
                type="text"
                value={torre}
                onChange={(e) => setTorre(e.target.value)}
                placeholder="Ej: 1, A..."
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3 py-2 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#836DAD] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ro-perfil-piso"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Piso
              </label>
              <input
                id="ro-perfil-piso"
                type="text"
                value={piso}
                onChange={(e) => setPiso(e.target.value)}
                placeholder="Ej: 3, PB..."
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3 py-2 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#836DAD] focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="ro-perfil-dpto"
                className="block text-xs font-bold text-[#2B3A55] mb-1.5"
              >
                Dpto
              </label>
              <input
                id="ro-perfil-dpto"
                name="address-line2"
                type="text"
                autoComplete="address-line2"
                value={dpto}
                onChange={(e) => setDpto(e.target.value)}
                placeholder="Ej: B, 4..."
                className="w-full rounded-xl border border-[#CBD8EE] bg-white px-3 py-2 text-sm text-[#1E293B] placeholder:text-[#94A3B8] focus:border-[#836DAD] focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* SECCIÓN DE GEOPOSICIÓN SATELITAL E IMAGEN DE MAPS EN EL PERFIL */}
        <div className="rounded-2xl border border-[#E6E0F0] bg-white p-4 sm:p-5 shadow-sm space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[#F4F0FA] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#836DAD]">
                  Geoposición Satelital • Google Maps
                </span>
                <span className="inline-flex items-center rounded-full bg-[#F3D791]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#5E4B8B]">
                  SO detectado: {osDetected}
                </span>
              </div>
              <h5 className="mt-1.5 text-sm font-bold text-[#2E2344]">
                Ubicación Satelital e Imagen de Maps del Perfil
              </h5>
              <p className="text-xs text-[#2E2344]/70">
                {osDetected === "Android" || osDetected === "iOS"
                  ? "En Android e iOS la geoposición satelital se obtiene de manera automática previa autorización del dispositivo."
                  : "En Windows podés posicionar tu ubicación de manera manual buscando por el domicilio cargado o ajustando las coordenadas."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(osDetected === "Android" || osDetected === "iOS") ? (
                <button
                  type="button"
                  disabled={geoLoading}
                  onClick={() => requestSatelliteGps(true)}
                  className="rounded-full bg-[#836DAD] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#5E4B8B] disabled:opacity-50 transition cursor-pointer"
                >
                  {geoLoading
                    ? "Obteniendo GPS..."
                    : "Autorizar y Obtener GPS Satelital Automático"}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={geoLoading}
                    onClick={geocodeAddressManually}
                    className="rounded-full bg-[#836DAD] px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-[#5E4B8B] disabled:opacity-50 transition cursor-pointer"
                  >
                    {geoLoading
                      ? "Localizando..."
                      : "Ubicar Manualmente desde Domicilio"}
                  </button>
                  <button
                    type="button"
                    disabled={geoLoading}
                    onClick={() => requestSatelliteGps(false)}
                    className="rounded-full border border-[#836DAD]/35 bg-[#FAF8FC] px-3.5 py-2 text-xs font-semibold text-[#5E4B8B] hover:bg-[#F4F0FA] disabled:opacity-50 transition cursor-pointer"
                  >
                    Usar GPS del Dispositivo
                  </button>
                </>
              )}
            </div>
          </div>

          {geoStatusMsg && (
            <div className="rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] px-3.5 py-2 text-xs font-medium text-[#5E4B8B]">
              {geoStatusMsg}
            </div>
          )}

          {/* Controles de posicionamiento manual (especialmente para Windows) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl bg-[#FAF8FC] p-3.5 border border-[#E6E0F0]">
            <div>
              <label
                htmlFor="ro-geo-lat"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#5E4B8B] mb-1"
              >
                Latitud Satelital
              </label>
              <input
                id="ro-geo-lat"
                type="text"
                value={latInput}
                onChange={(e) => {
                  setLatInput(e.target.value);
                  setCaptureMode("manual-windows");
                }}
                className="w-full rounded-lg border border-[#E6E0F0] bg-white px-3 py-1.5 font-mono text-xs text-[#2E2344]"
              />
            </div>

            <div>
              <label
                htmlFor="ro-geo-lng"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#5E4B8B] mb-1"
              >
                Longitud Satelital
              </label>
              <input
                id="ro-geo-lng"
                type="text"
                value={lngInput}
                onChange={(e) => {
                  setLngInput(e.target.value);
                  setCaptureMode("manual-windows");
                }}
                className="w-full rounded-lg border border-[#E6E0F0] bg-white px-3 py-1.5 font-mono text-xs text-[#2E2344]"
              />
            </div>

            <div>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-[#5E4B8B] mb-1">
                Ajuste Fino Manual (Windows)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => nudgeCoordinates(0.00025, 0)}
                  className="flex-1 rounded-lg border border-[#E6E0F0] bg-white py-1.5 text-xs font-bold text-[#5E4B8B] hover:bg-[#F4F0FA] cursor-pointer"
                  title="Mover al Norte"
                >
                  ↑ N
                </button>
                <button
                  type="button"
                  onClick={() => nudgeCoordinates(-0.00025, 0)}
                  className="flex-1 rounded-lg border border-[#E6E0F0] bg-white py-1.5 text-xs font-bold text-[#5E4B8B] hover:bg-[#F4F0FA] cursor-pointer"
                  title="Mover al Sur"
                >
                  ↓ S
                </button>
                <button
                  type="button"
                  onClick={() => nudgeCoordinates(0, -0.00025)}
                  className="flex-1 rounded-lg border border-[#E6E0F0] bg-white py-1.5 text-xs font-bold text-[#5E4B8B] hover:bg-[#F4F0FA] cursor-pointer"
                  title="Mover al Oeste"
                >
                  ← O
                </button>
                <button
                  type="button"
                  onClick={() => nudgeCoordinates(0, 0.00025)}
                  className="flex-1 rounded-lg border border-[#E6E0F0] bg-white py-1.5 text-xs font-bold text-[#5E4B8B] hover:bg-[#F4F0FA] cursor-pointer"
                  title="Mover al Este"
                >
                  → E
                </button>
              </div>
            </div>
          </div>

          {/* Imagen y Vista Satelital de Maps guardada en el perfil */}
          <div className="overflow-hidden rounded-2xl border-2 border-[#836DAD]/30 bg-[#1E1B2E] shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#2E2344] px-4 py-2.5 text-white">
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#F3D791]" />
                <span className="font-semibold">
                  Imagen de Maps en Mi Perfil:
                </span>
                <span className="text-white/80 truncate max-w-[260px] sm:max-w-md">
                  {formattedAddress}
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setMapLayer("h")}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    mapLayer === "h"
                      ? "bg-[#F3D791] text-[#2E2344]"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Satélite + Calles
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer("k")}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    mapLayer === "k"
                      ? "bg-[#F3D791] text-[#2E2344]"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Satélite Puro
                </button>
                <button
                  type="button"
                  onClick={() => setMapLayer("m")}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer ${
                    mapLayer === "m"
                      ? "bg-[#F3D791] text-[#2E2344]"
                      : "bg-white/10 text-white hover:bg-white/20"
                  }`}
                >
                  Mapa
                </button>
              </div>
            </div>

            <div className="relative h-64 sm:h-72 w-full bg-[#2E2344]">
              <iframe
                key={`${parsedLat}-${parsedLng}-${mapLayer}`}
                title="Imagen Satelital de Google Maps de Mi Perfil"
                src={mapEmbedUrl}
                className="h-full w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#FAF8FC] px-4 py-2.5 text-xs text-[#2E2344]">
              <div className="font-mono text-[11px] text-[#5E4B8B]">
                Coordenadas guardadas:{" "}
                <strong>
                  {parsedLat.toFixed(6)}, {parsedLng.toFixed(6)}
                </strong>{" "}
                ({captureMode === "auto-gps-mobile"
                  ? "GPS Satelital Automático Android/iOS"
                  : captureMode === "geocoded-address"
                  ? "Domicilio Geolocalizado"
                  : "Posición Manual Windows"})
              </div>
              <a
                href={mapExternalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#836DAD] underline hover:text-[#5E4B8B]"
              >
                Abrir ubicación en Google Maps ↗
              </a>
            </div>
          </div>
        </div>

        {/* Botón Guardar Mi Perfil */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            className="w-full sm:w-auto rounded-full bg-[#836DAD] px-8 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-[#5E4B8B] transition cursor-pointer"
          >
            Guardar Datos y Ubicación en Mi Perfil
          </button>
        </div>
      </form>
    </div>
  );
}
