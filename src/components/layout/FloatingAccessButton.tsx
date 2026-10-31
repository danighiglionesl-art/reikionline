"use client";

import React from "react";
import { ArrowUpRight } from "lucide-react";

interface FloatingAccessButtonProps {
  onOpenAccess: () => void;
}

export function FloatingAccessButton({ onOpenAccess }: FloatingAccessButtonProps) {
  return (
    <aside
      aria-label="Acceso rápido a Terapias online"
      className="fixed right-4 bottom-4 z-40 sm:right-6 sm:bottom-6"
    >
      <button
        type="button"
        onClick={onOpenAccess}
        aria-label="Acceso a Terapias online"
        title="Acceso a Terapias online"
        className="group flex cursor-pointer items-center gap-2.5 rounded-full border-2 border-[#F3D791] bg-[#836DAD] py-2 pr-4 pl-2 text-white shadow-xl shadow-[#2B1F42]/35 transition-all duration-200 hover:scale-[1.03] hover:bg-[#715B9B] active:scale-[0.98]"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#F3D791]/60 bg-[#836DAD] p-0.5">
          <img
            src="/brand/Reiki_Icono_Lavanda_Unificado.png"
            alt=""
            width={40}
            height={40}
            className="h-full w-full object-contain"
          />
        </span>

        <span className="text-xs sm:text-sm font-semibold tracking-wide text-white whitespace-nowrap">
          Acceso a Terapias online
        </span>

        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#F3D791] text-[#2B1F42] transition-transform duration-200 group-hover:translate-x-0.5">
          <ArrowUpRight className="h-3.5 w-3.5 stroke-[2.5]" />
        </span>
      </button>
    </aside>
  );
}
