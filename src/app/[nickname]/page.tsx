"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, ShieldCheck } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TerapiasAccessModal } from "@/components/auth/TerapiasAccessModal";
import { TerapiasAccessPanel } from "@/components/auth/TerapiasAccessPanel";
import SocialNetworkProfileView from "@/components/profile/SocialNetworkProfileView";
import { SYNC_EVENT_NAME } from "@/lib/socialNetwork";

const SESSION_STORAGE_KEY = "reiki_online_session_v1";

export default function NicknameSocialPage() {
  const params = useParams<{ nickname: string }>();
  const rawNickname = Array.isArray(params?.nickname)
    ? params.nickname[0]
    : params?.nickname || "danielghiglione";

  const [accessModalOpen, setAccessModalOpen] = useState(false);
  const [isRegisteredUser, setIsRegisteredUser] = useState<boolean>(false);
  const [checkedSession, setCheckedSession] = useState<boolean>(false);

  useEffect(() => {
    const checkAuth = () => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as { email?: string };
          setIsRegisteredUser(Boolean(parsed && parsed.email));
        } else {
          setIsRegisteredUser(false);
        }
      } catch {
        setIsRegisteredUser(false);
      } finally {
        setCheckedSession(true);
      }
    };

    checkAuth();
    window.addEventListener(SYNC_EVENT_NAME, checkAuth);
    window.addEventListener("storage", checkAuth);
    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-[#FAF8FC] text-[#2B1F42]">
      <Header onOpenAccess={() => setAccessModalOpen(true)} />

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#836DAD]/30 bg-white px-4 py-2 text-xs font-semibold text-[#5E4B8B] hover:bg-[#F4F0FA] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio de Reiki Online
            </Link>

            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#5E4B8B]">
              <ShieldCheck className="h-4 w-4 text-[#836DAD]" />
              Red Social Semi-Pública • reikionline.com.ar/{rawNickname}
            </span>
          </div>

          {!checkedSession ? null : isRegisteredUser ? (
            <SocialNetworkProfileView nickname={rawNickname} />
          ) : (
            <div className="space-y-6">
              <div className="rounded-3xl border-2 border-[#836DAD]/30 bg-white p-6 sm:p-8 shadow-md text-center space-y-3">
                <div className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[#836DAD] text-[#F3D791] shadow-sm">
                  <Lock className="h-7 w-7" />
                </div>
                <span className="block text-xs font-bold uppercase tracking-wider text-[#836DAD]">
                  Perfil Semi-Público · Solo Usuarios Registrados
                </span>
                <h1 className="text-xl sm:text-2xl font-bold text-[#2B1F42]">
                  Perfil de @{rawNickname} en Reiki Online
                </h1>
                <p className="mx-auto max-w-xl text-xs sm:text-sm text-[#2B1F42]/75 leading-relaxed">
                  Tanto si sos Consultante como Terapeuta, los perfiles y credenciales de la red son{" "}
                  <strong>semi-públicos</strong> y solo pueden visualizarse cuando estás registrado en la plataforma. Iniciá sesión o registrate debajo para ver el perfil de{" "}
                  <strong className="text-[#836DAD]">@{rawNickname}</strong>.
                </p>
              </div>

              <TerapiasAccessPanel
                idPrefix="semi-public-profile-gate"
                initialMode="login"
              />
            </div>
          )}
        </div>
      </main>

      <Footer onOpenAccess={() => setAccessModalOpen(true)} />

      <TerapiasAccessModal
        isOpen={accessModalOpen}
        onClose={() => setAccessModalOpen(false)}
        initialMode="login"
      />
    </div>
  );
}
