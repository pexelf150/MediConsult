import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PaymentGateway } from "@/components/payment-gateway";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/patient/payment-new/$id")({
  component: PaymentNewPage,
});

function PaymentNewPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedCurrency, setSelectedCurrency] = useState('LKR');

  const currencies = [
    { code: 'LKR', name: 'Sri Lankan Rupee', symbol: 'Rs' },
    { code: 'USD', name: 'US Dollar', symbol: '$' },
    { code: 'EUR', name: 'Euro', symbol: '€' },
    { code: 'GBP', name: 'British Pound', symbol: '£' },
  ];

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

  // Fetch exchange rate
  const { data: exchangeRate } = useQuery({
    queryKey: ["exchangeRate"],
    queryFn: async () => {
      const response = await fetch('/api/currency/rate', {
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) return null;
      return result.data;
    },
    staleTime: 10 * 60 * 1000, // Cache for 10 minutes
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

  // Calculate converted amount
  const getConvertedAmount = (amountLKR: number, currency: string) => {
    if (currency === 'LKR') return amountLKR;
    if (currency === 'USD' && exchangeRate?.lkrToUsd) {
      return amountLKR * exchangeRate.lkrToUsd;
    }
    // For EUR and GBP, approximate using USD as base (you can add more precise rates later)
    if (currency === 'EUR' && exchangeRate?.lkrToUsd) {
      return (amountLKR * exchangeRate.lkrToUsd) * 0.92; // Approximate USD to EUR
    }
    if (currency === 'GBP' && exchangeRate?.lkrToUsd) {
      return (amountLKR * exchangeRate.lkrToUsd) * 0.79; // Approximate USD to GBP
    }
    return amountLKR;
  };

  const convertedAmount = getConvertedAmount(amount, selectedCurrency);
  const currencySymbol = currencies.find(c => c.code === selectedCurrency)?.symbol || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Currency Selector */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Select Currency:</span>
            <div className="flex gap-2">
              {currencies.map((curr) => (
                <Button
                  key={curr.code}
                  variant={selectedCurrency === curr.code ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCurrency(curr.code)}
                  className={selectedCurrency === curr.code ? "bg-primary" : ""}
                >
                  {curr.code}
                </Button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <PaymentGateway
        paymentId={id}
        amount={convertedAmount}
        currency={selectedCurrency}
        payment={payment}
        doctor={doctor}
        patient={user}
        exchangeRate={exchangeRate}
      />
    </div>
  );
}
