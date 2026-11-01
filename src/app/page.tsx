"use client";

import React, { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingAccessButton } from "@/components/layout/FloatingAccessButton";
import { HeroSection } from "@/components/sections/HeroSection";
import { AboutObjectivesSection } from "@/components/sections/AboutObjectivesSection";
import { TherapiesSection } from "@/components/sections/TherapiesSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { ProfessionalsSection } from "@/components/sections/ProfessionalsSection";
import { InlineAccessSection } from "@/components/sections/InlineAccessSection";
import { FaqSection } from "@/components/sections/FaqSection";
import { TerapiasAccessModal } from "@/components/auth/TerapiasAccessModal";

export default function HomePage() {
  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [modalInitialMode, setModalInitialMode] = useState<"login" | "register" | "recover">(
    "login"
  );
  const [preselectedContext, setPreselectedContext] = useState<string | null>(null);

  const handleOpenAccess = (
    context?: string,
    initialMode: "login" | "register" = "login"
  ) => {
    setPreselectedContext(context ?? null);
    setModalInitialMode(initialMode);
    setAccessModalOpen(true);
  };

  return (
    <div className="flex min-h-dvh flex-col bg-white text-[#2B1F42]">
      {/* 01. Encabezado fijo con isologotipo oficial, menú y botón destacado */}
      <Header onOpenAccess={() => handleOpenAccess()} />

      <main className="flex-1">
        {/* 01. Presentación principal */}
        <HeroSection onOpenAccess={handleOpenAccess} />

        {/* 02. Quiénes somos · 03. Qué hacemos · 04. Qué buscamos */}
        <AboutObjectivesSection />

        {/* 05. Nuestras terapias (6 grandes categorías + Explorar todas las terapias) */}
        <TherapiesSection
          onRequestBooking={(specialtyLabel) =>
            handleOpenAccess(specialtyLabel, "login")
          }
        />

        {/* 06. Cómo funciona Reiki Online (Consultantes y Profesionales) */}
        <HowItWorksSection onOpenAccess={handleOpenAccess} />

        {/* 07. Un espacio para profesionales + Exploración de perfiles sin registro */}
        <ProfessionalsSection onOpenAccess={handleOpenAccess} />

        {/* 08. Ingreso a Terapias Online (Sección integrada en la página pública) */}
        <InlineAccessSection />

        {/* 09. Preguntas frecuentes + Aviso médico/psicológico obligatorio */}
        <FaqSection />
      </main>

      {/* 10. Pie de página oficial */}
      <Footer onOpenAccess={handleOpenAccess} />

      {/* Botón fijo flotante (como el de WhatsApp en otros proyectos): «Acceso a Terapias online» */}
      <FloatingAccessButton onOpenAccess={() => handleOpenAccess()} />

      {/* Modal nativo <dialog> de Acceso a Terapias Online */}
      <TerapiasAccessModal
        isOpen={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        initialMode={modalInitialMode}
        preselectedContext={preselectedContext}
      />
    </div>
  );
}
