import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_KEY } from "@/lib/supabase-public-config";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    if (!(import.meta.env.VITE_SUPABASE_URL || PUBLIC_SUPABASE_URL) || !(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || PUBLIC_SUPABASE_KEY)) {
      throw redirect({ to: "/auth" });
    }
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw redirect({ to: "/auth" });
      return { user: data.user };
    } catch (error) {
      if (error && typeof error === "object" && "options" in error) throw error;
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});