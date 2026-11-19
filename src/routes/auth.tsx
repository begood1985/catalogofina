import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Painel FinaSub" },
      { name: "description", content: "Acesso restrito à equipe administrativa da FinaSub." },
      { property: "og:title", content: "Entrar — Painel FinaSub" },
      { property: "og:description", content: "Acesso restrito à equipe." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({ email: z.string().trim().email("E-mail inválido").max(255), password: z.string().min(8, "Mínimo de 8 caracteres").max(72) });

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = schema.safeParse({ email, password });
    if (!p.success) { toast.error(p.error.issues[0]?.message ?? "Dados inválidos"); return; }
    setBusy(true);
    if (mode === "in") {
      const { error } = await supabase.auth.signInWithPassword(p.data);
      setBusy(false);
      if (error) { toast.error("E-mail ou senha incorretos"); return; }
      navigate({ to: "/admin" });
    } else {
      const { data, error } = await supabase.auth.signUp({ ...p.data, options: { emailRedirectTo: `${window.location.origin}/admin` } });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      if (data.session) navigate({ to: "/admin" });
      else toast.success("Conta criada! Confirme pelo link enviado ao seu e-mail e depois entre.");
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4 rounded-3xl bg-card p-8 shadow-card">
        <div>
          <Link to="/" className="text-xs text-muted-foreground underline">← Catálogo</Link>
          <h1 className="mt-2 text-2xl font-extrabold">{mode === "in" ? "Entrar no painel" : "Criar conta"}</h1>
          <p className="text-sm text-muted-foreground">Acesso exclusivo da equipe. A primeira conta criada recebe permissão de administrador.</p>
        </div>
        <div className="space-y-1"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" /></div>
        <div className="space-y-1"><Label htmlFor="pw">Senha</Label><Input id="pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "in" ? "current-password" : "new-password"} /></div>
        <Button type="submit" className="w-full" disabled={busy}>{mode === "in" ? "Entrar" : "Criar conta"}</Button>
        <button type="button" className="w-full text-sm text-muted-foreground underline" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "Ainda não tem conta? Criar" : "Já tem conta? Entrar"}
        </button>
      </form>
    </div>
  );
}