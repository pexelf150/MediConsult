import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Activity, Bell, Video, Loader2, CheckCircle2, BellRing, User as UserIcon, Phone, AlertTriangle, DollarSign, Save, CalendarDays, FileText, Download, X, ChevronLeft, ChevronRight, CalendarClock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { apiUrl } from "@/lib/api-config";
import PrescriptionPadV2 from "@/components/PrescriptionPad";

export const Route = createFileRoute("/_authenticated/doctor/")({
  component: DoctorDashboard,
});

function RescheduleModal({
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
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingNotification, setRemovingNotification] = useState<string | null>(null);

  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  // Fetch available slots when date is selected
  const { data: slotStatus } = useQuery({
    queryKey: ["slot-status", userData?.id, selectedDate],
    enabled: !!userData?.id && !!selectedDate,
    queryFn: async () => {
      const response = await fetch(apiUrl(`/appointments/slot-status/${userData?.id}?date=${selectedDate}`), {
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
      const response = await fetch(apiUrl(`/appointments/${appointment._id}/reschedule`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          newScheduledAt: newScheduledAt.toISOString(),
          reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reschedule');
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
            Select a new date and time for this appointment with {appointment?.patient?.firstName} {appointment?.patient?.lastName}
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

function DoctorDashboard() {
  const qc = useQueryClient();
  const [urgentAlert, setUrgentAlert] = useState<{ title: string; message: string; time: string } | null>(null);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported"
  );
  const [previewPrescription, setPreviewPrescription] = useState<any>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<any>(null);
  const [dateOffset, setDateOffset] = useState(0); // 0 = today, -1 = yesterday, +1 = tomorrow

  const handlePreviewPrescription = (appointment: any) => {
    if (!appointment.prescription || !appointment.prescription.medications) {
      return;
    }
    setPreviewPrescription(appointment);
  };

  const handleRescheduleAppointment = (appointment: any) => {
    setRescheduleAppointment(appointment);
  };

  const { data: exchangeRate } = useQuery({
    queryKey: ["exchangeRate"],
    queryFn: async () => {
      const { data, error } = await supabase.getExchangeRate();
      if (error) throw error;
      return data;
    },
  });


  // Ask for OS-level notification permission on dashboard load
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then((p) => setNotifPermission(p));
    }
  }, []);

  const showOsNotification = (title: string, body: string, urgent: boolean) => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    try {
      const n = new Notification(title, {
        body,
        tag: urgent ? "mediconsult-urgent" : "mediconsult",
        requireInteraction: urgent,
        icon: "/favicon.ico",
      });
      n.onclick = () => {
        window.focus();
        n.close();
      };
    } catch {
      // ignore
    }
  };

  // Calculate the target date based on offset
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + dateOffset);
  const targetDateStr = targetDate.toISOString().slice(0, 10);

  const { data: appts, isLoading } = useQuery({
    queryKey: ["doctor-appointments", targetDateStr],
    queryFn: async () => {
      const response = await fetch(apiUrl(`/appointments?date=${targetDateStr}`), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      const result = await response.json();
      return result.data.appointments;
    },
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  const patientById = new Map((appts ?? []).map((a) => [a.patient?._id || a.patient, a.patient]));

  const { data: notifications } = useQuery({
    queryKey: ["doctor-notifications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("is_read", false)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  // Realtime: refresh + toast + OS notification on new notification
  useEffect(() => {
    const ch = supabase
      .channel("doctor-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        (payload) => {
          const n = payload.new as { title: string; message: string; is_urgent: boolean };
          if (n.is_urgent) {
            toast.error(`🚨 ${n.title}`, { duration: 8000 });
            setUrgentAlert({
              title: n.title,
              message: n.message,
              time: new Date().toLocaleString(undefined, {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
            });
            try {
              if (typeof window !== "undefined" && "AudioContext" in window) {
                const ctx = new AudioContext();
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.type = "sine";
                o.frequency.value = 880;
                g.gain.value = 0.15;
                o.connect(g).connect(ctx.destination);
                o.start();
                setTimeout(() => { o.stop(); ctx.close(); }, 350);
              }
            } catch { /* ignore */ }
          } else toast(n.title);
          showOsNotification(
            n.is_urgent ? `🚨 ${n.title}` : n.title,
            n.message,
            n.is_urgent
          );
          qc.invalidateQueries({ queryKey: ["doctor-notifications"] });
          qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "appointments" },
        () => qc.invalidateQueries({ queryKey: ["doctor-appointments"] })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [qc]);

  const markComplete = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ status: "completed" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Marked complete");
      qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
    }
  };

  const admitPatient = async (id: string) => {
    const { error } = await supabase
      .from("appointments")
      .update({ doctorApproved: true })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Patient admitted to session!");
      qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
    }
  };

  const markRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id);
      if (error) {
        toast.error("Failed to mark notification as read");
      } else {
        toast.success("Notification marked as read");
        qc.invalidateQueries({ queryKey: ["doctor-notifications"] });
      }
    } catch (error) {
      toast.error("Failed to mark notification as read");
    }
  };

  const urgent = (appts ?? []).filter(
    (a) => a.type === "urgent" && (a.status === "scheduled" || a.status === "confirmed")
  );
  const others = (appts ?? []).filter((a) => !urgent.includes(a));

  return (
    <>
      <UrgentAlertDialog alert={urgentAlert} onClose={() => setUrgentAlert(null)} />
      <RescheduleModal 
        appointment={rescheduleAppointment} 
        onClose={() => setRescheduleAppointment(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["doctor-appointments"] });
          toast.success("Appointment rescheduled successfully");
          setRescheduleAppointment(null);
        }}
      />
      <div className="grid gap-6 lg:grid-cols-[2fr_1.3fr]">

        <div className="space-y-6">
          <section>
            <h1 className="text-2xl tracking-tight">Doctor dashboard</h1>
            <p className="text-sm text-muted-foreground">
              Urgent cases appear first. Join a visit from the meeting link.
            </p>
          </section>

          {notifPermission !== "granted" && notifPermission !== "unsupported" && (
            <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
              <div className="flex items-start gap-2 text-amber-900">
                <BellRing className="mt-0.5 h-4 w-4" />
                <span>
                  Enable desktop notifications to get alerted instantly when an urgent
                  case arrives — even if this tab is in the background.
                </span>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  Notification.requestPermission().then((p) => setNotifPermission(p))
                }
              >
                Enable
              </Button>
            </div>
          )}

          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          ) : (
            <>
              {urgent.length > 0 && (
                <section>
                  <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-urgent">
                    <Activity className="h-4 w-4" /> Urgent — waiting now
                  </h2>
                  <ul className="grid gap-3">
                    {urgent.map((a) => (
                      <AppointmentCard
                        key={a._id}
                        appt={a}
                        urgent
                        onPreviewPrescription={handlePreviewPrescription}
                      />
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    All consultations
                  </h2>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDateOffset(o => o - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous Day
                    </Button>
                    <span className="text-sm font-medium">
                      {dateOffset === 0 ? 'Today' : targetDateStr}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDateOffset(o => o + 1)}
                    >
                      Next Day <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                {others.length === 0 ? (
                  <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
                    No consultations for {dateOffset === 0 ? 'today' : targetDateStr}.
                  </p>
                ) : (
                  <ul className="grid gap-3">
                    {others.map((a) => (
                      <AppointmentCard
                        key={a._id}
                        appt={a}
                        onPreviewPrescription={handlePreviewPrescription}
                        onReschedule={handleRescheduleAppointment}
                      />
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}

        {/* Prescription Preview Dialog */}
        <Dialog open={!!previewPrescription} onOpenChange={() => setPreviewPrescription(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Prescription Preview</span>
                <Button variant="ghost" size="sm" onClick={() => setPreviewPrescription(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            {previewPrescription && (
              <PrescriptionPadV2
                hospitalName="Medi Consult"
                slogan="Your Health, Our Priority"
                addressLine1="123 Healthcare Street"
                addressLine2="Medical District, City 12345"
                phone="0123456789"
                email="mediconsult@email.com"
                website="www.mediconsult.com"
                patientName={previewPrescription.patient ? `${previewPrescription.patient.firstName} ${previewPrescription.patient.lastName}` : ""}
                patientAge={previewPrescription.patient?.age?.toString() || ""}
                patientSex={previewPrescription.patient?.gender || ""}
                date={new Date(previewPrescription.scheduledAt).toLocaleDateString()}
                medications={previewPrescription.prescription.medications}
                notes={previewPrescription.prescription.notes}
              />
            )}
          </DialogContent>
        </Dialog>
        </div>

        <aside className="space-y-4">
          <TodayScheduleCard />
          <div className="rounded-2xl border bg-card p-5 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4" /> Notifications
              {notifications && notifications.length > 0 && (
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {notifications.length}
                </span>
              )}
            </h2>
            <ul className="mt-3 grid gap-2 max-h-80 overflow-y-auto">
              {!notifications || notifications.length === 0 ? (
                <li className="text-sm text-muted-foreground">No notifications.</li>
              ) : (
                <AnimatePresence>
                  {notifications.map((n) => (
                    <motion.li
                      key={n.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 100, transition: { duration: 0.3 } }}
                      className={
                        "rounded-lg border p-3 text-sm " +
                        (n.is_urgent
                          ? "border-urgent/30 bg-urgent/5"
                          : "bg-background")
                      }
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="font-medium">{n.title}</div>
                          <div className="text-xs text-muted-foreground">{n.message}</div>
                          <div className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {new Date(n.created_at).toLocaleString()}
                          </div>
                        </div>
                        <button
                          className="text-xs text-primary hover:underline"
                          onClick={() => markRead(n.id)}
                        >
                          Mark read
                        </button>
                      </div>
                    </motion.li>
                  ))}
                </AnimatePresence>
              )}
            </ul>
          </div>
        </aside>
      </div>
    </>
  );
}

function TodayScheduleCard() {
  const todayStr = new Date().toISOString().slice(0, 10);
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayName = DAYS[new Date().getDay()];

  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: capacity, isLoading } = useQuery({
    queryKey: ["today-schedule-capacity", userData?.id],
    enabled: !!userData?.id,
    queryFn: async () => {
      const { data } = await supabase.getScheduleCapacity(userData!.id, [todayStr]);
      return data?.[0] ?? null;
    },
    refetchInterval: 30_000,
  });

  const blocks = capacity?.blocks ?? [];

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-soft">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <CalendarDays className="h-4 w-4" /> Today — {todayName}
      </h2>
      {isLoading ? (
        <Loader2 className="mt-3 h-4 w-4 animate-spin text-muted-foreground" />
      ) : blocks.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No schedule set for today.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {blocks.map((block: any) => {
            const max = block.max_appointments ?? 10;
            const active = block.active ?? 0;
            const pct = Math.min(100, Math.round((active / max) * 100));
            const barColor =
              pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
            return (
              <li key={block.id} className="rounded-lg border bg-muted/30 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-medium">
                    {block.start_time?.slice(0, 5)} – {block.end_time?.slice(0, 5)}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${barColor}`}>
                    {active} / {max} booked
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="mt-1 text-muted-foreground">{block.slot_minutes}-min slots</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function UrgentAlertDialog({
  alert,
  onClose,
}: {
  alert: { title: string; message: string; time: string } | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!alert} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xs border-0 bg-transparent p-0 shadow-none [&>button]:hidden">
        <AnimatePresence>
          {alert && (
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
              className="overflow-hidden rounded-sm bg-white shadow-2xl ring-1 ring-black/10"
            >
              <div className="bg-[#f59331] py-2 text-center">
                <DialogTitle className="text-sm font-bold uppercase tracking-[0.2em] text-white">
                  CAUTION
                </DialogTitle>
              </div>
              <div className="px-8 pb-6 pt-7 text-center">
                <DialogDescription className="text-[22px] font-bold leading-tight text-gray-900">
                  {alert.message}
                </DialogDescription>
                <button
                  onClick={onClose}
                  className="mt-5 rounded-sm border border-gray-300 bg-gray-100 px-6 py-1 text-xs font-semibold tracking-wider text-gray-700 hover:bg-gray-200"
                >
                  OK
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}



function AppointmentCard({
  appt,
  urgent,
  onPreviewPrescription,
  onReschedule,
}: {
  appt: {
    _id: string;
    type: string;
    status: string;
    scheduledAt: string;
    symptoms: string | null;
    jitsi?: {
      meetingUrl: string | null;
    };
    doctorApproved: boolean;
    healthMetrics?: {
      cholesterol?: { value: number | null; level: string | null };
      sugar?: { value: number | null; level: string | null };
      bloodPressure?: { value: string | null; level: string | null };
    };
    patient?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
    prescription?: {
      medications: any[];
      notes: string;
    };
  };
  urgent?: boolean;
  onPreviewPrescription?: (appt: any) => void;
  onReschedule?: (appt: any) => void;
}) {
  const navigate = useNavigate();
  return (
    <li
      className={
        "rounded-xl border bg-card p-4 shadow-soft " +
        (urgent ? "border-urgent/40" : "") +
        (appt.isRescheduled ? " border-amber-200 bg-amber-50" : "")
      }
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">
              {appt.scheduledAt ? new Date(appt.scheduledAt).toLocaleString() : "Not scheduled"}
            </span>
            {appt.isRescheduled && (
              <div className="flex items-center gap-1 text-amber-600" title="This appointment has been rescheduled">
                <AlertCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Rescheduled</span>
              </div>
            )}
            <span
              className={
                "rounded-full px-2 py-0.5 text-xs font-medium " +
                (appt.type === "urgent"
                  ? "bg-urgent/10 text-urgent"
                  : "bg-primary/10 text-primary")
              }
            >
              {appt.type}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">
              {appt.status}
            </span>
            {!appt.doctorApproved && appt.status !== "completed" && appt.status !== "cancelled" && (
              <span className="rounded-full bg-amber-100 text-amber-800 px-2 py-0.5 text-xs font-semibold">
                Waiting Admission
              </span>
            )}
          </div>
          {appt.isRescheduled && appt.rescheduleHistory && appt.rescheduleHistory.length > 0 && (
            <div className="mt-1 text-xs text-amber-700">
              Originally scheduled: {new Date(appt.rescheduleHistory[0].originalScheduledAt).toLocaleString()}
            </div>
          )}

          {appt.patient && (
            <div className="mt-3 rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <span className="flex items-center gap-1.5 font-medium text-foreground">
                  <UserIcon className="h-3.5 w-3.5" />
                  {`${appt.patient.firstName} ${appt.patient.lastName}` || "Unnamed patient"}
                </span>
                {appt.patient.phone && (
                  <a
                    href={`tel:${appt.patient.phone}`}
                    className="flex items-center gap-1.5 text-primary hover:underline"
                  >
                    <Phone className="h-3.5 w-3.5" />
                    {appt.patient.phone}
                  </a>
                )}
              </div>
            </div>
          )}

          {appt.symptoms && (
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              <span className="font-medium text-foreground">Symptoms: </span>
              {appt.symptoms}
            </p>
          )}

          {appt.bloodGroup && (
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="font-medium text-foreground">Blood Group:</span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">
                {appt.bloodGroup}
              </span>
            </div>
          )}

          {appt.healthMetrics && (
            <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-xs">
              <div className="mb-1.5 font-medium text-foreground">Health Metrics</div>
              <div className="grid gap-1.5 sm:grid-cols-3">
                {appt.healthMetrics.cholesterol?.value && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cholesterol:</span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium">{appt.healthMetrics.cholesterol.value} mg/dL</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${appt.healthMetrics.cholesterol.level === 'high'
                            ? 'bg-destructive/10 text-destructive'
                            : appt.healthMetrics.cholesterol.level === 'normal'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-muted'
                          }`}
                      >
                        {appt.healthMetrics.cholesterol.level?.toUpperCase() || 'N/A'}
                      </span>
                    </span>
                  </div>
                )}
                {appt.healthMetrics.sugar?.value && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Blood Sugar:</span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium">{appt.healthMetrics.sugar.value} mg/dL</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${appt.healthMetrics.sugar.level === 'high'
                            ? 'bg-destructive/10 text-destructive'
                            : appt.healthMetrics.sugar.level === 'normal'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-muted'
                          }`}
                      >
                        {appt.healthMetrics.sugar.level?.toUpperCase() || 'N/A'}
                      </span>
                    </span>
                  </div>
                )}
                {appt.healthMetrics.bloodPressure?.value && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">BP:</span>
                    <span className="flex items-center gap-1.5">
                      <span className="font-medium">{appt.healthMetrics.bloodPressure.value}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${appt.healthMetrics.bloodPressure.level === 'high'
                            ? 'bg-destructive/10 text-destructive'
                            : appt.healthMetrics.bloodPressure.level === 'normal'
                              ? 'bg-emerald-500/10 text-emerald-600'
                              : 'bg-muted'
                          }`}
                      >
                        {appt.healthMetrics.bloodPressure.level?.toUpperCase() || 'N/A'}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {appt.jitsi?.meetingUrl && appt.status !== "completed" && (
            <Button size="sm" onClick={() => navigate({ to: "/meeting", search: { appointmentId: appt._id } })}>
              <Video className="mr-1.5 h-4 w-4" /> Join
            </Button>
          )}
          {onReschedule && (
            <Button size="sm" variant="outline" onClick={() => onReschedule(appt)}>
              <CalendarClock className="mr-1.5 h-4 w-4" /> Reschedule
            </Button>
          )}
          {appt.prescription && appt.prescription.medications && appt.prescription.medications.length > 0 && onPreviewPrescription && (
            <Button size="sm" variant="outline" onClick={() => onPreviewPrescription(appt)}>
              <FileText className="mr-1.5 h-4 w-4" /> Prescription
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}
