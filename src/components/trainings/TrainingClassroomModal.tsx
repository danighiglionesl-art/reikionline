"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Video,
  VideoOff,
  Mic,
  MicOff,
  MonitorUp,
  Hand,
  Users,
  MessageSquare,
  Send,
  ShieldCheck,
  Clock,
  CheckCircle2,
  CircleDot,
  VolumeX,
  PhoneOff,
  X,
  Lock,
  Award,
} from "lucide-react";
import {
  TrainingClassSession,
  TrainingCourse,
  TrainingEnrollment,
} from "@/lib/trainingsData";

interface TrainingClassroomModalProps {
  isOpen: boolean;
  onClose: () => void;
  training: TrainingCourse;
  session: TrainingClassSession;
  viewerEmail: string;
  viewerName: string;
  viewerNickname: string;
  isOrganizer: boolean; // true = Terapeuta que dicta la clase; false = Alumno inscripto (Consultante o Terapeuta colega)
  enrolledStudents: TrainingEnrollment[];
  onMarkAttendance: (enrollmentId: string, sessionId: string) => void;
  onFinishClassSession: (
    sessionId: string,
    recordingGeneratedUrl?: string
  ) => void;
}

interface ClassroomParticipant {
  id: string;
  name: string;
  email: string;
  roleLabel: "Terapeuta Organizador" | "Alumno";
  micMuted: boolean;
  camOn: boolean;
  handRaised: boolean;
  attended: boolean;
  recordingConsent: boolean;
}

interface ClassroomChatMsg {
  id: string;
  sender: string;
  roleLabel: string;
  text: string;
  time: string;
}

export default function TrainingClassroomModal({
  isOpen,
  onClose,
  training,
  session,
  viewerEmail,
  viewerName,
  isOrganizer,
  enrolledStudents,
  onMarkAttendance,
  onFinishClassSession,
}: TrainingClassroomModalProps) {
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [roomData, setRoomData] = useState<{
    roomName: string;
    roomUrl: string;
    providerMode: "daily_api" | "daily_sandbox";
  } | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Controles multimedia WebRTC / Daily.co
  const [micEnabled, setMicEnabled] = useState(true);
  const [camEnabled, setCamEnabled] = useState(true);
  const [screenSharing, setScreenSharing] = useState(false);
  const [handRaised, setHandRaised] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingConsentModal, setRecordingConsentModal] = useState(false);

  // Paneles laterales
  const [activeSidePanel, setActiveSidePanel] = useState<
    "participantes" | "chat"
  >("participantes");
  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ClassroomChatMsg[]>([
    {
      id: "sys-welcome",
      sender: "Daily.co • Academia Reiki Online",
      roleLabel: "Sistema",
      text: "Sala de capacitación verificada activa. Acceso exclusivo para participantes con inscripción confirmada.",
      time: new Date().toLocaleTimeString("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [participants, setParticipants] = useState<ClassroomParticipant[]>([]);
  const [remainingSeconds, setRemainingSeconds] = useState(
    (session.durationMinutes || 120) * 60
  );
  const [classFinishedBanner, setClassFinishedBanner] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const stopAllStreams = () => {
    if (mediaStreamRef.current) {
      for (const t of mediaStreamRef.current.getTracks()) t.stop();
      mediaStreamRef.current = null;
    }
    if (screenStreamRef.current) {
      for (const t of screenStreamRef.current.getTracks()) t.stop();
      screenStreamRef.current = null;
    }
    setScreenSharing(false);
  };

  // Inicializar lista de participantes autorizados y registrar asistencia automática del alumno que ingresa
  useEffect(() => {
    if (!isOpen) return;

    const organizerItem: ClassroomParticipant = {
      id: "org-host",
      name: training.therapistName,
      email: training.therapistEmail,
      roleLabel: "Terapeuta Organizador",
      micMuted: false,
      camOn: true,
      handRaised: false,
      attended: true,
      recordingConsent: true,
    };

    const studentItems: ClassroomParticipant[] = enrolledStudents
      .filter((e) => e.status === "confirmada")
      .map((e) => {
        const isCurrentViewer =
          e.studentEmail.trim().toLowerCase() ===
          viewerEmail.trim().toLowerCase();
        if (isCurrentViewer) {
          onMarkAttendance(e.id, session.id);
        }
        return {
          id: e.id,
          name: e.studentName,
          email: e.studentEmail,
          roleLabel: "Alumno",
          micMuted: !isCurrentViewer,
          camOn: true,
          handRaised: false,
          attended:
            isCurrentViewer || e.attendedSessionIds.includes(session.id),
          recordingConsent: e.recordingConsentAccepted,
        };
      });

    setParticipants([organizerItem, ...studentItems]);
  }, [isOpen, training, session.id, enrolledStudents, viewerEmail]);

  // Conectar con el endpoint modular de Daily.co (/api/video/room)
  useEffect(() => {
    if (!isOpen) {
      stopAllStreams();
      return;
    }

    let cancelled = false;
    setLoadingRoom(true);
    setErrorMsg(null);
    setClassFinishedBanner(false);
    setRemainingSeconds((session.durationMinutes || 120) * 60);

    fetch("/api/video/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId: session.roomSlug || `${training.id}-${session.id}`,
        therapyName: `${training.title} — ${session.title}`,
        modality: "Online con turno",
        participantName: viewerName,
        participantRole: isOrganizer ? "Terapeuta" : "Consultante",
        isOrganizer,
        maxParticipants: Math.max(2, training.maxQuota + 2),
        durationMinutes: session.durationMinutes || 120,
        enableRecording: session.recordingEnabled,
      }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (!data?.ok) {
          setErrorMsg(
            data?.error ||
              "No se pudo inicializar la sala de capacitación en Daily.co."
          );
          setLoadingRoom(false);
          return;
        }
        setRoomData({
          roomName: data.roomName,
          roomUrl: data.roomUrl,
          providerMode: data.providerMode || "daily_sandbox",
        });
        setLoadingRoom(false);
      })
      .catch(() => {
        if (!cancelled) {
          setErrorMsg("Error de conexión al abrir la sala de capacitación.");
          setLoadingRoom(false);
        }
      });

    return () => {
      cancelled = true;
      stopAllStreams();
    };
  }, [
    isOpen,
    training.id,
    training.title,
    training.maxQuota,
    session.id,
    session.title,
    session.roomSlug,
    session.durationMinutes,
    session.recordingEnabled,
    viewerName,
    isOrganizer,
  ]);

  // Activar cámara WebRTC local en navegadores de escritorio, Android e iOS PWA
  useEffect(() => {
    if (!isOpen || !roomData || roomData.providerMode === "daily_api") return;

    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function"
    ) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          mediaStreamRef.current = stream;
          if (localVideoRef.current && !screenSharing) {
            localVideoRef.current.srcObject = stream;
          }
        })
        .catch(() => {
          // Si el usuario prefiere ingresar sin cámara encendida, funciona en modo avatar
        });
    }

    return () => {
      stopAllStreams();
    };
  }, [isOpen, roomData]);

  // Temporizador de la clase
  useEffect(() => {
    if (!isOpen || classFinishedBanner) return;
    const timer = window.setInterval(() => {
      setRemainingSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isOpen, classFinishedBanner]);

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

  const handleToggleScreenShare = async () => {
    if (screenSharing) {
      if (screenStreamRef.current) {
        for (const t of screenStreamRef.current.getTracks()) t.stop();
        screenStreamRef.current = null;
      }
      setScreenSharing(false);
      if (localVideoRef.current && mediaStreamRef.current) {
        localVideoRef.current.srcObject = mediaStreamRef.current;
      }
      return;
    }

    if (
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === "function"
    ) {
      try {
        const displayStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
        });
        screenStreamRef.current = displayStream;
        setScreenSharing(true);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = displayStream;
        }
        displayStream.getVideoTracks()[0]?.addEventListener("ended", () => {
          setScreenSharing(false);
          if (localVideoRef.current && mediaStreamRef.current) {
            localVideoRef.current.srcObject = mediaStreamRef.current;
          }
        });
      } catch {
        // Usuario canceló selector de pantalla
      }
    } else {
      setScreenSharing((prev) => !prev);
    }
  };

  const handleToggleRaiseHand = () => {
    const next = !handRaised;
    setHandRaised(next);
    setParticipants((prev) =>
      prev.map((p) =>
        p.email.trim().toLowerCase() === viewerEmail.trim().toLowerCase()
          ? { ...p, handRaised: next }
          : p
      )
    );
    if (next) {
      setMessages((prev) => [
        ...prev,
        {
          id: `hand-${Date.now()}`,
          sender: viewerName,
          roleLabel: isOrganizer ? "Terapeuta Organizador" : "Alumno",
          text: "✋ Levantó la mano para hacer una consulta.",
          time: new Date().toLocaleTimeString("es-AR", {
            hour: "2-digit",
            minute: "2-digit",
          }),
        },
      ]);
    }
  };

  // Control exclusivo del Terapeuta Organizador: silenciar un participante o silenciar a todos
  const handleOrganizerMuteParticipant = (participantId: string) => {
    if (!isOrganizer) return;
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, micMuted: true } : p))
    );
  };

  const handleOrganizerMuteAllStudents = () => {
    if (!isOrganizer) return;
    setParticipants((prev) =>
      prev.map((p) =>
        p.roleLabel === "Alumno" ? { ...p, micMuted: true } : p
      )
    );
  };

  const handleOrganizerLowerHand = (participantId: string) => {
    if (!isOrganizer) return;
    setParticipants((prev) =>
      prev.map((p) =>
        p.id === participantId ? { ...p, handRaised: false } : p
      )
    );
  };

  const handleOrganizerToggleAttendance = (participantId: string) => {
    if (!isOrganizer) return;
    setParticipants((prev) =>
      prev.map((p) => {
        if (p.id !== participantId) return p;
        const nextAttended = !p.attended;
        if (nextAttended && p.roleLabel === "Alumno") {
          onMarkAttendance(p.id, session.id);
        }
        return { ...p, attended: nextAttended };
      })
    );
  };

  const handleToggleRecording = () => {
    if (!isOrganizer) return;
    if (!isRecording) {
      setRecordingConsentModal(true);
    } else {
      setIsRecording(false);
    }
  };

  const confirmStartRecording = () => {
    setRecordingConsentModal(false);
    setIsRecording(true);
    setMessages((prev) => [
      ...prev,
      {
        id: `rec-${Date.now()}`,
        sender: "Daily.co • Grabación Oficial",
        roleLabel: "Sistema",
        text: "🔴 La grabación de la clase ha comenzado con el consentimiento informado de los participantes.",
        time: new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = chatInput.trim();
    if (!clean) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `msg-${Date.now()}`,
        sender: viewerName,
        roleLabel: isOrganizer ? "Terapeuta Organizador" : "Alumno",
        text: clean,
        time: new Date().toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      },
    ]);
    setChatInput("");
  };

  const handleFinishClass = () => {
    stopAllStreams();
    const generatedRecUrl = isRecording
      ? `Grabación Oficial Daily.co — ${training.title} (${session.title}) — Disponible en Mis Capacitaciones`
      : undefined;
    onFinishClassSession(session.id, generatedRecUrl);
    setClassFinishedBanner(true);
  };

  if (!isOpen) return null;

  const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, "0");
  const secs = String(remainingSeconds % 60).padStart(2, "0");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sala de Capacitación Online Daily.co — Academia Reiki Online"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D142E]/85 p-2 sm:p-4 backdrop-blur-sm"
    >
      <div className="flex max-h-[95dvh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border-2 border-[#F3D791] bg-[#2B1F42] text-white shadow-2xl">
        {/* CABECERA DE LA SALA DE CAPACITACIÓN */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/15 bg-[#836DAD] px-4 py-3 sm:px-6">
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
                  Daily.co • Sala de Capacitación Online
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#F3D791]/60 bg-white/15 px-2.5 py-0.5 text-[10px] font-bold text-[#F3D791]">
                  <ShieldCheck className="h-3 w-3" />
                  {isOrganizer
                    ? "Permisos: Terapeuta Organizador"
                    : "Permisos: Alumno Inscripto"}
                </span>
                {isRecording && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-0.5 text-[10px] font-bold text-white animate-pulse">
                    <CircleDot className="h-3 w-3" />
                    Grabando clase
                  </span>
                )}
              </div>
              <h3 className="mt-0.5 text-sm sm:text-base font-bold text-white">
                {training.title} • {session.title}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-xl border border-[#F3D791]/50 bg-[#2B1F42]/60 px-3 py-1.5 font-mono text-xs sm:text-sm font-bold text-[#F3D791]">
              <Clock className="h-4 w-4 text-[#F3D791]" />
              <span>
                {mins}:{secs}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                stopAllStreams();
                onClose();
              }}
              aria-label="Salir de la sala"
              className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-white/25 bg-white/10 text-white hover:bg-white/25 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* FRANJA DE SEGURIDAD Y ACCESO VERIFICADO */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-[#1F1631] px-4 py-2 text-[11px] text-white/85 border-b border-white/10">
          <span className="inline-flex items-center gap-1.5">
            <Lock className="h-3.5 w-3.5 text-[#F3D791]" />
            <span>
              <strong>Acceso restringido y verificado:</strong> Inscripción y pago comprobados. Compatible con navegador web y PWA Android / iOS sin instalar aplicaciones externas.
            </span>
          </span>
          {roomData && (
            <span className="font-mono text-[10px] text-[#F3D791]">
              Sala Daily: {roomData.roomName}
            </span>
          )}
        </div>

        {/* MODAL DE CONSENTIMIENTO DE GRABACIÓN */}
        {recordingConsentModal && (
          <div className="bg-[#342357] border-b border-[#F3D791] px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs text-white space-y-0.5">
              <p className="font-bold text-[#F3D791]">
                Confirmación de Consentimiento para Grabación de la Clase
              </p>
              <p className="text-white/85">
                Al iniciar la grabación, la clase quedará disponible en «Mis Capacitaciones» exclusivamente para los alumnos inscriptos que aceptaron el consentimiento.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={confirmStartRecording}
                className="cursor-pointer rounded-xl bg-[#F3D791] px-3.5 py-1.5 text-xs font-bold text-[#2B1F42] hover:bg-white"
              >
                Confirmar e iniciar grabación
              </button>
              <button
                type="button"
                onClick={() => setRecordingConsentModal(false)}
                className="cursor-pointer rounded-xl border border-white/25 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* CUERPO PRINCIPAL DE LA SALA */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {errorMsg && (
            <div className="mb-4 rounded-2xl border border-red-400/50 bg-red-950/60 p-4 text-xs font-semibold text-red-100">
              {errorMsg}
            </div>
          )}

          {classFinishedBanner ? (
            <div className="rounded-3xl border-2 border-[#F3D791] bg-[#836DAD]/30 p-6 sm:p-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#F3D791] text-[#2B1F42] shadow-lg">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h4 className="text-lg sm:text-xl font-bold text-white">
                ¡Encuentro de Capacitación Finalizado con Éxito!
              </h4>
              <p className="mx-auto max-w-xl text-xs sm:text-sm text-white/85 leading-relaxed">
                El encuentro <strong>{session.title}</strong> de{" "}
                <strong>{training.title}</strong> ha sido registrado como
                finalizado. La asistencia de los alumnos participantes quedó
                asentada automáticamente en el historial de{" "}
                <strong className="text-[#F3D791]">Mis Capacitaciones</strong>.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#F3D791] px-5 py-2.5 text-xs sm:text-sm font-bold text-[#2B1F42] hover:bg-white transition"
                >
                  <Award className="h-4 w-4 text-[#836DAD]" />
                  <span>Volver a Mis Capacitaciones</span>
                </button>
              </div>
            </div>
          ) : loadingRoom ? (
            <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-white/15 bg-black/30">
              <div className="h-10 w-10 animate-spin rounded-full border-3 border-[#F3D791] border-t-transparent" />
              <p className="text-xs sm:text-sm font-semibold text-[#F3D791]">
                Abriendo sala de capacitación en Daily.co...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {/* Escenario de Video Principal + Mosaico de Alumnos */}
              <div className="lg:col-span-2 space-y-3.5">
                {roomData?.providerMode === "daily_api" ? (
                  <div className="relative h-[380px] sm:h-[430px] w-full overflow-hidden rounded-2xl border-2 border-[#836DAD] bg-black shadow-inner">
                    <iframe
                      title={`Sala Daily.co ${roomData.roomName}`}
                      src={roomData.roomUrl}
                      allow="camera; microphone; fullscreen; display-capture; autoplay"
                      className="h-full w-full border-0"
                    />
                  </div>
                ) : (
                  <div className="relative flex min-h-[280px] sm:min-h-[340px] flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-[#F3D791] bg-[#191129] shadow-lg">
                    {camEnabled || screenSharing ? (
                      <video
                        ref={localVideoRef}
                        autoPlay
                        playsInline
                        muted
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 p-6 text-center">
                        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#F3D791] bg-[#836DAD] text-2xl font-bold text-[#F3D791]">
                          {viewerName
                            .split(" ")
                            .map((p) => p[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <p className="text-sm font-bold text-white">
                          {viewerName}
                        </p>
                        <p className="text-xs text-[#F3D791]">
                          {isOrganizer
                            ? "Terapeuta Organizador"
                            : "Alumno en clase"}
                        </p>
                      </div>
                    )}

                    <div className="absolute top-3 left-3 flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-3 py-1 text-[11px] font-bold text-[#F3D791]">
                        <span className="h-2 w-2 rounded-full bg-emerald-400" />
                        <span>
                          {screenSharing
                            ? "Compartiendo pantalla en vivo"
                            : `${viewerName} (${
                                isOrganizer ? "Organizador" : "Alumno"
                              })`}
                        </span>
                      </span>
                      {handRaised && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#F3D791] px-2.5 py-1 text-[11px] font-bold text-[#2B1F42]">
                          ✋ Mano levantada
                        </span>
                      )}
                    </div>

                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-xl bg-black/65 px-3.5 py-2 text-xs backdrop-blur-xs">
                      <span className="font-bold text-white truncate">
                        Terapeuta a cargo: {training.therapistName}
                      </span>
                      <span className="text-[11px] text-[#F3D791]">
                        {micEnabled ? "Audio activo" : "Silenciado"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Tarjetas compactas de participantes en la clase */}
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {participants.slice(0, 6).map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-[#1B122C] p-2.5 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-bold text-white">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-[#F3D791]">
                          {p.roleLabel}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {p.handRaised && (
                          <span
                            title="Mano levantada"
                            className="rounded-full bg-[#F3D791] px-1.5 py-0.5 text-[10px] font-bold text-[#2B1F42]"
                          >
                            ✋
                          </span>
                        )}
                        {p.micMuted ? (
                          <MicOff className="h-3.5 w-3.5 text-red-400" />
                        ) : (
                          <Mic className="h-3.5 w-3.5 text-emerald-400" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Panel Lateral: Control de Participantes / Asistencia y Chat */}
              <div className="flex h-[430px] flex-col justify-between rounded-2xl border border-white/20 bg-[#1B122C] p-3.5">
                <div className="flex items-center gap-1.5 border-b border-white/10 pb-2.5">
                  <button
                    type="button"
                    onClick={() => setActiveSidePanel("participantes")}
                    className={`flex-1 cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                      activeSidePanel === "participantes"
                        ? "bg-[#836DAD] text-white"
                        : "bg-white/5 text-white/75 hover:bg-white/10"
                    }`}
                  >
                    Participantes ({participants.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveSidePanel("chat")}
                    className={`flex-1 cursor-pointer rounded-xl px-2.5 py-1.5 text-xs font-bold transition ${
                      activeSidePanel === "chat"
                        ? "bg-[#836DAD] text-white"
                        : "bg-white/5 text-white/75 hover:bg-white/10"
                    }`}
                  >
                    Chat ({messages.length})
                  </button>
                </div>

                {activeSidePanel === "participantes" ? (
                  <div className="my-2 flex-1 space-y-2 overflow-y-auto pr-1">
                    {isOrganizer && (
                      <div className="flex items-center justify-between rounded-xl bg-white/5 px-3 py-2 text-[11px]">
                        <span className="text-[#F3D791] font-semibold">
                          Controles del organizador:
                        </span>
                        <button
                          type="button"
                          onClick={handleOrganizerMuteAllStudents}
                          className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#836DAD] px-2.5 py-1 text-[10px] font-bold text-white hover:bg-[#6E5898]"
                        >
                          <VolumeX className="h-3 w-3" />
                          <span>Silenciar alumnos</span>
                        </button>
                      </div>
                    )}

                    {participants.map((p) => (
                      <div
                        key={p.id}
                        className="rounded-xl border border-white/10 bg-white/5 p-2.5 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-[#F3D791]">
                              {p.roleLabel} •{" "}
                              {p.attended ? "Asistencia registrada" : "Ausente"}
                            </p>
                          </div>
                          {p.handRaised && (
                            <span className="rounded-full bg-[#F3D791] px-2 py-0.5 text-[10px] font-bold text-[#2B1F42]">
                              ✋ Mano
                            </span>
                          )}
                        </div>

                        {isOrganizer && p.roleLabel === "Alumno" && (
                          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/10">
                            <button
                              type="button"
                              onClick={() =>
                                handleOrganizerMuteParticipant(p.id)
                              }
                              className="cursor-pointer rounded-lg bg-white/10 px-2 py-1 text-[10px] font-semibold text-white hover:bg-white/20"
                            >
                              {p.micMuted ? "Silenciado" : "Silenciar"}
                            </button>
                            {p.handRaised && (
                              <button
                                type="button"
                                onClick={() => handleOrganizerLowerHand(p.id)}
                                className="cursor-pointer rounded-lg bg-[#F3D791]/20 px-2 py-1 text-[10px] font-semibold text-[#F3D791] hover:bg-[#F3D791]/30"
                              >
                                Bajar mano
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() =>
                                handleOrganizerToggleAttendance(p.id)
                              }
                              className={`cursor-pointer rounded-lg px-2 py-1 text-[10px] font-bold ${
                                p.attended
                                  ? "bg-emerald-500/25 text-emerald-200"
                                  : "bg-white/10 text-white/75"
                              }`}
                            >
                              {p.attended ? "✓ Presente" : "Marcar presente"}
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="my-2 flex-1 space-y-2 overflow-y-auto pr-1 text-xs">
                      {messages.map((m) => (
                        <div
                          key={m.id}
                          className="rounded-xl bg-white/10 px-3 py-2 text-white"
                        >
                          <div className="flex items-center justify-between text-[10px] text-[#F3D791]">
                            <strong>
                              {m.sender} ({m.roleLabel})
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
                        placeholder="Escribir en el chat de la clase..."
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
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* BARRA DE CONTROLES DE LA CLASE */}
        {!classFinishedBanner && (
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-white/15 bg-[#1F1631] px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={toggleMic}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  micEnabled
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-red-600 text-white"
                }`}
              >
                {micEnabled ? (
                  <>
                    <Mic className="h-4 w-4 text-[#F3D791]" />
                    <span>Micrófono</span>
                  </>
                ) : (
                  <>
                    <MicOff className="h-4 w-4" />
                    <span>Silenciado</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={toggleCam}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  camEnabled
                    ? "bg-white/15 text-white hover:bg-white/25"
                    : "bg-red-600 text-white"
                }`}
              >
                {camEnabled ? (
                  <>
                    <Video className="h-4 w-4 text-[#F3D791]" />
                    <span>Cámara</span>
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
                onClick={handleToggleScreenShare}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  screenSharing
                    ? "bg-[#F3D791] text-[#2B1F42]"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                <MonitorUp className="h-4 w-4" />
                <span>
                  {screenSharing
                    ? "Dejar de compartir"
                    : "Compartir pantalla"}
                </span>
              </button>

              <button
                type="button"
                onClick={handleToggleRaiseHand}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                  handRaised
                    ? "bg-[#F3D791] text-[#2B1F42]"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                <Hand className="h-4 w-4" />
                <span>{handRaised ? "Bajar la mano" : "Levantar la mano"}</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setActiveSidePanel((prev) =>
                    prev === "chat" ? "participantes" : "chat"
                  )
                }
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-xs font-bold text-white hover:bg-white/25 transition"
              >
                {activeSidePanel === "chat" ? (
                  <>
                    <Users className="h-4 w-4 text-[#F3D791]" />
                    <span>Participantes</span>
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 text-[#F3D791]" />
                    <span>Chat</span>
                  </>
                )}
              </button>

              {isOrganizer && session.recordingEnabled && (
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
                    isRecording
                      ? "bg-red-600 text-white"
                      : "border border-[#F3D791]/50 bg-white/10 text-[#F3D791] hover:bg-white/20"
                  }`}
                >
                  <CircleDot className="h-4 w-4" />
                  <span>
                    {isRecording ? "Detener grabación" : "Grabar clase"}
                  </span>
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isOrganizer ? (
                <button
                  type="button"
                  onClick={handleFinishClass}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#F3D791] px-4 py-2 text-xs font-extrabold text-[#2B1F42] shadow-md hover:bg-white transition"
                >
                  <PhoneOff className="h-4 w-4 text-red-700" />
                  <span>Finalizar clase (Organizador)</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    stopAllStreams();
                    onClose();
                  }}
                  className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-xs font-bold text-white hover:bg-white/20 transition"
                >
                  <PhoneOff className="h-4 w-4 text-[#F3D791]" />
                  <span>Salir de la clase</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
