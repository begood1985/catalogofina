// Número comercial informado para o catálogo FinaSub.
// O link abre a conversa com mensagem pré-preenchida; o envio exige ação do cliente.
export const FINASUB_WHATSAPP = "554491881664";
export const whatsappUrl = (message: string) =>
  `https://wa.me/${FINASUB_WHATSAPP}?text=${encodeURIComponent(message)}`;
