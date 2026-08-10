import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Activity, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patient/urgent")({
  component: UrgentFlow,
});

function UrgentFlow() {
  const navigate = useNavigate();
  const [symptoms, setSymptoms] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loadingDoctors, setLoadingDoctors] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const user = JSON.parse(userStr);
          if (user.phone) {
            setContactPhone(user.phone);
          }
        } catch (e) {
          console.error('Failed to parse user data', e);
        }
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const response = await fetch('/api/doctors/available', {
          credentials: 'include',
        });
        const result = await response.json();
        if (response.ok && result.data) {
          setDoctors(result.data);
          if (result.data.length > 0) {
            setSelectedDoctor(result.data[0]._id);
          }
        }
      } catch (err) {
        console.error("Failed to fetch doctors:", err);
      } finally {
        setLoadingDoctors(false);
      }
    };
    fetchDoctors();
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
    if (!selectedDoctor) {
      toast.error("Please select a doctor.");
      return;
    }
    setSubmitting(true);
    try {
      const selectedDoc = doctors.find(d => d._id === selectedDoctor);
      if (!selectedDoc) {
        toast.error("Selected doctor not found.");
        return;
      }

      const userStr = localStorage.getItem('user');
      if (!userStr) throw new Error("Not signed in");
      const user = JSON.parse(userStr);

      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          doctor_id: selectedDoctor,
          appointment_type: "urgent",
          symptoms,
          contact_phone: contactPhone,
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Failed to create appointment');

      navigate({ to: "/patient/payment-new/$id", params: { id: result.data._id } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-urgent text-urgent-foreground">
          <Activity className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-2xl tracking-tight">Urgent consultation</h1>
          <p className="text-sm text-muted-foreground">
            Tell us what's going on. We'll connect you with the next available doctor right after payment.
          </p>
        </div>
      </div>

      <form onSubmit={onNext} className="grid gap-6 lg:grid-cols-3">
        {/* Left side - Doctor selection */}
        <div className="lg:col-span-1 rounded-2xl border bg-card p-6 shadow-soft">
          <Label htmlFor="doctor" className="text-base">
            Select a doctor
          </Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose an available doctor for your urgent consultation.
          </p>
          {loadingDoctors ? (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading available doctors...
            </div>
          ) : doctors.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No doctors are available right now. Please try again shortly.
            </p>
          ) : (
            <div className="mt-3 space-y-2">
              {doctors.map((doctor) => (
                <div
                  key={doctor.id}
                  className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                    selectedDoctor === doctor.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => setSelectedDoctor(doctor.id)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{doctor.full_name}</div>
                    <div className="text-xs text-muted-foreground">{doctor.specialty}</div>
                  </div>
                  <div className="text-sm font-semibold">
                    Rs. {(doctor.urgent_fee_cents / 100).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right side - Symptoms and contact */}
        <div className="lg:col-span-2 rounded-2xl border bg-card p-6 shadow-soft">
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
        </div>
      </form>
    </div>
  );
}
