import { redirect } from "@tanstack/react-router";

export type AppRole = "patient" | "doctor";

export async function requireRole(expectedRole: AppRole) {
  // Check localStorage for backend auth
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

  console.log('requireRole: No user found in localStorage, redirecting to home');
  throw redirect({ to: "/" });
}
