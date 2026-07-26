import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/patient")({
  beforeLoad: () => requireRole("patient"),
  component: PatientLayout,
});

function PatientLayout() {
  const location = useLocation();
  
  return (
    <AppShell
      title="Patient"
      nav={
        <>
          <NavLink to="/patient" label="Home" isActive={location.pathname === '/patient'} />
          <NavLink to="/patient/book" label="Book" isActive={location.pathname === '/patient/book'} />
          <NavLink to="/patient/urgent" label="Urgent" isActive={location.pathname === '/patient/urgent'} />
          <NavLink to="/patient/appointments" label="My Visits" isActive={location.pathname === '/patient/appointments'} />
          <NavLink to="/patient/profile" label="Profile" isActive={location.pathname === '/patient/profile'} />
        </>
      }
    >
      <Outlet />
    </AppShell>
  );
}

function NavLink({ to, label, isActive }: { to: string; label: string; isActive: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-4 py-3.5 text-sm hover:bg-slate-700 transition-colors ${isActive ? 'text-white border-b-2 border-amber-400' : 'text-slate-300'}`}
    >
      {label}
    </Link>
  );
}
