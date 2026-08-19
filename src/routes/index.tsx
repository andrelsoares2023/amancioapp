import { createFileRoute } from "@tanstack/react-router";

const TITLE = "AMANCIOapp • Escola Estadual Amâncio de Moraes";
const DESC =
  "Acolher e Educar: agendamento de espaços, quadro de horários e calendário letivo 2026 SEDUC-TO em um app instalável no celular.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
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
      title="AMANCIOapp — Escola Estadual Amâncio de Moraes"
      className="h-screen w-screen border-0"
    />
  );
}
