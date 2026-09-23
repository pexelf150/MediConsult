import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { finalizeAppointmentPayment } from "@/lib/appointments.functions";
import { apiUrl } from "@/lib/api-config";
import { Calendar, Clock, User, Activity, Stethoscope, CreditCard, CheckCircle2, Loader2 } from "lucide-react";

interface PaymentGatewayProps {
  paymentId: string;
  amount: number;
  currency?: string;
  onSuccess?: () => void;
  payment?: any;
  reservation?: any;
  doctor?: any;
  patient?: any;
  exchangeRate?: any;
}

export function PaymentGateway({ paymentId, amount, currency, payment, reservation, doctor, patient, exchangeRate }: PaymentGatewayProps) {
  const navigate = useNavigate();
  const finalize = useServerFn(finalizeAppointmentPayment);
  const [cardNumber, setCardNumber] = useState("5399 0000 0000 0000");
  const [expDate, setExpDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [useMPGS, setUseMPGS] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      if (useMPGS) {
        // Use MPGS payment gateway
        const response = await fetch(apiUrl('/payments/mpgs/create'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            amount: amount * 100, // Convert to cents
            currency: currency || 'LKR',
            metadata: payment?.metadata || {},
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.message || 'Failed to create MPGS payment session');
        }

        const result = await response.json();
        const { sessionId, orderId, merchantId, bankUrl, apiVersion } = result.data;

        // Load MPGS Checkout.js and configure
        if (!window.Checkout) {
          const script = document.createElement('script');
          script.src = `${bankUrl}/checkout/${apiVersion}/checkout.js`;
          script.async = true;
          script.onload = () => configureMPGS(sessionId, orderId, merchantId);
          script.onerror = () => {
            toast.error('Failed to load MPGS Checkout.js. Please check with Seylan Bank for the correct Checkout.js URL.');
            setProcessing(false);
          };
          document.body.appendChild(script);
        } else {
          configureMPGS(sessionId, orderId, merchantId);
        }
      } else {
        // Simulate payment processing
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Call backend to mark payment as completed
        const result = await finalize({ data: { paymentId } });
        toast.success("Payment successful — the doctor has been notified.");
        navigate({ to: "/patient/appointments" });
        return result;
      }
    } catch (err) {
      toast.error((err as Error).message || "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const configureMPGS = (sessionId: string, orderId: string, merchantId: string) => {
    if (!window.Checkout) {
      toast.error('MPGS Checkout.js failed to load');
      setProcessing(false);
      return;
    }

    // @ts-ignore - Checkout is loaded from external script
    Checkout.configure({
      merchant: merchantId,
      session: {
        id: sessionId,
      },
      interaction: {
        merchant: {
          name: 'Premedi Lanka',
          email: 'info@premedilanka.com',
          phone: '+94 123 456 789',
          logo: '/logo.jpeg',
          url: window.location.origin,
          address: {
            line1: 'Sri Lanka',
            line2: '',
          },
        },
        displayControl: {
          billingAddress: 'HIDE',
          customerEmail: 'HIDE',
          orderSummary: 'SHOW',
          paymentConfirmation: 'HIDE',
          shipping: 'HIDE',
        },
      },
    });

    // @ts-ignore
    Checkout.showPaymentPage();
  };

  return (
    <div className="flex justify-center py-10 px-4 bg-gray-50 min-h-screen">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-2">
        {/* Left side - Appointment details (Shopping cart style) */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <img src="/logo.jpeg" alt="Logo" className="h-14 w-14 object-contain" />
            <h2 className="text-lg text-gray-900">Order Summary</h2>
          </div>

          {payment ? (
            <div className="space-y-4">
              {/* Consultation Type */}
              <div className="border-b border-gray-100 pb-4">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/5 text-primary">
                    <Stethoscope className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {payment.metadata?.appointmentType === 'urgent' ? 'Urgent Consultation' : 'Medical Consultation'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Doctor Consultation
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {currency} {amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Reserved Time Slot */}
              <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Reserved Time Slot</p>
                  <p className="text-sm text-gray-600">
                    {payment?.metadata?.scheduledAt
                      ? new Date(payment.metadata.scheduledAt).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: true
                        })
                      : payment?.metadata?.appointmentType === 'urgent' ? 'ASAP' : 'Pending'}
                  </p>
                </div>
              </div>

              {/* Doctor's Details */}
              <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Doctor</p>
                  <p className="text-sm text-gray-600">
                    {doctor?.fullName || doctor?.firstName + ' ' + doctor?.lastName || 'Doctor Assigned'}
                  </p>
                </div>
              </div>

              {/* Patient's Name */}
              <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  <User className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Patient</p>
                  <p className="text-sm text-gray-600">
                    {patient?.fullName || patient?.firstName + ' ' + patient?.lastName || 'Patient'}
                  </p>
                </div>
              </div>

              {/* Order Summary */}
              <div className="mt-6 space-y-3 pt-4 border-t border-gray-200">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="text-gray-900">{currency} {amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Service Fee</span>
                  <span className="text-gray-900">{currency} 0.00</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Tax</span>
                  <span className="text-gray-900">{currency} 0.00</span>
                </div>
                {exchangeRate && currency !== 'LKR' && (
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Exchange Rate (1 LKR)</span>
                    <span>${exchangeRate.lkrToUsd?.toFixed(6)} USD</span>
                  </div>
                )}
                <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                  <span className="text-base font-semibold text-gray-900">Total</span>
                  <span className="text-2xl font-bold text-gray-900">
                    {currency} {amount.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Secure checkout badge */}
              <div className="mt-4 flex items-center gap-2 text-xs text-gray-500">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span>Secure checkout powered by MediConsult</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}
        </div>

        {/* Right side - Payment form */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h1 className="text-base font-bold text-gray-900 mb-4">Payment</h1>

          {/* Payment Method Selector */}
          <div className="mb-5">
            <label className="block text-xs text-gray-500 mb-2">Payment Method</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUseMPGS(false)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  !useMPGS
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Test Mode
              </button>
              <button
                type="button"
                onClick={() => setUseMPGS(true)}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                  useMPGS
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Card Payment
              </button>
            </div>
          </div>

          {!useMPGS && (
            <>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-7 h-5 relative">
                  <span className="absolute top-0.5 w-4.5 h-4.5 rounded-full bg-[#eb001b]"></span>
                  <span className="absolute top-0.5 left-2.5 w-4.5 h-4.5 rounded-full bg-[#f79e1b] opacity-85"></span>
                </div>
                <span className="italic font-extrabold text-sm text-[#1a1f71] tracking-wider">VISA</span>
              </div>

              <label className="block text-xs text-gray-500 mb-1.5" htmlFor="cardNumber">Card Number</label>
              <div className="relative mb-4.5">
                <input
                  type="text"
                  id="cardNumber"
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3 pr-11 py-3 border border-[#e2e4e9] rounded-lg text-sm text-gray-900 outline-none focus:border-[#2fbf71]"
                />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 w-6 h-4">
                  <span className="absolute top-0 w-3.5 h-3.5 rounded-full bg-[#eb001b]"></span>
                  <span className="absolute top-0 left-2 w-3.5 h-3.5 rounded-full bg-[#f79e1b] opacity-85"></span>
                </span>
              </div>

              <div className="flex gap-3.5 mb-4">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1.5" htmlFor="expDate">Expiration Date</label>
                  <input
                    type="text"
                    id="expDate"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    placeholder="MM/YY"
                    className="w-full px-3 py-3 border border-[#e2e4e9] rounded-lg text-sm text-gray-900 outline-none focus:border-[#2fbf71] placeholder-gray-300"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1.5" htmlFor="cvv">CVV</label>
                  <input
                    type="text"
                    id="cvv"
                    value={cvv}
                    onChange={(e) => setCvv(e.target.value)}
                    placeholder="***"
                    className="w-full px-3 py-3 border border-[#e2e4e9] rounded-lg text-sm text-gray-900 outline-none focus:border-[#2fbf71] placeholder-gray-300"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-gray-600 mb-4.5">
                <input
                  type="checkbox"
                  checked={saveCard}
                  onChange={(e) => setSaveCard(e.target.checked)}
                  className="w-4 h-4 accent-[#2fbf71]"
                />
                Save card details
              </label>
            </>
          )}

          {useMPGS && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">Secure Card Payment</p>
                  <p className="text-xs text-blue-700 mt-1">
                    You will be redirected to the Seylan Bank payment gateway to complete your payment securely.
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Currency: <span className="font-semibold">{currency}</span>
                  </p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full bg-[#3ec97a] text-white border-none rounded-lg py-3 text-sm font-semibold cursor-pointer hover:bg-[#35b56c] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing...
              </span>
            ) : (
              `Pay ${currency} ${amount.toFixed(2)}`
            )}
          </button>

          <p className="text-[10.5px] text-gray-400 leading-relaxed mt-3.5">
            Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
