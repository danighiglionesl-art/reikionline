"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { TerapiasAccessModal } from "@/components/auth/TerapiasAccessModal";
import SocialNetworkProfileView from "@/components/profile/SocialNetworkProfileView";

export default function NicknameSocialPage() {
  const params = useParams<{ nickname: string }>();
  const rawNickname = Array.isArray(params?.nickname)
    ? params.nickname[0]
    : params?.nickname || "danielghiglione";

  const [accessModalOpen, setAccessModalOpen] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col bg-[#FAF8FC] text-[#2B1F42]">
      <Header onOpenAccess={() => setAccessModalOpen(true)} />

      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#836DAD]/30 bg-white px-4 py-2 text-xs font-semibold text-[#5E4B8B] hover:bg-[#F4F0FA] transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Volver al inicio de Reiki Online
            </Link>

            <span className="text-xs font-semibold text-[#5E4B8B]">
              Red Social • reikionline.com.ar/{rawNickname}
            </span>
          </div>

          <SocialNetworkProfileView nickname={rawNickname} />
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
