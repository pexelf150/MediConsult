import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // Check if user is authenticated via backend (localStorage)
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        return { user };
      } catch {
        localStorage.removeItem('user');
      }
    }

    // No user found, redirect to home
    throw redirect({ to: "/" });
  },
  component: () => <Outlet />,
});
