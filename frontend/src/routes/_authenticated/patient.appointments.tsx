import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Video, Activity, Loader2, FileText, Download, X, CalendarClock, AlertCircle } from "lucide-react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { apiUrl } from "@/lib/api-config";
import PrescriptionPadV2 from "@/components/PrescriptionPad";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/patient/appointments")({
  component: PatientAppointments,
});

function PatientAppointments() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [previewPrescription, setPreviewPrescription] = useState<any>(null);
  const [rescheduleAppointment, setRescheduleAppointment] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const prescriptionRef = useRef<HTMLDivElement>(null);

  const handlePreviewPrescription = async (appointment: any) => {
    if (!appointment.prescription || !appointment.prescription.medications) {
      return;
    }
    
    // Fetch patient profile to get dateOfBirth for age calculation
    let patientWithAge = appointment.patient;
    if (appointment.patient && !appointment.patient.age && appointment.patient._id) {
      try {
        const response = await fetch(apiUrl('/patients/profile'), {
          credentials: 'include',
        });
        if (response.ok) {
          const result = await response.json();
          if (result.data && result.data.dateOfBirth) {
            const birthDate = new Date(result.data.dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear() - 
              (today.getMonth() < birthDate.getMonth() || 
               (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
            patientWithAge = { ...appointment.patient, age };
          }
        }
      } catch (error) {
        console.error('Failed to fetch patient profile:', error);
      }
    }
    
    setPreviewPrescription({ ...appointment, patient: patientWithAge });
  };

  const handleRescheduleAppointment = (appointment: any) => {
    setRescheduleAppointment(appointment);
  };

  const handleDownloadPrescription = async () => {
    if (!previewPrescription || !prescriptionRef.current) return;
    
    try {
      const canvas = await html2canvas(prescriptionRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 190; // A4 width in mm minus margins
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
      pdf.save(`prescription-${previewPrescription.patient?.firstName}-${new Date(previewPrescription.scheduledAt).toLocaleDateString()}.pdf`);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      toast.error('Failed to download prescription');
    }
  };

  const { data: appointments, isLoading, error } = useQuery({
    queryKey: ["appointments"],
    queryFn: async () => {
      const response = await fetch(apiUrl('/appointments'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch appointments');
      const result = await response.json();
      return result.data.appointments;
    },
    refetchInterval: 5000,
  });

  const { data: rescheduleRequests } = useQuery({
    queryKey: ["patient-reschedule-requests"],
    queryFn: async () => {
      const response = await fetch(apiUrl('/reschedule/patient/requests'), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch reschedule requests');
      const result = await response.json();
      return result.data.requests || [];
    },
  });

  // Create a map of appointment IDs to request status
  const pendingRequestsMap = new Map(
    rescheduleRequests
      ?.filter((r: any) => r.status === 'pending')
      .map((r: any) => [r.appointment._id, 'pending']) || []
  );
  const approvedRequestsMap = new Map(
    rescheduleRequests
      ?.filter((r: any) => r.status === 'approved')
      .map((r: any) => [r.appointment._id, 'approved']) || []
  );

  // Sort appointments by date and time in descending order
  const sortedAppointments = appointments 
    ? [...appointments].sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    : [];

  // Group appointments by date
  const groupedAppointments = sortedAppointments.reduce((groups: Record<string, any[]>, appointment: any) => {
    const date = new Date(appointment.scheduledAt).toLocaleDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(appointment);
    return groups;
  }, {} as Record<string, any[]>);

  // Filter by selected date
  const filteredGroupedAppointments = selectedDate
    ? { [selectedDate]: groupedAppointments[selectedDate] || [] }
    : groupedAppointments;

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl tracking-tight">My consultations</h1>
        <div className="flex items-center gap-4">
          <Label htmlFor="search-date" className="whitespace-nowrap">Search by date</Label>
          <Input
            id="search-date"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="max-w-xs"
          />
          {selectedDate && (
            <Button variant="outline" size="sm" onClick={() => setSelectedDate("")}>
              Clear filter
            </Button>
          )}
        </div>
      </div>
      <PatientRescheduleModal
        appointment={rescheduleAppointment}
        onClose={() => setRescheduleAppointment(null)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["patient-appointments"] });
          qc.invalidateQueries({ queryKey: ["patient-reschedule-requests"] });
          toast.success("Reschedule request sent successfully");
          setRescheduleAppointment(null);
        }}
      />
      {!sortedAppointments || sortedAppointments.length === 0 ? (
        <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
          You haven't booked any consultations yet.
        </p>
      ) : (
        <>
          {Object.entries(filteredGroupedAppointments).map(([date, appointments]: [string, any[]]) => (
            <div key={date} className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground">{date}</h3>
              <ul className="grid gap-3">
                {appointments.map((a) => (
                <li key={a._id} className={`rounded-xl border bg-card p-4 shadow-soft ${a.isRescheduled ? 'border-amber-200 bg-amber-50' : ''}`}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {a.type === "urgent" && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-urgent/10 px-2 py-0.5 text-xs font-medium text-urgent">
                            <Activity className="h-3 w-3" /> Urgent
                          </span>
                        )}
                        <span className="text-sm font-medium">
                          {new Date(a.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {a.isRescheduled && (
                          <div className="flex items-center gap-1 text-amber-600" title="This appointment has been rescheduled">
                            <AlertCircle className="h-4 w-4" />
                            <span className="text-xs font-medium">Rescheduled</span>
                          </div>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Status: {a.status}
                      </div>
                      {a.isRescheduled && a.rescheduleHistory && a.rescheduleHistory.length > 0 && (
                        <div className="mt-1 text-xs text-amber-700">
                          Originally scheduled: {new Date(a.rescheduleHistory[0].originalScheduledAt).toLocaleString()}
                        </div>
                      )}
                      {a.symptoms && (
                        <p className="mt-2 line-clamp-2 max-w-xl text-sm text-muted-foreground">
                          <span className="font-medium text-foreground">Symptoms: </span>
                          {a.symptoms}
                        </p>
                      )}
                      {a.healthMetrics && (
                        <div className="mt-2 rounded-lg border bg-muted/30 p-3 text-xs">
                          <div className="mb-1.5 font-medium text-foreground">Health Metrics</div>
                          <div className="grid gap-1.5 sm:grid-cols-3">
                            {a.healthMetrics.cholesterol?.value && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Cholesterol:</span>
                                <span className="flex items-center gap-1.5">
                                  <span className="font-medium">{a.healthMetrics.cholesterol.value} mg/dL</span>
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                      a.healthMetrics.cholesterol.level === 'high'
                                        ? 'bg-destructive/10 text-destructive'
                                        : a.healthMetrics.cholesterol.level === 'normal'
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : 'bg-muted'
                                    }`}
                                  >
                                    {a.healthMetrics.cholesterol.level?.toUpperCase() || 'N/A'}
                                  </span>
                                </span>
                              </div>
                            )}
                            {a.healthMetrics.sugar?.value && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Blood Sugar:</span>
                                <span className="flex items-center gap-1.5">
                                  <span className="font-medium">{a.healthMetrics.sugar.value} mg/dL</span>
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                      a.healthMetrics.sugar.level === 'high'
                                        ? 'bg-destructive/10 text-destructive'
                                        : a.healthMetrics.sugar.level === 'normal'
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : 'bg-muted'
                                    }`}
                                  >
                                    {a.healthMetrics.sugar.level?.toUpperCase() || 'N/A'}
                                  </span>
                                </span>
                              </div>
                            )}
                            {a.healthMetrics.bloodPressure?.value && (
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">BP:</span>
                                <span className="flex items-center gap-1.5">
                                  <span className="font-medium">{a.healthMetrics.bloodPressure.value}</span>
                                  <span
                                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                                      a.healthMetrics.bloodPressure.level === 'high'
                                        ? 'bg-destructive/10 text-destructive'
                                        : a.healthMetrics.bloodPressure.level === 'normal'
                                        ? 'bg-emerald-500/10 text-emerald-600'
                                        : 'bg-muted'
                                    }`}
                                  >
                                    {a.healthMetrics.bloodPressure.level?.toUpperCase() || 'N/A'}
                                  </span>
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      {a.bloodGroup && (
                        <div className="mt-2 text-xs">
                          <span className="text-muted-foreground">Blood Group: </span>
                          <span className="font-medium">{a.bloodGroup}</span>
                        </div>
                      )}
                      {!a.doctorApproved && a.status !== "completed" && a.status !== "cancelled" && (
                        <div className="mt-3 rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                          <p className="font-medium">Note: The patient is granted access to the consultation only after the doctor admits them to the session. Please keep your mobile phone available and stay in contact on your scheduled appointment day.</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {a.jitsi?.meetingUrl && a.status !== "completed" && a.status !== "cancelled" && (
                        <Button 
                          size="sm" 
                          onClick={() => navigate({ to: "/meeting", search: { appointmentId: a._id } })}
                          disabled={!a.doctorApproved}
                        >
                          <Video className="mr-1.5 h-4 w-4" /> Join visit
                        </Button>
                      )}
                      {(a.status === "scheduled" || a.status === "confirmed") && a.type === "normal" && (
                        pendingRequestsMap.has(a._id) ? (
                          <Button size="sm" className="bg-slate-400 text-slate-950 cursor-default" disabled>
                            <CalendarClock className="mr-1.5 h-4 w-4" /> Requested
                          </Button>
                        ) : approvedRequestsMap.has(a._id) ? (
                          <Button size="sm" className="bg-green-500 text-green-950 cursor-default" disabled>
                            <CalendarClock className="mr-1.5 h-4 w-4" /> Request Approved
                          </Button>
                        ) : (
                          <Button size="sm" className="bg-amber-400 text-amber-950 hover:bg-amber-500" onClick={() => handleRescheduleAppointment(a)}>
                            <CalendarClock className="mr-1.5 h-4 w-4" /> Request Reschedule
                          </Button>
                        )
                      )}
                      {a.prescription && a.prescription.medications && a.prescription.medications.length > 0 && (
                        <Button size="sm" variant="outline" onClick={() => handlePreviewPrescription(a)}>
                          <FileText className="mr-1.5 h-4 w-4" /> Prescription
                        </Button>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
        </>
      )}

      {/* Prescription Preview Dialog */}
      <Dialog open={!!previewPrescription} onOpenChange={() => setPreviewPrescription(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto [&>button]:hidden">
          <DialogHeader>
            <DialogTitle>Prescription Preview</DialogTitle>
          </DialogHeader>
          {previewPrescription && (
            <div className="space-y-4">
              <div ref={prescriptionRef}>
                <PrescriptionPadV2
                  hospitalName="Premedi Lanka"
                  slogan="Your Health, Our Priority"
                  addressLine1={previewPrescription.doctor?.address || "123 Healthcare Street"}
                  addressLine2={previewPrescription.doctor?.city || "Medical District, City 12345"}
                  phone={previewPrescription.doctor?.phone || "0123456789"}
                  email={previewPrescription.doctor?.contactEmail || previewPrescription.doctor?.email || "premedilanka@email.com"}
                  website="www.premedilanka.com"
                  patientName={previewPrescription.patient ? `${previewPrescription.patient.firstName} ${previewPrescription.patient.lastName}` : ""}
                  patientAge={previewPrescription.patient?.age?.toString() || ""}
                  patientSex={previewPrescription.patient?.gender || ""}
                  date={new Date(previewPrescription.scheduledAt).toLocaleDateString()}
                  medications={previewPrescription.prescription.medications}
                  notes={previewPrescription.prescription.notes}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button onClick={handleDownloadPrescription}>
                  <Download className="mr-2 h-4 w-4" /> Download PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PatientRescheduleModal({
  appointment,
  onClose,
  onSuccess,
}: {
  appointment: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);

  // Fetch available slots when date is selected
  const { data: slotStatus } = useQuery({
    queryKey: ["slot-status", appointment?.doctor?._id || appointment?.doctor, selectedDate],
    enabled: !!appointment?.doctor && !!selectedDate,
    queryFn: async () => {
      const doctorId = appointment?.doctor?._id || appointment?.doctor;
      const response = await fetch(apiUrl(`/appointments/slot-status/${doctorId}?date=${selectedDate}`), {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch slot status');
      return response.json();
    },
  });

  useEffect(() => {
    if (slotStatus?.data) {
      const bookedTimes = slotStatus.data.booked || [];
      // Generate time slots from 9 AM to 11 PM
      const allSlots = [];
      for (let hour = 9; hour < 23; hour++) {
        allSlots.push(`${hour.toString().padStart(2, '0')}:00`);
        allSlots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
      setAvailableSlots(allSlots);
      setBookedSlots(bookedTimes);
    }
  }, [slotStatus]);

  // Get current appointment time in 24-hour format to match slots
  const currentAppointmentTime = appointment?.scheduledAt 
    ? new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
    : null;

  // Get current appointment date to check if selected date matches
  const currentAppointmentDate = appointment?.scheduledAt
    ? new Date(appointment.scheduledAt).toISOString().split('T')[0]
    : null;

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select date and time");
      return;
    }

    const newScheduledAt = new Date(`${selectedDate}T${selectedTime}:00`);
    setLoading(true);

    try {
      const response = await fetch(apiUrl('/reschedule/request'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          appointmentId: appointment._id,
          newScheduledAt: newScheduledAt.toISOString(),
          reason,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to send reschedule request');
      }

      onSuccess();
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={!!appointment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Reschedule Appointment</DialogTitle>
          <DialogDescription>
            Select a new date and time for your appointment with Dr. {appointment?.doctor?.lastName || 'Doctor'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="date">New Date</Label>
            <Input
              id="date"
              type="date"
              min={new Date().toISOString().split('T')[0]}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {selectedDate && (
            <div>
              <Label htmlFor="time">Time Slots</Label>
              {currentAppointmentTime && selectedDate === currentAppointmentDate && (
                <div className="mt-1 text-xs text-muted-foreground">
                  Current appointment time: <span className="font-semibold text-foreground">{currentAppointmentTime}</span>
                </div>
              )}
              <div className="mt-2 grid grid-cols-3 gap-2 max-h-60 overflow-y-auto">
                {availableSlots.length === 0 ? (
                  <p className="col-span-3 text-sm text-muted-foreground">No slots available</p>
                ) : (
                  availableSlots.map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    const isCurrentAppointment = selectedDate === currentAppointmentDate && slot === currentAppointmentTime;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => !isBooked && setSelectedTime(slot)}
                        disabled={isBooked}
                        className={`rounded-lg border p-2 text-sm transition-colors ${
                          isCurrentAppointment
                            ? 'border-yellow-500 bg-yellow-100 text-yellow-800'
                            : isBooked
                            ? 'border-red-500 bg-red-100 text-red-800 cursor-not-allowed'
                            : selectedTime === slot
                            ? 'border-green-500 bg-green-100 text-green-800'
                            : 'border-border hover:bg-muted'
                        }`}
                        title={isBooked ? 'Already booked' : isCurrentAppointment ? 'Current appointment time' : 'Available'}
                      >
                        {slot}
                      </button>
                    );
                  })
                )}
              </div>
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span> Selected</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-yellow-500"></span> Current</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Booked</span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="reason">Reason (Optional)</Label>
            <Input
              id="reason"
              placeholder="Why are you rescheduling?"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleReschedule} disabled={loading || !selectedDate || !selectedTime}>
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Confirm Reschedule
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
