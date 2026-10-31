export interface NavItem {
  label: string;
  href: string;
}

export interface TherapySpecialty {
  name: string;
  modality: "Online a distancia" | "Presencial y Online";
  duration: string;
  summary: string;
}

export interface TherapyCategory {
  id: string;
  title: string;
  shortSubtitle: string;
  image: string;
  galleryImage: string;
  description: string;
  specialties: TherapySpecialty[];
}

export interface IllustrativeProfessional {
  id: string;
  name: string;
  roleTitle: string;
  categoryTitle: string;
  services: string[];
  declaredFormation: string;
  modality: "Online a distancia" | "Presencial y a distancia";
  location: string;
  availability: string;
  illustrativePhoto: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface LegalDocument {
  id: "terminos" | "privacidad" | "consentimiento" | "cancelacion";
  title: string;
  subtitle: string;
  sections: { heading: string; body: string }[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "#inicio" },
  { label: "Quiénes somos", href: "#quienes-somos" },
  { label: "Terapias", href: "#terapias" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Profesionales", href: "#profesionales" },
  { label: "Contacto", href: "#contacto" },
];

export const THERAPY_CATEGORIES: TherapyCategory[] = [
  {
    id: "energia-armonizacion",
    title: "Energía y armonización",
    shortSubtitle: "Reiki, chakras, cristales y péndulo.",
    image: "/images/cat-energia-armonizacion.png",
    galleryImage: "/images/galeria-cristales.png",
    description:
      "Sesiones orientadas al equilibrio energético integral, alineación de centros vitales y acompañamiento con técnicas tradicionales y complementarias, disponibles de forma presencial o a distancia.",
    specialties: [
      {
        name: "Reiki Usui y Reiki a distancia",
        modality: "Presencial y Online",
        duration: "45 a 60 min",
        summary: "Canalización de energía vital universal para acompañar procesos de calma, descanso y armonización.",
      },
      {
        name: "Alineación y armonización de chakras",
        modality: "Presencial y Online",
        duration: "50 min",
        summary: "Equilibrio de los centros energéticos principales mediante técnicas vibracionales y visualización guiada.",
      },
      {
        name: "Gemoterapia y cristales",
        modality: "Presencial y Online",
        duration: "45 min",
        summary: "Aplicación de cuarzos y cristales seleccionados según el momento personal de cada consultante.",
      },
      {
        name: "Radiestesia y péndulo hebreo / integrativo",
        modality: "Online a distancia",
        duration: "45 min",
        summary: "Lectura energética y limpieza vibracional mediante péndulo con devolución detallada al finalizar.",
      },
    ],
  },
  {
    id: "meditacion-bienestar",
    title: "Meditación y bienestar",
    shortSubtitle: "Meditación, mindfulness y relajación.",
    image: "/images/cat-meditacion-bienestar.png",
    galleryImage: "/images/galeria-meditacion.png",
    description:
      "Prácticas guiadas para cultivar la presencia plena, reducir la tensión cotidiana, mejorar la respiración consciente y construir hábitos sostenibles de serenidad.",
    specialties: [
      {
        name: "Meditación guiada personalizada",
        modality: "Online a distancia",
        duration: "45 min",
        summary: "Encuentros individuales en vivo adaptados al ritmo y necesidad emocional del consultante.",
      },
      {
        name: "Mindfulness y atención plena",
        modality: "Presencial y Online",
        duration: "50 min",
        summary: "Entrenamiento práctico de observación consciente para gestionar el estrés diario con claridad.",
      },
      {
        name: "Relajación profunda y respiración consciente",
        modality: "Online a distancia",
        duration: "40 min",
        summary: "Técnicas respiratorias y relajación progresiva para favorecer el descanso reparador.",
      },
    ],
  },
  {
    id: "espiritualidad-orientacion",
    title: "Espiritualidad y orientación",
    shortSubtitle: "Tarot, videncia, astrología y oráculos.",
    image: "/images/cat-espiritualidad-orientacion.png",
    galleryImage: "/images/galeria-tarot.png",
    description:
      "Lenguajes simbólicos y lecturas orientativas que invitan a la reflexión personal, brindando perspectiva sobre ciclos vitales, decisiones e inquietudes presentes.",
    specialties: [
      {
        name: "Tarot evolutivo y terapéutico",
        modality: "Presencial y Online",
        duration: "60 min",
        summary: "Lectura reflexiva centrada en el presente del consultante para clarificar caminos y bloqueos.",
      },
      {
        name: "Carta natal y astrología",
        modality: "Online a distancia",
        duration: "60 a 75 min",
        summary: "Interpretación de carta natal, revolución solar y tránsitos planetarios actuales.",
      },
      {
        name: "Oráculos y orientación intuitiva",
        modality: "Online a distancia",
        duration: "45 min",
        summary: "Sesiones de consulta simbólica mediante diferentes mazos oraculares y escucha atenta.",
      },
    ],
  },
  {
    id: "autoconocimiento",
    title: "Autoconocimiento",
    shortSubtitle: "Constelaciones, vidas pasadas y otras prácticas.",
    image: "/images/cat-autoconocimiento.png",
    galleryImage: "/images/galeria-lavanda.png",
    description:
      "Experiencias profundas de exploración interior orientadas a comprender vínculos familiares, patrones repetitivos e historia personal desde una mirada integradora.",
    specialties: [
      {
        name: "Constelaciones familiares individuales",
        modality: "Presencial y Online",
        duration: "60 min",
        summary: "Abordaje sistémico individual con figuras o anclajes visuales para ordenar vínculos y dinámicas familiares.",
      },
      {
        name: "Exploración de memorias y vidas pasadas",
        modality: "Presencial y Online",
        duration: "75 min",
        summary: "Acompañamiento guiado de introspección simbólica y reconocimiento de aprendizajes personales.",
      },
      {
        name: "Biodecodificación e indagación personal",
        modality: "Online a distancia",
        duration: "60 min",
        summary: "Espacio de escucha y reflexión sobre el sentido emocional de vivencias y etapas de cambio.",
      },
    ],
  },
  {
    id: "terapias-holisticas",
    title: "Terapias holísticas",
    shortSubtitle: "Sonoterapia, aromaterapia y flores de Bach.",
    image: "/images/cat-terapias-holisticas.png",
    galleryImage: "/images/galeria-cuencos.png",
    description:
      "Disciplinas vibracionales y naturales que acompañan el bienestar emocional y físico a través del sonido, las esencias florales y los aromas naturales.",
    specialties: [
      {
        name: "Sonoterapia y cuencos tibetanos",
        modality: "Presencial y Online",
        duration: "50 min",
        summary: "Armonización mediante frecuencias sonoras de cuencos, diapasones e instrumentos ancestrales.",
      },
      {
        name: "Terapia floral y Flores de Bach",
        modality: "Presencial y Online",
        duration: "45 min",
        summary: "Entrevista personalizada para identificar emociones presentes y sugerir la fórmula floral adecuada.",
      },
      {
        name: "Aromaterapia holística",
        modality: "Presencial y Online",
        duration: "45 min",
        summary: "Asesoramiento en aceites esenciales puros y rutinas olfativas para el hogar y el descanso.",
      },
    ],
  },
  {
    id: "armonizacion-espacios",
    title: "Armonización de espacios",
    shortSubtitle: "Feng Shui, armonización y rituales.",
    image: "/images/cat-armonizacion-espacios.png",
    galleryImage: "/images/galeria-espacio.png",
    description:
      "Asesoramiento y limpieza energética para hogares, estudios y lugares de trabajo, buscando que cada ambiente acompañe en armonía a quienes lo habitan.",
    specialties: [
      {
        name: "Asesoría integral de Feng Shui",
        modality: "Presencial y Online",
        duration: "60 min",
        summary: "Análisis de distribución, luz, colores y circulación energética sobre plano o mediante videollamada.",
      },
      {
        name: "Limpieza y armonización energética de ambientes",
        modality: "Presencial y Online",
        duration: "50 min",
        summary: "Protocolos de renovación ambiental para mudanzas, aperturas de espacios o cierres de etapa.",
      },
      {
        name: "Rituales conscientes del hogar",
        modality: "Online a distancia",
        duration: "45 min",
        summary: "Guía práctica de sahumado respetuoso, orden intencional y creación de rincones de calma.",
      },
    ],
  },
];

export const ILLUSTRATIVE_PROFESSIONALS: IllustrativeProfessional[] = [
  {
    id: "prof-energia",
    name: "Perfil ilustrativo · Especialista en Reiki",
    roleTitle: "Reikista y Armonización Energética",
    categoryTitle: "Energía y armonización",
    services: ["Reiki Usui a distancia", "Alineación de chakras", "Péndulo integrativo"],
    declaredFormation: "Maestría en Reiki Usui Tradicional · Formación en Radiestesia y Cristales",
    modality: "Presencial y a distancia",
    location: "Atención online sin fronteras",
    availability: "Turnos disponibles de lunes a sábados",
    illustrativePhoto: "/images/cat-energia-armonizacion.png",
  },
  {
    id: "prof-meditacion",
    name: "Perfil ilustrativo · Guía de Meditación",
    roleTitle: "Facilitadora de Mindfulness y Relajación",
    categoryTitle: "Meditación y bienestar",
    services: ["Meditación guiada 1 a 1", "Respiración consciente", "Prácticas de atención plena"],
    declaredFormation: "Instructorado en Mindfulness y Meditación Contemplativa",
    modality: "Online a distancia",
    location: "Sesiones en vivo por videollamada",
    availability: "Horarios flexibles de mañana y tarde",
    illustrativePhoto: "/images/galeria-meditacion.png",
  },
  {
    id: "prof-holistica",
    name: "Perfil ilustrativo · Terapeuta Holístico",
    roleTitle: "Sonoterapia, Flores de Bach y Autoconocimiento",
    categoryTitle: "Terapias holísticas",
    services: ["Consulta de Flores de Bach", "Armonización sonora", "Constelaciones individuales"],
    declaredFormation: "Terapeuta Floral diplomado · Formación en Sonoterapia y Enfoque Sistémico",
    modality: "Presencial y a distancia",
    location: "Consultorio y modalidad online",
    availability: "Agenda abierta con reserva previa",
    illustrativePhoto: "/images/galeria-cuencos.png",
  },
];

export const CONSULTANTE_STEPS = [
  {
    step: "01",
    title: "Explorá las especialidades disponibles.",
    detail: "Recorré las seis grandes categorías de la plataforma sin necesidad de registrarte previamente.",
  },
  {
    step: "02",
    title: "Conocé los perfiles de los profesionales.",
    detail: "Consultá sus servicios, formación declarada, modalidad de atención (presencial o a distancia) y tarifas.",
  },
  {
    step: "03",
    title: "Elegí una experiencia y un horario.",
    detail: "Seleccioná al reikista o terapeuta que mejor se adapte a tu búsqueda y verificá su disponibilidad.",
  },
  {
    step: "04",
    title: "Reservá y gestioná tu sesión online.",
    detail: "Ingresá a tu cuenta como Consultante para confirmar tu turno y administrar tus próximas sesiones.",
  },
];

export const PROFESIONAL_STEPS = [
  {
    step: "01",
    title: "Registrate en la plataforma.",
    detail: "Creá tu cuenta con correo electrónico o Google y elegí continuar con el rol de Terapeuta.",
  },
  {
    step: "02",
    title: "Completá tu perfil y tus especialidades.",
    detail: "Detallá tu presentación, formación declarada y las disciplinas en las que brindás acompañamiento.",
  },
  {
    step: "03",
    title: "Configurá tus servicios, tarifas y disponibilidad.",
    detail: "Definí tus modalidades (online o presencial), duración de cada encuentro, valores y franjas horarias.",
  },
  {
    step: "04",
    title: "Recibí reservas y administrá tus sesiones.",
    detail: "Gestioná tu agenda digital de forma ordenada y conectá con consultantes sin barreras geográficas.",
  },
];

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: "que-es-reiki-online",
    question: "¿Qué es Reiki Online?",
    answer:
      "Reiki Online es una plataforma digital que reúne a reikistas y profesionales de terapias alternativas, prácticas de bienestar y disciplinas de autoconocimiento. Facilitamos el encuentro directo entre consultantes que buscan bienestar y terapeutas que ofrecen acompañamiento presencial o a distancia.",
  },
  {
    id: "necesito-registrarme",
    question: "¿Necesito registrarme para reservar?",
    answer:
      "Podés explorar libremente toda la propuesta de la plataforma, las seis categorías de terapias y los perfiles de los profesionales sin registrarte. Solo te solicitaremos ingresar o crear tu cuenta gratuita al momento de confirmar una reserva para que puedas gestionar tu turno con seguridad.",
  },
  {
    id: "como-elijo-terapeuta",
    question: "¿Cómo elijo un terapeuta?",
    answer:
      "En cada perfil profesional encontrarás detallados sus servicios específicos, su formación declarada, su modalidad de atención (online a distancia o presencial), sus tarifas y su disponibilidad horaria, para que elijas con total libertad de acuerdo con tu búsqueda.",
  },
  {
    id: "como-se-realizan-sesiones-distancia",
    question: "¿Cómo se realizan las sesiones a distancia?",
    answer:
      "Las sesiones a distancia se coordinan en el día y horario reservados a través de la plataforma. Según la especialidad elegida (como Reiki a distancia, meditación guiada, tarot, astrología o flores de Bach), el encuentro se desarrolla mediante videollamada o acompañamiento energético acordado previamente con el profesional.",
  },
  {
    id: "puedo-reservar-otro-pais",
    question: "¿Puedo reservar desde otro país?",
    answer:
      "Sí. Reiki Online nació con el propósito de eliminar las barreras geográficas. Podés reservar y recibir sesiones online desde cualquier ciudad o país, coordinando el horario directamente en la agenda digital del profesional.",
  },
  {
    id: "como-ofrecer-servicios-terapeuta",
    question: "¿Cómo puedo ofrecer mis servicios como terapeuta?",
    answer:
      "Ingresá en la sección «Acceso a Terapias Online», registrate con tu correo electrónico o con Google y seleccioná el perfil «Terapeuta». Desde allí podrás completar tu formación declarada, configurar tus especialidades, tarifas y disponibilidad para recibir reservas.",
  },
  {
    id: "terapias-reemplazan-tratamientos-medicos",
    question: "¿Las terapias reemplazan tratamientos médicos?",
    answer:
      "No. Todas las disciplinas ofrecidas en Reiki Online son prácticas complementarias de bienestar y autoconocimiento. Las prácticas complementarias no sustituyen diagnósticos ni tratamientos médicos ni atención psicológica profesional.",
  },
];

export const LEGAL_DOCUMENTS: Record<LegalDocument["id"], LegalDocument> = {
  terminos: {
    id: "terminos",
    title: "Términos y Condiciones de Uso",
    subtitle: "Reiki Online — Conectando bienestar",
    sections: [
      {
        heading: "1. Naturaleza de la plataforma",
        body: "Reiki Online es un espacio digital de contacto y gestión de reservas entre consultantes y profesionales independientes de terapias alternativas, prácticas de bienestar y disciplinas de autoconocimiento.",
      },
      {
        heading: "2. Roles de acceso (Consultante y Terapeuta)",
        body: "Toda persona autenticada puede elegir en cada ingreso si continúa como «Consultante» o como «Terapeuta». Estos roles no son excluyentes. Cada profesional es responsable de la veracidad de su formación declarada, servicios y tarifas publicadas.",
      },
      {
        heading: "3. Alcance de las prácticas complementarias",
        body: "Las prácticas complementarias ofrecidas a través de la plataforma no sustituyen diagnósticos ni tratamientos médicos ni atención psicológica profesional.",
      },
    ],
  },
  privacidad: {
    id: "privacidad",
    title: "Política de Privacidad y Protección de Datos",
    subtitle: "Cuidado y confidencialidad de tu información",
    sections: [
      {
        heading: "1. Datos recolectados",
        body: "Recopilamos únicamente los datos necesarios para la autenticación (correo electrónico o acceso mediante Google) y para la coordinación de reservas entre consultantes y terapeutas.",
      },
      {
        heading: "2. Uso y resguardo",
        body: "La información personal no se comercializa ni se cede a terceros ajenos a la reserva solicitada. No publicamos estadísticas ni testimonios no verificados.",
      },
      {
        heading: "3. Derechos del titular",
        body: "Todo usuario puede actualizar o solicitar la baja de su cuenta y sus datos personales en cualquier momento desde los canales de contacto oficiales de Reiki Online.",
      },
    ],
  },
  consentimiento: {
    id: "consentimiento",
    title: "Consentimiento Informado",
    subtitle: "Criterios de participación responsable",
    sections: [
      {
        heading: "1. Elección libre e informada",
        body: "Al reservar una sesión en Reiki Online, el consultante declara comprender que las sesiones de Reiki, meditación, lectura simbólica, armonización y disciplinas afines constituyen experiencias de bienestar y autoconocimiento.",
      },
      {
        heading: "2. No sustitución de atención sanitaria",
        body: "Las prácticas complementarias no sustituyen diagnósticos ni tratamientos médicos ni atención psicológica profesional. Ante cualquier síntoma físico o psicológico, se recomienda consultar siempre con profesionales de la salud matriculados.",
      },
    ],
  },
  cancelacion: {
    id: "cancelacion",
    title: "Condiciones de Cancelación y Reprogramación",
    subtitle: "Respeto por el tiempo de consultantes y profesionales",
    sections: [
      {
        heading: "1. Solicitud de reprogramación o cancelación",
        body: "Los turnos reservados pueden reprogramarse o cancelarse desde el panel de sesiones respetando el plazo de antelación indicado en el perfil de cada profesional (habitualmente 24 horas previas al encuentro).",
      },
      {
        heading: "2. Inconvenientes técnicos en sesiones online",
        body: "En caso de interrupciones de conectividad durante una sesión a distancia, el terapeuta y el consultante podrán reprogramar el encuentro sin costo adicional.",
      },
    ],
  },
};
