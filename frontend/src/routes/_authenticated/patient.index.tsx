import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Activity, CalendarClock, Video, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiUrl } from "@/lib/api-config";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patient/")({
  component: PatientHome,
});

function PatientHome() {
  const qc = useQueryClient();
  const [rescheduleAppointment, setRescheduleAppointment] = useState<any>(null);

  const { data: upcoming } = useQuery({
    queryKey: ["patient-upcoming"],
    queryFn: async () => {
      const response = await fetch(apiUrl('/appointments'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const result = await response.json();
      return result.data.appointments.filter((a: any) => 
        a.status !== 'completed' && a.status !== 'cancelled' && new Date(a.scheduledAt) > new Date()
      ).slice(0, 3);
    },
  });

  const { data: rescheduleRequests } = useQuery({
    queryKey: ["patient-reschedule-requests"],
    queryFn: async () => {
      const response = await fetch(apiUrl('/reschedule/patient/requests'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch reschedule requests');
      const result = await response.json();
      return result.data;
    },
  });

  // Create a map of appointment IDs to request status
  const pendingRequestsMap = new Map(
    rescheduleRequests
      ?.filter((r: any) => r.status === 'pending')
      .map((r: any) => [r.appointment._id, 'pending']) || []
  );
  const approvedRequestsMap = new Map(
    rescheduleRequests
      ?.filter((r: any) => r.status === 'approved')
      .map((r: any) => [r.appointment._id, 'approved']) || []
  );

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
                <div className="flex gap-2">
                  {a.status === "scheduled" && a.type === "normal" && (
                    pendingRequestsMap.has(a._id) ? (
                      <Button size="sm" className="bg-slate-400 text-slate-950 cursor-default" disabled>
                        <CalendarClock className="mr-1.5 h-4 w-4" /> Requested
                      </Button>
                    ) : approvedRequestsMap.has(a._id) ? (
                      <Button size="sm" className="bg-green-500 text-green-950 cursor-default" disabled>
                        <CalendarClock className="mr-1.5 h-4 w-4" /> Request Approved
                      </Button>
                    ) : (
                      <Button size="sm" className="bg-amber-400 text-amber-950 hover:bg-amber-500" onClick={() => setRescheduleAppointment(a)}>
                        <CalendarClock className="mr-1.5 h-4 w-4" /> Request Reschedule
                      </Button>
                    )
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            No upcoming visits yet.
          </p>
        )}
      </section>

      {/* Reschedule Modal */}
      <PatientRescheduleModal
        appointment={rescheduleAppointment}
        onClose={() => setRescheduleAppointment(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["patient-upcoming"] });
          qc.invalidateQueries({ queryKey: ["patient-reschedule-requests"] });
          toast.success("Reschedule request sent successfully");
          setRescheduleAppointment(null);
        }}
      />
    </div>
  );
}

function PatientRescheduleModal({
  appointment,
  onClose,
  onSuccess,
}: {
  appointment: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Fetch available slots when date is selected
  const { data: slotStatus } = useQuery({
    queryKey: ["slot-status", appointment?.doctor?._id || appointment?.doctor, selectedDate],
    enabled: !!appointment?.doctor && !!selectedDate,
    queryFn: async () => {
      const doctorId = appointment?.doctor?._id || appointment?.doctor;
      const response = await fetch(apiUrl(`/appointments/slot-status/${doctorId}?date=${selectedDate}`), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch slot status');
      return response.json();
    },
  });

  useEffect(() => {
    if (slotStatus?.data) {
      const bookedTimes = slotStatus.data.booked || [];
      // Generate time slots from 9 AM to 11 PM
      const allSlots = [];
      for (let hour = 9; hour < 23; hour++) {
        allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      setAvailableSlots(allSlots);
      setBookedSlots(bookedTimes);
    }
  }, [slotStatus]);

  // Get current appointment time in 24-hour format to match slots
  const currentAppointmentTime = appointment?.scheduledAt 
    ? new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;

  // Get current appointment date to check if selected date matches
  const currentAppointmentDate = appointment?.scheduledAt
    ? new Date(appointment.scheduledAt).toISOString().split('T')[0]
    : null;

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select date and time");
      return;
    }

    const newScheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/reschedule/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          appointmentId: appointment._id,
          newScheduledAt: newScheduledAt.toISOString(),
          reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reschedule request');
      }

      onSuccess();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!appointment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Select a new date and time for your appointment
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="date">New Date</Label>
            <Input
              id="date"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {selectedDate && (
            <div>
              <Label htmlFor="time">Time Slots</Label>
              {currentAppointmentTime && selectedDate === currentAppointmentDate && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Current appointment time: <span className="font-semibold text-foreground">{currentAppointmentTime}</span>
                </div>
              )}
              <div className="mt-2 grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {availableSlots.length === 0 ? (
                  <p className="col-span-3 text-sm text-muted-foreground">No slots available</p>
                ) : (
                  availableSlots.map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    const isCurrentAppointment = selectedDate === currentAppointmentDate && slot === currentAppointmentTime;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => !isBooked && setSelectedTime(slot)}
                        disabled={isBooked}
                        className={`rounded-lg border p-2 text-sm transition-colors ${
                          isCurrentAppointment
                            ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                            : isBooked
                            ? 'border-red-500 bg-red-100 text-red-800 cursor-not-allowed'
                            : selectedTime === slot
                            ? 'border-green-500 bg-green-100 text-green-800'
                            : 'border-border hover:bg-muted'
                        }`}
                        title={isBooked ? 'Already booked' : isCurrentAppointment ? 'Current appointment time' : 'Available'}
                      >
                        {slot}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Selected</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Current</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Booked</span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              placeholder="Why are you rescheduling?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} disabled={loading || !selectedDate || !selectedTime}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm Reschedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
