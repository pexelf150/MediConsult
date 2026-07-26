import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/doctor")({
  beforeLoad: () => requireRole("doctor"),
  component: DoctorLayout,
});

function DoctorLayout() {
  const location = useLocation();
  
  return (
    <AppShell
      title="Doctor"
      nav={
        <>
          <NavLink to="/doctor" label="Dashboard" isActive={location.pathname === '/doctor'} />
          <NavLink to="/doctor/bookings" label="Appointments" isActive={location.pathname === '/doctor/bookings'} />
          <NavLink to="/doctor/profile" label="Profile" isActive={location.pathname === '/doctor/profile'} />
          <NavLink to="/doctor/schedule" label="Schedule" isActive={location.pathname === '/doctor/schedule'} />
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
