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
  nickname: string;
  city: string;
  roleTitle: string;
  categoryTitle: string;
  services: string[];
  declaredFormation: string;
  modality: "Online a distancia" | "Presencial y a distancia";
  location: string;
  availability: string;
  illustrativePhoto: string;
  followersCount: number;
  followingCount: number;
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

export interface RoleTherapyCategory {
  id: string;
  number: number;
  title: string;
  options: string[];
}

export const ROLE_THERAPY_CATEGORIES: RoleTherapyCategory[] = [
  {
    id: "terapias-energeticas",
    number: 1,
    title: "Terapias energéticas",
    options: [
      "Reiki Usui",
      "Reiki Karuna",
      "Reiki Kundalini",
      "Reiki con cristales",
      "Sanación pránica",
      "Magnified Healing",
      "Terapia con péndulo",
      "Radiestesia",
      "Biomagnetismo",
      "Alineación de chakras",
      "Limpieza y armonización energética",
      "Terapia de cristales (cristaloterapia)",
      "Terapia de ángeles",
      "Sanación cuántica",
    ],
  },
  {
    id: "terapias-emocionales-autoconocimiento",
    number: 2,
    title: "Terapias emocionales y de autoconocimiento",
    options: [
      "Constelaciones familiares",
      "Constelaciones individuales",
      "Terapia de vidas pasadas",
      "Regresión espiritual",
      "Limpieza de memoria celular",
      "Biodescodificación",
      "Bioneuroemoción",
      "Flores de Bach",
      "EFT (técnica de liberación emocional)",
      "Hipnosis regresiva",
      "Terapia transpersonal",
      "Liberación de creencias limitantes",
      "Coaching espiritual",
    ],
  },
  {
    id: "meditacion-conexion-interior",
    number: 3,
    title: "Meditación y conexión interior",
    options: [
      "Meditación guiada",
      "Meditación mindfulness",
      "Meditación trascendental",
      "Yoga Nidra",
      "Respiración consciente (breathwork)",
      "Visualización creativa",
      "Relajación profunda",
      "Meditación con mantras",
      "Meditación de chakras",
      "Baños sonoros",
      "Sonoterapia con cuencos tibetanos",
      "Sonoterapia con cuencos de cuarzo",
    ],
  },
  {
    id: "consultas-espirituales-esotericas",
    number: 4,
    title: "Consultas espirituales y esotéricas",
    options: [
      "Tarot",
      "Videncia",
      "Astrología",
      "Carta natal",
      "Revolución solar",
      "Numerología",
      "Lectura de registros akáshicos",
      "Canalización espiritual",
      "Mediumnidad",
      "Lectura de aura",
      "Oráculos",
      "Runas",
      "Lectura de péndulo",
      "Interpretación de sueños",
      "Lectura de manos (quiromancia)",
      "I Ching",
    ],
  },
  {
    id: "terapias-holisticas-corporales",
    number: 5,
    title: "Terapias holísticas y corporales",
    options: [
      "Aromaterapia",
      "Reflexología",
      "Acupresión",
      "Shiatsu",
      "Masoterapia",
      "Ayurveda",
      "Yoga terapéutico",
      "Terapia de sonido",
      "Cromoterapia",
      "Musicoterapia",
      "Arteterapia",
      "Movimiento consciente",
      "Tai Chi",
      "Qi Gong",
    ],
  },
  {
    id: "armonizacion-espacios-rituales",
    number: 6,
    title: "Armonización de espacios y rituales",
    options: [
      "Limpieza energética de hogares",
      "Armonización de ambientes",
      "Feng Shui",
      "Geobiología",
      "Limpieza energética a distancia",
      "Rituales de luna nueva y luna llena",
      "Ceremonias de intención",
      "Protección energética",
      "Armonización con cristales",
      "Bendición de espacios",
    ],
  },
];

export const NAV_ITEMS: NavItem[] = [
  { label: "Inicio", href: "#inicio" },
  { label: "Quiénes somos", href: "#quienes-somos" },
  { label: "Terapias", href: "#terapias" },
  { label: "Cómo funciona", href: "#como-funciona" },
  { label: "Profesionales", href: "#profesionales" },
  { label: "Contacto", href: "#contacto" },
];

const CATEGORY_VISUAL_META: Record<
  string,
  {
    shortSubtitle: string;
    image: string;
    galleryImage: string;
    description: string;
  }
> = {
  "terapias-energeticas": {
    shortSubtitle: "Reiki Usui, Karuna, Kundalini, chakras, péndulo y cristales.",
    image: "/images/cat-energia-armonizacion.png",
    galleryImage: "/images/galeria-cristales.png",
    description:
      "Sesiones orientadas al equilibrio energético integral, alineación de centros vitales y acompañamiento con técnicas tradicionales y cuánticas, disponibles de forma presencial o a distancia.",
  },
  "terapias-emocionales-autoconocimiento": {
    shortSubtitle: "Constelaciones, vidas pasadas, biodescodificación y Flores de Bach.",
    image: "/images/cat-autoconocimiento.png",
    galleryImage: "/images/galeria-lavanda.png",
    description:
      "Experiencias profundas de exploración interior orientadas a comprender vínculos familiares, patrones emocionales, memoria celular y creencias desde una mirada integradora.",
  },
  "meditacion-conexion-interior": {
    shortSubtitle: "Meditación guiada, mindfulness, breathwork y cuencos sonoros.",
    image: "/images/cat-meditacion-bienestar.png",
    galleryImage: "/images/galeria-meditacion.png",
    description:
      "Prácticas guiadas para cultivar la presencia plena, reducir la tensión cotidiana, mejorar la respiración consciente y armonizar mediante baños sonoros y cuencos.",
  },
  "consultas-espirituales-esotericas": {
    shortSubtitle: "Tarot, astrología, registros akáshicos, numerología y oráculos.",
    image: "/images/cat-espiritualidad-orientacion.png",
    galleryImage: "/images/galeria-tarot.png",
    description:
      "Lenguajes simbólicos, canalizaciones y lecturas orientativas que invitan a la reflexión personal, brindando perspectiva sobre ciclos vitales, decisiones e inquietudes presentes.",
  },
  "terapias-holisticas-corporales": {
    shortSubtitle: "Aromaterapia, reflexología, ayurveda, yoga terapéutico y sonido.",
    image: "/images/cat-terapias-holisticas.png",
    galleryImage: "/images/galeria-cuencos.png",
    description:
      "Disciplinas holísticas, corporales y vibracionales que acompañan el bienestar integral a través del movimiento consciente, los aromas naturales y la armonización física.",
  },
  "armonizacion-espacios-rituales": {
    shortSubtitle: "Limpieza de hogares, Feng Shui, geobiología y rituales conscientes.",
    image: "/images/cat-armonizacion-espacios.png",
    galleryImage: "/images/galeria-espacio.png",
    description:
      "Asesoramiento, protección y limpieza energética para hogares, estudios y lugares de trabajo, buscando que cada ambiente acompañe en armonía a quienes lo habitan.",
  },
};

export const THERAPY_CATEGORIES: TherapyCategory[] = ROLE_THERAPY_CATEGORIES.map(
  (roleCat) => {
    const meta = CATEGORY_VISUAL_META[roleCat.id] ?? {
      shortSubtitle: roleCat.options.slice(0, 4).join(", "),
      image: "/images/cat-energia-armonizacion.png",
      galleryImage: "/images/galeria-cristales.png",
      description: `Especialidades de ${roleCat.title} disponibles de forma online a distancia y presencial.`,
    };

    return {
      id: roleCat.id,
      title: roleCat.title,
      shortSubtitle: meta.shortSubtitle,
      image: meta.image,
      galleryImage: meta.galleryImage,
      description: meta.description,
      specialties: roleCat.options.map((optionName) => ({
        name: optionName,
        modality: "Presencial y Online",
        duration: "45 a 60 min",
        summary: `Sesión personalizada de ${optionName} dentro de ${roleCat.title}, disponible en modalidad online a distancia o presencial.`,
      })),
    };
  }
);

export const ILLUSTRATIVE_PROFESSIONALS: IllustrativeProfessional[] = [
  {
    id: "prof-energia",
    name: "Valeria Méndez",
    nickname: "valeriamendez",
    city: "Córdoba, Córdoba",
    roleTitle: "Reikista y Armonización Energética",
    categoryTitle: "Energía y armonización",
    services: ["Reiki Usui a distancia", "Alineación de chakras", "Péndulo integrativo"],
    declaredFormation: "Maestría en Reiki Usui Tradicional · Formación en Radiestesia y Cristales",
    modality: "Presencial y a distancia",
    location: "Atención online sin fronteras",
    availability: "Turnos disponibles de lunes a sábados",
    illustrativePhoto:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=400&q=80",
    followersCount: 18,
    followingCount: 12,
  },
  {
    id: "prof-meditacion",
    name: "Martín Arrieta",
    nickname: "martinarrieta",
    city: "Río Cuarto, Córdoba",
    roleTitle: "Facilitador de Mindfulness y Registros Akáshicos",
    categoryTitle: "Meditación y bienestar",
    services: ["Meditación guiada 1 a 1", "Reiki Karuna", "Registros akáshicos"],
    declaredFormation: "Instructorado en Mindfulness, Meditación Contemplativa y Reiki Karuna",
    modality: "Online a distancia",
    location: "Sesiones en vivo por videollamada",
    availability: "Horarios flexibles de mañana y tarde",
    illustrativePhoto:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80",
    followersCount: 14,
    followingCount: 9,
  },
  {
    id: "prof-holistica",
    name: "Sofía Benítez",
    nickname: "sofiabenitez",
    city: "Villa María, Córdoba",
    roleTitle: "Sonoterapia, Flores de Bach y Autoconocimiento",
    categoryTitle: "Terapias holísticas",
    services: ["Consulta de Flores de Bach", "Armonización sonora", "Constelaciones individuales"],
    declaredFormation: "Terapeuta Floral diplomada · Formación en Sonoterapia y Enfoque Sistémico",
    modality: "Presencial y a distancia",
    location: "Consultorio y modalidad online",
    availability: "Agenda abierta con reserva previa",
    illustrativePhoto:
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&w=400&q=80",
    followersCount: 22,
    followingCount: 15,
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
