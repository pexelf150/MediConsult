import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { finalizeAppointmentPayment } from "@/lib/appointments.functions";
import { Calendar, Clock, User, Activity, Stethoscope, CreditCard, CheckCircle2 } from "lucide-react";

interface PaymentGatewayProps {
  appointmentId: string;
  amount: number;
  currency?: string;
  onSuccess?: () => void;
  appointment?: any;
}

export function PaymentGateway({ appointmentId, amount, currency, appointment }: PaymentGatewayProps) {
  const navigate = useNavigate();
  const finalize = useServerFn(finalizeAppointmentPayment);
  const [cardNumber, setCardNumber] = useState("5399 0000 0000 0000");
  const [expDate, setExpDate] = useState("");
  const [cvv, setCvv] = useState("");
  const [saveCard, setSaveCard] = useState(false);
  const [processing, setProcessing] = useState(false);

  const handlePayment = async () => {
    setProcessing(true);
    try {
      // Simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Call backend to mark payment as completed using existing Supabase flow
      const result = await finalize({ data: { paymentId: appointmentId } });
      toast.success("Payment successful — the doctor has been notified.");
      navigate({ to: "/patient/appointments" });
      return result;
    } catch (err) {
      toast.error((err as Error).message || "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="flex justify-center py-10 px-4 bg-gray-50 min-h-screen">
      <div className="w-full max-w-5xl grid gap-6 lg:grid-cols-2">
        {/* Left side - Appointment details (Shopping cart style) */}
        <div className="bg-white rounded-xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <CreditCard className="h-5 w-5" />
            </div>
            <h2 className="text-lg text-gray-900">Order Summary</h2>
          </div>
          
          {appointment ? (
            <div className="space-y-4">
              {/* Service item */}
              <div className="border-b border-gray-100 pb-4">
                <div className="flex gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/5 text-primary">
                    <Stethoscope className="h-8 w-8" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">
                      {appointment.appointment_type === 'urgent' ? 'Urgent Consultation' : 'Medical Consultation'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {appointment.doctors?.full_name || 'Doctor'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {appointment.doctors?.specialty || 'General Practitioner'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      {currency} {amount.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                  <Calendar className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Date & Time</p>
                  <p className="text-sm text-gray-600">
                    {appointment.scheduled_at 
                      ? new Date(appointment.scheduled_at).toLocaleString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })
                      : 'ASAP - Urgent Consultation'}
                  </p>
                </div>
              </div>

              {/* Symptoms */}
              {appointment.symptoms && (
                <div className="flex items-start gap-3 py-3 border-b border-gray-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600 mt-0.5">
                    <Activity className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Symptoms</p>
                    <p className="text-sm text-gray-600 line-clamp-2">{appointment.symptoms}</p>
                  </div>
                </div>
              )}

              {/* Contact Phone */}
              {appointment.contact_phone && (
                <div className="flex items-center gap-3 py-3 border-b border-gray-100">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-600">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">Contact Phone</p>
                    <p className="text-sm text-gray-600">{appointment.contact_phone}</p>
                  </div>
                </div>
              )}

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

          <button
            onClick={handlePayment}
            disabled={processing}
            className="w-full bg-[#3ec97a] text-white border-none rounded-lg py-3 text-sm font-semibold cursor-pointer hover:bg-[#35b56c] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? "Processing..." : `Pay ${currency} ${amount.toFixed(2)}`}
          </button>

          <p className="text-[10.5px] text-gray-400 leading-relaxed mt-3.5">
            Your personal data will be used to process your order, support your experience throughout this website, and for other purposes described in our privacy policy.
          </p>
        </div>
      </div>
    </div>
  );
}
