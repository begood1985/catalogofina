import { queryOptions } from "@tanstack/react-query";
import { getCatalog } from "./catalog.functions";
import { fallbackCatalog } from "./fallback-catalog";

// SSR, runtime ou integração podem falhar independentemente. Uma falha na
// consulta não deve derrubar a vitrine pública. O fallback é somente
// demonstrativo; a confirmação de pedidos permanece bloqueada.
export const catalogQuery = queryOptions({
  queryKey: ["catalog"],
  queryFn: async () => {
    try {
      const data = await getCatalog();
      if (!data || !Array.isArray(data.products) || !Array.isArray(data.categories)) {
        console.error("Resposta inválida do catálogo; usando demonstração.");
        return fallbackCatalog;
      }
      return data;
    } catch (error) {
      console.error("Falha na busca de catálogo; usando demonstração.", error);
      return fallbackCatalog;
    }
  },
  staleTime: 30_000,
});
