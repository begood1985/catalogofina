import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import {
  getMetaConsent, META_CONSENT_EVENT, setMetaConsent, trackPageView,
  type MetaConsent,
} from "@/lib/meta-pixel";

/** Controle de consentimento independente para publicidade. Não carrega o Pixel por padrão. */
export function MetaTracking() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const privatePage = pathname.startsWith("/admin") || pathname.startsWith("/auth");
  const [consent, setConsent] = useState<MetaConsent>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      const current = getMetaConsent();
      setConsent(current);
      setReady(true);
      if (current === null) setOpen(true);
    };
    sync();
    window.addEventListener(META_CONSENT_EVENT, sync);
    return () => window.removeEventListener(META_CONSENT_EVENT, sync);
  }, []);

  useEffect(() => {
    if (ready && !privatePage && consent === "granted") trackPageView(pathname);
  }, [ready, privatePage, consent, pathname]);

  if (!ready || privatePage) return null;

  const choose = (value: "granted" | "denied") => {
    setMetaConsent(value);
    setOpen(false);
  };

  return (
    <div className="fixed bottom-24 left-4 z-50 max-w-[calc(100vw-2rem)]">
      {open ? (
        <section
          role="region"
          aria-label="Preferências de privacidade e publicidade"
          className="w-[340px] max-w-full rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-xl"
        >
          <h2 className="text-sm font-bold">Privacidade no catálogo FinaSub</h2>
          <p className="mt-2 text-xs leading-relaxed">
            Com sua autorização, usamos o Pixel da Meta para medir visualizações de produtos,
            itens adicionados ao orçamento e solicitações enviadas. Não enviamos seus dados
            pessoais e não registramos orçamentos como compras.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => choose("denied")}
              className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold">
              Recusar
            </button>
            <button type="button" onClick={() => choose("granted")}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
              Aceitar métricas da Meta
            </button>
            {consent !== null && (
              <button type="button" onClick={() => setOpen(false)}
                className="px-2 py-2 text-xs underline">Fechar</button>
            )}
          </div>
        </section>
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          aria-label="Alterar preferências de privacidade da Meta"
          className="rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 shadow-md">
          Privacidade
        </button>
      )}
    </div>
  );
}
