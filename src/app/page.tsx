"use client"
import { useState, useMemo, useEffect, useRef } from "react";
import { AppCard } from "@/app/components/AppCard";
import { FaSearch, FaTimes, FaEdit } from "react-icons/fa";
import { BiGrid } from "react-icons/bi";
import { appsConfig, type App, type Category, type AppsConfig } from "@/app/data/app-config";
import { Avatar } from "@/app/components/Avatar";
import { useTranslation } from "@/lib/i18n";
import { useModal } from "@/lib/modalContext";
import FAQAccordion from "@/app/components/FAQAccordion";
import { useEditMode } from "@/lib/editModeContext";
import AppEditorModal from "@/app/components/AppEditorModal";

export default function App() {
  const [currentRole, setCurrentRole] = useState<string>("student");
  const [searchQuery, setSearchQuery] = useState("");

  // persisted/ editable config (saved to localStorage). If you need true global persistence, add a backend.
  const [config, setConfig] = useState<AppsConfig>(() => {
    try {
      const raw = localStorage.getItem("unified:appsConfig:v1");
      if (raw) return JSON.parse(raw) as AppsConfig;
    } catch (e) {
      // noop
    }
    return appsConfig;
  });

  const { t, locale, setLocale } = useTranslation();
  const { openModal } = useModal();
  const { editMode, toggleEditMode } = useEditMode();

  // helper to open a url in a new tab and sever opener reference; falls back to same-tab if blocked
  const openInNewTab = (url: string) => {
    try {
      const newWindow = window.open(url, "_blank");
      if (newWindow) {
        try {
          newWindow.opener = null;
        } catch (e) {
          // noop
        }
      } else {
        // popup blocked
        window.location.href = url;
      }
    } catch (e) {
      window.location.href = url;
    }
  };

  // Helper: empty or undefined roles => allowed for all
  const roleMatches = (roles?: string[]) => {
    // Admin bypasses all checks
    if (currentRole === "admin") return true;
    if (!roles) return true;
    if (Array.isArray(roles) && roles.length === 0) return true;
    return roles.includes(currentRole);
  };

  const appAvailable = (app: App) => {
    if (app.subChoices && app.subChoices.length > 0) {
      return app.subChoices.some((sc) => roleMatches(sc.roles));
    }
    return roleMatches(app.roles);
  };

  const PINS_KEY = "unified:pinnedApps";
  // store pinned items as composite keys: "categoryId:appId" to uniquely identify instances
  const [pinnedKeys, setPinnedKeys] = useState<string[]>([]);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) {
          // migrate legacy entries that may be plain app ids into composite keys by
          // resolving the first matching category for that app id.
          const migrated: string[] = [];
          for (const entry of parsed) {
            if (entry.includes(":")) {
              migrated.push(entry);
            } else {
              // find first category containing this app id
              let found = false;
              for (const c of config.categories) {
                if (c.apps.find((a) => a.id === entry)) {
                  migrated.push(`${c.id}:${entry}`);
                  found = true;
                  break;
                }
              }
              if (!found) {
                // keep as-is (fallback)
                migrated.push(entry);
              }
            }
          }
          setPinnedKeys(migrated);
        }
      }
    } catch (e) {
      // noop
    }
  }, []);

  useEffect(() => {
    if (searchExpanded && searchInputRef.current) {
      try {
        searchInputRef.current.focus();
      } catch (e) {
        // noop
      }
    }
  }, [searchExpanded]);

  // persist config when it changes
  useEffect(() => {
    try {
      localStorage.setItem("unified:appsConfig:v1", JSON.stringify(config));
    } catch (e) {
      // noop
    }
  }, [config]);

  // Close expanded search on Escape
  useEffect(() => {
    if (!searchExpanded) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSearchExpanded(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [searchExpanded]);

  // toggle pin for a specific app instance identified by categoryId + appId
  const togglePin = (categoryIdOrComposite: string, maybeAppId?: string) => {
    const composite = maybeAppId ? `${categoryIdOrComposite}:${maybeAppId}` : categoryIdOrComposite;
    setPinnedKeys((prev) => {
      const next = prev.includes(composite) ? prev.filter((k) => k !== composite) : [...prev, composite];
      try {
        localStorage.setItem(PINS_KEY, JSON.stringify(next));
      } catch (e) {
        // noop
      }
      return next;
    });
  };

  // Editor modal state and handlers (create/edit apps)
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitial, setEditorInitial] = useState<App | null>(null);
  const [editorTargetCategory, setEditorTargetCategory] = useState<string | null>(null);

  const openEditApp = (app: App, categoryId: string) => {
    setEditorInitial(app);
    setEditorTargetCategory(categoryId);
    setEditorOpen(true);
  };

  const openCreateApp = (categoryId: string) => {
    setEditorInitial(null);
    setEditorTargetCategory(categoryId);
    setEditorOpen(true);
  };

  const closeEditor = () => {
    setEditorOpen(false);
    setEditorInitial(null);
    setEditorTargetCategory(null);
  };

  const saveApp = (app: App) => {
    // create a deep copy of config and apply change so we can compute resulting nameKeys
    const prevConfig = config;
    const next = { ...prevConfig, categories: prevConfig.categories.map((c) => ({ ...c, apps: [...c.apps] })) } as AppsConfig;

    let found = false;
    let oldNameKey: string | undefined = undefined;
    const matchId = editorInitial?.id ?? app.id;
    for (const c of next.categories) {
      const idx = c.apps.findIndex((a) => a.id === matchId);
      if (idx >= 0) {
        oldNameKey = c.apps[idx].nameKey;
        c.apps[idx] = app;
        found = true;
        break;
      }
    }

    if (!found && editorTargetCategory) {
      const cat = next.categories.find((c) => c.id === editorTargetCategory);
      if (cat) cat.apps.push(app);
    }

    setConfig(next);

    const allNameKeys = next.categories.flatMap((c) => c.apps.map((a) => a.nameKey));

    (async () => {
      try {
        if (found) {
          if (oldNameKey && oldNameKey !== app.nameKey) {
            await fetch("/api/translations", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "rename", oldKey: oldNameKey, newKey: app.nameKey, allNameKeys }),
            });
          }
        } else {
          await fetch("/api/translations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "create", newKey: app.nameKey, allNameKeys }),
          });
        }
      } catch (e) {
        // noop
      }
    })();
  };

  const deleteApp = (appId: string) => {
    if (!confirm("Delete this app for everyone? This action cannot be undone.")) return;
    const existing = config.categories.flatMap((c) => c.apps).find((a) => a.id === appId);
    const oldNameKey = existing?.nameKey;
    const next = { ...config, categories: config.categories.map((c) => ({ ...c, apps: c.apps.filter((a) => a.id !== appId) })) } as AppsConfig;
    setConfig(next);
  // remove any pinned keys that refer to this app id (across categories)
  setPinnedKeys((prev) => prev.filter((k) => !k.endsWith(`:${appId}`)));

    const allNameKeys = next.categories.flatMap((c) => c.apps.map((a) => a.nameKey));
    (async () => {
      try {
        if (oldNameKey) {
          await fetch("/api/translations", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "delete", oldKey: oldNameKey, allNameKeys }),
          });
        }
      } catch (e) {
        // noop
      }
    })();
  };

  // Category creator state
  const [catCreatorOpen, setCatCreatorOpen] = useState(false);
  const [newCatNameKey, setNewCatNameKey] = useState("");

  const genId = (prefix = "cat") => {
    try {
      // @ts-ignore
      if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return `${prefix}:${(crypto as any).randomUUID()}`;
    } catch (e) {}
    return `${prefix}:${Math.random().toString(36).slice(2, 9)}`;
  };

  const createCategory = () => {
    if (!newCatNameKey) return;
    const id = genId("cat");
    const next = { ...config, categories: [...config.categories, { id, nameKey: newCatNameKey, apps: [] }] } as AppsConfig;
    setConfig(next);
    setNewCatNameKey("");
    setCatCreatorOpen(false);
    const allNameKeys = next.categories.flatMap((c) => c.apps.map((a) => a.nameKey));
    (async () => {
      try {
        await fetch("/api/translations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "create", newKey: newCatNameKey, allNameKeys }),
        });
      } catch (e) {
        // noop
      }
    })();
  };

  // Simple native drag-drop for categories
  const dragIndexRef = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  const onCategoryDragStart = (e: React.DragEvent, index: number) => {
    // Hide the default drag image to avoid the ghost moving item
    try {
      const crt = document.createElement('canvas');
      crt.width = 0;
      crt.height = 0;
      e.dataTransfer.setDragImage(crt, 0, 0);
    } catch (err) {
      // ignore
    }
    dragIndexRef.current = index;
    setDraggingIndex(index);
    console.debug('[drag] category start', { index });
  };

  // Immediate reordering: when dragging over another index, move the category immediately
  const onCategoryDragOver = (e: React.DragEvent, overIndex: number) => {
    e.preventDefault();
    const dragIndex = dragIndexRef.current;
    if (dragIndex == null) return;
    if (dragIndex === overIndex) return;
    setConfig((prev) => {
      const cats = [...prev.categories];
      const [moved] = cats.splice(dragIndex, 1);
      cats.splice(overIndex, 0, moved);
      return { ...prev, categories: cats };
    });
    // update the ref so subsequent over events move from the new index
    dragIndexRef.current = overIndex;
    setDraggingIndex(overIndex);
    console.debug('[drag] category over -> moved to', { overIndex });
  };

  const onCategoryDragEnd = () => {
    dragIndexRef.current = null;
    setDraggingIndex(null);
    console.debug('[drag] category end');
  };

  // Drag-drop for apps (intra and inter category) with immediate UI update during drag
  const dragAppRef = useRef<{ appId: string; fromCategoryId: string; fromIndex: number } | null>(null);
  const [draggingAppId, setDraggingAppId] = useState<string | null>(null);

  // Ensure each app instance has a runtime-only unique id (__uid) so we can reliably
  // track specific objects even when `id` values are duplicated across categories.
  const genUid = (prefix = "uid") => {
    try {
      // @ts-ignore
      if (typeof crypto !== "undefined" && (crypto as any).randomUUID) return `${prefix}:${(crypto as any).randomUUID()}`;
    } catch (e) {}
    return `${prefix}:${Math.random().toString(36).slice(2, 9)}`;
  };

  useEffect(() => {
    // add __uid to any app missing it
    let added = false;
    const next = { ...config, categories: config.categories.map((c) => ({ ...c, apps: c.apps.map((a) => ({ ...a })) })) } as AppsConfig;
    for (const c of next.categories) {
      for (let i = 0; i < c.apps.length; i++) {
        const app: any = c.apps[i] as any;
        if (!app.__uid) {
          app.__uid = genUid('app');
          added = true;
        }
      }
    }
    if (added) setConfig(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onAppDragStart = (e: React.DragEvent, appId: string, categoryId: string, index: number) => {
    // prevent the category dragstart from also firing when starting to drag an app
    e.stopPropagation();
    // capture runtime uid of the specific app instance when available
    let uid: string | undefined;
    try {
      const cat = config.categories.find((c) => c.id === categoryId);
      if (cat && cat.apps[index]) uid = (cat.apps[index] as any).__uid;
      // fallback: find first matching id and take its uid
      if (!uid) {
        for (const c of config.categories) {
          const a = c.apps.find((x) => x.id === appId) as any;
          if (a && a.__uid) {
            uid = a.__uid;
            break;
          }
        }
      }
    } catch (e) {
      // noop
    }
    dragAppRef.current = { appId, fromCategoryId: categoryId, fromIndex: index, uid } as any;
    setDraggingAppId(appId);
    try {
      const crt = document.createElement('canvas');
      crt.width = 0;
      crt.height = 0;
      e.dataTransfer.setDragImage(crt, 0, 0);
    } catch (err) {
      // ignore
    }
    e.dataTransfer.effectAllowed = "move";
    console.debug('[drag] app start', { appId, categoryId, index });
  };

  const moveAppOptimistic = (fromCatId: string, fromIndex: number, toCatId: string, toIndex: number) => {
    setConfig((prev) => {
      const next = { ...prev, categories: prev.categories.map((c) => ({ ...c, apps: [...c.apps] })) } as AppsConfig;
      const fromCat = next.categories.find((c) => c.id === fromCatId);
      const toCat = next.categories.find((c) => c.id === toCatId);
      if (!fromCat || !toCat) return prev;
      // recompute the actual fromIndex by locating the dragged item in the current fromCat
      const dragRef = dragAppRef.current as any;
      let actualFromIndex = -1;
      if (dragRef && dragRef.uid) {
        actualFromIndex = fromCat.apps.findIndex((a) => (a as any).__uid === dragRef.uid);
      }
      if (actualFromIndex === -1) {
        // fallback to id-based lookup
        actualFromIndex = fromCat.apps.findIndex((a) => a.id === (dragRef?.appId ?? ""));
      }
      if (actualFromIndex === -1) return prev;
      // take the moved item
      const [moved] = fromCat.apps.splice(actualFromIndex, 1);
      let insertIndex = toIndex;
      if (fromCatId === toCatId && actualFromIndex < toIndex) insertIndex = toIndex - 1;
      if (insertIndex < 0) insertIndex = 0;
      if (insertIndex > toCat.apps.length) insertIndex = toCat.apps.length;
      toCat.apps.splice(insertIndex, 0, moved);

      // Update dragAppRef to reflect where the moved app now resides so subsequent over events
      // use the correct current index of the dragged item.
      try {
        // prefer to locate by runtime uid if present
        const movedUid = (moved as any).__uid;
        let newIndex = -1;
        if (movedUid) newIndex = toCat.apps.findIndex((a) => (a as any).__uid === movedUid);
        if (newIndex === -1) newIndex = toCat.apps.findIndex((a) => a.id === moved.id);
        dragAppRef.current = { appId: moved.id, fromCategoryId: toCatId, fromIndex: newIndex, uid: movedUid } as any;
        console.debug('[drag] moved optimistic', { movedId: moved.id, toCatId, newIndex });
      } catch (e) {
        // noop
      }

      return next;
    });
  };

  const onAppDragOver = (e: React.DragEvent, overCategoryId: string, overIndex: number) => {
    e.preventDefault();
    const drag = dragAppRef.current;
    if (!drag) return;
    const currentPos = (() => {
        // try source category first and prefer runtime uid match if available
        if (drag.fromCategoryId) {
          const src = config.categories.find((c) => c.id === drag.fromCategoryId);
          if (src) {
            // prefer uid match
            if ((drag as any).uid) {
              const idx = src.apps.findIndex((a) => (a as any).__uid === (drag as any).uid);
              if (idx >= 0) return { categoryId: src.id, index: idx };
            }
            const idxById = src.apps.findIndex((a) => a.id === drag.appId);
            if (idxById >= 0) return { categoryId: src.id, index: idxById };
          }
        }
        // fallback to global search (prefer uid)
        for (const c of config.categories) {
          if ((drag as any).uid) {
            const idx = c.apps.findIndex((a) => (a as any).__uid === (drag as any).uid);
            if (idx >= 0) return { categoryId: c.id, index: idx };
          }
          const idx2 = c.apps.findIndex((a) => a.id === drag.appId);
          if (idx2 >= 0) return { categoryId: c.id, index: idx2 };
        }
      return null;
    })();
    if (!currentPos) {
      console.warn('[drag] app over but currentPos not found for', drag);
      return;
    }

    // If we only matched by id and that id exists in multiple places, abort to avoid
    // moving the wrong instance. Require uid to disambiguate. This prevents the observed
    // case where the displayed drag (visual) is one app but the logical move matches a different one.
    const idOccurrences = config.categories.flatMap((c) => c.apps.map((a) => ({ cat: c.id, id: a.id, uid: (a as any).__uid })) ).filter(x => x.id === drag.appId);
    if ((!drag as any).uid && idOccurrences.length > 1) {
      console.warn('[drag] ambiguous id match, skipping move until uid available', { drag, idOccurrences });
      return;
    }

    if (currentPos.categoryId === overCategoryId && currentPos.index === overIndex) return;
    console.debug('[drag] app over', { dragAppRef: drag, currentPos, overCategoryId, overIndex });
    moveAppOptimistic(currentPos.categoryId, currentPos.index, overCategoryId, overIndex);
  };

  const onAppDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragAppRef.current = null;
    setDraggingAppId(null);
    console.debug('[drag] app drop');
  };

  const onAppDragEnd = () => {
    dragAppRef.current = null;
    setDraggingAppId(null);
    console.debug('[drag] app end');
  };

  // Debug: detect duplicate app ids across categories and warn once
  useEffect(() => {
    try {
      const map = new Map<string, number>();
      for (const c of config.categories) {
        for (const a of c.apps) {
          map.set(a.id, (map.get(a.id) || 0) + 1);
        }
      }
      const duplicates = Array.from(map.entries()).filter(([, count]) => count > 1).map(([id]) => id);
      if (duplicates.length > 0) {
        console.warn('[drag] duplicate app ids detected:', duplicates);
      }
    } catch (e) {
      // noop
    }
  }, [config]);

  // Flatten all apps with category for easy lookup
  const allAppsWithCategory: { app: App; categoryId: string }[] = config.categories.flatMap((c) => c.apps.map((a) => ({ app: a, categoryId: c.id })));

  // Pinned apps matching role + search. pinnedKeys contains entries like "categoryId:appId".
  const pinnedApps = useMemo(() => {
    return allAppsWithCategory
      .filter(({ app, categoryId }) => pinnedKeys.includes(`${categoryId}:${app.id}`))
      .filter(({ app }) => appAvailable(app))
      .filter(({ app }) => t(app.nameKey).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allAppsWithCategory, pinnedKeys, currentRole, searchQuery, t]);

  // Filtrer les applications et catégories basées sur le rôle et la recherche
  const filteredCategories = useMemo(() => {
    return config.categories
      .map((category) => {
        // Filtrer les apps selon le rôle de l'utilisateur
          const filteredApps = category.apps.filter((app) => {
          const displayedName = t(app.nameKey);
          const matchesSearch = displayedName
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
          // Exclude pinned apps from the main categories (they appear in My Applications)
          // However, when in edit mode we want pinned items to remain in their original
          // categories so they can be edited. Only exclude pinned apps when NOT in editMode.
          if (!editMode && pinnedKeys.includes(`${category.id}:${app.id}`)) return false;
          if (!matchesSearch) return false;
          // If app has subChoices, only show if at least one subChoice is available for the role.
          if (app.subChoices && app.subChoices.length > 0) {
            return app.subChoices.some((sc) => roleMatches(sc.roles));
          }
          // Otherwise fall back to app-level roles (empty roles => allowed for all)
          return roleMatches(app.roles);
        });

        return {
          ...category,
          apps: filteredApps,
        };
      })
      // Masquer les catégories vides
      .filter((category) => category.apps.length > 0);
  }, [currentRole, searchQuery, config.categories, pinnedKeys, t, editMode]);

  const handleAppClick = (app: App) => {
    // If app defines subChoices, filter them by role (empty roles => allowed for all)
    const available = (app.subChoices ?? []).filter((sc) => roleMatches(sc.roles));

    if (app.subChoices && app.subChoices.length > 0) {
      if (available.length === 0) {
        // nothing available for this role; do nothing (shouldn't be rendered)
        return;
      }
      if (available.length === 1) {
      const url = available[0].url ?? app.url;
      if (url) {
        openInNewTab(url);
        return;
      }
        // fallback to opening modal if no url
        openModal({ ...app, subChoices: available });
        return;
      }

      // multiple available -> open modal with only the available subChoices
      openModal({ ...app, subChoices: available });
      return;
    }

    // No subChoices: navigate to app.url if present
    if (app.url) {
      openInNewTab(app.url);
      return;
    }
  };

  return (
    <>
      
  <div className="min-h-screen relative overflow-hidden pt-30">
        

        {/* Content */}
        <div className="relative z-10">
          {/* Header */}
          <header className="fixed top-0 left-0 right-0 z-30 px-8 py-6 backdrop-blur-md bg-black/40 border-b border-white/5">
            {/* Normal header layout when search not expanded */}
            {!searchExpanded ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <BiGrid className="w-8 h-8 text-white/80" title={t("gridIconAlt")} aria-label={t("gridIconAlt")} />
                </div>

                <div className="flex items-center gap-4">
                  {/* Search Bar - visible on md+; on small screens show magnifier button */}
                  <div className="relative hidden md:block">
                    <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <input
                      type="text"
                      placeholder={t("searchPlaceholder")}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors w-64"
                    />
                  </div>

                  {/* Magnifier button for small screens */}
                  <button
                    onClick={() => setSearchExpanded(true)}
                    aria-label={t("searchPlaceholder")}
                    className="md:hidden p-2 rounded bg-black/20 text-white/80"
                  >
                    <FaSearch className="w-5 h-5" />
                  </button>

                  {/* Icons */}
                  <div className="flex items-center gap-3">
                    <select
                      aria-label={t("languageLabel")}
                      className="bg-black/30 text-white px-3 py-1 rounded"
                      value={locale}
                      onChange={(e) => setLocale(e.target.value as any)}
                    >
                      <option value="en">EN</option>
                      <option value="fr">FR</option>
                    </select>

                    <button onClick={toggleEditMode} className={`p-2 rounded ${editMode ? 'bg-yellow-600/20 text-white' : 'bg-black/20 text-white/80'}`} title={editMode ? 'Exit edit' : 'Edit'}>
                      <FaEdit />
                    </button>

                    <Avatar name="AS" />
                  </div>
                </div>
              </div>
            ) : (
              // Expanded search: cover header area with full-width input and close button
              <div className="relative flex items-center">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full">
                    <div className="relative max-w-none">
                      <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                      <input
                        ref={searchInputRef}
                        type="text"
                        placeholder={t("searchPlaceholder")}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl pl-11 pr-12 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors w-full"
                      />
                    </div>
                  </div>
                </div>
                <button onClick={() => setSearchExpanded(false)} aria-label="Close search" className="ml-4 p-2 text-white/80">
                  <FaTimes />
                </button>
              </div>
            )}
          </header>

          {/* Main Content */}
          <main className="px-8 pb-12">
            
            {/* Pinned / Categories and Apps */}
            <div className="space-y-12">
              {!editMode && pinnedApps.length > 0 && (
                <div key="my-apps">
                  <h2 className="text-white text-2xl mb-6">{t("category.favorite")}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
                    {pinnedApps.map(({ app, categoryId }) => (
                      <AppCard
                        key={`${categoryId}:${app.id}`}
                        name={t(app.nameKey)}
                        icon={app.icon}
                        url={app.url}
                        isPinned={true}
                        onTogglePin={() => togglePin(categoryId, app.id)}
                        pinLabel={t("action.pin")}
                        unpinLabel={t("action.unpin")}
                        onClick={() => handleAppClick(app)}
                        onEdit={() => openEditApp(app, categoryId)}
                        onDelete={() => deleteApp(app.id)}
                      />
                    ))}
                  </div>
                </div>
              )}
              {filteredCategories.length === 0 ? (
                <div className="text-center py-20">
                  <p className="text-white/60 text-lg">
                    {t("noAppsMessage")}
                  </p>
                </div>
              ) : (
                filteredCategories.map((category, catIndex) => (
                  <div
                    key={category.id}
                    draggable={editMode}
                    onDragStart={editMode ? (e) => onCategoryDragStart(e, catIndex) : undefined}
                    onDragOver={editMode ? (e) => onCategoryDragOver(e, catIndex) : undefined}
                    onDragEnd={editMode ? onCategoryDragEnd : undefined}
                    className={`${draggingIndex === catIndex ? 'opacity-70 scale-95 transition-transform' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="text-white text-2xl mb-6">{t(category.nameKey)}</h2>
                      {editMode && <div className="text-white/40 text-sm">Drag to reorder</div>}
                    </div>
                    <div
                      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4"
                      // allow dropping to the end by handling dragover on the grid itself
                      onDragOver={(e) => {
                        if (!editMode) return;
                        // if dragging over the container (not a card), treat as drop to end
                        onAppDragOver(e, category.id, category.apps.length);
                      }}
                      onDrop={(e) => {
                        if (!editMode) return;
                        onAppDrop(e);
                      }}
                    >
                      {category.apps.map((app, appIndex) => (
                        <div
                          key={`${category.id}:${app.id}`}
                          draggable={editMode}
                          onDragStart={(e) => onAppDragStart(e, app.id, category.id, appIndex)}
                          onDragOver={(e) => {
                            if (!editMode) return;
                            e.stopPropagation();
                            onAppDragOver(e, category.id, appIndex);
                          }}
                          onDrop={onAppDrop}
                          onDragEnd={onAppDragEnd}
                          className={`${draggingAppId === app.id ? 'opacity-50 scale-95' : ''}`}
                        >
                          <AppCard
                            name={t(app.nameKey )}
                            icon={app.icon}
                            url={app.url}
                            isPinned={pinnedKeys.includes(`${category.id}:${app.id}`)}
                            onTogglePin={() => togglePin(category.id, app.id)}
                            pinLabel={t("action.pin")}
                            unpinLabel={t("action.unpin")}
                            onClick={() => handleAppClick(app)}
                            onEdit={() => openEditApp(app, category.id)}
                            onDelete={() => deleteApp(app.id)}
                          />
                        </div>
                      ))}
                      
                      {editMode && (
                        <button onClick={() => openCreateApp(category.id)} className="group relative bg-black/20 border-2 border-dashed border-white/10 rounded-2xl p-6 hover:bg-black/30 transition-all duration-300 flex flex-col items-center justify-center gap-4 aspect-square">
                          <div className="text-4xl text-white/80">+</div>
                          <div className="text-white/80">{t("action.createApp")}</div>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
              {editMode && (
                <div className="mt-8">
                  <button onClick={() => setCatCreatorOpen(true)} className="w-full border-2 border-dashed border-white/10 rounded-xl py-6 text-white/80">{t("action.createCategory")}</button>
                </div>
              )}
            </div>
          </main>
        </div>
            </div>
            {/* Editor modal for creating/editing apps */}
            <AppEditorModal open={editorOpen} initial={editorInitial} onClose={closeEditor} onSave={saveApp} />
            {/* Simple category creator modal */}
            {catCreatorOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black/60" onClick={() => setCatCreatorOpen(false)} />
                <div className="relative z-10 w-full max-w-md mx-4 bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-white text-xl">{t("action.createCategory")}</h3>
                    <button onClick={() => setCatCreatorOpen(false)} className="text-white/70">×</button>
                  </div>
                  <div className="mt-4 grid gap-2">
                    {/* id is autogenerated */}
                    <label className="text-white/70">nameKey</label>
                    <input value={newCatNameKey} onChange={(e) => setNewCatNameKey(e.target.value)} className="bg-black/30 text-white px-3 py-2 rounded" />
                    <div className="flex justify-end gap-2 pt-3">
                      <button onClick={() => setCatCreatorOpen(false)} className="bg-gray-600 text-white px-3 py-2 rounded">Cancel</button>
                      <button onClick={createCategory} className="bg-blue-600 text-white px-3 py-2 rounded">Create</button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <FAQAccordion />
          </>
  );
}