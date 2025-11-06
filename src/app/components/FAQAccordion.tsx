"use client";
import React from "react";
import { useTranslation } from "@/lib/i18n";
import faqItems from "@/app/data/faq";

export default function FAQAccordion() {
  const { t } = useTranslation();

  return (
    <section aria-label={t("faq.title")} className="mt-12 px-8 pb-12 relative z-20">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-white text-2xl mb-4">{t("faq.title")}</h2>
        <div className="space-y-3">
          {faqItems.map((it) => (
            <details key={it.id} className="bg-black/70 rounded-md" aria-expanded="false">
              <summary className="cursor-pointer list-none text-white/90 font-medium p-4 block">{t(it.questionKey)}</summary>
              <div className="px-4 pb-4 pt-2 text-white/70 whitespace-pre-line">{t(it.answerKey)}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
