import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { finalizeAppointmentPayment } from "@/lib/appointments.functions";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patient/payment/$id")({
  component: PaymentPage,
});

function PaymentPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const finalize = useServerFn(finalizeAppointmentPayment);
  const [paying, setPaying] = useState(false);

  const { data: payment, isLoading } = useQuery({
    queryKey: ["payment", id],
    queryFn: async () => {
      const { data, error } = await supabase.getPayment(id);
      if (error) throw error;
      return data;
    },
  });

  const { data: exchangeRate } = useQuery({
    queryKey: ["exchangeRate"],
    queryFn: async () => {
      const { data, error } = await supabase.getExchangeRate();
      if (error) throw error;
      return data;
    },
  });

  const onPay = async () => {
    setPaying(true);
    try {
      const result = await finalize({ data: { paymentId: id } });
      toast.success("Payment successful — the doctor has been notified.");
      navigate({ to: "/patient/appointments" });
      return result;
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setPaying(false);
    }
  };

  if (isLoading || !payment) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const amountLKR = payment.amount / 100;
  const amountUSD = exchangeRate ? (amountLKR * exchangeRate.lkrToUsd).toFixed(2) : null;
  const appointmentType = payment.metadata?.appointmentType || 'normal';
  const paymentStatus = payment.status;

  return (
    <div className="mx-auto max-w-xl">
      <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <Lock className="h-4 w-4" /> Secure payment gateway · demo mode
      </div>
      <div className="rounded-2xl border bg-card p-6 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <CreditCard className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold">Complete your payment</h1>
        </div>

        <dl className="mt-6 divide-y rounded-lg border bg-background">
          <Row label="Consultation type">
            {appointmentType === "urgent" ? (
              <span className="rounded-full bg-urgent/10 px-2 py-0.5 text-xs font-medium text-urgent">
                Urgent
              </span>
            ) : (
              "Normal"
            )}
          </Row>
          <Row label="Amount due">
            <div className="flex flex-col items-end">
              <span className="text-lg font-semibold">Rs. {amountLKR.toFixed(2)}</span>
              {amountUSD && (
                <span className="text-sm text-muted-foreground">≈ ${amountUSD} USD</span>
              )}
            </div>
          </Row>
          <Row label="Status">{paymentStatus}</Row>
        </dl>

        <div className="mt-6 rounded-lg border border-dashed bg-muted/40 p-4 text-sm text-muted-foreground">
          <div className="flex items-start gap-2">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p>
              This is a simulated checkout for demonstration. Click <strong>Pay</strong> to
              mark the appointment paid, generate the meeting link, and notify your doctor.
              Swap in Stripe / Paddle later without changing the rest of the flow.
            </p>
          </div>
        </div>

        <Button
          onClick={onPay}
          disabled={paying || paymentStatus === "completed"}
          size="lg"
          className="mt-6 w-full"
        >
          {paying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : paymentStatus === "completed" ? (
            "Already paid"
          ) : (
            `Pay Rs. ${amountLKR.toFixed(2)}`
          )}
        </Button>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium">{children}</dd>
    </div>
  );
}
