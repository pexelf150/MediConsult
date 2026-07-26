import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CalendarClock, Video, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiUrl } from "@/lib/api-config";

export const Route = createFileRoute("/_authenticated/patient/")({
  component: PatientHome,
});

function PatientHome() {
  const { data: upcoming } = useQuery({
    queryKey: ["patient-upcoming"],
    queryFn: async () => {
      const response = await fetch(apiUrl('/appointments'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const result = await response.json();
      return result.data.appointments.filter((a: any) => 
        ['scheduled', 'in_progress'].includes(a.status)
      ).slice(0, 3);
    },
  });

  return (
    <div className="grid gap-6">
      <section>
        <h1 className="text-3xl tracking-tight">How can we help today?</h1>
        <p className="mt-1 text-muted-foreground">
          Choose an urgent consultation now, or book a normal visit with a doctor of your choice.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <Link
          to="/patient/urgent"
          className="group rounded-2xl border-2 border-urgent/40 bg-card p-6 shadow-soft transition hover:border-urgent hover:shadow-lift"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-urgent text-urgent-foreground">
              <Activity className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">Urgent consultation</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Describe your symptoms, pay securely, and connect with the next available doctor.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-urgent group-hover:underline">
            Start now →
          </span>
        </Link>

        <Link
          to="/patient/book"
          className="group rounded-2xl border bg-card p-6 shadow-soft transition hover:border-primary hover:shadow-lift"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CalendarClock className="h-5 w-5" />
            </div>
            <h2 className="text-xl font-semibold">Schedule a normal visit</h2>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            Browse our doctors and pick a date and time that works for you.
          </p>
          <span className="mt-4 inline-block text-sm font-medium text-primary group-hover:underline">
            Find a doctor →
          </span>
        </Link>
      </section>

      <section>
        <h2 className="mb-3 text-lg">Upcoming visits</h2>
        {upcoming && upcoming.length > 0 ? (
          <ul className="grid gap-3">
            {upcoming.map((a: any) => (
              <li
                key={a._id}
                className={`flex items-center justify-between rounded-xl border bg-card p-4 ${a.isRescheduled ? 'border-amber-200 bg-amber-50' : ''}`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium">
                      {a.type === "urgent" ? "Urgent" : "Normal"} visit ·{" "}
                      {new Date(a.scheduledAt).toLocaleString()}
                    </div>
                    {a.isRescheduled && (
                      <div className="flex items-center gap-1 text-amber-600" title="This appointment has been rescheduled">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-xs font-medium">Rescheduled</span>
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground">Status: {a.status}</div>
                  {a.isRescheduled && a.rescheduleHistory && a.rescheduleHistory.length > 0 && (
                    <div className="mt-1 text-xs text-amber-700">
                      Originally scheduled: {new Date(a.rescheduleHistory[0].originalScheduledAt).toLocaleString()}
                    </div>
                  )}
                </div>
                {a.jitsi?.meetingUrl && (
                  <Button asChild size="sm">
                    <a href={a.jitsi.meetingUrl} target="_blank" rel="noopener noreferrer">
                      <Video className="mr-1.5 h-4 w-4" /> Join
                    </a>
                  </Button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            No upcoming visits yet.
          </p>
        )}
      </section>
    </div>
  );
}
