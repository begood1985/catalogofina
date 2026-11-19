const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const money = (n: number | null | undefined) => brl.format(Number(n ?? 0));
export const kg = (n: number) =>
  `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(n)} kg`;
export const onlyDigits = (s: string) => s.replace(/\D/g, "");
export function whatsappLink(phone: string, text: string) {
  const d = onlyDigits(phone);
  return d ? `https://wa.me/${d}?text=${encodeURIComponent(text)}` : null;
}