"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { TerapiasAccessPanel } from "./TerapiasAccessPanel";

interface TerapiasAccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register" | "recover";
  preselectedContext?: string | null;
}

export function TerapiasAccessModal({
  isOpen,
  onClose,
  initialMode = "login",
  preselectedContext = null,
}: TerapiasAccessModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen) {
      if (!dialog.open) {
        dialog.showModal();
      }
    } else if (dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };

    dialog.addEventListener("close", handleClose);

    // Fallback for closedby="any" in browsers without native dialog.closedBy support
    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      );
    };

    const onPointerDown = (e: PointerEvent) => {
      if (!("closedBy" in HTMLDialogElement.prototype)) {
        pressedOutside = isOutside(e);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!("closedBy" in HTMLDialogElement.prototype) && pressedOutside && isOutside(e)) {
        dialog.close();
      }
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);

    return () => {
      dialog.removeEventListener("close", handleClose);
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      {...({ closedby: "any" } as React.DialogHTMLAttributes<HTMLDialogElement>)}
      aria-label="Acceso a Terapias Online"
      className="m-auto max-h-[92dvh] w-[calc(100%-1.25rem)] max-w-4xl overflow-y-auto rounded-3xl border-0 bg-transparent p-0 shadow-none backdrop:bg-[#2B1F42]/75 backdrop:backdrop-blur-sm"
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          aria-label="Cerrar ventana de acceso"
          className="absolute top-4 right-4 z-10 inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-[#F6F3FA] text-[#2B1F42] transition-colors hover:bg-[#836DAD] hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        <TerapiasAccessPanel
          idPrefix="modal"
          initialMode={initialMode}
          preselectedContext={preselectedContext}
        />
      </div>
    </dialog>
  );
}
