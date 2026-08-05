import { createFileRoute } from "@tanstack/react-router";
import { PaymentGateway } from "@/components/payment-gateway";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/patient/payment-new/$id")({
  component: PaymentNewPage,
});

function PaymentNewPage() {
  const { id } = Route.useParams();

  const { data: payment, isLoading } = useQuery({
    queryKey: ["payment", id],
    queryFn: async () => {
      const { data, error } = await supabase.getPayment(id);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: exchangeRate } = useQuery({
    queryKey: ["exchangeRate"],
    queryFn: async () => {
      const { data, error } = await supabase.getExchangeRate();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !payment) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  const amount = payment.amount ? payment.amount / 100 : 0;
  const currency = payment.currency || 'LKR';

  return (
    <PaymentGateway
      appointmentId={id}
      amount={amount}
      currency={currency}
    />
  );
}
