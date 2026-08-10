import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PaymentGateway } from "@/components/payment-gateway";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/patient/payment-new/$id")({
  component: PaymentNewPage,
});

function PaymentNewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!id || id === 'undefined') {
      navigate({ to: "/patient/book" });
    }
  }, [id, navigate]);

  const { data: payment, isLoading, error } = useQuery({
    queryKey: ["payment", id],
    queryFn: async () => {
      if (!id || id === 'undefined') {
        throw new Error('Invalid payment ID');
      }
      const response = await fetch(`/api/payments/${id}`, {
        credentials: 'include',
      });
      const result = await response.json();
      console.log('Payment data from API:', result);
      if (!response.ok) throw new Error(result.message || 'Failed to fetch payment');
      return result.data.payment;
    },
    enabled: !!id && id !== 'undefined',
  });

  // Fetch doctor details
  const { data: doctor } = useQuery({
    queryKey: ["doctor", payment?.metadata?.doctorId],
    queryFn: async () => {
      if (!payment?.metadata?.doctorId) return null;
      const response = await fetch(`/api/doctors/${payment.metadata.doctorId}`, {
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) return null;
      return result.data.doctor;
    },
    enabled: !!payment?.metadata?.doctorId,
  });

  if (!id || id === 'undefined') {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Redirecting to booking page...</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error || !payment) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <p className="text-red-500">Failed to load payment details</p>
        <button
          onClick={() => navigate({ to: "/patient/book" })}
          className="px-4 py-2 bg-primary text-white rounded-lg"
        >
          Back to Booking
        </button>
      </div>
    );
  }

  const amount = payment.amount ? payment.amount / 100 : 0;
  const currency = 'LKR';

  return (
    <PaymentGateway
      paymentId={id}
      amount={amount}
      currency={currency}
      payment={payment}
      doctor={doctor}
      patient={user}
    />
  );
}
