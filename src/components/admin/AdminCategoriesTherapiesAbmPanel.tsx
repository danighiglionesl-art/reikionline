"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  PlusCircle,
  Trash2,
  Edit3,
  Check,
  X,
  Search,
  Sparkles,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  FolderPlus,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Layers,
} from "lucide-react";
import {
  CATALOG_SYNC_EVENT_NAME,
  CUSTOM_OPTIONS_STORAGE_KEY,
  loadManagedRoleCategories,
  resetManagedRoleCategoriesToDefaults,
  RoleTherapyCategory,
  saveManagedRoleCategories,
} from "@/lib/reiki-data";
import type { PendingAdminCategoryAlert } from "@/components/auth/TerapiasAccessPanel";

interface AdminCategoriesTherapiesAbmPanelProps {
  pendingAdminAlerts: PendingAdminCategoryAlert[];
  approvedCustomOptions: Record<string, string[]>;
  adminFeedback: string | null;
  onApproveAlert: (alertItem: PendingAdminCategoryAlert) => void;
  onDismissAlert: (alertId: string) => void;
  onRemoveCustomOption?: (categoryId: string, optionLabel: string) => void;
}

function slugifyCategoryId(title: string): string {
  const base = (title || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 42);
  return base || `cat-${Date.now()}`;
}

export default function AdminCategoriesTherapiesAbmPanel({
  pendingAdminAlerts,
  adminFeedback,
  onApproveAlert,
  onDismissAlert,
  onRemoveCustomOption,
}: AdminCategoriesTherapiesAbmPanelProps) {
  const [categories, setCategories] = useState<RoleTherapyCategory[]>(() =>
    loadManagedRoleCategories()
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(
    "terapias-energeticas"
  );
  const [expandAll, setExpandAll] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [localNotice, setLocalNotice] = useState<string | null>(null);

  // Estado para Alta de Nueva Categoría
  const [showNewCategoryForm, setShowNewCategoryForm] =
    useState<boolean>(false);
  const [newCategoryTitle, setNewCategoryTitle] = useState<string>("");
  const [newCategorySubtitle, setNewCategorySubtitle] = useState<string>("");
  const [newCategoryDescription, setNewCategoryDescription] =
    useState<string>("");
  const [newCategoryInitialTherapies, setNewCategoryInitialTherapies] =
    useState<string>("");

  // Estado para Modificación de Categoría existente
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null
  );
  const [editCatTitle, setEditCatTitle] = useState<string>("");
  const [editCatSubtitle, setEditCatSubtitle] = useState<string>("");
  const [editCatDescription, setEditCatDescription] = useState<string>("");

  // Estado para Baja de Categoría (con opción de reasignar sus terapias a otra categoría)
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null
  );
  const [reassignTargetCategoryId, setReassignTargetCategoryId] =
    useState<string>("");

  // Estado para Alta rápida de Terapia vinculada a una Categoría
  const [newTherapyByCatId, setNewTherapyByCatId] = useState<
    Record<string, string>
  >({});
  const [globalNewTherapyName, setGlobalNewTherapyName] = useState<string>("");
  const [globalNewTherapyCatId, setGlobalNewTherapyCatId] =
    useState<string>("");

  // Estado para Modificación / Reasignación de una Terapia existente
  const [editingTherapyKey, setEditingTherapyKey] = useState<string | null>(
    null
  ); // `${catId}::${therapyName}`
  const [editingTherapyName, setEditingTherapyName] = useState<string>("");
  const [editingTherapyTargetCatId, setEditingTherapyTargetCatId] =
    useState<string>("");

  // Categoría destino elegida para cada alerta pendiente de "Otra -> ¿Cuál?"
  const [alertTargetCatById, setAlertTargetCatById] = useState<
    Record<string, string>
  >({});

  const flashNotice = (msg: string) => {
    setLocalNotice(msg);
    setTimeout(() => {
      setLocalNotice((prev) => (prev === msg ? null : prev));
    }, 5000);
  };

  const syncFromStorage = () => {
    const loaded = loadManagedRoleCategories();
    setCategories(loaded);
    if (
      loaded.length > 0 &&
      (!globalNewTherapyCatId ||
        !loaded.some((c) => c.id === globalNewTherapyCatId))
    ) {
      setGlobalNewTherapyCatId(loaded[0].id);
    }
  };

  useEffect(() => {
    syncFromStorage();
    if (typeof window === "undefined") return;
    window.addEventListener(CATALOG_SYNC_EVENT_NAME, syncFromStorage);
    window.addEventListener("storage", syncFromStorage);
    return () => {
      window.removeEventListener(CATALOG_SYNC_EVENT_NAME, syncFromStorage);
      window.removeEventListener("storage", syncFromStorage);
    };
  }, []);

  const persistCategories = (next: RoleTherapyCategory[], message?: string) => {
    const saved = saveManagedRoleCategories(next);
    setCategories(saved);
    if (message) {
      flashNotice(message);
    }
  };

  const totalTherapiesCount = useMemo(() => {
    return categories.reduce((acc, cat) => acc + cat.options.length, 0);
  }, [categories]);

  // Filtrado por buscador (categorías o terapias vinculadas)
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter(
      (cat) =>
        cat.title.toLowerCase().includes(q) ||
        (cat.shortSubtitle || "").toLowerCase().includes(q) ||
        cat.options.some((opt) => opt.toLowerCase().includes(q))
    );
  }, [categories, searchQuery]);

  // =========================================================================
  // 1. ABM DE CATEGORÍAS (ALTA, MODIFICACIÓN, REORDENAMIENTO Y BAJA)
  // =========================================================================
  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = newCategoryTitle.trim();
    if (!cleanTitle) return;

    const baseId = slugifyCategoryId(cleanTitle);
    const uniqueId = categories.some((c) => c.id === baseId)
      ? `${baseId}-${Date.now().toString().slice(-4)}`
      : baseId;

    const initialOptions = newCategoryInitialTherapies
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const newCat: RoleTherapyCategory = {
      id: uniqueId,
      number: categories.length + 1,
      title: cleanTitle,
      shortSubtitle:
        newCategorySubtitle.trim() ||
        initialOptions.slice(0, 4).join(", ") ||
        `Especialidades de ${cleanTitle}`,
      description:
        newCategoryDescription.trim() ||
        `Sesiones y especialidades de ${cleanTitle} disponibles en modalidad online a distancia y presencial.`,
      image: "/images/cat-energia-armonizacion.png",
      galleryImage: "/images/galeria-cristales.png",
      options: initialOptions,
    };

    const next = [...categories, newCat];
    persistCategories(
      next,
      `Categoría «${cleanTitle}» dada de alta y vinculada al catálogo (${initialOptions.length} terapias iniciales).`
    );

    setNewCategoryTitle("");
    setNewCategorySubtitle("");
    setNewCategoryDescription("");
    setNewCategoryInitialTherapies("");
    setShowNewCategoryForm(false);
    setSelectedCategoryId(uniqueId);
  };

  const handleStartEditCategory = (cat: RoleTherapyCategory) => {
    setEditingCategoryId(cat.id);
    setEditCatTitle(cat.title);
    setEditCatSubtitle(
      cat.shortSubtitle || cat.options.slice(0, 4).join(", ")
    );
    setEditCatDescription(cat.description || "");
    setSelectedCategoryId(cat.id);
  };

  const handleSaveEditCategory = (catId: string) => {
    const cleanTitle = editCatTitle.trim();
    if (!cleanTitle) return;

    const next = categories.map((cat) =>
      cat.id === catId
        ? {
            ...cat,
            title: cleanTitle,
            shortSubtitle: editCatSubtitle.trim() || cat.shortSubtitle,
            description: editCatDescription.trim() || cat.description,
          }
        : cat
    );
    persistCategories(
      next,
      `Categoría «${cleanTitle}» actualizada correctamente.`
    );
    setEditingCategoryId(null);
  };

  const handleMoveCategoryOrder = (index: number, direction: -1 | 1) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= categories.length) return;
    const copy = [...categories];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    persistCategories(copy, "Orden de las categorías actualizado.");
  };

  const handleConfirmDeleteCategory = (cat: RoleTherapyCategory) => {
    if (categories.length <= 1) {
      flashNotice("Debe existir al menos 1 categoría activa en el catálogo.");
      return;
    }

    let next = categories.filter((c) => c.id !== cat.id);

    // Si el administrador eligió reasignar las terapias de esta categoría a otra antes de eliminarla
    if (reassignTargetCategoryId && reassignTargetCategoryId !== "NONE") {
      next = next.map((c) => {
        if (c.id !== reassignTargetCategoryId) return c;
        const merged = Array.from(new Set([...c.options, ...cat.options]));
        return { ...c, options: merged };
      });
    }

    persistCategories(
      next,
      reassignTargetCategoryId && reassignTargetCategoryId !== "NONE"
        ? `Categoría «${cat.title}» dada de baja. Sus ${cat.options.length} terapias fueron vinculadas a la categoría destino.`
        : `Categoría «${cat.title}» eliminada del catálogo.`
    );
    setDeletingCategoryId(null);
    setReassignTargetCategoryId("");
    if (selectedCategoryId === cat.id) {
      setSelectedCategoryId(next[0]?.id || null);
    }
  };

  // =========================================================================
  // 2. ABM DE TERAPIAS VINCULADAS A CADA CATEGORÍA
  // =========================================================================
  const handleAddTherapyToCategory = (
    catId: string,
    rawTherapyName: string
  ) => {
    const cleanName = rawTherapyName.trim();
    if (!cleanName) return;

    const targetCat = categories.find((c) => c.id === catId);
    if (!targetCat) return;

    if (
      targetCat.options.some(
        (opt) => opt.toLowerCase() === cleanName.toLowerCase()
      )
    ) {
      flashNotice(
        `La terapia «${cleanName}» ya se encuentra vinculada a «${targetCat.title}».`
      );
      return;
    }

    const next = categories.map((cat) =>
      cat.id === catId
        ? { ...cat, options: [...cat.options, cleanName] }
        : cat
    );
    persistCategories(
      next,
      `Terapia «${cleanName}» dada de alta y vinculada a «${targetCat.title}».`
    );
    setNewTherapyByCatId((prev) => ({ ...prev, [catId]: "" }));
    setSelectedCategoryId(catId);
  };

  const handleGlobalAddTherapy = (e: React.FormEvent) => {
    e.preventDefault();
    const targetCatId = globalNewTherapyCatId || categories[0]?.id;
    if (!targetCatId || !globalNewTherapyName.trim()) return;
    handleAddTherapyToCategory(targetCatId, globalNewTherapyName);
    setGlobalNewTherapyName("");
  };

  const handleStartEditTherapy = (catId: string, therapyName: string) => {
    setEditingTherapyKey(`${catId}::${therapyName}`);
    setEditingTherapyName(therapyName);
    setEditingTherapyTargetCatId(catId);
  };

  const handleSaveEditTherapy = (sourceCatId: string, oldName: string) => {
    const cleanNewName = editingTherapyName.trim();
    if (!cleanNewName) return;

    const targetCatId = editingTherapyTargetCatId || sourceCatId;

    if (sourceCatId === targetCatId) {
      // Modificación de nombre dentro de la misma categoría
      const next = categories.map((cat) => {
        if (cat.id !== sourceCatId) return cat;
        return {
          ...cat,
          options: cat.options.map((opt) =>
            opt === oldName ? cleanNewName : opt
          ),
        };
      });
      persistCategories(
        next,
        `Terapia actualizada: «${oldName}» → «${cleanNewName}».`
      );
    } else {
      // Reasignar / Vincular la terapia a otra categoría
      const targetCat = categories.find((c) => c.id === targetCatId);
      const next = categories.map((cat) => {
        if (cat.id === sourceCatId) {
          return {
            ...cat,
            options: cat.options.filter((opt) => opt !== oldName),
          };
        }
        if (cat.id === targetCatId) {
          const exists = cat.options.some(
            (o) => o.toLowerCase() === cleanNewName.toLowerCase()
          );
          return {
            ...cat,
            options: exists ? cat.options : [...cat.options, cleanNewName],
          };
        }
        return cat;
      });
      persistCategories(
        next,
        `Terapia «${cleanNewName}» vinculada a la categoría «${
          targetCat?.title || targetCatId
        }».`
      );
    }

    setEditingTherapyKey(null);
  };

  const handleDeleteTherapyFromCategory = (
    catId: string,
    therapyName: string
  ) => {
    const targetCat = categories.find((c) => c.id === catId);
    const next = categories.map((cat) =>
      cat.id === catId
        ? {
            ...cat,
            options: cat.options.filter((opt) => opt !== therapyName),
          }
        : cat
    );

    // También limpiar de CUSTOM_OPTIONS_STORAGE_KEY si estaba allí
    if (onRemoveCustomOption) {
      onRemoveCustomOption(catId, therapyName);
    } else if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(CUSTOM_OPTIONS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Record<string, string[]>;
          if (parsed[catId]) {
            parsed[catId] = parsed[catId].filter((o) => o !== therapyName);
            window.localStorage.setItem(
              CUSTOM_OPTIONS_STORAGE_KEY,
              JSON.stringify(parsed)
            );
          }
        }
      } catch {
        // Ignore
      }
    }

    persistCategories(
      next,
      `Terapia «${therapyName}» dada de baja de «${
        targetCat?.title || catId
      }».`
    );
  };

  const handleRestoreDefaults = () => {
    const restored = resetManagedRoleCategoriesToDefaults();
    setCategories(restored);
    setSelectedCategoryId(restored[0]?.id || null);
    flashNotice(
      "Se restauró el catálogo original de las 6 Categorías y sus Terapias vinculadas."
    );
  };

  return (
    <div className="space-y-5">
      {/* NOTIFICACIÓN DE ACCIÓN ABM */}
      {(localNotice || adminFeedback) && (
        <div
          role="status"
          className="flex items-center justify-between gap-2 rounded-2xl border border-[#836DAD] bg-[#F3D791]/35 px-4 py-3 text-xs sm:text-sm font-bold text-[#2B1F42]"
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-[#836DAD]" />
            <span>{localNotice || adminFeedback}</span>
          </div>
          {localNotice && (
            <button
              type="button"
              onClick={() => setLocalNotice(null)}
              className="cursor-pointer text-xs underline"
            >
              Cerrar
            </button>
          )}
        </div>
      )}

      {/* =====================================================================
          BLOQUE 1: PROPUESTAS DE NUEVAS TERAPIAS («OTRA -> ¿CUÁL?») CON VINCULACIÓN A CATEGORÍA
         ===================================================================== */}
      <div className="rounded-3xl border border-[#836DAD]/25 bg-[#F6F3FA] p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h4 className="text-base font-bold text-[#2B1F42]">
              Propuestas de Nuevas Terapias («Otra → ¿Cuál?»)
            </h4>
            <p className="text-xs text-[#2B1F42]/75">
              Cuando un Terapeuta propone una terapia nueva, podés elegir a qué categoría vincularla y aprobarla para sumarla al catálogo oficial, o descartarla.
            </p>
          </div>
          <span className="rounded-full bg-[#836DAD] px-3 py-1 text-xs font-extrabold text-[#F3D791]">
            {pendingAdminAlerts.length} pendiente(s)
          </span>
        </div>

        {pendingAdminAlerts.length > 0 ? (
          <ul className="space-y-2.5">
            {pendingAdminAlerts.map((alertItem) => {
              const selectedTargetCatId =
                alertTargetCatById[alertItem.id] || alertItem.categoryId;
              const targetCatObj =
                categories.find((c) => c.id === selectedTargetCatId) ||
                categories[0];

              return (
                <li
                  key={alertItem.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 rounded-2xl border border-[#836DAD]/25 bg-white p-4 shadow-2xs"
                >
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-block rounded-full bg-[#836DAD]/12 px-2.5 py-0.5 text-[11px] font-bold text-[#836DAD]">
                        Sugerida en Categoría {alertItem.categoryNumber}:{" "}
                        {alertItem.categoryTitle}
                      </span>
                      <span className="text-[11px] text-[#2B1F42]/65">
                        Por: <strong>{alertItem.proposedBy}</strong>
                      </span>
                    </div>
                    <p className="text-sm font-bold text-[#2B1F42]">
                      Nueva terapia propuesta: «{alertItem.proposedOption}»
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <label className="text-[11px] font-bold text-[#5E4B8B]">
                        Vincular a:
                      </label>
                      <select
                        value={selectedTargetCatId}
                        onChange={(e) =>
                          setAlertTargetCatById((prev) => ({
                            ...prev,
                            [alertItem.id]: e.target.value,
                          }))
                        }
                        className="rounded-xl border border-[#836DAD]/30 bg-[#FAF8FC] px-2.5 py-1.5 text-xs font-bold text-[#2B1F42]"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.number}. {cat.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        if (targetCatObj) {
                          handleAddTherapyToCategory(
                            targetCatObj.id,
                            alertItem.proposedOption
                          );
                        }
                        onApproveAlert({
                          ...alertItem,
                          categoryId: targetCatObj?.id || alertItem.categoryId,
                          categoryNumber:
                            targetCatObj?.number || alertItem.categoryNumber,
                          categoryTitle:
                            targetCatObj?.title || alertItem.categoryTitle,
                        });
                      }}
                      className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors hover:bg-[#6F599B]"
                    >
                      <PlusCircle className="h-3.5 w-3.5 text-[#F3D791]" />
                      <span>Aprobar y vincular</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => onDismissAlert(alertItem.id)}
                      className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#836DAD]/25 bg-[#FAF8FC] px-3 py-2 text-xs font-bold text-[#2B1F42]/75 transition-colors hover:bg-[#836DAD]/10 hover:text-[#2B1F42]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>Descartar</span>
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="rounded-2xl border border-[#836DAD]/15 bg-white p-4 text-xs text-[#2B1F42]/70">
            No hay propuestas pendientes de nuevas terapias en este momento.
          </div>
        )}
      </div>

      {/* =====================================================================
          BLOQUE 2: CATÁLOGO VIGENTE DE CATEGORÍAS VINCULADAS CON SUS TERAPIAS (ABM COMPLETO)
         ===================================================================== */}
      <div className="rounded-3xl border border-[#836DAD]/25 bg-white p-5 space-y-5 shadow-xs">
        {/* Cabecera del ABM de Categorías y Terapias */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#836DAD]/15 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#836DAD] text-[#F3D791]">
                <Layers className="h-4 w-4" />
              </span>
              <h5 className="text-base sm:text-lg font-extrabold text-[#2B1F42]">
                Catálogo Vigente de Categorías y Terapias Vinculadas (ABM)
              </h5>
              <span className="rounded-full bg-[#836DAD]/12 px-2.5 py-0.5 text-xs font-extrabold text-[#836DAD]">
                {categories.length} categorías • {totalTherapiesCount} terapias
              </span>
            </div>
            <p className="text-xs text-[#2B1F42]/75">
              Hacé clic en cualquier categoría para ver todas sus terapias vinculadas. Podés dar de <strong>Alta, Baja y Modificación (ABM)</strong> tanto a las <strong>Categorías</strong> como a las <strong>Terapias</strong> o mover terapias entre categorías.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowNewCategoryForm((prev) => !prev)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6D5898] transition"
            >
              <FolderPlus className="h-4 w-4 text-[#F3D791]" />
              <span>
                {showNewCategoryForm
                  ? "Cerrar Alta de Categoría"
                  : "+ Nueva Categoría"}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setExpandAll((prev) => !prev)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-[#836DAD]/30 bg-[#F6F3FA] px-3 py-2 text-xs font-bold text-[#2B1F42] hover:bg-[#836DAD] hover:text-white transition"
            >
              {expandAll ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" />
                  <span>Contraer categorías</span>
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" />
                  <span>Ver todas las terapias</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleRestoreDefaults}
              title="Restaurar las 6 categorías y terapias originales"
              className="inline-flex cursor-pointer items-center gap-1 rounded-xl border border-[#836DAD]/25 bg-white px-3 py-2 text-xs font-semibold text-[#5E4B8B] hover:bg-[#F6F3FA] transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Restaurar base</span>
            </button>
          </div>
        </div>

        {/* FORMULARIO DE ALTA DE NUEVA CATEGORÍA */}
        {showNewCategoryForm && (
          <form
            onSubmit={handleCreateCategory}
            className="rounded-2xl border-2 border-[#836DAD] bg-[#F6F3FA] p-4 sm:p-5 space-y-3.5"
          >
            <div className="flex items-center justify-between">
              <h6 className="text-sm font-extrabold text-[#2B1F42]">
                Alta de Nueva Categoría de Terapias
              </h6>
              <button
                type="button"
                onClick={() => setShowNewCategoryForm(false)}
                className="cursor-pointer text-xs font-bold text-[#836DAD]"
              >
                Cancelar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                  Nombre de la Categoría *
                </label>
                <input
                  type="text"
                  required
                  value={newCategoryTitle}
                  onChange={(e) => setNewCategoryTitle(e.target.value)}
                  placeholder="Ej.: Terapias cuánticas y bioenergéticas"
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                  Subtítulo / Resumen corto
                </label>
                <input
                  type="text"
                  value={newCategorySubtitle}
                  onChange={(e) => setNewCategorySubtitle(e.target.value)}
                  placeholder="Ej.: Bioenergética, sincronización cuántica y campos..."
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                  Descripción de la Categoría
                </label>
                <input
                  type="text"
                  value={newCategoryDescription}
                  onChange={(e) => setNewCategoryDescription(e.target.value)}
                  placeholder="Descripción que verán los consultantes y terapeutas..."
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-[#2B1F42] mb-1">
                  Terapias iniciales vinculadas (separadas por coma, opcional)
                </label>
                <input
                  type="text"
                  value={newCategoryInitialTherapies}
                  onChange={(e) =>
                    setNewCategoryInitialTherapies(e.target.value)
                  }
                  placeholder="Ej.: Armonización bioenergética, Sanación holográfica, Pulso cuántico"
                  className="w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="submit"
                className="cursor-pointer rounded-xl bg-[#836DAD] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#6D5898]"
              >
                Guardar y Crear Categoría
              </button>
            </div>
          </form>
        )}

        {/* BARRA DE ALTA RÁPIDA DE TERAPIA VINCULADA A UNA CATEGORÍA + BUSCADOR */}
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 items-end rounded-2xl border border-[#836DAD]/20 bg-[#FAF8FC] p-3.5">
          <form
            onSubmit={handleGlobalAddTherapy}
            className="lg:col-span-8 grid grid-cols-1 gap-2.5 sm:grid-cols-12 items-end"
          >
            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                Alta rápida de Nueva Terapia
              </label>
              <input
                type="text"
                value={globalNewTherapyName}
                onChange={(e) => setGlobalNewTherapyName(e.target.value)}
                placeholder="Nombre de la nueva terapia..."
                className="w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42]"
              />
            </div>

            <div className="sm:col-span-5">
              <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
                Categoría vinculada
              </label>
              <select
                value={globalNewTherapyCatId || categories[0]?.id || ""}
                onChange={(e) => setGlobalNewTherapyCatId(e.target.value)}
                className="w-full rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs font-semibold text-[#2B1F42]"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.number}. {cat.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <button
                type="submit"
                className="w-full cursor-pointer inline-flex items-center justify-center gap-1 rounded-xl bg-[#836DAD] px-3 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#6D5898]"
              >
                <PlusCircle className="h-3.5 w-3.5 text-[#F3D791]" />
                <span>Vincular</span>
              </button>
            </div>
          </form>

          <div className="lg:col-span-4">
            <label className="block text-[11px] font-bold text-[#2B1F42] mb-1">
              Buscar categoría o terapia vinculada
            </label>
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-[#836DAD]" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ej.: Reiki Usui, Tarot, Meditación..."
                className="w-full rounded-xl border border-[#836DAD]/30 bg-white py-2 pr-3 pl-8 text-xs text-[#2B1F42]"
              />
            </div>
          </div>
        </div>

        {/* GRILLA INTERACTIVA DE LAS CATEGORÍAS VINCULADAS CON SUS TERAPIAS */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {filteredCategories.map((cat, idx) => {
            const isSelected =
              expandAll ||
              selectedCategoryId === cat.id ||
              Boolean(searchQuery.trim());
            const isEditingThisCat = editingCategoryId === cat.id;
            const isDeletingThisCat = deletingCategoryId === cat.id;
            const q = searchQuery.trim().toLowerCase();
            const visibleTherapies = q
              ? cat.options.filter(
                  (opt) =>
                    opt.toLowerCase().includes(q) ||
                    cat.title.toLowerCase().includes(q)
                )
              : cat.options;

            return (
              <div
                key={cat.id}
                className={`rounded-2xl border transition-all p-4 space-y-3 ${
                  isSelected
                    ? "border-2 border-[#836DAD] bg-[#FAF8FC] shadow-sm sm:col-span-2"
                    : "border-[#836DAD]/25 bg-[#FAF8FC] hover:border-[#836DAD]"
                }`}
              >
                {/* Cabecera de la tarjeta de Categoría */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedCategoryId((prev) =>
                        prev === cat.id ? null : cat.id
                      )
                    }
                    className="flex flex-1 cursor-pointer items-center gap-2 text-left"
                  >
                    <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#836DAD] text-xs font-extrabold text-[#F3D791]">
                      {cat.number}
                    </span>
                    <div>
                      <span className="text-xs sm:text-sm font-extrabold text-[#836DAD] hover:underline">
                        {cat.number}. {cat.title}
                      </span>
                      {cat.shortSubtitle && (
                        <p className="text-[11px] text-[#2B1F42]/65">
                          {cat.shortSubtitle}
                        </p>
                      )}
                    </div>
                  </button>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full bg-[#836DAD]/15 px-2.5 py-0.5 text-[11px] font-extrabold text-[#836DAD]">
                      {cat.options.length} terapias
                    </span>

                    {/* Botones de ordenamiento y ABM de la Categoría */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveCategoryOrder(idx, -1)}
                      title="Subir orden de categoría"
                      className="cursor-pointer rounded-lg border border-[#836DAD]/25 bg-white p-1.5 text-[#2B1F42] hover:bg-[#836DAD] hover:text-white disabled:opacity-35"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === categories.length - 1}
                      onClick={() => handleMoveCategoryOrder(idx, 1)}
                      title="Bajar orden de categoría"
                      className="cursor-pointer rounded-lg border border-[#836DAD]/25 bg-white p-1.5 text-[#2B1F42] hover:bg-[#836DAD] hover:text-white disabled:opacity-35"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartEditCategory(cat)}
                      title="Editar Categoría"
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#836DAD]/30 bg-white px-2.5 py-1 text-[11px] font-bold text-[#2B1F42] hover:bg-[#836DAD] hover:text-white transition"
                    >
                      <Edit3 className="h-3 w-3" />
                      <span>Editar</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setDeletingCategoryId((prev) =>
                          prev === cat.id ? null : cat.id
                        );
                        setSelectedCategoryId(cat.id);
                      }}
                      title="Dar de baja Categoría"
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-600 hover:text-white transition"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Baja</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setSelectedCategoryId((prev) =>
                          prev === cat.id ? null : cat.id
                        )
                      }
                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#836DAD] px-2.5 py-1 text-[11px] font-bold text-white"
                    >
                      <span>
                        {isSelected ? "Ocultar terapias" : "Ver / ABM terapias"}
                      </span>
                      {isSelected ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Vista resumida cuando la tarjeta está contraída: vista previa clicable de sus terapias */}
                {!isSelected && (
                  <div
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className="cursor-pointer flex flex-wrap items-center gap-1.5 pt-1"
                  >
                    {cat.options.slice(0, 6).map((opt) => (
                      <span
                        key={opt}
                        className="rounded-full border border-[#836DAD]/20 bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#2B1F42]"
                      >
                        {opt}
                      </span>
                    ))}
                    {cat.options.length > 6 && (
                      <span className="rounded-full bg-[#836DAD]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#836DAD]">
                        +{cat.options.length - 6} más (clic para gestionar)
                      </span>
                    )}
                  </div>
                )}

                {/* PANEL DE MODIFICACIÓN DE LA CATEGORÍA */}
                {isEditingThisCat && (
                  <div className="rounded-2xl border border-[#836DAD] bg-white p-3.5 space-y-2.5">
                    <span className="block text-xs font-extrabold text-[#836DAD]">
                      Modificar Categoría {cat.number}
                    </span>
                    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                      <div>
                        <label className="block text-[11px] font-bold text-[#2B1F42] mb-0.5">
                          Nombre de la categoría
                        </label>
                        <input
                          type="text"
                          value={editCatTitle}
                          onChange={(e) => setEditCatTitle(e.target.value)}
                          className="w-full rounded-xl border border-[#836DAD]/35 bg-[#FAF8FC] px-3 py-1.5 text-xs font-bold text-[#2B1F42]"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[#2B1F42] mb-0.5">
                          Subtítulo corto
                        </label>
                        <input
                          type="text"
                          value={editCatSubtitle}
                          onChange={(e) => setEditCatSubtitle(e.target.value)}
                          className="w-full rounded-xl border border-[#836DAD]/35 bg-[#FAF8FC] px-3 py-1.5 text-xs text-[#2B1F42]"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-[#2B1F42] mb-0.5">
                          Descripción
                        </label>
                        <input
                          type="text"
                          value={editCatDescription}
                          onChange={(e) =>
                            setEditCatDescription(e.target.value)
                          }
                          className="w-full rounded-xl border border-[#836DAD]/35 bg-[#FAF8FC] px-3 py-1.5 text-xs text-[#2B1F42]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingCategoryId(null)}
                        className="cursor-pointer rounded-xl border border-[#836DAD]/30 px-3 py-1.5 text-xs font-bold text-[#2B1F42]"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveEditCategory(cat.id)}
                        className="cursor-pointer rounded-xl bg-[#836DAD] px-3.5 py-1.5 text-xs font-bold text-white"
                      >
                        Guardar Categoría
                      </button>
                    </div>
                  </div>
                )}

                {/* PANEL DE CONFIRMACIÓN DE BAJA DE LA CATEGORÍA */}
                {isDeletingThisCat && (
                  <div className="rounded-2xl border border-rose-300 bg-rose-50 p-3.5 space-y-2.5 text-xs text-rose-950">
                    <p className="font-bold">
                      ¿Dar de baja la categoría «{cat.title}» ({cat.options.length}{" "}
                      terapias vinculadas)?
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="font-semibold">
                        Reasignar sus terapias a:
                      </label>
                      <select
                        value={reassignTargetCategoryId}
                        onChange={(e) =>
                          setReassignTargetCategoryId(e.target.value)
                        }
                        className="rounded-xl border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-bold text-[#2B1F42]"
                      >
                        <option value="NONE">
                          No reasignar (eliminar junto con la categoría)
                        </option>
                        {categories
                          .filter((c) => c.id !== cat.id)
                          .map((c) => (
                            <option key={c.id} value={c.id}>
                              Mover terapias a: {c.number}. {c.title}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDeletingCategoryId(null)}
                        className="cursor-pointer rounded-xl border border-rose-300 bg-white px-3 py-1.5 text-xs font-bold text-[#2B1F42]"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirmDeleteCategory(cat)}
                        className="cursor-pointer rounded-xl bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-rose-700"
                      >
                        Confirmar Baja de Categoría
                      </button>
                    </div>
                  </div>
                )}

                {/* PANEL DESPLEGADO: TODAS LAS TERAPIAS VINCULADAS A ESTA CATEGORÍA + ABM DE TERAPIAS */}
                {isSelected && (
                  <div className="border-t border-[#836DAD]/20 pt-3 space-y-3">
                    {/* Barra de Alta de Terapia directa en esta Categoría */}
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={newTherapyByCatId[cat.id] || ""}
                        onChange={(e) =>
                          setNewTherapyByCatId((prev) => ({
                            ...prev,
                            [cat.id]: e.target.value,
                          }))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddTherapyToCategory(
                              cat.id,
                              newTherapyByCatId[cat.id] || ""
                            );
                          }
                        }}
                        placeholder={`+ Agregar nueva terapia vinculada a «${cat.title}»...`}
                        className="flex-1 rounded-xl border border-[#836DAD]/30 bg-white px-3 py-2 text-xs text-[#2B1F42]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleAddTherapyToCategory(
                            cat.id,
                            newTherapyByCatId[cat.id] || ""
                          )
                        }
                        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#836DAD] px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-[#6D5898]"
                      >
                        <PlusCircle className="h-3.5 w-3.5 text-[#F3D791]" />
                        <span>Alta de Terapia</span>
                      </button>
                    </div>

                    {/* Grilla de Terapias vinculadas con Edición, Cambio de Categoría y Baja */}
                    {visibleTherapies.length === 0 ? (
                      <p className="text-xs text-[#2B1F42]/60 py-2">
                        No hay terapias vinculadas en esta categoría. Usá el campo superior para dar de alta la primera.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {visibleTherapies.map((therapyName) => {
                          const itemKey = `${cat.id}::${therapyName}`;
                          const isEditingThisTherapy =
                            editingTherapyKey === itemKey;

                          return (
                            <div
                              key={itemKey}
                              className="flex flex-col justify-between gap-2 rounded-xl border border-[#836DAD]/25 bg-white p-2.5 text-xs shadow-2xs"
                            >
                              {isEditingThisTherapy ? (
                                <div className="space-y-2">
                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-[#836DAD] mb-0.5">
                                      Nombre de la Terapia
                                    </label>
                                    <input
                                      type="text"
                                      value={editingTherapyName}
                                      onChange={(e) =>
                                        setEditingTherapyName(e.target.value)
                                      }
                                      className="w-full rounded-lg border border-[#836DAD]/40 bg-[#FAF8FC] px-2.5 py-1 text-xs font-bold text-[#2B1F42]"
                                    />
                                  </div>

                                  <div>
                                    <label className="block text-[10px] font-bold uppercase text-[#836DAD] mb-0.5">
                                      Categoría Vinculada
                                    </label>
                                    <select
                                      value={editingTherapyTargetCatId}
                                      onChange={(e) =>
                                        setEditingTherapyTargetCatId(
                                          e.target.value
                                        )
                                      }
                                      className="w-full rounded-lg border border-[#836DAD]/40 bg-[#FAF8FC] px-2 py-1 text-[11px] font-semibold text-[#2B1F42]"
                                    >
                                      {categories.map((destCat) => (
                                        <option
                                          key={destCat.id}
                                          value={destCat.id}
                                        >
                                          {destCat.number}. {destCat.title}
                                        </option>
                                      ))}
                                    </select>
                                  </div>

                                  <div className="flex items-center justify-end gap-1.5 pt-1">
                                    <button
                                      type="button"
                                      onClick={() => setEditingTherapyKey(null)}
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[#836DAD]/30 px-2 py-1 text-[11px] font-bold text-[#2B1F42]"
                                    >
                                      <X className="h-3 w-3" />
                                      <span>Cancelar</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleSaveEditTherapy(
                                          cat.id,
                                          therapyName
                                        )
                                      }
                                      className="inline-flex cursor-pointer items-center gap-1 rounded-lg bg-[#836DAD] px-2.5 py-1 text-[11px] font-bold text-white"
                                    >
                                      <Check className="h-3 w-3 text-[#F3D791]" />
                                      <span>Guardar</span>
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-center justify-between gap-2">
                                  <div className="min-w-0">
                                    <span className="block font-bold text-[#2B1F42] leading-snug">
                                      {therapyName}
                                    </span>
                                    <span className="text-[10px] font-semibold text-[#836DAD]">
                                      Cat. {cat.number} • {cat.title}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStartEditTherapy(
                                          cat.id,
                                          therapyName
                                        )
                                      }
                                      title="Modificar nombre o cambiar de Categoría vinculada"
                                      className="cursor-pointer rounded-lg border border-[#836DAD]/25 bg-[#F6F3FA] p-1.5 text-[#836DAD] hover:bg-[#836DAD] hover:text-white transition"
                                    >
                                      <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleStartEditTherapy(
                                          cat.id,
                                          therapyName
                                        )
                                      }
                                      title="Vincular / Mover a otra Categoría"
                                      className="cursor-pointer rounded-lg border border-[#836DAD]/25 bg-[#F6F3FA] p-1.5 text-[#5E4B8B] hover:bg-[#836DAD] hover:text-white transition"
                                    >
                                      <ArrowRightLeft className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDeleteTherapyFromCategory(
                                          cat.id,
                                          therapyName
                                        )
                                      }
                                      title="Dar de baja Terapia"
                                      className="cursor-pointer rounded-lg border border-rose-200 bg-rose-50 p-1.5 text-rose-700 hover:bg-rose-600 hover:text-white transition"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
