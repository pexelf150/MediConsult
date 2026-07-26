import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patient/urgent")({
  component: UrgentFlow,
});

function UrgentFlow() {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  const onNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (symptoms.trim().length < 10) {
      toast.error("Please describe your symptoms in a bit more detail (at least 10 characters).");
      return;
    }
    if (!contactPhone.trim()) {
      toast.error("Please provide your contact phone number.");
      return;
    }
    setSubmitting(true);
    try {
      // Pick the first available doctor
      const { data: doc, error: docErr } = await supabase
        .from("doctors")
        .select("id, urgent_fee_cents")
        .eq("is_available", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (docErr) throw docErr;
      if (!doc) {
        toast.error("No doctors are available right now. Please try again shortly.");
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Not signed in");

      const { data: appt, error: insErr } = await supabase
        .from("appointments")
        .insert({
          patient_id: user.user.id,
          doctor_id: doc.id,
          appointment_type: "urgent",
          status: "pending_payment",
          payment_status: "unpaid",
          symptoms,
          contact_phone: contactPhone,
          fee_cents: doc.urgent_fee_cents,
          scheduled_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (insErr) throw insErr;

      navigate({ to: "/patient/payment/$id", params: { id: appt.id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-urgent text-urgent-foreground">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Urgent consultation</h1>
          <p className="text-sm text-muted-foreground">
            Tell us what's going on. We'll connect you with the next available doctor right after payment.
          </p>
        </div>
      </div>

      <form onSubmit={onNext} className="rounded-2xl border bg-card p-6 shadow-soft">
        <Label htmlFor="symptoms" className="text-base">
          Describe your symptoms
        </Label>
        <p className="mt-1 text-xs text-muted-foreground">
          Include onset, severity, and anything else the doctor should know.
        </p>
        <Textarea
          id="symptoms"
          className="mt-3 min-h-40"
          placeholder="E.g. Sharp chest pain on the left side starting an hour ago, shortness of breath…"
          value={symptoms}
          onChange={(e) => setSymptoms(e.target.value)}
          required
          maxLength={2000}
        />
        <div className="mt-2 text-right text-xs text-muted-foreground">
          {symptoms.length}/2000
        </div>

        <div className="mt-4 grid gap-1.5">
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

        <div className="mt-5 flex justify-end">
          <Button type="submit" disabled={submitting} size="lg" className="gap-1.5">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <>
                Next <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
