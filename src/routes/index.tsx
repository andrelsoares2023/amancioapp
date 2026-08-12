import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "EducaTO 2026 • Painel Pedagógico Offline" },
      {
        name: "description",
        content:
          "PWA educacional offline: horários, agendamento de espaços, calendário letivo 2026 SEDUC-TO e guia BNCC para professores e coordenação.",
      },
      { property: "og:title", content: "EducaTO 2026 • Painel Pedagógico Offline" },
      {
        property: "og:description",
        content:
          "Horários, agendamentos, calendário letivo 2026 e dicas BNCC em um app instalável no celular.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <iframe
      src="/app/index.html"
      title="EducaTO 2026 — Painel Pedagógico"
      className="h-screen w-screen border-0"
    />
  );
}
