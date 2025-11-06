"use client";
import React from "react";
import { useModal } from "@/lib/modalContext";
import { useTranslation } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { FaTimes } from "react-icons/fa";

export default function AppModal() {
  const { state, closeModal } = useModal();
  const router = useRouter();
  const { t } = useTranslation();

  if (!state.open || !state.app) return null;

  const { app } = state;

  const handleNavigate = (url?: string) => {
    if (!url) return;
    // close then navigate
    closeModal();
    try {
      const newWindow = window.open(url, "_blank");
      if (newWindow) {
        // prevent the opened page from having access to window.opener
        try {
          newWindow.opener = null;
        } catch (e) {
          // noop
        }
      } else {
        // popup blocked - fallback to same-tab navigation
        window.location.href = url;
      }
    } catch (e) {
      // fallback to same-tab navigation
      window.location.href = url;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={closeModal} />
      <div className="relative z-10 w-full max-w-xl mx-4 bg-white/5 backdrop-blur rounded-2xl border border-white/10 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-white text-xl">{t(app.nameKey)}</h3>
            <p className="text-white/60 mt-1">{t(app.nameKey + ".description") ?? ""}</p>
          </div>
          <button
            onClick={closeModal}
            aria-label={t("action.close")}
            className="text-white/70 hover:text-white p-2 rounded"
          >
            <FaTimes />
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {app.subChoices && app.subChoices.length > 0 ? (
            app.subChoices.map((sc) => (
              <button
                key={sc.id}
                onClick={() => handleNavigate(sc.url)}
                className="w-full text-left bg-black/30 hover:bg-black/40 text-white rounded-md px-4 py-3"
              >
                {t(sc.nameKey)}
              </button>
            ))
          ) : (
            <div className="space-y-3">
              <p className="text-white/70">{t(app.nameKey)}</p>
              {app.url ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleNavigate(app.url)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                  >
                    {t("action.open")}
                  </button>
                  <button onClick={closeModal} className="bg-gray-600 text-white px-4 py-2 rounded">
                    {t("action.cancel")}
                  </button>
                </div>
              ) : (
                <div className="text-white/60">{t("noActionsAvailable")}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
