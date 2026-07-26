import { redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "patient" | "doctor";

export async function requireRole(expectedRole: AppRole) {
  // First check localStorage for backend auth
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      const role = user.role as AppRole;
      console.log('requireRole: Found user in localStorage', { role, expectedRole });
      if (role !== expectedRole) {
        throw redirect({ to: role === "doctor" ? "/doctor" : "/patient" });
      }
      return { user, role };
    } catch {
      localStorage.removeItem('user');
    }
  }
  
  // Fallback to Supabase auth
  const { data, error } = await supabase.auth.getUser();

  if (error || !data.user) {
    console.log('requireRole: No Supabase user found, redirecting to home');
    throw redirect({ to: "/" });
  }

  const role = (data.user.user_metadata?.role as AppRole | undefined) ?? "patient";

  if (role !== expectedRole) {
    throw redirect({ to: role === "doctor" ? "/doctor" : "/patient" });
  }

  return { user: data.user, role };
}
