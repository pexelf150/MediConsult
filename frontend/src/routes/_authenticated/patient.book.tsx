import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Stethoscope,
  Loader2,
  CalendarDays,
  Clock,
  ChevronLeft,
  ChevronRight,
  TimerIcon,
  AlertCircle,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

export const Route = createFileRoute("/_authenticated/patient/book")({
  component: BookNormal,
});

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const RESERVATION_DURATION = 15 * 60; // 15 minutes in seconds

type Step = "doctor" | "week" | "slots" | "reserved";

interface Reservation {
  reservationId: string;
  expiresAt: string;
  scheduledAt: string;
  doctorId: string;
}

function getWeekDates(offset = 0): string[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1 + offset * 7);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}

function generateSlots(blocks: any[]): string[] {
  const slotsSet = new Set<string>();
  for (const block of blocks) {
    const [sh, sm] = block.start_time.split(":").map(Number);
    const [eh, em] = block.end_time.split(":").map(Number);
    let cur = sh * 60 + sm;
    const end = eh * 60 + em;
    while (cur + block.slot_minutes <= end) {
      const h = Math.floor(cur / 60);
      const m = cur % 60;
      slotsSet.add(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
      cur += block.slot_minutes;
    }
  }
  return Array.from(slotsSet).sort();
}

function useCountdown(expiresAt: string | null) {
  // -1 means 'not yet initialised' — avoids firing the expiry effect on first render
  const [secs, setSecs] = useState<number>(-1);
  useEffect(() => {
    if (!expiresAt) { setSecs(-1); return; }
    const tick = () => {
      const diff = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setSecs(diff);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  return secs;
}

function BookNormal() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("doctor");
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [symptoms, setSymptoms] = useState("");
  const [cholesterol, setCholesterol] = useState("");
  const [sugar, setSugar] = useState("");
  const [bloodPressure, setBloodPressure] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [bloodGroup, setBloodGroup] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reserving, setReserving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("id", user.id)
          .single();
        if (profile?.phone) {
          setContactPhone(profile.phone);
        }
      }
    };
    fetchProfile();
  }, []);
  const reservationRef = useRef<Reservation | null>(null);
  reservationRef.current = reservation;

  const secsLeft = useCountdown(reservation?.expiresAt ?? null);
  const weekDates = useMemo(() => getWeekDates(weekOffset), [weekOffset]);

  // ── Auto-release when countdown hits 0 ──────────────────────────────────
  // secsLeft starts at -1 (uninitialised). Only trigger expiry once it has
  // been initialised (>= 0) AND has now counted down to exactly 0.
  const countdownStarted = useRef(false);
  useEffect(() => {
    if (secsLeft > 0) {
      countdownStarted.current = true;
    }
    if (reservation && countdownStarted.current && secsLeft === 0) {
      toast.error("Your reservation expired. Please choose another slot.");
      countdownStarted.current = false;
      setReservation(null);
      setStep("slots");
    }
  }, [secsLeft, reservation]);

  // ── Data: doctors ────────────────────────────────────────────────────────
  const { data: doctors, isLoading: doctorsLoading } = useQuery({
    queryKey: ["doctors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctors")
        .select("id, full_name, specialty, bio, consultation_fee_cents, is_available")
        .eq("is_available", true);
      if (error) throw error;
      return data;
    },
  });

  // ── Data: weekly capacity ────────────────────────────────────────────────
  const { data: weekCapacity, isLoading: capacityLoading } = useQuery({
    queryKey: ["week-capacity", selectedDoctor?.id, weekDates.join(",")],
    enabled: !!selectedDoctor && step === "week",
    queryFn: async () => {
      const { data } = await supabase.getScheduleCapacity(selectedDoctor!.id, weekDates);
      return data ?? [];
    },
    refetchInterval: 15_000,
  });

  // ── Data: slot status for selected date ──────────────────────────────────
  const { data: slotStatus, refetch: refetchSlots } = useQuery({
    queryKey: ["slot-status", selectedDoctor?.id, selectedDate],
    enabled: !!selectedDoctor && !!selectedDate && step === "slots",
    queryFn: async () => {
      const { data } = await supabase.getSlotStatus(selectedDoctor!.id, selectedDate!);
      return data ?? { booked: [], reserved: [] };
    },
    refetchInterval: 10_000,
  });

  const selectedDayCapacity = useMemo(
    () => weekCapacity?.find((d: any) => d.date === selectedDate) ?? null,
    [weekCapacity, selectedDate]
  );

  const availableSlots = useMemo(() => {
    if (!selectedDayCapacity?.blocks?.length) return [];
    return generateSlots(selectedDayCapacity.blocks);
  }, [selectedDayCapacity]);

  const bookedSet = useMemo(() => {
    const times = new Set<string>();
    (slotStatus?.booked ?? []).forEach((iso: string) => {
      times.add(new Date(iso).toTimeString().slice(0, 5));
    });
    return times;
  }, [slotStatus]);

  const reservedMap = useMemo(() => {
    const m = new Map<string, string>(); // time -> expiresAt
    (slotStatus?.reserved ?? []).forEach((r: any) => {
      const time = new Date(r.scheduledAt).toTimeString().slice(0, 5);
      m.set(time, r.expiresAt);
    });
    return m;
  }, [slotStatus]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const onDoctorSelect = (doc: any) => {
    setSelectedDoctor(doc);
    setSelectedDate(null);
    setStep("week");
  };

  const onDateSelect = (date: string, cap: any) => {
    if (!cap?.blocks?.length) return;
    setSelectedDate(date);
    setSelectedTime(null);
    setStep("slots");
  };

  const onSlotClick = async (time: string) => {
    if (bookedSet.has(time) || reservedMap.has(time)) return;
    setSelectedTime(time);
    setReserving(true);
    try {
      const scheduledAt = new Date(`${selectedDate}T${time}:00`).toISOString();
      console.log('Reserving slot:', { doctorId: selectedDoctor.id, scheduledAt });
      const { data, error } = await supabase.reserveSlot(selectedDoctor.id, scheduledAt);
      console.log('Reservation response:', data, error);
      if (error) throw error;
      console.log('Setting reservation state:', {
        reservationId: data.reservationId,
        expiresAt: data.expiresAt,
        expiresAtType: typeof data.expiresAt,
        scheduledAt: data.scheduledAt,
        doctorId: data.doctorId,
      });
      setReservation({
        reservationId: data.reservationId,
        expiresAt: data.expiresAt,
        scheduledAt: data.scheduledAt,
        doctorId: data.doctorId,
      });
      setStep("reserved");
    } catch (err: any) {
      console.error('Reservation error:', err);
      toast.error(err.message || "Could not reserve slot. Try another.");
      setSelectedTime(null);
      refetchSlots();
    } finally {
      setReserving(false);
    }
  };

  const onConfirmPayment = async () => {
    if (!reservation || !symptoms.trim()) {
      toast.error("Please describe your symptoms.");
      return;
    }
    if (!contactPhone.trim()) {
      toast.error("Please provide your contact phone number.");
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.confirmReservation(
        reservation.reservationId,
        symptoms,
        "medium",
        cholesterol ? parseFloat(cholesterol) : undefined,
        sugar ? parseFloat(sugar) : undefined,
        bloodPressure || undefined,
        contactPhone,
        bloodGroup || undefined
      );
      if (error) throw error;
      toast.success("Proceeding to payment...");
      navigate({ to: "/patient/payment-new/$id", params: { id: data.paymentId } });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const onBack = useCallback(async () => {
    if (reservation) {
      await supabase.releaseReservation(reservation.reservationId);
      setReservation(null);
    }
    if (step === "reserved") setStep("slots");
    else if (step === "slots") { setStep("week"); setSelectedDate(null); }
    else if (step === "week") setStep("doctor");
  }, [step, reservation]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="grid gap-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl tracking-tight">Book a consultation</h1>
          <p className="text-sm text-muted-foreground">Choose a doctor, pick a day, then lock your slot.</p>
        </div>
        {step !== "doctor" && (
          <Button variant="outline" size="sm" onClick={onBack} className="shrink-0 gap-1.5">
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
        )}
      </header>

      {/* Step breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {(["doctor", "week", "slots", "reserved"] as Step[]).map((s, i) => (
          <span key={s} className="flex items-center gap-2">
            {i > 0 && <ChevronRight className="h-3 w-3" />}
            <span className={step === s ? "font-semibold text-primary" : ""}>
              {i + 1}. {s === "doctor" ? "Pick doctor" : s === "week" ? "Pick day" : s === "slots" ? "Pick time" : "Confirm"}
            </span>
          </span>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* ── STEP 1: Pick a doctor ── */}
        {step === "doctor" && (
          <motion.div key="doctor" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid gap-4">
            {doctorsLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : !doctors || doctors.length === 0 ? (
              <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
                No doctors registered yet.
              </div>
            ) : (
              <ul className="grid gap-3 md:grid-cols-2">
                {doctors.map((d: any) => (
                  <li key={d.id}>
                    <button
                      type="button"
                      onClick={() => onDoctorSelect(d)}
                      className="w-full rounded-2xl border bg-card p-5 text-left shadow-soft transition hover:border-primary/50 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Stethoscope className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold">{d.full_name}</div>
                          <div className="text-sm text-muted-foreground">{d.specialty}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            ₹{(d.consultation_fee_cents / 100).toFixed(2)} per visit
                          </div>
                          {d.bio && <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{d.bio}</p>}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        )}

        {/* ── STEP 2: Weekly calendar ── */}
        {step === "week" && (
          <motion.div key="week" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  Dr. {selectedDoctor?.full_name} — week of {weekDates[0]}
                </h2>
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline" size="icon"
                  disabled={weekDates[0] <= new Date().toISOString().slice(0, 10)}
                  onClick={() => setWeekOffset((o) => o - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setWeekOffset((o) => o + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {capacityLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-7 gap-2">
                {weekDates.map((date, i) => {
                  const cap = weekCapacity?.find((c: any) => c.date === date);
                  const hasSchedule = (cap?.blocks?.length ?? 0) > 0;
                  const isPast = date < new Date().toISOString().slice(0, 10);
                  // Sum up max and active across all blocks for the day
                  const max = cap?.blocks?.reduce((sum: number, b: any) => sum + (b.max_appointments ?? 10), 0) ?? 10;
                  const active = cap?.blocks?.reduce((sum: number, b: any) => sum + (b.active ?? 0), 0) ?? 0;
                  const isFull = hasSchedule && active >= max;
                  const pct = hasSchedule ? Math.min(100, Math.round((active / max) * 100)) : 0;

                  return (
                    <button
                      key={date}
                      type="button"
                      disabled={!hasSchedule || isPast || isFull}
                      onClick={() => onDateSelect(date, cap)}
                      className={[
                        "flex flex-col items-center rounded-xl border p-3 text-center transition",
                        !hasSchedule || isPast
                          ? "cursor-not-allowed opacity-40 bg-muted"
                          : isFull
                          ? "cursor-not-allowed border-destructive/40 bg-destructive/5"
                          : "cursor-pointer hover:border-primary/60 hover:bg-primary/5 bg-card shadow-soft",
                      ].join(" ")}
                    >
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        {DAYS[new Date(date + "T00:00:00").getDay()]}
                      </span>
                      <span className="mt-1 text-lg font-bold">{date.slice(8)}</span>
                      {hasSchedule && !isPast && (
                        <>
                          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full rounded-full ${isFull ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="mt-1 text-[10px] text-muted-foreground">
                            {isFull ? "Full" : `${active}/${max}`}
                          </span>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-emerald-500" /> Available</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Filling up</span>
              <span className="flex items-center gap-1"><span className="inline-block h-2 w-2 rounded-full bg-destructive" /> Full</span>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3: Time slot grid ── */}
        {step === "slots" && selectedDate && selectedDayCapacity && (
          <motion.div key="slots" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">
                {DAY_FULL[new Date(selectedDate + "T00:00:00").getDay()]}, {selectedDate}
              </h2>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-xs text-muted-foreground">
              Slots locked by other patients are shown in amber. Click an available slot to hold it for 10 minutes while you pay.
            </div>

            {availableSlots.length === 0 ? (
              <p className="text-sm text-muted-foreground">No slots available for this day.</p>
            ) : (
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                {availableSlots.map((time) => {
                  const isBooked = bookedSet.has(time);
                  const isReserved = reservedMap.has(time);
                  const disabled = isBooked || isReserved;
                  return (
                    <button
                      key={time}
                      type="button"
                      disabled={disabled || reserving}
                      onClick={() => onSlotClick(time)}
                      className={[
                        "flex flex-col items-center rounded-xl border px-2 py-3 text-xs font-semibold transition",
                        isBooked
                          ? "cursor-not-allowed border-muted bg-muted/50 text-muted-foreground line-through opacity-60"
                          : isReserved
                          ? "cursor-not-allowed border-amber-300 bg-amber-50 text-amber-700"
                          : "cursor-pointer border-primary/30 bg-card text-foreground shadow-soft hover:border-primary hover:bg-primary/5",
                      ].join(" ")}
                    >
                      {isBooked ? <CheckCircle2 className="mb-0.5 h-3 w-3 text-muted-foreground" /> : isReserved ? <Lock className="mb-0.5 h-3 w-3 text-amber-600" /> : null}
                      {time}
                      {isReserved && <span className="mt-0.5 text-[9px] text-amber-600">Reserved</span>}
                    </button>
                  );
                })}
              </div>
            )}

            {reserving && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" /> Locking slot…
              </div>
            )}
          </motion.div>
        )}

        {/* ── STEP 4: Reservation confirmed — symptoms + pay ── */}
        {step === "reserved" && reservation && (
          <motion.div key="reserved" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid gap-5">
            {/* Countdown banner */}
            <div className={`flex items-center gap-3 rounded-xl border p-4 ${secsLeft >= 0 && secsLeft <= 60 ? "border-destructive/50 bg-destructive/5" : "border-primary/30 bg-primary/5"}`}>
              <TimerIcon className={`h-5 w-5 shrink-0 ${secsLeft >= 0 && secsLeft <= 60 ? "text-destructive" : "text-primary"}`} />
              <div>
                <p className="text-sm font-semibold">
                  Slot reserved! Complete payment within{" "}
                  <span className={secsLeft >= 0 && secsLeft <= 60 ? "text-destructive" : "text-primary"}>
                   {secsLeft >= 0
                      ? `${Math.floor(secsLeft / 60)}:${String(secsLeft % 60).padStart(2, "0")}`
                      : "10:00"}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(reservation.scheduledAt).toLocaleString()} with Dr. {selectedDoctor?.full_name}
                </p>
              </div>
            </div>

            {secsLeft === 0 && secsLeft !== -1 && (
              <div className="flex items-center gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Reservation expired. Please go back and select a slot again.
              </div>
            )}

            <div className="rounded-2xl border bg-card p-6 shadow-soft">
              <h2 className="mb-1 text-base font-semibold">Describe your symptoms</h2>
              <p className="mb-3 text-xs text-muted-foreground">Tell the doctor what you're experiencing so they can prepare.</p>
              <div className="grid gap-1.5">
                <Label htmlFor="symptoms">Symptoms *</Label>
                <Textarea
                  id="symptoms"
                  rows={4}
                  placeholder="e.g. Fever for 3 days, sore throat, mild headache…"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  className="resize-none"
                />
              </div>

              <div className="mt-6 grid gap-4">
                <h3 className="text-sm font-semibold">Contact Information</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="grid gap-1.5">
                    <Label htmlFor="contactPhone">Contact Phone *</Label>
                    <input
                      id="contactPhone"
                      type="tel"
                      placeholder="e.g. +1234567890"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      required
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="bloodGroup">Blood Group (Optional)</Label>
                    <select
                      id="bloodGroup"
                      value={bloodGroup}
                      onChange={(e) => setBloodGroup(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">Select blood group</option>
                      <option value="A+">A+</option>
                      <option value="A-">A-</option>
                      <option value="B+">B+</option>
                      <option value="B-">B-</option>
                      <option value="AB+">AB+</option>
                      <option value="AB-">AB-</option>
                      <option value="O+">O+</option>
                      <option value="O-">O-</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="mt-6 grid gap-4">
                <h3 className="text-sm font-semibold">Health Metrics (Optional)</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="cholesterol">Cholesterol (mg/dL)</Label>
                    <input
                      id="cholesterol"
                      type="number"
                      placeholder="e.g. 200"
                      value={cholesterol}
                      onChange={(e) => setCholesterol(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="sugar">Blood Sugar (mg/dL)</Label>
                    <input
                      id="sugar"
                      type="number"
                      placeholder="e.g. 100"
                      value={sugar}
                      onChange={(e) => setSugar(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="bloodPressure">Blood Pressure</Label>
                    <input
                      id="bloodPressure"
                      type="text"
                      placeholder="e.g. 120/80"
                      value={bloodPressure}
                      onChange={(e) => setBloodPressure(e.target.value)}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-xl bg-muted/40 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consultation fee</span>
                  <span className="font-semibold">₹{(selectedDoctor?.consultation_fee_cents / 100).toFixed(2)}</span>
                </div>
              </div>

              <Button
                size="lg"
                onClick={onConfirmPayment}
                disabled={submitting || !symptoms.trim() || secsLeft === 0}
                className="mt-5 w-full"
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Confirm appointment"
                )}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
