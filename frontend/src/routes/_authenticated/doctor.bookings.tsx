import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CalendarDays, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { apiUrl } from "@/lib/api-config";

export const Route = createFileRoute("/_authenticated/doctor/bookings")({
  component: DoctorBookings,
});

function DoctorBookings() {
  const [weekOffset, setWeekOffset] = useState(0);

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const getWeekDates = (offset = 0): string[] => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return d.toISOString().slice(0, 10);
    });
  };

  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  const { data: appts, isLoading } = useQuery({
    queryKey: ["doctor-appointments", weekDates.join(",")],
    queryFn: async () => {
      const response = await fetch(apiUrl('/appointments?limit=100'), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      const result = await response.json();
      return result.data.appointments;
    },
  });

  // Group appointments by date for calendar
  const appointmentsByDate = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    (appts ?? []).forEach((a: any) => {
      if (a.scheduledAt) {
        // Use local date for grouping to avoid timezone issues
        const dateObj = new Date(a.scheduledAt);
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        const date = `${year}-${month}-${day}`;
        if (!grouped[date]) grouped[date] = [];
        grouped[date].push(a);
      }
    });
    return grouped;
  }, [appts]);

  return (
    <div className="grid gap-6">
      <section>
        <h1 className="text-2xl tracking-tight">Bookings</h1>
        <p className="text-sm text-muted-foreground">
          View your upcoming appointments in a calendar view.
        </p>
      </section>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <CalendarDays className="h-4 w-4" /> Schedule
            </h2>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setWeekOffset((o) => o - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" onClick={() => setWeekOffset((o) => o + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date) => {
              const dayAppointments = appointmentsByDate[date] || [];
              const isPast = date < new Date().toISOString().slice(0, 10);
              const isToday = date === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={date}
                  className={`flex flex-col rounded-xl border p-3 transition ${isPast
                      ? "opacity-40 bg-muted"
                      : isToday
                        ? "border-primary/50 bg-primary/5"
                        : "bg-card shadow-soft"
                    }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {DAYS[new Date(date + "T00:00:00").getDay()]}
                  </span>
                  <span className="mt-1 text-lg font-bold">{date.slice(8)}</span>
                  <div className="mt-2 flex flex-col gap-1">
                    {dayAppointments.length > 0 ? (
                      dayAppointments.map((a: any) => (
                        <div
                          key={a._id}
                          className="text-xs rounded px-1.5 py-0.5 bg-primary/20 text-primary"
                        >
                          {new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No appointments</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
