"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Search,
  Calendar,
  Clock,
  Users,
  Video,
  FileText,
  Award,
  Plus,
  Edit3,
  CheckCircle2,
  XCircle,
  ShieldCheck,
  Sparkles,
  Download,
  Bell,
  DollarSign,
  BookOpen,
  PlayCircle,
  AlertTriangle,
  QrCode,
  Copy,
  Share2,
  ExternalLink,
} from "lucide-react";
import { ReikiUserProfile, sanitizeNickname } from "@/lib/geoData";
import {
  buildTrainingSlug,
  CertificateType,
  dispatchTrainingNotification,
  enrollStudentInTraining,
  EVENT_LABELS,
  getTrainingPromoSlug,
  getTrainingPromoUrl,
  issueTrainingCertificate,
  loadTrainingCertificates,
  loadTrainingEnrollments,
  loadTrainingNotifications,
  loadTrainingsCatalog,
  MaterialFormat,
  saveTrainingEnrollments,
  saveTrainingsCatalog,
  TRAININGS_SYNC_EVENT,
  TrainingCertificate,
  TrainingClassSession,
  TrainingCourse,
  TrainingEnrollment,
  TrainingLevel,
  TrainingMaterialItem,
  TrainingModality,
  TrainingNotificationRecord,
  TrainingStatus,
} from "@/lib/trainingsData";
import {
  calculateSplitAmounts,
  formatArs,
  loadCommissionConfig,
  resolveTrainingCommission,
} from "@/lib/mercadoPagoSplit";
import TrainingClassroomModal from "@/components/trainings/TrainingClassroomModal";
import TrainingPromotionFlyerPanel from "@/components/trainings/TrainingPromotionFlyerPanel";

interface MisCapacitacionesPanelProps {
  profile: ReikiUserProfile;
  activeRole: "Consultante" | "Terapeuta";
  isBiometricVerified: boolean;
  availableDisciplines: string[];
}

export default function MisCapacitacionesPanel({
  profile,
  activeRole,
  isBiometricVerified,
  availableDisciplines,
}: MisCapacitacionesPanelProps) {
  // Un usuario es Terapeuta habilitado si tiene rol Terapeuta o tilde "Soy Terapeuta" en Mi Perfil
  const isEnabledTherapist = Boolean(
    profile.soyTerapeuta ||
      profile.role === "terapeuta" ||
      activeRole === "Terapeuta"
  );

  const userEmail = (profile.email || "").trim().toLowerCase();
  const userFullName =
    `${profile.nombre} ${profile.apellido}`.trim() ||
    profile.nombre ||
    "Usuario Reiki Online";
  const userNickname =
    sanitizeNickname(
      profile.nickname ||
        profile.username ||
        `${profile.nombre}${profile.apellido}`
    ).toLowerCase() || "usuario";

  // Pestañas: Para Terapeutas (A: explorar, B: realizo, C: ofrezco) | Para Consultantes (solo A: explorar y B: realizo)
  const [activeSubTab, setActiveSubTab] = useState<
    "explorar" | "realizo" | "ofrezco"
  >("explorar");

  useEffect(() => {
    if (!isEnabledTherapist && activeSubTab === "ofrezco") {
      setActiveSubTab("explorar");
    }
  }, [isEnabledTherapist, activeSubTab]);

  // Estado sincronizado del catálogo, inscripciones, certificados y notificaciones
  const [catalog, setCatalog] = useState<TrainingCourse[]>(() =>
    loadTrainingsCatalog()
  );
  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>(() =>
    loadTrainingEnrollments()
  );
  const [certificates, setCertificates] = useState<TrainingCertificate[]>(() =>
    loadTrainingCertificates()
  );
  const [notifications, setNotifications] = useState<
    TrainingNotificationRecord[]
  >(() => loadTrainingNotifications());

  const refreshAll = () => {
    setCatalog(loadTrainingsCatalog());
    setEnrollments(loadTrainingEnrollments());
    setCertificates(loadTrainingCertificates());
    setNotifications(loadTrainingNotifications());
  };

  useEffect(() => {
    refreshAll();
    if (typeof window === "undefined") return;
    window.addEventListener(TRAININGS_SYNC_EVENT, refreshAll);
    window.addEventListener("storage", refreshAll);
    return () => {
      window.removeEventListener(TRAININGS_SYNC_EVENT, refreshAll);
      window.removeEventListener("storage", refreshAll);
    };
  }, []);

  // ==========================================================================
  // A. FILTROS DE «EXPLORAR CAPACITACIONES»
  // ==========================================================================
  const [filterSearchTitle, setFilterSearchTitle] = useState("");
  const [filterDiscipline, setFilterDiscipline] = useState("TODAS");
  const [filterTherapist, setFilterTherapist] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterPriceMode, setFilterPriceMode] = useState<
    "TODAS" | "GRATUITAS" | "PAGAS"
  >("TODAS");
  const [filterMaxPrice, setFilterMaxPrice] = useState<string>("");
  const [filterModality, setFilterModality] = useState("TODAS");
  const [filterLevel, setFilterLevel] = useState("TODOS");
  const [filterOnlyAvailableQuota, setFilterOnlyAvailableQuota] =
    useState(false);

  // Modal de inscripción / pago Mercado Pago Split 1:1
  const [selectedCourseForEnrollment, setSelectedCourseForEnrollment] =
    useState<TrainingCourse | null>(null);
  const [recordingConsentCheck, setRecordingConsentCheck] = useState(true);
  const [processingEnrollment, setProcessingEnrollment] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  // Sala online Daily.co activa
  const [activeClassroom, setActiveClassroom] = useState<{
    training: TrainingCourse;
    session: TrainingClassSession;
    isOrganizer: boolean;
  } | null>(null);

  // Vista previa de Certificado Digital
  const [previewCertificate, setPreviewCertificate] =
    useState<TrainingCertificate | null>(null);

  // Panel de notificaciones automáticas del usuario
  const [showMyNotifications, setShowMyNotifications] = useState(false);

  // ==========================================================================
  // C. FORMULARIO DE CREACIÓN / EDICIÓN DE CAPACITACIONES (SOLO TERAPEUTA)
  // ==========================================================================
  const [showCourseForm, setShowCourseForm] = useState(false);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDiscipline, setFormDiscipline] = useState(
    availableDisciplines[0] || "Reiki Usui"
  );
  const [formDescription, setFormDescription] = useState("");
  const [formObjectives, setFormObjectives] = useState("");
  const [formSyllabus, setFormSyllabus] = useState("");
  const [formLevel, setFormLevel] = useState<TrainingLevel>("Inicial");
  const [formModality, setFormModality] = useState<TrainingModality>(
    "Online en vivo (Daily.co)"
  );
  const [formStartDate, setFormStartDate] = useState("2026-11-28");
  const [formStartTime, setFormStartTime] = useState("19:00");
  const [formDurationHours, setFormDurationHours] = useState(4);
  const [formSessionsCount, setFormSessionsCount] = useState(2);
  const [formMaxQuota, setFormMaxQuota] = useState(20);
  const [formIsFree, setFormIsFree] = useState(false);
  const [formPriceArs, setFormPriceArs] = useState(35000);
  const [formCoverUrl, setFormCoverUrl] = useState(
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80"
  );
  const [formPrerequisites, setFormPrerequisites] = useState(
    "Sin requisitos previos."
  );
  const [formMaterialsSummary, setFormMaterialsSummary] = useState(
    "Manual en PDF, material de lectura complementario y grabación autorizada."
  );
  const [formCertificateType, setFormCertificateType] =
    useState<CertificateType>("aprobacion");
  const [formStatus, setFormStatus] = useState<TrainingStatus>("publicada");
  const [formAdditionalDoc, setFormAdditionalDoc] = useState("");
  const [formPromoSlug, setFormPromoSlug] = useState("");

  // Panel de Promoción (Link + QR + Flyer estilo Credencial) abierto en una capacitación publicada
  const [promotingCourseId, setPromotingCourseId] = useState<string | null>(
    "cap-reiki-usui-1"
  );

  // Gestión de Materiales en una capacitación del terapeuta
  const [managingMaterialsCourseId, setManagingMaterialsCourseId] = useState<
    string | null
  >(null);
  const [newMatTitle, setNewMatTitle] = useState("");
  const [newMatFormat, setNewMatFormat] = useState<MaterialFormat>("pdf");
  const [newMatDesc, setNewMatDesc] = useState("");
  const [newMatContent, setNewMatContent] = useState("");

  // Disciplinas únicas disponibles en el filtro
  const disciplineOptions = useMemo(() => {
    const set = new Set<string>(availableDisciplines);
    for (const c of catalog) {
      if (c.discipline) set.add(c.discipline);
    }
    return Array.from(set);
  }, [availableDisciplines, catalog]);

  // Catálogo filtrado para «A. Explorar capacitaciones»
  const filteredExploreCourses = useMemo(() => {
    return catalog.filter((c) => {
      if (
        c.status !== "publicada" &&
        c.status !== "en_curso" &&
        c.therapistEmail.toLowerCase() !== userEmail
      ) {
        return false;
      }
      if (c.status === "borrador" || c.status === "suspendida_admin") {
        return false;
      }
      if (
        filterSearchTitle.trim() &&
        !c.title.toLowerCase().includes(filterSearchTitle.trim().toLowerCase()) &&
        !c.description
          .toLowerCase()
          .includes(filterSearchTitle.trim().toLowerCase())
      ) {
        return false;
      }
      if (filterDiscipline !== "TODAS" && c.discipline !== filterDiscipline) {
        return false;
      }
      if (
        filterTherapist.trim() &&
        !c.therapistName
          .toLowerCase()
          .includes(filterTherapist.trim().toLowerCase()) &&
        !c.therapistNickname
          .toLowerCase()
          .includes(filterTherapist.trim().toLowerCase())
      ) {
        return false;
      }
      if (filterDateFrom && c.startDate < filterDateFrom) {
        return false;
      }
      if (filterPriceMode === "GRATUITAS" && !c.isFree && c.priceArs > 0) {
        return false;
      }
      if (filterPriceMode === "PAGAS" && (c.isFree || c.priceArs === 0)) {
        return false;
      }
      if (filterMaxPrice.trim()) {
        const maxVal = Number(filterMaxPrice);
        if (!Number.isNaN(maxVal) && maxVal >= 0 && c.priceArs > maxVal) {
          return false;
        }
      }
      if (filterModality !== "TODAS" && c.modality !== filterModality) {
        return false;
      }
      if (filterLevel !== "TODOS" && c.level !== filterLevel) {
        return false;
      }
      const remainingQuota = Math.max(0, c.maxQuota - c.enrolledCount);
      if (filterOnlyAvailableQuota && remainingQuota <= 0) {
        return false;
      }
      return true;
    });
  }, [
    catalog,
    userEmail,
    filterSearchTitle,
    filterDiscipline,
    filterTherapist,
    filterDateFrom,
    filterPriceMode,
    filterMaxPrice,
    filterModality,
    filterLevel,
    filterOnlyAvailableQuota,
  ]);

  // «B. Capacitaciones que realizo» (como alumno, sin importar si es Consultante o Terapeuta)
  const myStudentEnrollments = useMemo(() => {
    return enrollments.filter(
      (e) => e.studentEmail.trim().toLowerCase() === userEmail
    );
  }, [enrollments, userEmail]);

  // «C. Capacitaciones que ofrezco» (publicadas/creadas por este Terapeuta)
  const myOfferedCourses = useMemo(() => {
    return catalog.filter(
      (c) =>
        c.therapistEmail.trim().toLowerCase() === userEmail ||
        c.therapistNickname.trim().toLowerCase() === userNickname
    );
  }, [catalog, userEmail, userNickname]);

  // Notificaciones dirigidas a este usuario
  const myNotifications = useMemo(() => {
    return notifications.filter(
      (n) => n.recipientEmail.trim().toLowerCase() === userEmail
    );
  }, [notifications, userEmail]);

  // Resumen de ingresos del terapeuta por capacitaciones
  const myTrainingRevenueSummary = useMemo(() => {
    const myCourseIds = new Set(myOfferedCourses.map((c) => c.id));
    const paidEnrollments = enrollments.filter(
      (e) =>
        myCourseIds.has(e.trainingId) &&
        e.status === "confirmada" &&
        e.paymentStatus === "aprobado"
    );
    const totalBruto = paidEnrollments.reduce(
      (acc, item) => acc + item.pricePaidArs,
      0
    );
    const totalComisionReiki = paidEnrollments.reduce(
      (acc, item) => acc + item.marketplaceFeeArs,
      0
    );
    const totalNetoTerapeuta = paidEnrollments.reduce(
      (acc, item) => acc + item.therapistGrossShareArs,
      0
    );
    return {
      inscripcionesPagas: paidEnrollments.length,
      totalBruto,
      totalComisionReiki,
      totalNetoTerapeuta,
    };
  }, [myOfferedCourses, enrollments]);

  // Confirmar inscripción (gratuita o paga vía Mercado Pago Split 1:1)
  const handleConfirmEnrollment = async () => {
    if (!selectedCourseForEnrollment) return;
    setProcessingEnrollment(true);
    setFeedbackBanner(null);

    try {
      let mpPreferenceId: string | undefined;
      if (
        !selectedCourseForEnrollment.isFree &&
        selectedCourseForEnrollment.priceArs > 0
      ) {
        // Invocar endpoint oficial de preferencias de Mercado Pago cuando está disponible
        try {
          const res = await fetch("/api/mp/preference", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sessionPriceArs: selectedCourseForEnrollment.priceArs,
              therapistId: selectedCourseForEnrollment.therapistEmail,
              therapistName: selectedCourseForEnrollment.therapistName,
              therapistNickname: selectedCourseForEnrollment.therapistNickname,
              therapistMpLinked: true,
              attentionModality: "distancia_con_video",
              bookingTiming: "con_turno",
              therapyName: `Capacitación: ${selectedCourseForEnrollment.title}`,
              scheduledSlotLabel: `${selectedCourseForEnrollment.startDate} ${selectedCourseForEnrollment.startTime}`,
              consultanteEmail: userEmail,
              consultanteName: userFullName,
            }),
          });
          const data = await res.json();
          if (data?.preferenceId) {
            mpPreferenceId = data.preferenceId;
          }
        } catch {
          // Continúa con confirmación verificada
        }
      }

      const result = enrollStudentInTraining({
        training: selectedCourseForEnrollment,
        studentEmail: userEmail,
        studentName: userFullName,
        studentNickname: userNickname,
        studentRole: activeRole,
        recordingConsentAccepted: recordingConsentCheck,
        mpPreferenceId,
      });

      setProcessingEnrollment(false);

      if (!result.ok) {
        setFeedbackBanner({
          type: "err",
          text:
            result.error || "No se pudo completar la inscripción en este momento.",
        });
        return;
      }

      setSelectedCourseForEnrollment(null);
      refreshAll();
      setActiveSubTab("realizo");
      setFeedbackBanner({
        type: "ok",
        text: `¡Inscripción confirmada en «${selectedCourseForEnrollment.title}»! Se enviaron las notificaciones automáticas y ya tenés habilitado el acceso a la sala y materiales en «Capacitaciones que realizo».`,
      });
    } catch {
      setProcessingEnrollment(false);
      setFeedbackBanner({
        type: "err",
        text: "Error inesperado al procesar la inscripción.",
      });
    }
  };

  // Abrir formulario para crear o editar capacitación
  const openCreateForm = () => {
    setEditingCourseId(null);
    setFormTitle("");
    setFormDiscipline(availableDisciplines[0] || "Reiki Usui");
    setFormDescription("");
    setFormObjectives("");
    setFormSyllabus("");
    setFormLevel("Inicial");
    setFormModality("Online en vivo (Daily.co)");
    setFormStartDate("2026-11-28");
    setFormStartTime("19:00");
    setFormDurationHours(4);
    setFormSessionsCount(2);
    setFormMaxQuota(20);
    setFormIsFree(false);
    setFormPriceArs(35000);
    setFormPrerequisites("Sin requisitos previos.");
    setFormMaterialsSummary(
      "Manual en PDF, documentos de lectura y grabación autorizada."
    );
    setFormCertificateType("aprobacion");
    setFormStatus("publicada");
    setFormAdditionalDoc("");
    setFormPromoSlug("");
    setShowCourseForm(true);
  };

  const openEditForm = (course: TrainingCourse) => {
    setEditingCourseId(course.id);
    setFormTitle(course.title);
    setFormDiscipline(course.discipline);
    setFormDescription(course.description);
    setFormObjectives(course.objectives);
    setFormSyllabus(course.syllabus);
    setFormLevel(course.level);
    setFormModality(course.modality);
    setFormStartDate(course.startDate);
    setFormStartTime(course.startTime);
    setFormDurationHours(course.durationHoursTotal);
    setFormSessionsCount(course.sessionsCount);
    setFormMaxQuota(course.maxQuota);
    setFormIsFree(course.isFree);
    setFormPriceArs(course.priceArs);
    setFormCoverUrl(course.coverImageUrl);
    setFormPrerequisites(course.prerequisites);
    setFormMaterialsSummary(course.materialsIncludedSummary);
    setFormCertificateType(course.certificateType);
    setFormStatus(course.status);
    setFormAdditionalDoc(course.additionalDocumentationRef || "");
    setFormPromoSlug(
      course.promoSlug || getTrainingPromoSlug(course)
    );
    setShowCourseForm(true);
  };

  const handleSaveCourseForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEnabledTherapist) return;
    if (!isBiometricVerified) {
      setFeedbackBanner({
        type: "err",
        text: "Para publicar capacitaciones debés contar con tu perfil de Terapeuta habilitado y la verificación biométrica completada.",
      });
      return;
    }

    const cleanTitle = formTitle.trim();
    if (!cleanTitle) return;

    const nowIso = new Date().toISOString();
    const count = Math.max(1, Math.min(24, Number(formSessionsCount) || 1));
    const totalHours = Math.max(1, Number(formDurationHours) || 2);
    const perSessionMinutes = Math.max(
      30,
      Math.round((totalHours * 60) / count)
    );

    const courseId = editingCourseId || `cap-${Date.now()}`;
    const existingCourse = catalog.find((c) => c.id === editingCourseId);

    const generatedSessions: TrainingClassSession[] = Array.from(
      { length: count },
      (_, idx) => {
        const existingSes = existingCourse?.sessions[idx];
        const baseDate = new Date(`${formStartDate}T12:00:00`);
        if (!Number.isNaN(baseDate.getTime())) {
          baseDate.setDate(baseDate.getDate() + idx * 7);
        }
        const sesDateStr = !Number.isNaN(baseDate.getTime())
          ? baseDate.toISOString().slice(0, 10)
          : formStartDate;

        return {
          id: existingSes?.id || `${courseId}-ses-${idx + 1}`,
          classNumber: idx + 1,
          title:
            existingSes?.title ||
            `Encuentro ${idx + 1}: ${cleanTitle}`,
          date: existingSes ? existingSes.date : sesDateStr,
          time: formStartTime,
          durationMinutes: perSessionMinutes,
          status: existingSes?.status || "programada",
          roomSlug: `${courseId}-clase-${idx + 1}`,
          recordingEnabled: true,
          recordingConsentConfirmed: true,
          recordingUrl: existingSes?.recordingUrl,
        };
      }
    );

    const savedCourse: TrainingCourse = {
      id: courseId,
      title: cleanTitle,
      discipline: formDiscipline,
      description:
        formDescription.trim() ||
        `Capacitación online en vivo sobre ${formDiscipline} dictada por ${userFullName}.`,
      objectives:
        formObjectives.trim() ||
        `Brindar herramientas teórico-prácticas de ${formDiscipline}.`,
      syllabus:
        formSyllabus.trim() ||
        `Módulos progresivos sobre ${formDiscipline} y práctica supervisada.`,
      level: formLevel,
      modality: formModality,
      startDate: formStartDate,
      startTime: formStartTime,
      durationHoursTotal: totalHours,
      sessionsCount: count,
      sessions: generatedSessions,
      maxQuota: Math.max(1, Number(formMaxQuota) || 20),
      enrolledCount: existingCourse?.enrolledCount || 0,
      isFree: formIsFree,
      priceArs: formIsFree ? 0 : Math.max(0, Number(formPriceArs) || 0),
      coverImageUrl:
        formCoverUrl.trim() ||
        "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=900&q=80",
      prerequisites: formPrerequisites.trim() || "Sin requisitos previos.",
      materialsIncludedSummary: formMaterialsSummary.trim(),
      materials: existingCourse?.materials || [],
      certificateType: formCertificateType,
      status: formStatus,
      therapistEmail: userEmail,
      therapistName: userFullName,
      therapistNickname: userNickname,
      therapistPhotoUrl: profile.fotoUrl,
      therapistBiometricVerified: isBiometricVerified,
      additionalDocumentationRef: formAdditionalDoc.trim() || undefined,
      promoSlug: buildTrainingSlug(formPromoSlug.trim() || cleanTitle, courseId),
      createdAt: existingCourse?.createdAt || nowIso,
      updatedAt: nowIso,
    };

    const nextCatalog = editingCourseId
      ? catalog.map((c) => (c.id === editingCourseId ? savedCourse : c))
      : [savedCourse, ...catalog];

    saveTrainingsCatalog(nextCatalog);

    // Si se modificaron horarios de un curso con alumnos inscriptos, enviar notificación automática
    if (
      editingCourseId &&
      existingCourse &&
      (existingCourse.startDate !== formStartDate ||
        existingCourse.startTime !== formStartTime)
    ) {
      const courseStudents = enrollments.filter(
        (en) => en.trainingId === editingCourseId && en.status === "confirmada"
      );
      for (const st of courseStudents) {
        dispatchTrainingNotification({
          event: "modificacion_horarios",
          trainingId: savedCourse.id,
          trainingTitle: savedCourse.title,
          recipientEmail: st.studentEmail,
          recipientName: st.studentName,
          subject: `Actualización de fecha/horario: ${savedCourse.title}`,
          message: `Te informamos que la capacitación «${savedCourse.title}» actualizó su cronograma al ${savedCourse.startDate} a las ${savedCourse.startTime} hs.`,
        });
      }
    }

    setShowCourseForm(false);
    setEditingCourseId(null);
    setPromotingCourseId(savedCourse.id);
    refreshAll();
    setFeedbackBanner({
      type: "ok",
      text: editingCourseId
        ? `Capacitación «${savedCourse.title}» actualizada correctamente. Abajo tenés tu Link, Código QR y Flyer listos para promocionar.`
        : `Capacitación «${savedCourse.title}» creada y publicada. Ya podés compartir el Link, descargar el Flyer o bajar solo el Código QR.`,
    });
  };

  // Agregar material (PDF, lectura, imagen, complementario, grabación) y notificar a alumnos
  const handleAddMaterialToCourse = (course: TrainingCourse) => {
    if (!newMatTitle.trim()) return;
    const item: TrainingMaterialItem = {
      id: `mat-${Date.now()}`,
      title: newMatTitle.trim(),
      format: newMatFormat,
      description: newMatDesc.trim() || `Material oficial de ${course.title}`,
      urlOrContent:
        newMatContent.trim() ||
        `Material disponible en Academia Reiki Online: ${newMatTitle.trim()}`,
      addedAt: new Date().toISOString(),
    };

    const updatedCourse: TrainingCourse = {
      ...course,
      materials: [...course.materials, item],
      updatedAt: new Date().toISOString(),
    };
    saveTrainingsCatalog(
      catalog.map((c) => (c.id === course.id ? updatedCourse : c))
    );

    // Notificar automáticamente a los alumnos inscriptos
    const courseStudents = enrollments.filter(
      (en) => en.trainingId === course.id && en.status === "confirmada"
    );
    for (const st of courseStudents) {
      dispatchTrainingNotification({
        event: "disponibilidad_materiales",
        trainingId: course.id,
        trainingTitle: course.title,
        recipientEmail: st.studentEmail,
        recipientName: st.studentName,
        subject: `Nuevo material disponible: ${course.title}`,
        message: `El terapeuta ${course.therapistName} incorporó el material «${item.title}» (${item.format.toUpperCase()}) en «${course.title}».`,
      });
    }

    setNewMatTitle("");
    setNewMatDesc("");
    setNewMatContent("");
    refreshAll();
    setFeedbackBanner({
      type: "ok",
      text: `Material «${item.title}» incorporado y notificado automáticamente a los alumnos.`,
    });
  };

  // Registrar asistencia de un alumno a una clase
  const handleMarkStudentAttendance = (
    enrollmentId: string,
    sessionId: string
  ) => {
    const current = loadTrainingEnrollments();
    const updated = current.map((e) => {
      if (e.id !== enrollmentId) return e;
      if (e.attendedSessionIds.includes(sessionId)) return e;
      return {
        ...e,
        attendedSessionIds: [...e.attendedSessionIds, sessionId],
        updatedAt: new Date().toISOString(),
      };
    });
    saveTrainingEnrollments(updated);
    setEnrollments(updated);
  };

  // Finalizar una clase en vivo desde la sala Daily.co
  const handleFinishClassSession = (
    course: TrainingCourse,
    sessionId: string,
    recordingGeneratedUrl?: string
  ) => {
    const updatedSessions = course.sessions.map((s) =>
      s.id === sessionId
        ? {
            ...s,
            status: "finalizada" as const,
            recordingUrl: recordingGeneratedUrl || s.recordingUrl,
          }
        : s
    );

    const allFinished = updatedSessions.every((s) => s.status === "finalizada");
    const updatedMaterials = [...course.materials];
    if (recordingGeneratedUrl) {
      updatedMaterials.push({
        id: `rec-mat-${Date.now()}`,
        title: `Grabación de clase (${sessionId})`,
        format: "grabacion",
        description: "Grabación oficial autorizada de la clase en vivo.",
        urlOrContent: recordingGeneratedUrl,
        addedAt: new Date().toISOString(),
        requiresRecordingConsent: true,
      });
    }

    const updatedCourse: TrainingCourse = {
      ...course,
      sessions: updatedSessions,
      materials: updatedMaterials,
      status: allFinished ? "finalizada" : "en_curso",
      updatedAt: new Date().toISOString(),
    };

    saveTrainingsCatalog(
      catalog.map((c) => (c.id === course.id ? updatedCourse : c))
    );

    // Si finalizó toda la capacitación, emitir certificados automáticamente a los alumnos inscriptos
    if (allFinished && course.certificateType !== "sin_certificado") {
      const courseStudents = loadTrainingEnrollments().filter(
        (e) => e.trainingId === course.id && e.status === "confirmada"
      );
      for (const st of courseStudents) {
        issueTrainingCertificate({
          enrollmentId: st.id,
          training: updatedCourse,
        });
      }
    }

    refreshAll();
  };

  // Finalizar o cancelar capacitación completa (por el Terapeuta Organizador)
  const handleChangeCourseStatus = (
    course: TrainingCourse,
    nextStatus: "finalizada" | "cancelada"
  ) => {
    const nowIso = new Date().toISOString();
    const updatedCourse: TrainingCourse = {
      ...course,
      status: nextStatus,
      updatedAt: nowIso,
    };
    saveTrainingsCatalog(
      catalog.map((c) => (c.id === course.id ? updatedCourse : c))
    );

    const courseStudents = enrollments.filter(
      (e) => e.trainingId === course.id && e.status === "confirmada"
    );

    if (nextStatus === "finalizada") {
      for (const st of courseStudents) {
        issueTrainingCertificate({
          enrollmentId: st.id,
          training: updatedCourse,
        });
      }
      setFeedbackBanner({
        type: "ok",
        text: `Capacitación «${course.title}» marcada como Finalizada. Se emitieron los certificados digitales a los alumnos participantes.`,
      });
    } else if (nextStatus === "cancelada") {
      const updatedEnrollments = enrollments.map((e) =>
        e.trainingId === course.id && e.status === "confirmada"
          ? {
              ...e,
              status: "cancelada_terapeuta" as const,
              paymentStatus:
                e.paymentStatus === "aprobado"
                  ? ("reembolsado" as const)
                  : e.paymentStatus,
              updatedAt: nowIso,
            }
          : e
      );
      saveTrainingEnrollments(updatedEnrollments);

      for (const st of courseStudents) {
        dispatchTrainingNotification({
          event: "cancelacion",
          trainingId: course.id,
          trainingTitle: course.title,
          recipientEmail: st.studentEmail,
          recipientName: st.studentName,
          subject: `Cancelación de capacitación: ${course.title}`,
          message: `El terapeuta organizador canceló la capacitación «${course.title}». Si abonaste inscripción, se gestiona la devolución íntegra a tu favor manteniendo firme la comisión de plataforma según las condiciones de Reiki Online.`,
        });
      }
      setFeedbackBanner({
        type: "ok",
        text: `Capacitación «${course.title}» cancelada. Se notificó automáticamente a los inscriptos.`,
      });
    }

    refreshAll();
  };

  // Descargar Certificado Digital como imagen PNG verificada
  const handleDownloadCertificatePng = (cert: TrainingCertificate) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1400;
    canvas.height = 980;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fondo lavanda institucional
    ctx.fillStyle = "#836DAD";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Marco interior Champán y superficie blanca
    ctx.strokeStyle = "#F3D791";
    ctx.lineWidth = 8;
    ctx.strokeRect(36, 36, canvas.width - 72, canvas.height - 72);

    ctx.fillStyle = "#FAF8FC";
    ctx.fillRect(56, 56, canvas.width - 112, canvas.height - 112);

    // Franja superior lavanda
    ctx.fillStyle = "#836DAD";
    ctx.fillRect(56, 56, canvas.width - 112, 145);

    ctx.fillStyle = "#F3D791";
    ctx.font = "bold 20px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(
      "ACADEMIA REIKI ONLINE • WWW.REIKIONLINE.COM.AR",
      canvas.width / 2,
      115
    );

    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 36px sans-serif";
    ctx.fillText(
      cert.certificateType === "aprobacion"
        ? "CERTIFICADO DIGITAL DE APROBACIÓN"
        : "CERTIFICADO DIGITAL DE PARTICIPACIÓN",
      canvas.width / 2,
      165
    );

    // Cuerpo del certificado
    ctx.fillStyle = "#2B1F42";
    ctx.font = "24px sans-serif";
    ctx.fillText("Se deja constancia de que:", canvas.width / 2, 280);

    ctx.fillStyle = "#836DAD";
    ctx.font = "bold 46px sans-serif";
    ctx.fillText(cert.studentName, canvas.width / 2, 350);

    ctx.fillStyle = "#2B1F42";
    ctx.font = "24px sans-serif";
    ctx.fillText(
      `ha completado satisfactoriamente la capacitación online en ${cert.discipline}:`,
      canvas.width / 2,
      425
    );

    ctx.fillStyle = "#2B1F42";
    ctx.font = "bold 34px sans-serif";
    ctx.fillText(`«${cert.trainingTitle}»`, canvas.width / 2, 490);

    ctx.font = "22px sans-serif";
    ctx.fillText(
      `Carga horaria total: ${cert.durationHours} horas reloj • Modalidad Online en Vivo`,
      canvas.width / 2,
      555
    );

    // Datos del terapeuta organizador y código único
    ctx.fillStyle = "#5E4B8B";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText(
      `Terapeuta Organizador: ${cert.therapistName} (@${cert.therapistNickname})`,
      canvas.width / 2,
      645
    );

    const dateStr = new Date(cert.issuedAt).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    ctx.fillStyle = "#2B1F42";
    ctx.font = "20px sans-serif";
    ctx.fillText(
      `Fecha de emisión: ${dateStr}  |  Código único de verificación: ${cert.verificationCode}`,
      canvas.width / 2,
      710
    );

    // Aviso legal obligatorio (Sección 7)
    ctx.fillStyle = "#64748B";
    ctx.font = "16px sans-serif";
    ctx.fillText(
      "Certificado privado de formación complementaria emitido en el marco de Academia Reiki Online.",
      canvas.width / 2,
      835
    );
    ctx.fillText(
      "No equivale a título oficial estatal ni habilitación profesional médica o psicológica.",
      canvas.width / 2,
      862
    );

    const link = document.createElement("a");
    link.download = `Certificado-${cert.verificationCode}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="space-y-5">
      {/* CABECERA RECTANGULAR DE «MIS CAPACITACIONES» */}
      <div className="rounded-2xl border border-[#836DAD]/25 bg-[#F6F3FA] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#836DAD] text-[#F3D791] shadow-xs">
            <GraduationCap className="h-5 w-5" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-base sm:text-lg font-bold text-[#2B1F42]">
                Mis Capacitaciones • Academia Reiki Online
              </h4>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#836DAD] px-2.5 py-0.5 text-[11px] font-bold text-[#F3D791]">
                Rol activo: {isEnabledTherapist ? "Terapeuta" : "Consultante"}
              </span>
            </div>
            <p className="text-xs text-[#2B1F42]/75">
              {isEnabledTherapist
                ? "Explorá capacitaciones de otros colegas, cursá como alumno o publicá y dictá tus propias formaciones en vivo."
                : "Explorá el catálogo de capacitaciones online, inscribite y accedé a tus clases en vivo, materiales y certificados."}
            </p>
          </div>
        </div>

        {/* Botón de Notificaciones Automáticas de Capacitaciones */}
        <button
          type="button"
          onClick={() => setShowMyNotifications((prev) => !prev)}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD]/30 bg-white px-3.5 py-2 text-xs font-bold text-[#2B1F42] hover:bg-[#836DAD] hover:text-white transition"
        >
          <Bell className="h-4 w-4 text-[#836DAD] group-hover:text-white" />
          <span>Avisos ({myNotifications.length})</span>
        </button>
      </div>

      {/* BANDEJA DE NOTIFICACIONES AUTOMÁTICAS (Email + WhatsApp) */}
      {showMyNotifications && (
        <div className="rounded-2xl border border-[#836DAD]/30 bg-white p-4 space-y-3 shadow-xs">
          <div className="flex items-center justify-between border-b border-[#836DAD]/15 pb-2.5">
            <h5 className="text-xs sm:text-sm font-bold text-[#2B1F42]">
              Notificaciones Automáticas Enviadas (Correo Electrónico y WhatsApp)
            </h5>
            <button
              type="button"
              onClick={() => setShowMyNotifications(false)}
              className="cursor-pointer text-xs font-semibold text-[#836DAD] hover:underline"
            >
              Cerrar
            </button>
          </div>
          {myNotifications.length === 0 ? (
            <p className="text-xs text-[#2B1F42]/65 py-2">
              Aún no tenés notificaciones registradas en tus capacitaciones.
            </p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {myNotifications.map((n) => (
                <div
                  key={n.id}
                  className="rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-3 text-xs space-y-1"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-bold text-[#836DAD]">
                      {EVENT_LABELS[n.event]} — {n.subject}
                    </span>
                    <span className="text-[11px] text-[#2B1F42]/60">
                      Canales: {n.channels.join(" + ").toUpperCase()} •{" "}
                      {new Date(n.sentAt).toLocaleString("es-AR")}
                    </span>
                  </div>
                  <p className="text-[#2B1F42]/85">{n.message}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MENSAJE DE FEEDBACK */}
      {feedbackBanner && (
        <div
          role="status"
          className={`rounded-2xl border px-4 py-3 text-xs sm:text-sm font-semibold flex items-center justify-between gap-3 ${
            feedbackBanner.type === "ok"
              ? "border-emerald-300 bg-emerald-50 text-emerald-900"
              : "border-rose-300 bg-rose-50 text-rose-900"
          }`}
        >
          <span>{feedbackBanner.text}</span>
          <button
            type="button"
            onClick={() => setFeedbackBanner(null)}
            className="cursor-pointer text-xs font-bold underline"
          >
            Cerrar
          </button>
        </div>
      )}

      {/* SELECTOR DE APARTADOS SEGÚN ROL (Sección 3 de las instrucciones):
          - Terapeutas: A. Explorar capacitaciones | B. Capacitaciones que realizo | C. Capacitaciones que ofrezco
          - Consultantes: Solamente Explorar capacitaciones | Capacitaciones que realizo */}
      <div
        className={`grid grid-cols-1 gap-2 rounded-2xl bg-[#F6F3FA] p-1.5 ${
          isEnabledTherapist ? "sm:grid-cols-3" : "sm:grid-cols-2"
        }`}
      >
        <button
          type="button"
          onClick={() => setActiveSubTab("explorar")}
          className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === "explorar"
              ? "bg-[#836DAD] text-white shadow-sm"
              : "bg-white text-[#2B1F42] hover:bg-[#836DAD]/12"
          }`}
        >
          <Search className="h-4 w-4 shrink-0" />
          <span>Explorar capacitaciones ({filteredExploreCourses.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("realizo")}
          className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
            activeSubTab === "realizo"
              ? "bg-[#836DAD] text-white shadow-sm"
              : "bg-white text-[#2B1F42] hover:bg-[#836DAD]/12"
          }`}
        >
          <BookOpen className="h-4 w-4 shrink-0" />
          <span>
            Capacitaciones que realizo ({myStudentEnrollments.length})
          </span>
        </button>

        {isEnabledTherapist && (
          <button
            type="button"
            onClick={() => setActiveSubTab("ofrezco")}
            className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all ${
              activeSubTab === "ofrezco"
                ? "bg-[#836DAD] text-white shadow-sm"
                : "bg-white text-[#2B1F42] hover:bg-[#836DAD]/12"
            }`}
          >
            <GraduationCap className="h-4 w-4 shrink-0" />
            <span>Capacitaciones que ofrezco ({myOfferedCourses.length})</span>
          </button>
        )}
      </div>

      {/* =====================================================================
          APARTADO A: EXPLORAR CAPACITACIONES (CATÁLOGO CON BÚSQUEDA Y FILTROS)
      ===================================================================== */}
      {activeSubTab === "explorar" && (
        <div className="space-y-4">
          {/* Barra de búsqueda y 8 filtros requeridos */}
          <div className="rounded-2xl border border-[#836DAD]/25 bg-white p-4 shadow-2xs space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                  Nombre del curso o temática
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#836DAD]" />
                  <input
                    type="search"
                    value={filterSearchTitle}
                    onChange={(e) => setFilterSearchTitle(e.target.value)}
                    placeholder="Buscar curso..."
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] py-2 pr-3 pl-8 text-xs text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                  Disciplina
                </label>
                <select
                  value={filterDiscipline}
                  onChange={(e) => setFilterDiscipline(e.target.value)}
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
                >
                  <option value="TODAS">Todas las disciplinas</option>
                  {disciplineOptions.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                  Terapeuta que lo ofrece
                </label>
                <input
                  type="text"
                  value={filterTherapist}
                  onChange={(e) => setFilterTherapist(e.target.value)}
                  placeholder="Nombre o @nickname..."
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                  Nivel de formación
                </label>
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value)}
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
                >
                  <option value="TODOS">Todos los niveles</option>
                  <option value="Inicial">Inicial</option>
                  <option value="Intermedio">Intermedio</option>
                  <option value="Avanzado">Avanzado</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 pt-1">
              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                  Fecha desde
                </label>
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={(e) => setFilterDateFrom(e.target.value)}
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-1.5 text-xs text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                  Modalidad
                </label>
                <select
                  value={filterModality}
                  onChange={(e) => setFilterModality(e.target.value)}
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42] focus:border-[#836DAD] focus:outline-none"
                >
                  <option value="TODAS">Todas las modalidades</option>
                  <option value="Online en vivo (Daily.co)">
                    Online en vivo (Daily.co)
                  </option>
                  <option value="Online intensivo en vivo">
                    Online intensivo en vivo
                  </option>
                  <option value="Ciclo de formación online">
                    Ciclo de formación online
                  </option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                  Precio
                </label>
                <div className="flex gap-1.5">
                  <select
                    value={filterPriceMode}
                    onChange={(e) =>
                      setFilterPriceMode(
                        e.target.value as "TODAS" | "GRATUITAS" | "PAGAS"
                      )
                    }
                    className="w-1/2 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-2 py-2 text-xs text-[#2B1F42]"
                  >
                    <option value="TODAS">Todas</option>
                    <option value="GRATUITAS">Gratuitas</option>
                    <option value="PAGAS">Pagas</option>
                  </select>
                  <input
                    type="number"
                    min={0}
                    value={filterMaxPrice}
                    onChange={(e) => setFilterMaxPrice(e.target.value)}
                    placeholder="Máx $ ARS"
                    className="w-1/2 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-2.5 py-2 text-xs text-[#2B1F42]"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs font-semibold text-[#2B1F42] w-full">
                  <input
                    type="checkbox"
                    checked={filterOnlyAvailableQuota}
                    onChange={(e) =>
                      setFilterOnlyAvailableQuota(e.target.checked)
                    }
                    className="h-4 w-4 accent-[#836DAD]"
                  />
                  <span>Solo con cupos disponibles</span>
                </label>
              </div>
            </div>
          </div>

          {/* Tarjetas del catálogo de capacitaciones */}
          {filteredExploreCourses.length === 0 ? (
            <div className="rounded-2xl border border-[#836DAD]/20 bg-white p-8 text-center space-y-2">
              <p className="text-sm font-bold text-[#2B1F42]">
                No se encontraron capacitaciones con los filtros seleccionados.
              </p>
              <button
                type="button"
                onClick={() => {
                  setFilterSearchTitle("");
                  setFilterDiscipline("TODAS");
                  setFilterTherapist("");
                  setFilterDateFrom("");
                  setFilterPriceMode("TODAS");
                  setFilterMaxPrice("");
                  setFilterModality("TODAS");
                  setFilterLevel("TODOS");
                  setFilterOnlyAvailableQuota(false);
                }}
                className="cursor-pointer rounded-xl bg-[#836DAD] px-4 py-2 text-xs font-bold text-white"
              >
                Limpiar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredExploreCourses.map((course) => {
                const remainingQuota = Math.max(
                  0,
                  course.maxQuota - course.enrolledCount
                );
                const alreadyEnrolled = myStudentEnrollments.some(
                  (e) =>
                    e.trainingId === course.id && e.status === "confirmada"
                );
                const isOwnCourse =
                  course.therapistEmail.trim().toLowerCase() === userEmail;

                return (
                  <article
                    key={course.id}
                    className="flex flex-col justify-between overflow-hidden rounded-2xl border border-[#836DAD]/25 bg-white shadow-xs transition hover:shadow-md"
                  >
                    <div>
                      <div className="relative h-44 w-full overflow-hidden bg-[#2B1F42]">
                        <img
                          src={course.coverImageUrl}
                          alt={course.title}
                          className="h-full w-full object-cover opacity-90"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#2B1F42]/90 via-[#2B1F42]/25 to-transparent" />
                        <div className="absolute top-3 left-3 right-3 flex flex-wrap items-center justify-between gap-1.5">
                          <span className="rounded-full bg-[#836DAD] px-3 py-1 text-[11px] font-bold text-[#F3D791]">
                            {course.discipline} • Nivel {course.level}
                          </span>
                          <span className="rounded-full bg-[#F3D791] px-3 py-1 text-xs font-extrabold text-[#2B1F42]">
                            {course.isFree || course.priceArs === 0
                              ? "GRATUITA"
                              : formatArs(course.priceArs)}
                          </span>
                        </div>
                        <div className="absolute bottom-3 left-3 right-3">
                          <h5 className="text-base font-bold text-white leading-snug">
                            {course.title}
                          </h5>
                        </div>
                      </div>

                      <div className="p-4 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#2B1F42]/80">
                          <span className="font-semibold text-[#836DAD]">
                            Terapeuta: {course.therapistName} (@
                            {course.therapistNickname})
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F6F3FA] px-2.5 py-0.5 text-[11px] font-bold text-[#2B1F42]">
                            <Users className="h-3 w-3 text-[#836DAD]" />
                            {remainingQuota} de {course.maxQuota} cupos
                            disponibles
                          </span>
                        </div>

                        <p className="text-xs text-[#2B1F42]/80 leading-relaxed">
                          {course.description}
                        </p>

                        <div className="rounded-xl bg-[#FAF8FC] border border-[#836DAD]/15 p-3 text-xs space-y-1">
                          <p>
                            <strong>Inicio:</strong> {course.startDate} a las{" "}
                            {course.startTime} hs ({course.sessionsCount}{" "}
                            {course.sessionsCount === 1
                              ? "encuentro"
                              : "encuentros"}{" "}
                            • {course.durationHoursTotal} hs totales)
                          </p>
                          <p>
                            <strong>Modalidad:</strong> {course.modality}
                          </p>
                          <p>
                            <strong>Temario:</strong>{" "}
                            {course.syllabus.replace(/\n/g, " • ")}
                          </p>
                          <p>
                            <strong>Certificado:</strong>{" "}
                            {course.certificateType === "sin_certificado"
                              ? "No incluye certificado"
                              : course.certificateType === "aprobacion"
                              ? "Certificado digital de aprobación (con código QR/verificación)"
                              : "Certificado digital de participación"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-[#836DAD]/15 bg-[#FAF8FC] px-4 py-3 flex items-center justify-between gap-2">
                      {alreadyEnrolled ? (
                        <button
                          type="button"
                          onClick={() => setActiveSubTab("realizo")}
                          className="w-full cursor-pointer rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition"
                        >
                          ✓ Ya estás inscripto • Ir a «Capacitaciones que realizo»
                        </button>
                      ) : isOwnCourse ? (
                        <button
                          type="button"
                          onClick={() => setActiveSubTab("ofrezco")}
                          className="w-full cursor-pointer rounded-xl border border-[#836DAD] bg-white px-4 py-2.5 text-xs font-bold text-[#836DAD] hover:bg-[#836DAD] hover:text-white transition"
                        >
                          Administrás esta capacitación • Ver en «Capacitaciones que ofrezco»
                        </button>
                      ) : remainingQuota <= 0 ? (
                        <span className="w-full text-center rounded-xl bg-gray-200 px-4 py-2.5 text-xs font-bold text-gray-600">
                          Cupo completo
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setSelectedCourseForEnrollment(course)
                          }
                          className="w-full cursor-pointer rounded-xl bg-[#836DAD] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#6D5898] transition"
                        >
                          {course.isFree || course.priceArs === 0
                            ? "Inscribirme sin cargo"
                            : `Inscribirme y abonar ${formatArs(course.priceArs)}`}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE INSCRIPCIÓN Y PAGO MERCADO PAGO SPLIT 1:1 */}
      {selectedCourseForEnrollment && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D142E]/75 p-3 backdrop-blur-xs"
        >
          <div className="w-full max-w-lg rounded-3xl border-2 border-[#836DAD] bg-white p-5 sm:p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[#836DAD]/15 pb-3">
              <div>
                <span className="inline-flex items-center gap-1 rounded-full bg-[#836DAD] px-2.5 py-0.5 text-[10px] font-bold text-[#F3D791]">
                  Inscripción Verificada • Academia Reiki Online
                </span>
                <h5 className="mt-1 text-base sm:text-lg font-bold text-[#2B1F42]">
                  {selectedCourseForEnrollment.title}
                </h5>
                <p className="text-xs text-[#2B1F42]/75">
                  Dictada por {selectedCourseForEnrollment.therapistName} (@
                  {selectedCourseForEnrollment.therapistNickname})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCourseForEnrollment(null)}
                className="cursor-pointer rounded-lg px-2 py-1 text-xs font-bold text-[#2B1F42]/60 hover:text-[#2B1F42]"
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-[#F6F3FA] p-4 text-xs space-y-2">
              <div className="flex justify-between">
                <span>Alumno inscripto:</span>
                <strong>
                  {userFullName} (@{userNickname})
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Inicio y modalidad:</span>
                <strong>
                  {selectedCourseForEnrollment.startDate} •{" "}
                  {selectedCourseForEnrollment.startTime} hs (
                  {selectedCourseForEnrollment.modality})
                </strong>
              </div>
              <div className="flex justify-between">
                <span>Encuentros y carga horaria:</span>
                <strong>
                  {selectedCourseForEnrollment.sessionsCount} encuentro(s) •{" "}
                  {selectedCourseForEnrollment.durationHoursTotal} hs reloj
                </strong>
              </div>
              <div className="flex justify-between border-t border-[#836DAD]/20 pt-2 text-sm">
                <span className="font-bold">Arancel total:</span>
                <strong className="text-[#836DAD]">
                  {selectedCourseForEnrollment.isFree ||
                  selectedCourseForEnrollment.priceArs === 0
                    ? "SIN CARGO ($0 ARS)"
                    : formatArs(selectedCourseForEnrollment.priceArs)}
                </strong>
              </div>
            </div>

            <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] p-3 text-xs text-[#2B1F42]">
              <input
                type="checkbox"
                checked={recordingConsentCheck}
                onChange={(e) => setRecordingConsentCheck(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[#836DAD]"
              />
              <span>
                Presto mi consentimiento para participar en la sala de
                videollamada integrada Daily.co y acceder a las grabaciones
                autorizadas de la clase con fines exclusivamente formativos.
              </span>
            </label>

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedCourseForEnrollment(null)}
                className="cursor-pointer rounded-xl border border-[#836DAD]/30 px-4 py-2.5 text-xs font-bold text-[#2B1F42]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={processingEnrollment}
                onClick={handleConfirmEnrollment}
                className="cursor-pointer rounded-xl bg-[#836DAD] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#6D5898] disabled:opacity-50"
              >
                {processingEnrollment
                  ? "Procesando inscripción..."
                  : selectedCourseForEnrollment.isFree ||
                    selectedCourseForEnrollment.priceArs === 0
                  ? "Confirmar Inscripción Gratuita"
                  : `Pagar con Mercado Pago (${formatArs(
                      selectedCourseForEnrollment.priceArs
                    )}) y Confirmar`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          APARTADO B: CAPACITACIONES QUE REALIZO (COMO ALUMNO)
      ===================================================================== */}
      {activeSubTab === "realizo" && (
        <div className="space-y-4">
          {myStudentEnrollments.length === 0 ? (
            <div className="rounded-2xl border border-[#836DAD]/25 bg-white p-8 text-center space-y-3">
              <BookOpen className="mx-auto h-10 w-10 text-[#836DAD]" />
              <h5 className="text-base font-bold text-[#2B1F42]">
                Aún no te inscribiste en ninguna capacitación
              </h5>
              <p className="text-xs text-[#2B1F42]/70 max-w-md mx-auto">
                Desde «Explorar capacitaciones» podés buscar cursos y talleres
                en vivo ofrecidos por los terapeutas de Reiki Online e
                inscribirte en un clic.
              </p>
              <button
                type="button"
                onClick={() => setActiveSubTab("explorar")}
                className="cursor-pointer rounded-xl bg-[#836DAD] px-4 py-2.5 text-xs font-bold text-white"
              >
                Explorar capacitaciones disponibles
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {myStudentEnrollments.map((enrollment) => {
                const course = catalog.find(
                  (c) => c.id === enrollment.trainingId
                );
                if (!course) return null;

                const myCert = certificates.find(
                  (cert) =>
                    cert.id === enrollment.certificateId ||
                    (cert.trainingId === course.id &&
                      cert.studentEmail.toLowerCase() === userEmail)
                );

                return (
                  <div
                    key={enrollment.id}
                    className="rounded-2xl border border-[#836DAD]/30 bg-white p-4 sm:p-5 shadow-xs space-y-4"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#836DAD]/15 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-[#836DAD] px-2.5 py-0.5 text-[11px] font-bold text-[#F3D791]">
                            {course.discipline} • Nivel {course.level}
                          </span>
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                              enrollment.status === "confirmada"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            Inscripción: {enrollment.status.toUpperCase()} •
                            Pago: {enrollment.paymentStatus.toUpperCase()}
                          </span>
                        </div>
                        <h5 className="mt-1.5 text-base sm:text-lg font-bold text-[#2B1F42]">
                          {course.title}
                        </h5>
                        <p className="text-xs text-[#2B1F42]/75">
                          Terapeuta organizador:{" "}
                          <strong>{course.therapistName}</strong> (@
                          {course.therapistNickname}) • Carga horaria:{" "}
                          {course.durationHoursTotal} hs
                        </p>
                      </div>

                      {/* Botón de Certificado Digital si ya fue emitido o para solicitarlo al completar */}
                      <div className="flex flex-wrap items-center gap-2">
                        {myCert ? (
                          <button
                            type="button"
                            onClick={() => setPreviewCertificate(myCert)}
                            className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#F3D791] px-3.5 py-2 text-xs font-extrabold text-[#2B1F42] shadow-xs hover:bg-[#e8c877] transition"
                          >
                            <Award className="h-4 w-4 text-[#836DAD]" />
                            <span>Ver / Descargar Certificado</span>
                          </button>
                        ) : (
                          course.certificateType !== "sin_certificado" &&
                          enrollment.status === "confirmada" && (
                            <button
                              type="button"
                              onClick={() => {
                                const emitted = issueTrainingCertificate({
                                  enrollmentId: enrollment.id,
                                  training: course,
                                });
                                refreshAll();
                                if (emitted) setPreviewCertificate(emitted);
                              }}
                              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD] bg-[#F6F3FA] px-3.5 py-2 text-xs font-bold text-[#836DAD] hover:bg-[#836DAD] hover:text-white transition"
                            >
                              <Award className="h-4 w-4" />
                              <span>Obtener Certificado Digital</span>
                            </button>
                          )
                        )}
                      </div>
                    </div>

                    {/* PRÓXIMAS CLASES Y ACCESO A SALA ONLINE DAILY.CO */}
                    <div className="space-y-2">
                      <h6 className="text-xs font-bold uppercase tracking-wider text-[#5E4B8B]">
                        Cronograma de Clases y Sala Online Integrada (Daily.co)
                      </h6>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                        {course.sessions.map((ses) => {
                          const attended =
                            enrollment.attendedSessionIds.includes(ses.id);
                          return (
                            <div
                              key={ses.id}
                              className="flex items-center justify-between gap-2 rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <p className="font-bold text-[#2B1F42]">
                                  {ses.title}
                                </p>
                                <p className="text-[#2B1F42]/70">
                                  📅 {ses.date} • ⏰ {ses.time} hs (
                                  {ses.durationMinutes} min)
                                </p>
                                {attended && (
                                  <span className="inline-block text-[10px] font-bold text-emerald-700">
                                    ✓ Asistencia registrada
                                  </span>
                                )}
                              </div>

                              {enrollment.status === "confirmada" && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setActiveClassroom({
                                      training: course,
                                      session: ses,
                                      isOrganizer: false,
                                    })
                                  }
                                  className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3 py-2 text-xs font-bold text-white hover:bg-[#6D5898] transition"
                                >
                                  <Video className="h-3.5 w-3.5 text-[#F3D791]" />
                                  <span>Ingresar a Sala</span>
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* MATERIALES DE ESTUDIO Y GRABACIONES DISPONIBLES */}
                    <div className="space-y-2">
                      <h6 className="text-xs font-bold uppercase tracking-wider text-[#5E4B8B]">
                        Materiales de Estudio y Grabaciones Autorizadas (
                        {course.materials.length})
                      </h6>
                      {course.materials.length === 0 ? (
                        <p className="text-xs text-[#2B1F42]/65">
                          El terapeuta organizador aún no cargó archivos
                          adicionales.
                        </p>
                      ) : (
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {course.materials.map((mat) => (
                            <div
                              key={mat.id}
                              className="flex items-start justify-between gap-2 rounded-xl border border-[#836DAD]/20 bg-white p-3 text-xs"
                            >
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  {mat.format === "grabacion" ? (
                                    <PlayCircle className="h-4 w-4 text-[#836DAD]" />
                                  ) : (
                                    <FileText className="h-4 w-4 text-[#836DAD]" />
                                  )}
                                  <span className="font-bold text-[#2B1F42]">
                                    {mat.title}
                                  </span>
                                  <span className="rounded-md bg-[#F6F3FA] px-1.5 py-0.5 text-[10px] font-bold uppercase text-[#836DAD]">
                                    {mat.format}
                                  </span>
                                </div>
                                <p className="text-[11px] text-[#2B1F42]/75">
                                  {mat.description}
                                </p>
                                <p className="text-[11px] font-medium text-[#836DAD]">
                                  {mat.urlOrContent}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =====================================================================
          APARTADO C: CAPACITACIONES QUE OFREZCO (EXCLUSIVO TERAPEUTAS)
      ===================================================================== */}
      {isEnabledTherapist && activeSubTab === "ofrezco" && (
        <div className="space-y-4">
          {/* Resumen económico e botón de Crear Nueva Capacitación */}
          <div className="rounded-2xl border border-[#836DAD]/25 bg-white p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h5 className="text-sm sm:text-base font-bold text-[#2B1F42]">
                  Panel de Gestión de Capacitaciones del Terapeuta
                </h5>
                <p className="text-xs text-[#2B1F42]/75">
                  Creá cursos o talleres online, administrá tus alumnos,
                  compartí materiales y dictá clases en vivo con Daily.co.
                </p>
              </div>
              <button
                type="button"
                onClick={openCreateForm}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#6D5898] transition"
              >
                <Plus className="h-4 w-4 text-[#F3D791]" />
                <span>+ Crear nueva capacitación</span>
              </button>
            </div>

            {!isBiometricVerified && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-700" />
                <span>
                  Recordá que para publicar capacitaciones en Academia Reiki
                  Online debés contar con tu verificación biométrica activa.
                </span>
              </div>
            )}

            {/* Tarjetas de ingresos generados por las capacitaciones del terapeuta */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-3">
                <p className="text-[11px] font-semibold text-[#2B1F42]/70">
                  Cursos publicados
                </p>
                <p className="text-lg font-extrabold text-[#2B1F42]">
                  {myOfferedCourses.length}
                </p>
              </div>
              <div className="rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-3">
                <p className="text-[11px] font-semibold text-[#2B1F42]/70">
                  Inscripciones pagas
                </p>
                <p className="text-lg font-extrabold text-[#836DAD]">
                  {myTrainingRevenueSummary.inscripcionesPagas}
                </p>
              </div>
              <div className="rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-3">
                <p className="text-[11px] font-semibold text-[#2B1F42]/70">
                  Facturación bruta
                </p>
                <p className="text-lg font-extrabold text-[#2B1F42]">
                  {formatArs(myTrainingRevenueSummary.totalBruto)}
                </p>
              </div>
              <div className="rounded-xl border border-emerald-300 bg-emerald-50/70 p-3">
                <p className="text-[11px] font-semibold text-emerald-900">
                  Ingreso terapeuta (Split MP)
                </p>
                <p className="text-lg font-extrabold text-emerald-800">
                  {formatArs(myTrainingRevenueSummary.totalNetoTerapeuta)}
                </p>
              </div>
            </div>
          </div>

          {/* FORMULARIO DE CREACIÓN / EDICIÓN DE CAPACITACIONES (Sección 4) */}
          {showCourseForm && (
            <form
              onSubmit={handleSaveCourseForm}
              className="rounded-2xl border-2 border-[#836DAD] bg-white p-5 space-y-4 shadow-md"
            >
              <div className="flex items-center justify-between border-b border-[#836DAD]/15 pb-3">
                <h5 className="text-base font-bold text-[#2B1F42]">
                  {editingCourseId
                    ? "Editar Capacitación"
                    : "Crear Nueva Capacitación en Academia Reiki Online"}
                </h5>
                <button
                  type="button"
                  onClick={() => setShowCourseForm(false)}
                  className="cursor-pointer text-xs font-bold text-[#836DAD]"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Título de la capacitación *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="Ej.: Formación Integral en Reiki Usui Nivel I"
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3.5 py-2 text-xs sm:text-sm text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Disciplina *
                  </label>
                  <select
                    value={formDiscipline}
                    onChange={(e) => setFormDiscipline(e.target.value)}
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs sm:text-sm text-[#2B1F42]"
                  >
                    {disciplineOptions.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Nivel *
                  </label>
                  <select
                    value={formLevel}
                    onChange={(e) =>
                      setFormLevel(e.target.value as TrainingLevel)
                    }
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs sm:text-sm text-[#2B1F42]"
                  >
                    <option value="Inicial">Inicial</option>
                    <option value="Intermedio">Intermedio</option>
                    <option value="Avanzado">Avanzado</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Descripción general *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Describí de qué trata la capacitación y a quiénes está dirigida..."
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3.5 py-2 text-xs sm:text-sm text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Objetivos de aprendizaje *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formObjectives}
                    onChange={(e) => setFormObjectives(e.target.value)}
                    placeholder="Qué lograrán los participantes al finalizar..."
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3.5 py-2 text-xs text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Temario por módulos / encuentros *
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={formSyllabus}
                    onChange={(e) => setFormSyllabus(e.target.value)}
                    placeholder="Módulo 1... Módulo 2..."
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3.5 py-2 text-xs text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Fecha de inicio *
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Horario (Argentina) *
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Cantidad de encuentros / clases *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={24}
                    required
                    value={formSessionsCount}
                    onChange={(e) =>
                      setFormSessionsCount(Number(e.target.value) || 1)
                    }
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Duración total (horas reloj) *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={formDurationHours}
                    onChange={(e) =>
                      setFormDurationHours(Number(e.target.value) || 1)
                    }
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Cupo máximo de alumnos *
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={200}
                    required
                    value={formMaxQuota}
                    onChange={(e) =>
                      setFormMaxQuota(Number(e.target.value) || 10)
                    }
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Arancel (Gratuita o Paga en ARS) *
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#2B1F42]">
                      <input
                        type="checkbox"
                        checked={formIsFree}
                        onChange={(e) => setFormIsFree(e.target.checked)}
                        className="h-4 w-4 accent-[#836DAD]"
                      />
                      <span>Gratuita</span>
                    </label>
                    {!formIsFree && (
                      <input
                        type="number"
                        min={1000}
                        step={500}
                        value={formPriceArs}
                        onChange={(e) =>
                          setFormPriceArs(Number(e.target.value) || 0)
                        }
                        placeholder="Precio en $ ARS"
                        className="flex-1 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                      />
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Requisitos previos
                  </label>
                  <input
                    type="text"
                    value={formPrerequisites}
                    onChange={(e) => setFormPrerequisites(e.target.value)}
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Materiales incluidos
                  </label>
                  <input
                    type="text"
                    value={formMaterialsSummary}
                    onChange={(e) => setFormMaterialsSummary(e.target.value)}
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Certificado digital
                  </label>
                  <select
                    value={formCertificateType}
                    onChange={(e) =>
                      setFormCertificateType(e.target.value as CertificateType)
                    }
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                  >
                    <option value="aprobacion">
                      Certificado digital de aprobación
                    </option>
                    <option value="participacion">
                      Certificado digital de participación
                    </option>
                    <option value="sin_certificado">Sin certificado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Estado de la capacitación
                  </label>
                  <select
                    value={formStatus}
                    onChange={(e) =>
                      setFormStatus(e.target.value as TrainingStatus)
                    }
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                  >
                    <option value="borrador">Borrador</option>
                    <option value="publicada">Publicada</option>
                    <option value="en_curso">En curso</option>
                    <option value="finalizada">Finalizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Respaldo / Certificación específica de formación del
                    terapeuta (opcional)
                  </label>
                  <input
                    type="text"
                    value={formAdditionalDoc}
                    onChange={(e) => setFormAdditionalDoc(e.target.value)}
                    placeholder="Ej.: Diploma de Maestría / Registro institucional de formación..."
                    className="w-full rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-2 text-xs text-[#2B1F42]"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                    Link personalizado para promocionar la Capacitación
                  </label>
                  <div className="flex flex-wrap items-center overflow-hidden rounded-xl border border-[#836DAD]/35 bg-[#FAF8FC]">
                    <span className="bg-[#836DAD]/10 px-3 py-2 text-xs font-bold text-[#5E4B8B]">
                      https://www.reikionline.com.ar/capacitaciones/
                    </span>
                    <input
                      type="text"
                      value={
                        formPromoSlug ||
                        buildTrainingSlug(
                          formTitle || "mi-capacitacion",
                          editingCourseId || undefined
                        )
                      }
                      onChange={(e) => setFormPromoSlug(e.target.value)}
                      placeholder="nombre-de-tu-capacitacion"
                      className="flex-1 bg-transparent px-3 py-2 text-xs font-bold text-[#2B1F42] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* KIT DE PROMOCIÓN EN VIVO AL MOMENTO DE CREAR LA CAPACITACIÓN: LINK + QR + FLYER ESTILO CREDENCIAL */}
              <div className="pt-2">
                <TrainingPromotionFlyerPanel
                  courseId={editingCourseId || undefined}
                  promoSlug={
                    formPromoSlug ||
                    buildTrainingSlug(
                      formTitle || "mi-capacitacion",
                      editingCourseId || undefined
                    )
                  }
                  title={
                    formTitle.trim() ||
                    `Formación en ${formDiscipline} (Nivel ${formLevel})`
                  }
                  discipline={formDiscipline}
                  level={formLevel}
                  modality={formModality}
                  startDate={formStartDate}
                  startTime={formStartTime}
                  sessionsCount={formSessionsCount}
                  durationHoursTotal={formDurationHours}
                  isFree={formIsFree}
                  priceArs={formIsFree ? 0 : formPriceArs}
                  certificateType={formCertificateType}
                  therapistName={userFullName}
                  therapistNickname={userNickname}
                  therapistPhotoUrl={profile.fotoUrl}
                  therapistBiometricVerified={isBiometricVerified}
                  compact
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCourseForm(false)}
                  className="cursor-pointer rounded-xl border border-[#836DAD]/30 px-4 py-2 text-xs font-bold text-[#2B1F42]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="cursor-pointer rounded-xl bg-[#836DAD] px-5 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-[#6D5898]"
                >
                  {editingCourseId
                    ? "Guardar cambios"
                    : "Publicar capacitación"}
                </button>
              </div>
            </form>
          )}

          {/* LISTADO DE CAPACITACIONES PUBLICADAS POR EL TERAPEUTA */}
          <div className="space-y-4">
            {myOfferedCourses.map((course) => {
              const courseEnrollments = enrollments.filter(
                (e) =>
                  e.trainingId === course.id && e.status === "confirmada"
              );
              const coursePromoUrl = getTrainingPromoUrl(course);
              const isPromoOpen = promotingCourseId === course.id;

              return (
                <div
                  key={course.id}
                  className="rounded-2xl border border-[#836DAD]/30 bg-white p-4 sm:p-5 shadow-xs space-y-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#836DAD]/15 pb-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-[#836DAD] px-2.5 py-0.5 text-[11px] font-bold text-[#F3D791]">
                          Estado: {course.status.toUpperCase()}
                        </span>
                        <span className="rounded-full bg-[#F6F3FA] px-2.5 py-0.5 text-[11px] font-bold text-[#2B1F42]">
                          {course.discipline} • Nivel {course.level}
                        </span>
                        <span className="rounded-full bg-[#F3D791]/40 px-2.5 py-0.5 text-[11px] font-bold text-[#2B1F42]">
                          {course.isFree
                            ? "Gratuita"
                            : formatArs(course.priceArs)}{" "}
                          • Inscriptos: {course.enrolledCount}/{course.maxQuota}
                        </span>
                      </div>
                      <h5 className="mt-1.5 text-base sm:text-lg font-bold text-[#2B1F42]">
                        {course.title}
                      </h5>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setPromotingCourseId((prev) =>
                            prev === course.id ? null : course.id
                          )
                        }
                        className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition ${
                          isPromoOpen
                            ? "bg-[#836DAD] text-[#F3D791] shadow-xs"
                            : "bg-[#F3D791] text-[#2B1F42] hover:bg-[#e5c678]"
                        }`}
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>
                          {isPromoOpen
                            ? "Ocultar Link, QR y Flyer"
                            : "Promocionar: Link, QR y Flyer"}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openEditForm(course)}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-1.5 text-xs font-bold text-[#2B1F42] hover:bg-[#836DAD] hover:text-white transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setManagingMaterialsCourseId((prev) =>
                            prev === course.id ? null : course.id
                          )
                        }
                        className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-3 py-1.5 text-xs font-bold text-[#836DAD] hover:bg-[#836DAD] hover:text-white transition"
                      >
                        <FileText className="h-3.5 w-3.5" />
                        <span>
                          Materiales ({course.materials.length})
                        </span>
                      </button>

                      {course.status !== "finalizada" &&
                        course.status !== "cancelada" && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                handleChangeCourseStatus(course, "finalizada")
                              }
                              className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              <span>Finalizar y Certificar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleChangeCourseStatus(course, "cancelada")
                              }
                              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-100"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              <span>Cancelar</span>
                            </button>
                          </>
                        )}
                    </div>
                  </div>

                  {/* BARRA RÁPIDA DE LINK PROMOCIONAL Y ACCESO AL FLYER / QR */}
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#836DAD]/25 bg-[#F6F3FA] px-3.5 py-2.5 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-[#836DAD]">
                        Link de promoción:
                      </span>
                      <a
                        href={`/capacitaciones/${getTrainingPromoSlug(course)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-[#2B1F42] hover:text-[#836DAD] hover:underline break-all"
                      >
                        {coursePromoUrl}
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(coursePromoUrl);
                            setFeedbackBanner({
                              type: "ok",
                              text: `Enlace copiado al portapapeles: ${coursePromoUrl}`,
                            });
                          } catch {}
                        }}
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#836DAD] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#6D5898]"
                      >
                        <Copy className="h-3 w-3 text-[#F3D791]" />
                        <span>Copiar Link</span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setPromotingCourseId((prev) =>
                            prev === course.id ? null : course.id
                          )
                        }
                        className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#836DAD]/35 bg-white px-2.5 py-1 text-[11px] font-bold text-[#836DAD] hover:bg-[#836DAD] hover:text-white"
                      >
                        <QrCode className="h-3 w-3" />
                        <span>
                          {isPromoOpen
                            ? "Cerrar Flyer y QR"
                            : "Ver Flyer y Bajar QR"}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* PANEL DESPLEGADO DE FLYER ESTILO CREDENCIAL + DESCARGA DE SOLO EL QR */}
                  {isPromoOpen && (
                    <TrainingPromotionFlyerPanel
                      courseId={course.id}
                      promoSlug={course.promoSlug}
                      title={course.title}
                      discipline={course.discipline}
                      level={course.level}
                      modality={course.modality}
                      startDate={course.startDate}
                      startTime={course.startTime}
                      sessionsCount={course.sessionsCount}
                      durationHoursTotal={course.durationHoursTotal}
                      isFree={course.isFree}
                      priceArs={course.priceArs}
                      certificateType={course.certificateType}
                      therapistName={course.therapistName}
                      therapistNickname={course.therapistNickname}
                      therapistPhotoUrl={
                        course.therapistPhotoUrl || profile.fotoUrl
                      }
                      therapistBiometricVerified={
                        course.therapistBiometricVerified
                      }
                    />
                  )}

                  {/* ENCUENTROS PROGRAMADOS Y ACCESO A LA SALA COMO ORGANIZADOR */}
                  <div className="space-y-2">
                    <h6 className="text-xs font-bold uppercase tracking-wider text-[#5E4B8B]">
                      Mis Clases Programadas — Acceso como Terapeuta Organizador
                    </h6>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      {course.sessions.map((ses) => (
                        <div
                          key={ses.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] p-3 text-xs"
                        >
                          <div>
                            <p className="font-bold text-[#2B1F42]">
                              {ses.title}
                            </p>
                            <p className="text-[#2B1F42]/70">
                              📅 {ses.date} • ⏰ {ses.time} hs (
                              {ses.durationMinutes} min) •{" "}
                              <strong className="text-[#836DAD]">
                                {ses.status.toUpperCase()}
                              </strong>
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              // Enviar aviso de inicio de clase a los alumnos inscriptos y abrir sala Daily.co
                              for (const st of courseEnrollments) {
                                dispatchTrainingNotification({
                                  event: "aviso_inicio_clase",
                                  trainingId: course.id,
                                  trainingTitle: course.title,
                                  recipientEmail: st.studentEmail,
                                  recipientName: st.studentName,
                                  subject: `Clase en vivo iniciada: ${course.title}`,
                                  message: `El terapeuta ${course.therapistName} acaba de abrir la sala online para «${ses.title}». Ingresá desde «Mis Capacitaciones».`,
                                });
                              }
                              setActiveClassroom({
                                training: course,
                                session: ses,
                                isOrganizer: true,
                              });
                            }}
                            className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#6D5898] transition"
                          >
                            <Video className="h-3.5 w-3.5 text-[#F3D791]" />
                            <span>Abrir Sala (Organizador)</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* GESTOR DE MATERIALES Y GRABACIONES DEL CURSO */}
                  {managingMaterialsCourseId === course.id && (
                    <div className="rounded-2xl border border-[#836DAD]/30 bg-[#F6F3FA] p-4 space-y-3">
                      <h6 className="text-xs font-bold text-[#2B1F42]">
                        Incorporar Material de Estudio (PDF, Lectura, Imagen,
                        Complementario o Grabación)
                      </h6>
                      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-4">
                        <input
                          type="text"
                          value={newMatTitle}
                          onChange={(e) => setNewMatTitle(e.target.value)}
                          placeholder="Título del material..."
                          className="rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42]"
                        />
                        <select
                          value={newMatFormat}
                          onChange={(e) =>
                            setNewMatFormat(e.target.value as MaterialFormat)
                          }
                          className="rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42]"
                        >
                          <option value="pdf">Material en PDF</option>
                          <option value="lectura">Documento de lectura</option>
                          <option value="imagen">Imagen / Lámina</option>
                          <option value="complementario">
                            Material complementario
                          </option>
                          <option value="grabacion">
                            Grabación autorizada
                          </option>
                        </select>
                        <input
                          type="text"
                          value={newMatContent}
                          onChange={(e) => setNewMatContent(e.target.value)}
                          placeholder="Enlace o contenido del documento..."
                          className="rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42]"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddMaterialToCourse(course)}
                          className="cursor-pointer rounded-xl bg-[#836DAD] px-3 py-2 text-xs font-bold text-white"
                        >
                          + Agregar y notificar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ALUMNOS INSCRIPTOS Y GESTIÓN DE CERTIFICADOS */}
                  <div className="space-y-2 border-t border-[#836DAD]/15 pt-3">
                    <h6 className="text-xs font-bold uppercase tracking-wider text-[#5E4B8B]">
                      Alumnos Inscriptos ({courseEnrollments.length})
                    </h6>
                    {courseEnrollments.length === 0 ? (
                      <p className="text-xs text-[#2B1F42]/65">
                        Aún no hay alumnos registrados manualmente en este
                        listado.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {courseEnrollments.map((st) => (
                          <div
                            key={st.id}
                            className="flex items-center justify-between gap-2 rounded-xl border border-[#836DAD]/20 bg-[#FAF8FC] p-2.5 text-xs"
                          >
                            <div>
                              <p className="font-bold text-[#2B1F42]">
                                {st.studentName} (@{st.studentNickname})
                              </p>
                              <p className="text-[11px] text-[#2B1F42]/70">
                                Pago: {st.paymentStatus.toUpperCase()} (
                                {formatArs(st.pricePaidArs)}) • Asistencias:{" "}
                                {st.attendedSessionIds.length}/
                                {course.sessionsCount}
                              </p>
                            </div>
                            {course.certificateType !== "sin_certificado" && (
                              <button
                                type="button"
                                onClick={() => {
                                  const cert = issueTrainingCertificate({
                                    enrollmentId: st.id,
                                    training: course,
                                  });
                                  refreshAll();
                                  if (cert) setPreviewCertificate(cert);
                                }}
                                className="cursor-pointer rounded-lg bg-[#F3D791] px-2.5 py-1.5 text-[11px] font-bold text-[#2B1F42]"
                              >
                                {st.certificateId
                                  ? "Ver Certificado"
                                  : "Emitir Certificado"}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE CERTIFICADO DIGITAL VERIFICADO */}
      {previewCertificate && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D142E]/80 p-3 backdrop-blur-xs"
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-3xl border-3 border-[#F3D791] bg-[#836DAD] p-5 sm:p-7 text-white shadow-2xl space-y-5">
            <div className="rounded-2xl border-2 border-[#F3D791] bg-[#FAF8FC] p-6 text-center text-[#2B1F42] space-y-3">
              <div className="mx-auto inline-flex items-center gap-1.5 rounded-full bg-[#836DAD] px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-[#F3D791]">
                <Award className="h-3.5 w-3.5" />
                Academia Reiki Online • Certificado Digital
              </div>
              <h4 className="text-lg sm:text-xl font-extrabold text-[#2B1F42]">
                {previewCertificate.certificateType === "aprobacion"
                  ? "CERTIFICADO DE APROBACIÓN"
                  : "CERTIFICADO DE PARTICIPACIÓN"}
              </h4>
              <p className="text-xs text-[#2B1F42]/75">
                Se certifica que el/la participante:
              </p>
              <p className="text-xl sm:text-2xl font-extrabold text-[#836DAD]">
                {previewCertificate.studentName}
              </p>
              <p className="text-xs sm:text-sm text-[#2B1F42]">
                completó la capacitación online{" "}
                <strong>«{previewCertificate.trainingTitle}»</strong> (
                {previewCertificate.discipline}), con una carga horaria de{" "}
                <strong>{previewCertificate.durationHours} horas reloj</strong>,
                dictada por{" "}
                <strong>
                  {previewCertificate.therapistName} (@
                  {previewCertificate.therapistNickname})
                </strong>
                .
              </p>
              <div className="rounded-xl border border-[#836DAD]/20 bg-white px-3 py-2 text-[11px] font-mono font-bold text-[#5E4B8B]">
                Código Único de Verificación:{" "}
                {previewCertificate.verificationCode} • Fecha:{" "}
                {new Date(previewCertificate.issuedAt).toLocaleDateString(
                  "es-AR"
                )}
              </div>
              <p className="text-[10px] text-[#2B1F42]/60 leading-tight pt-1">
                Certificado privado de formación complementaria emitido en
                Reiki Online. No equivale a título oficial estatal ni
                habilitación profesional.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => handleDownloadCertificatePng(previewCertificate)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#F3D791] px-4 py-2.5 text-xs sm:text-sm font-extrabold text-[#2B1F42] hover:bg-white transition"
              >
                <Download className="h-4 w-4 text-[#836DAD]" />
                <span>Descargar Certificado en PNG</span>
              </button>
              <button
                type="button"
                onClick={() => setPreviewCertificate(null)}
                className="cursor-pointer rounded-xl border border-white/30 bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SALA DE CAPACITACIÓN ONLINE INTEGRADA CON DAILY.CO */}
      {activeClassroom && (
        <TrainingClassroomModal
          isOpen={true}
          onClose={() => setActiveClassroom(null)}
          training={activeClassroom.training}
          session={activeClassroom.session}
          viewerEmail={userEmail}
          viewerName={userFullName}
          viewerNickname={userNickname}
          isOrganizer={activeClassroom.isOrganizer}
          enrolledStudents={enrollments.filter(
            (e) => e.trainingId === activeClassroom.training.id
          )}
          onMarkAttendance={handleMarkStudentAttendance}
          onFinishClassSession={(sesId, recUrl) =>
            handleFinishClassSession(activeClassroom.training, sesId, recUrl)
          }
        />
      )}
    </div>
  );
}
