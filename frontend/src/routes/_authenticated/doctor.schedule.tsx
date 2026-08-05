import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus, Trash2, CalendarClock, Users, DollarSign, Save } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/schedule")({
  component: DoctorSchedule,
});

const DAYS = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function DoctorSchedule() {
  const qc = useQueryClient();
  const [day, setDay] = useState<string>("1");
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("17:00");
  const [slotMinutes, setSlotMinutes] = useState("30");
  const [maxAppointments, setMaxAppointments] = useState("10");
  const [saving, setSaving] = useState(false);

  // Fees state
  const [normalFee, setNormalFee] = useState("");
  const [urgentFee, setUrgentFee] = useState("");
  const [savingFees, setSavingFees] = useState(false);
  const [feesLoaded, setFeesLoaded] = useState(false);

  const { data: exchangeRate } = useQuery({
    queryKey: ["exchangeRate"],
    queryFn: async () => {
      const { data, error } = await supabase.getExchangeRate();
      if (error) throw error;
      return data;
    },
  });

  const { data: userData } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });

  const { data: schedules, isLoading } = useQuery({
    queryKey: ["my-schedule", userData?.id],
    enabled: !!userData?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("doctor_schedules")
        .select("*")
        .eq("doctor_id", userData!.id)
        .order("day_of_week", { ascending: true })
        .order("start_time", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  // Fetch today's appointment counts for this doctor
  const todayStr = new Date().toISOString().slice(0, 10);
  const { data: todayCapacity } = useQuery({
    queryKey: ["today-capacity", userData?.id],
    enabled: !!userData?.id,
    queryFn: async () => {
      const { data } = await supabase.getScheduleCapacity(userData!.id, [todayStr]);
      return data?.[0] ?? null;
    },
    refetchInterval: 30_000,
  });

  const addSlot = async () => {
    if (!userData) return;
    if (endTime <= startTime) {
      toast.error("End time must be after start time.");
      return;
    }
    const maxNum = parseInt(maxAppointments, 10);
    if (isNaN(maxNum) || maxNum < 1 || maxNum > 100) {
      toast.error("Max appointments must be between 1 and 100.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("doctor_schedules").insert({
      doctor_id: userData.id,
      day_of_week: Number(day),
      start_time: startTime,
      end_time: endTime,
      slot_minutes: Number(slotMinutes),
      max_appointments: maxNum,
    });
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Schedule added");
      qc.invalidateQueries({ queryKey: ["my-schedule", userData.id] });
    }
  };

  const removeSlot = async (id: string) => {
    const { error } = await supabase.from("doctor_schedules").delete().eq("id", id);
    if (error) toast.error(error.message);
    else qc.invalidateQueries({ queryKey: ["my-schedule", userData?.id] });
  };

  // Load doctor's fees
  useEffect(() => {
    supabase.getDoctorProfile().then(({ data }: { data: any }) => {
      if (data) {
        setNormalFee(String(data.consultationFee ?? ""));
        setUrgentFee(String(data.urgentFee ?? ""));
        setFeesLoaded(true);
      }
    });
  }, []);

  // Save fees
  const handleSaveFees = async () => {
    if (!userData) return;
    setSavingFees(true);
    const { error } = await supabase.updateDoctorFees({
      consultationFee: parseFloat(normalFee),
      urgentFee: parseFloat(urgentFee),
    });
    setSavingFees(false);
    if (error) {
      toast.error("Failed to update fees: " + error.message);
    } else {
      toast.success("Consultation fees updated successfully.");
    }
  };

  const grouped = new Map<number, typeof schedules>();
  (schedules ?? []).forEach((s) => {
    const list = grouped.get(s.day_of_week) ?? [];
    list.push(s);
    grouped.set(s.day_of_week, list as typeof schedules);
  });

  const todayDow = new Date().getDay();
  const todayBlocks = grouped.get(todayDow) ?? [];

  const normalFeeUSD = exchangeRate && normalFee ? (parseFloat(normalFee) * exchangeRate.lkrToUsd).toFixed(2) : null;
  const urgentFeeUSD = exchangeRate && urgentFee ? (parseFloat(urgentFee) * exchangeRate.lkrToUsd).toFixed(2) : null;

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl tracking-tight">Consulting schedule</h1>
        <p className="text-sm text-muted-foreground">
          Set your weekly availability and appointment capacity. Patients see these slots when booking.
        </p>
      </header>

      {/* Today's capacity summary */}
      {todayBlocks.length > 0 && (
        <section className="rounded-2xl border bg-primary/5 p-5 shadow-soft">
          <div className="mb-3 flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            <h2 className="text-sm font-semibold">Today's appointments ({DAYS[todayDow]})</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {todayBlocks.map((block) => {
              const max = block.max_appointments ?? 10;
              const active = todayCapacity?.active ?? 0;
              const pct = Math.min(100, Math.round((active / max) * 100));
              const color = pct >= 100 ? "bg-destructive" : pct >= 80 ? "bg-amber-500" : "bg-emerald-500";
              return (
                <div key={block.id} className="rounded-xl border bg-card p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {block.start_time.slice(0, 5)} – {block.end_time.slice(0, 5)}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold text-white ${color}`}>
                      {active} / {max}
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{block.slot_minutes}-min slots</div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Add a time block</h2>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="grid gap-1.5">
            <Label>Day</Label>
            <Select value={day} onValueChange={setDay}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DAYS.map((d, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>Start</Label>
            <Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>End</Label>
            <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label>Slot length (min)</Label>
            <Select value={slotMinutes} onValueChange={setSlotMinutes}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[15, 20, 30, 45, 60].map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="max-appts">Max appointments / day</Label>
            <Input
              id="max-appts"
              type="number"
              min={1}
              max={100}
              value={maxAppointments}
              onChange={(e) => setMaxAppointments(e.target.value)}
              placeholder="10"
            />
          </div>
        </div>
        <Button onClick={addSlot} disabled={saving} className="mt-5">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add block"}
        </Button>
      </section>

      <section className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Consultation Fees</h2>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Set your consultation fees (in LKR). Patients will see these fees when booking.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="grid gap-1.5">
            <Label htmlFor="normal-fee" className="text-xs font-medium">Normal consultation (LKR)</Label>
            <Input
              id="normal-fee"
              type="number"
              min="0"
              step="0.01"
              placeholder={feesLoaded ? undefined : "Loading…"}
              value={normalFee}
              onChange={(e) => setNormalFee(e.target.value)}
              className="h-9 text-sm"
            />
            {normalFeeUSD && (
              <p className="text-[10px] text-muted-foreground">≈ ${normalFeeUSD} USD</p>
            )}
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="urgent-fee" className="text-xs font-medium">Urgent consultation (LKR)</Label>
            <Input
              id="urgent-fee"
              type="number"
              min="0"
              step="0.01"
              placeholder={feesLoaded ? undefined : "Loading…"}
              value={urgentFee}
              onChange={(e) => setUrgentFee(e.target.value)}
              className="h-9 text-sm"
            />
            {urgentFeeUSD && (
              <p className="text-[10px] text-muted-foreground">≈ ${urgentFeeUSD} USD</p>
            )}
          </div>
        </div>
        <Button
          size="sm"
          onClick={handleSaveFees}
          disabled={savingFees || !feesLoaded}
          className="mt-4 gap-1.5"
        >
          {savingFees ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save fees
        </Button>
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <CalendarClock className="h-4 w-4" /> Weekly availability
        </h2>
        {isLoading ? (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        ) : !schedules || schedules.length === 0 ? (
          <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
            No time blocks yet. Add one above to start receiving normal consultations.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {DAYS.map((d, i) => {
              const items = grouped.get(i);
              if (!items || items.length === 0) return null;
              return (
                <div key={i} className="rounded-xl border bg-card p-4 shadow-soft">
                  <div className="mb-2 font-semibold">{d}</div>
                  <ul className="grid gap-2">
                    {items.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between rounded-lg border bg-muted/30 p-2 text-sm"
                      >
                        <div>
                          <span>
                            {s.start_time.slice(0, 5)} – {s.end_time.slice(0, 5)}
                          </span>
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({s.slot_minutes} min slots)
                          </span>
                          <span className="ml-3 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            <Users className="h-3 w-3" />
                            max {s.max_appointments ?? 10}/day
                          </span>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => removeSlot(s.id)}
                          aria-label="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
