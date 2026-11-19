import { MessageCircle } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { whatsappUrl } from "@/lib/whatsapp";

export function FloatingWhatsApp() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  // Somente na vitrine pública; não atrapalhar a edição no painel restrito.
  if (path.startsWith("/admin") || path.startsWith("/auth")) return null;
  return (
    <a
      href={whatsappUrl("Olá! Vim pelo catálogo da FinaSub e gostaria de atendimento.")}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Conversar com a FinaSub pelo WhatsApp"
      title="Falar com a FinaSub no WhatsApp"
      className="fixed bottom-24 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg ring-2 ring-white transition-transform hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#128C7E] md:bottom-6 md:right-6"
    >
      <MessageCircle className="h-7 w-7" strokeWidth={2.2} />
    </a>
  );
}
