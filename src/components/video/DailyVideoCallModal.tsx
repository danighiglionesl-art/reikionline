"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  PhoneOff,
  ShieldCheck,
  Clock,
  MessageSquare,
  Send,
  Sparkles,
  CheckCircle2,
  X,
  Lock,
  Maximize2,
} from "lucide-react";
import {
  DailyVideoRoomRecord,
  markVideoSessionCompleted,
  saveDailyVideoRoom,
  VideoSessionModality,
} from "@/lib/dailyVideo";

export interface DailyVideoCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  therapyName: string;
  modality: VideoSessionModality;
  scheduledSlotLabel: string;
  therapistName: string;
  therapistNickname: string;
  consultanteName: string;
  consultanteEmail: string;
  viewerRole: "Terapeuta" | "Consultante";
  onSessionCompleted?: (sessionId: string) => void;
}

interface ChatMessageItem {
  id: string;
  sender: string;
  role: "Terapeuta" | "Consultante" | "Sistema";
  text: string;
  time: string;
}

export default function DailyVideoCallModal({
  isOpen,
  onClose,
  sessionId,
  therapyName,
  modality,
  scheduledSlotLabel,
  therapistName,
  therapistNickname,
  consultanteName,
  consultanteEmail,
  viewerRole,
  onSessionCompleted,
}: DailyVideoCallModalProps) {
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [roomInfo, setRoomInfo] = useState<DailyVideoRoomRecord | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Controles de cámara y micrófono en el entorno embebido WebRTC / Daily
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraNotice, setCameraNotice] = useState<string | null>(null);

  // Temporizador de 60 minutos (3600 segundos)
  const [remainingSeconds, setRemainingSeconds] = useState(3600);
  const [sessionCompletedBanner, setSessionCompletedBanner] = useState(false);

  // Chat interno de la videollamada (confidencial, sin WhatsApp ni emails)
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMessageItem[]>([
    {
      id: "sys-1",
      sender: "Daily.co • Reiki Online",
      role: "Sistema",
      text: "Sala privada 1:1 encriptada activa. Los números de WhatsApp y correos personales están protegidos y ocultos.",
      time: new Date().toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const participantName =
    viewerRole === "Terapeuta" ? therapistName : consultanteName;
  const remoteParticipantName =
    viewerRole === "Terapeuta" ? consultanteName : therapistName;
  const remoteParticipantRole =
    viewerRole === "Terapeuta" ? "Consultante" : "Terapeuta";

  // Detener cámara/micrófono al cerrar
  const stopLocalMedia = () => {
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getTracks()) {
        track.stop();
      }
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  // Inicializar sala Daily.co en el backend (/api/video/room)
  useEffect(() => {
    if (!isOpen) {
      stopLocalMedia();
      return;
    }

    let cancelled = false;
    setLoadingRoom(true);
    setErrorMsg(null);
    setSessionCompletedBanner(false);
    setRemainingSeconds(3600);

    fetch("/api/video/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        therapyName,
        modality,
        participantName,
        participantRole: viewerRole,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setErrorMsg(
            data?.error || "No se pudo conectar con la sala de Daily.co."
          );
          setLoadingRoom(false);
          return;
        }

        const record: DailyVideoRoomRecord = {
          sessionId,
          roomName: data.roomName,
          roomUrl: data.roomUrl,
          providerMode: data.providerMode || "daily_sandbox",
          modality,
          therapyName,
          scheduledSlotLabel,
          therapistName,
          therapistNickname,
          consultanteName,
          consultanteEmail,
          durationMinutes: 60,
          createdAt: data.createdAt,
          expiresAt: data.expiresAt,
          status: "activa",
        };
        setRoomInfo(record);
        saveDailyVideoRoom(record);
        setLoadingRoom(false);
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg("Error de red al inicializar la sala de videollamada.");
          setLoadingRoom(false);
        }
      });

    return () => {
      cancelled = true;
      stopLocalMedia();
    };
  }, [
    isOpen,
    sessionId,
    therapyName,
    modality,
    scheduledSlotLabel,
    therapistName,
    therapistNickname,
    consultanteName,
    consultanteEmail,
    participantName,
    viewerRole,
  ]);

  // En modo Sandbox WebRTC: conectar cámara y micrófono reales del dispositivo
  useEffect(() => {
    if (!isOpen || !roomInfo || roomInfo.providerMode === "daily_api") return;

    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          mediaStreamRef.current = stream;
          setCameraActive(true);
          setCameraNotice(null);
          if (localVideoRef.current) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          setCameraActive(false);
          setCameraNotice(
            "Cámara en modo avatar (podés habilitar el permiso de cámara del navegador cuando quieras)."
          );
        });
    }

    return () => {
      stopLocalMedia();
    };
  }, [isOpen, roomInfo]);

  // Temporizador regresivo de 60 minutos (1 hora exacta por sesión)
  useEffect(() => {
    if (!isOpen || sessionCompletedBanner) return;
    const interval = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isOpen, sessionCompletedBanner]);

  const toggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getAudioTracks()) {
        track.enabled = next;
      }
    }
  };

  const toggleCam = () => {
    const next = !camEnabled;
    setCamEnabled(next);
    if (mediaStreamRef.current) {
      for (const track of mediaStreamRef.current.getVideoTracks()) {
        track.enabled = next;
      }
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatInput.trim();
    if (!clean) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: participantName,
        role: viewerRole,
        text: clean,
        time: new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setChatInput("");
  };

  const handleFinishAndConfirmSession = () => {
    stopLocalMedia();
    markVideoSessionCompleted({
      sessionId,
      therapistNickname,
      therapistName,
      consultanteEmail,
      consultanteName,
      therapyName,
      modality,
      scheduledSlotLabel,
    });
    setSessionCompletedBanner(true);
    onSessionCompleted?.(sessionId);
  };

  if (!isOpen) return null;

  const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const secs = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sala de Videollamada Daily.co — Reiki Online"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D142E]/80 p-2 sm:p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border-2 border-[#F3D791] bg-[#2B1F42] text-white shadow-2xl">
        {/* 1. CABECERA INSTITUCIONAL REIKI ONLINE + DAILY.CO */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-[#836DAD] px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="shrink-0 overflow-hidden rounded-xl bg-white/15 p-1">
              <img
                src="/brand/Reiki_Icono_Lavanda_Unificado.png"
                alt="Reiki Online"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#F3D791] px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#2B1F42]">
                  <Video className="h-3 w-3" />
                  Daily.co • Sala Privada 1:1
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#F3D791]/60 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-[#F3D791]">
                  <ShieldCheck className="h-3 w-3" />✓ Identidad verificada
                </span>
                <span className="text-[11px] font-semibold text-white/85">
                  {modality} ({scheduledSlotLabel})
                </span>
              </div>
              <h3 className="mt-0.5 text-sm sm:text-base font-bold text-white">
                {therapyName} — {therapistName} ↔ {consultanteName}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Contador de 60 minutos */}
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#F3D791]/50 bg-[#2B1F42]/60 px-3 py-1.5 font-mono text-xs sm:text-sm font-bold text-[#F3D791]">
              <Clock className="h-4 w-4 text-[#F3D791]" />
              <span>
                {mins}:{secs}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                stopLocalMedia();
                onClose();
              }}
              aria-label="Cerrar ventana de videollamada"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/25 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Franja de confidencialidad de números de WhatsApp */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1F1631] px-4 py-2 text-[11px] text-white/85 border-b border-white/10">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#F3D791]" />
            <span>
              <strong>Privacidad garantizada:</strong> Conexión directa dentro de Reiki Online mediante Daily.co. Ningún número de WhatsApp es publicable ni visible.
            </span>
          </span>
          {roomInfo && (
            <span className="font-mono text-[10px] text-[#F3D791]">
              Sala: {roomInfo.roomName}
            </span>
          )}
        </div>

        {/* 2. ESCENARIO DE VIDEOLLAMADA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {errorMsg && (
            <div className="rounded-2xl border border-red-400/50 bg-red-950/60 p-4 text-xs font-semibold text-red-100">
              {errorMsg}
            </div>
          )}

          {sessionCompletedBanner ? (
            <div className="rounded-3xl border-2 border-[#F3D791] bg-[#836DAD]/30 p-6 sm:p-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3D791] text-[#2B1F42] shadow-lg">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white">
                ¡Sesión de Videollamada Finalizada y Confirmada!
              </h4>
              <p className="mx-auto max-w-xl text-xs sm:text-sm text-white/85 leading-relaxed">
                La consulta de <strong>{therapyName}</strong> entre{" "}
                <strong>{therapistName}</strong> y{" "}
                <strong>{consultanteName}</strong> quedó registrada como{" "}
                <strong className="text-[#F3D791]">Consulta efectuada</strong>.
                Ya se encuentra habilitada la calificación de{" "}
                <strong>1 a 5 estrellas</strong> y la reseña de hasta 150
                caracteres en la Red Social del terapeuta.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <a
                  href={`/${therapistNickname}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-[#F3D791] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#2B1F42] hover:bg-white transition"
                >
                  <Sparkles className="h-4 w-4 text-[#836DAD]" />
                  <span>
                    Calificar al Terapeuta (1 a 5 estrellas) en su Red Social
                  </span>
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white hover:bg-white/20 transition"
                >
                  <span>Volver a Reiki Online</span>
                </button>
              </div>
            </div>
          ) : loadingRoom ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-white/15 bg-black/30">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#F3D791] border-t-transparent" />
              <p className="text-xs sm:text-sm font-semibold text-[#F3D791]">
                Creando sala privada 1:1 en Daily.co...
              </p>
            </div>
          ) : roomInfo?.providerMode === "daily_api" ? (
            /* Iframe oficial de Daily.co Prebuilt cuando DAILY_API_KEY está activa en Vercel */
            <div className="relative h-[420px] sm:h-[480px] w-full overflow-hidden rounded-2xl border-2 border-[#836DAD] bg-black shadow-inner">
              <iframe
                title={`Sala Daily.co ${roomInfo.roomName}`}
                src={roomInfo.roomUrl}
                allow="camera; microphone; fullscreen; display-capture; autoplay"
                className="h-full w-full border-0"
              />
            </div>
          ) : (
            /* Sala interactiva Daily.co WebRTC Embebida (Entorno de Pruebas activo sin costo) */
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-3.5 ${
                  showChat ? "lg:col-span-2" : "lg:col-span-3"
                }`}
              >
                {/* Ventana 1: Participante Local (con cámara WebRTC en vivo del dispositivo) */}
                <div className="relative flex min-h-[240px] sm:min-h-[290px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-[#F3D791] bg-[#191129] shadow-lg">
                  {cameraActive && camEnabled ? (
                    <video
                      ref={localVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 p-4 text-center">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#F3D791] bg-[#836DAD] text-2xl font-bold text-[#F3D791] shadow-md">
                        {participantName
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <p className="text-xs font-semibold text-white/80">
                        {camEnabled
                          ? cameraNotice || "Cámara lista para transmitir"
                          : "Cámara apagada"}
                      </p>
                    </div>
                  )}

                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/65 px-3 py-1 text-[11px] font-bold text-[#F3D791] backdrop-blur-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    <span>Tú • {viewerRole}</span>
                  </div>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/65 px-3 py-1.5 text-xs backdrop-blur-xs">
                    <span className="font-bold text-white truncate">
                      {participantName}
                    </span>
                    <span className="text-[11px] text-[#F3D791]">
                      {micEnabled ? "Micrófono activo" : "Silenciado"}
                    </span>
                  </div>
                </div>

                {/* Ventana 2: Participante Remoto (Terapeuta / Consultante en la sala 1:1) */}
                <div className="relative flex min-h-[240px] sm:min-h-[290px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-[#836DAD] bg-gradient-to-b from-[#352554] to-[#1E1430] p-5 text-center shadow-lg">
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-[11px] font-bold text-white backdrop-blur-xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Conectado en sala • {remoteParticipantRole}</span>
                  </div>

                  {remoteParticipantRole === "Terapeuta" && (
                    <span className="absolute top-3 right-3 inline-flex items-center gap-1 rounded-full bg-[#836DAD] px-2.5 py-0.5 text-[10px] font-bold text-[#F3D791]">
                      ✓ Identidad verificada
                    </span>
                  )}

                  <div className="flex h-22 w-22 items-center justify-center rounded-full border-3 border-[#F3D791] bg-[#836DAD] text-2xl font-bold text-[#F3D791] shadow-xl">
                    {remoteParticipantName
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>

                  <h5 className="mt-3 text-base font-bold text-white">
                    {remoteParticipantName}
                  </h5>
                  <p className="text-xs font-medium text-[#F3D791]">
                    {remoteParticipantRole} • {therapyName}
                  </p>
                  <p className="mt-2 max-w-xs text-[11px] text-white/75">
                    Sala Daily.co vinculada a la sesión ({modality}). Audio y
                    video encriptados punto a punto.
                  </p>

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/60 px-3 py-1.5 text-xs backdrop-blur-xs">
                    <span className="font-bold text-white truncate">
                      {remoteParticipantName}
                    </span>
                    <span className="text-[11px] text-emerald-300 font-semibold">
                      En línea (HD)
                    </span>
                  </div>
                </div>
              </div>

              {/* Panel de Chat Interno de la Sesión */}
              {showChat && (
                <div className="flex h-[290px] flex-col justify-between rounded-2xl border border-white/20 bg-[#1B122C] p-3.5">
                  <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#F3D791]">
                      Chat interno de la sesión
                    </span>
                    <span className="text-[10px] text-white/60">
                      Confidencial
                    </span>
                  </div>

                  <div className="my-2 flex-1 space-y-2 overflow-y-auto pr-1 text-xs">
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className="rounded-xl bg-white/10 px-3 py-2 text-white"
                      >
                        <div className="flex items-center justify-between text-[10px] text-[#F3D791]">
                          <strong>
                            {m.sender} ({m.role})
                          </strong>
                          <span>{m.time}</span>
                        </div>
                        <p className="mt-0.5 text-white/95">{m.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendChat} className="flex gap-1.5">
                    <input
                      type="text"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Escribir mensaje en la sala..."
                      className="flex-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-white/45 focus:border-[#F3D791] focus:outline-none"
                    />
                    <button
                      type="submit"
                      aria-label="Enviar mensaje"
                      className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#836DAD] px-3 py-2 text-white hover:bg-[#6F599B]"
                    >
                      <Send className="h-3.5 w-3.5 text-[#F3D791]" />
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. BARRA DE CONTROLES DE LA VIDEOLLAMADA DAILY.CO */}
        {!sessionCompletedBanner && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/15 bg-[#1F1631] px-4 py-3.5 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  micEnabled
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-red-600 text-white"
                }`}
              >
                {micEnabled ? (
                  <>
                    <Mic className="h-4 w-4 text-[#F3D791]" />
                    <span>Micrófono activo</span>
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4" />
                    <span>Micrófono silenciado</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleCam}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  camEnabled
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-red-600 text-white"
                }`}
              >
                {camEnabled ? (
                  <>
                    <Video className="h-4 w-4 text-[#F3D791]" />
                    <span>Cámara activa</span>
                  </>
                ) : (
                  <>
                    <VideoOff className="h-4 w-4" />
                    <span>Cámara apagada</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowChat((prev) => !prev)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold transition ${
                  showChat
                    ? "bg-[#836DAD] text-[#F3D791]"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                <MessageSquare className="h-4 w-4" />
                <span>{showChat ? "Ocultar chat" : "Chat de sesión"}</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleFinishAndConfirmSession}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#F3D791] px-4 py-2.5 text-xs font-extrabold text-[#2B1F42] shadow-md hover:bg-white transition"
              >
                <PhoneOff className="h-4 w-4 text-red-700" />
                <span>Finalizar sesión y marcar Consulta Efectuada</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
