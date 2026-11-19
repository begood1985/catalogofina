import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductsAdmin } from "@/components/admin/ProductsAdmin";
import { CategoriesAdmin } from "@/components/admin/CategoriesAdmin";
import { DiscountsAdmin } from "@/components/admin/DiscountsAdmin";
import { OrdersAdmin } from "@/components/admin/OrdersAdmin";
import { SettingsAdmin } from "@/components/admin/SettingsAdmin";
import { ImportExport } from "@/components/admin/ImportExport";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel administrativo — FinaSub" },
      { name: "description", content: "Gestão de produtos, preços, descontos, estoque e pedidos." },
      { property: "og:title", content: "Painel administrativo — FinaSub" },
      { property: "og:description", content: "Área restrita." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const { data: isAdmin, isLoading } = useQuery({
    queryKey: ["admin", "is-admin", user.id],
    queryFn: async () => (await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" })).data === true,
  });
  const logout = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };

  if (isLoading) return <p className="p-8 text-sm text-muted-foreground">Verificando acesso…</p>;
  if (!isAdmin)
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-sm">
          <h1 className="text-2xl font-bold">Acesso restrito</h1>
          <p className="mt-2 text-sm text-muted-foreground">Sua conta ({user.email}) não tem permissão de administrador. Peça a um administrador para liberar o acesso.</p>
          <div className="mt-4 flex justify-center gap-2"><Button variant="outline" asChild><Link to="/">Catálogo</Link></Button><Button onClick={logout}>Sair</Button></div>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen">
      <header className="bg-ink text-primary-foreground">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3"><span className="rounded-lg bg-white p-1"><img src="/brand/finasub-symbol.svg" alt="" className="h-9 w-9" /></span><div><p className="text-xs uppercase tracking-widest opacity-75">Painel</p><h1 className="text-xl font-extrabold">FinaSub Admin</h1></div></div>
          <div className="flex items-center gap-3 text-sm">
            <Link to="/" className="underline opacity-90">Ver catálogo</Link>
            <button onClick={logout} className="inline-flex items-center gap-1 opacity-90"><LogOut className="h-4 w-4" /> Sair</button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">
        <Tabs defaultValue="pedidos">
          <TabsList className="mb-6 flex h-auto flex-wrap">
            <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
            <TabsTrigger value="produtos">Produtos</TabsTrigger>
            <TabsTrigger value="categorias">Categorias</TabsTrigger>
            <TabsTrigger value="descontos">Descontos</TabsTrigger>
            <TabsTrigger value="importar">Importar/Exportar</TabsTrigger>
            <TabsTrigger value="config">Marca e regras</TabsTrigger>
          </TabsList>
          <TabsContent value="pedidos"><OrdersAdmin /></TabsContent>
          <TabsContent value="produtos"><ProductsAdmin /></TabsContent>
          <TabsContent value="categorias"><CategoriesAdmin /></TabsContent>
          <TabsContent value="descontos"><DiscountsAdmin /></TabsContent>
          <TabsContent value="importar"><ImportExport /></TabsContent>
          <TabsContent value="config"><SettingsAdmin /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}