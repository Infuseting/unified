"use client"
import { useState, useMemo, useEffect } from "react";
import { AppCard } from "@/app/components/AppCard";
import { FaSearch } from "react-icons/fa";
import { BiGrid } from "react-icons/bi";
import { appsConfig, type App, type Category, type AppsConfig } from "@/app/data/app-config";
import { Avatar } from "@/app/components/Avatar";
import { useTranslation } from "@/lib/i18n";
import { useModal } from "@/lib/modalContext";
import FAQAccordion from "@/app/components/FAQAccordion";

export default function App() {
  const [currentRole, setCurrentRole] = useState<string>("student");
  const [searchQuery, setSearchQuery] = useState("");

  const config = appsConfig;
  const { t, locale, setLocale } = useTranslation();
  const { openModal } = useModal();

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
  const [pinnedIds, setPinnedIds] = useState<string[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(PINS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        if (Array.isArray(parsed)) setPinnedIds(parsed);
      }
    } catch (e) {
      // noop
    }
  }, []);

  const togglePin = (appId: string) => {
    setPinnedIds((prev) => {
      const next = prev.includes(appId) ? prev.filter((id) => id !== appId) : [...prev, appId];
      try {
        localStorage.setItem(PINS_KEY, JSON.stringify(next));
      } catch (e) {
        // noop
      }
      return next;
    });
  };

  // Flatten all apps for easy lookup
  const allApps: App[] = config.categories.flatMap((c) => c.apps);

  // Pinned apps matching role + search
  const pinnedApps = useMemo(() => {
    return allApps
      .filter((app) => pinnedIds.includes(app.id))
      .filter((app) => appAvailable(app))
      .filter((app) => t(app.nameKey).toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allApps, pinnedIds, currentRole, searchQuery, t]);

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
          if (pinnedIds.includes(app.id)) return false;
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
  }, [currentRole, searchQuery, config.categories, pinnedIds, t]);

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
          <header className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-8 py-6 backdrop-blur-md bg-black/40 border-b border-white/5">
            <div className="flex items-center gap-3">
              <BiGrid className="w-8 h-8 text-white/80" title={t("gridIconAlt")} aria-label={t("gridIconAlt")} />
            </div>

            <div className="flex items-center gap-4">
              {/* Search Bar */}
              <div className="relative">
                <FaSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                <input
                  type="text"
                  placeholder={t("searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-black/40 backdrop-blur-sm border border-white/10 rounded-xl pl-11 pr-4 py-2.5 text-white placeholder:text-white/40 focus:outline-none focus:border-white/30 transition-colors w-64"
                />
              </div>

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

                <Avatar name="AS" />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="px-8 pb-12">
            
            {/* Pinned / Categories and Apps */}
            <div className="space-y-12">
              {pinnedApps.length > 0 && (
                <div key="my-apps">
                  <h2 className="text-white text-2xl mb-6">{t("category.favorite")}</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-6">
                    {pinnedApps.map((app) => (
                      <AppCard
                        key={app.id}
                        name={t(app.nameKey)}
                        icon={app.icon}
                        url={app.url}
                        isPinned={true}
                        onTogglePin={() => togglePin(app.id)}
                        pinLabel={t("action.pin")}
                        unpinLabel={t("action.unpin")}
                        onClick={() => handleAppClick(app)}
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
                filteredCategories.map((category) => (
                  <div key={category.id}>
                    <h2 className="text-white text-2xl mb-6">{t(category.nameKey)}</h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {category.apps.map((app) => (
                        <AppCard
                          key={app.id}
                          name={t(app.nameKey )}
                          icon={app.icon}
                          url={app.url}
                          isPinned={pinnedIds.includes(app.id)}
                          onTogglePin={() => togglePin(app.id)}
                          pinLabel={t("action.pin")}
                          unpinLabel={t("action.unpin")}
                          onClick={() => handleAppClick(app)}
                        />
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </main>
        </div>
            </div>
            <FAQAccordion />
          </>
  );
}