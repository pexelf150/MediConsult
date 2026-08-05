import { createFileRoute, Link, Outlet, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/AppShell";
import { requireRole } from "@/lib/require-role";

export const Route = createFileRoute("/_authenticated/doctor")({
  beforeLoad: () => requireRole("doctor"),
  component: DoctorLayout,
});

function DoctorLayout() {
  const location = useLocation();

  const { data: rescheduleRequests } = useQuery({
    queryKey: ["doctor-reschedule-requests"],
    queryFn: async () => {
      const response = await fetch('/api/reschedule/doctor/requests', {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch reschedule requests');
      const result = await response.json();
      return result.data;
    },
  });

  const pendingCount = rescheduleRequests?.filter((r: any) => r.status === 'pending').length || 0;

  return (
    <AppShell
      title="Doctor"
      nav={
        <>
          <NavLink to="/doctor" label="Dashboard" isActive={location.pathname === '/doctor'} />
          <NavLink to="/doctor/bookings" label="Appointments" isActive={location.pathname === '/doctor/bookings'} />
          <NavLink to="/doctor/reschedule-requests" label="Reschedule Requests" isActive={location.pathname === '/doctor/reschedule-requests'} badgeCount={pendingCount} />
          <NavLink to="/doctor/profile" label="Profile" isActive={location.pathname === '/doctor/profile'} />
          <NavLink to="/doctor/schedule" label="Schedule" isActive={location.pathname === '/doctor/schedule'} />
        </>
      }
    >
      <Outlet />
    </AppShell>
  );
}

function NavLink({ to, label, isActive, badgeCount }: { to: string; label: string; isActive: boolean; badgeCount?: number }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-1.5 px-4 py-3.5 text-sm hover:bg-slate-700 transition-colors ${isActive ? 'text-white border-b-2 border-amber-400' : 'text-slate-300'}`}
    >
      {label}
      {badgeCount && badgeCount > 0 && (
        <span className="ml-1.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
    </Link>
  );
}
