export interface FAQItem {
  id: string;
  questionKey: string;
  answerKey: string;
}

export const faqItems: FAQItem[] = [
  {
    id: "certificat",
    questionKey: "faq.certificat.q",
    answerKey: "faq.certificat.a",
  },
  {
    id: "lost-item",
    questionKey: "faq.lostItem.q",
    answerKey: "faq.lostItem.a",
  },
  {
    id: "timetable",
    questionKey: "faq.timetable.q",
    answerKey: "faq.timetable.a",
  },
  {
    id: "inscription-pedagogique",
    questionKey: "faq.inscriptionPedagogique.q",
    answerKey: "faq.inscriptionPedagogique.a",
  },
  {
    id: "leocarte-not-received",
    questionKey: "faq.leocarteReceived.q",
    answerKey: "faq.leocarteReceived.a",
  },
  {
    id: "leocarte-not-working",
    questionKey: "faq.leocarteNotWorking.q",
    answerKey: "faq.leocarteNotWorking.a",
  },
  {
    id: "resign",
    questionKey: "faq.resign.q",
    answerKey: "faq.resign.a",
  },
];

export default faqItems;
