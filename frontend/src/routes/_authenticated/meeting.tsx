import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Plus, Trash2, Download, FileText, CheckCircle2, Eye, X, User, Mail, Calendar, Clock, AlertCircle, Activity } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import jsPDF from "jspdf";
import { useQueryClient } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api-config";
import PrescriptionPadV2 from "@/components/PrescriptionPad";

const searchSchema = z.object({
  appointmentId: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/meeting")({
  validateSearch: searchSchema,
  component: MeetingPage,
});

function MeetingPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const search = useSearch({ from: "/_authenticated/meeting" });
  const { appointmentId } = search as { appointmentId: string };

  const [medications, setMedications] = useState<Array<{ name: string; dosage: string; frequency: string; duration: string; instructions: string }>>([
    { name: "", dosage: "", frequency: "", duration: "", instructions: "" }
  ]);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [previewPrescription, setPreviewPrescription] = useState(false);

  // Get current user role
  const { data: userData } = useQuery({
    queryKey: ["currentUser"],
    queryFn: async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      try {
        const user = JSON.parse(userStr);
        // Ensure _id is set from id if missing
        if (user.id && !user._id) {
          user._id = user.id;
        }
        return user;
      } catch (e) {
        console.error('Failed to parse user data', e);
        return null;
      }
    },
  });

  const isDoctor = userData?.role === "doctor";

  const { data: doctorProfile } = useQuery({
    queryKey: ["doctor-profile"],
    queryFn: async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) return null;
      try {
        const user = JSON.parse(userStr);
        const response = await fetch(`/api/doctors/${user._id}/profile`, {
          credentials: 'include',
        });
        const result = await response.json();
        if (response.ok && result.data) {
          return result.data;
        }
        return null;
      } catch (e) {
        console.error('Failed to fetch doctor profile', e);
        return null;
      }
    },
    enabled: userData?.role === "doctor",
  });

  const { data: appointment, isLoading } = useQuery({
    queryKey: ["appointment", appointmentId],
    queryFn: async () => {
      if (!appointmentId) return null;
      const response = await fetch(apiUrl(`/appointments/${appointmentId}`), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch appointment');
      }
      const result = await response.json();
      return result.data.appointment;
    },
    enabled: !!appointmentId,
  });

  const addMedication = () => {
    setMedications([...medications, { name: "", dosage: "", frequency: "", duration: "", instructions: "" }]);
  };

  const removeMedication = (index: number) => {
    setMedications(medications.filter((_, i) => i !== index));
  };

  const updateMedication = (index: number, field: string, value: string) => {
    const updated = [...medications];
    updated[index] = { ...updated[index], [field]: value };
    setMedications(updated);
  };

  const handleAdmitPatient = async () => {
    if (!appointment) return;

    try {
      const response = await fetch(apiUrl(`/appointments/${appointmentId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          doctorApproved: true,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to admit patient');
      }

      toast.success("Patient admitted successfully");
      qc.invalidateQueries({ queryKey: ["appointment", appointmentId] });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to admit patient");
    }
  };

  const handleCompleteSession = async () => {
    if (!appointment) return;

    try {
      const response = await fetch(apiUrl(`/appointments/${appointmentId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'completed',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to complete session');
      }

      toast.success("Session completed successfully");
      navigate({ to: "/doctor" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to complete session");
    }
  };

  const handleSavePrescription = async () => {
    if (!appointment) return;

    const validMedications = medications.filter(m => m.name && m.dosage);
    if (validMedications.length === 0) {
      toast.error("Please add at least one medication");
      return;
    }

    setIsSaving(true);
    try {
      console.log("Saving prescription:", { validMedications, notes, appointmentId });

      const response = await fetch(apiUrl(`/appointments/${appointmentId}/status`), {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          prescription: {
            medications: validMedications,
            notes,
            issuedAt: new Date().toISOString(),
          },
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Backend error:", error);
        throw new Error(error.message || 'Failed to save prescription');
      }

      console.log("Prescription saved successfully");
      toast.success("Prescription saved successfully");
    } catch (error) {
      console.error("Failed to save prescription:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save prescription");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDownloadPDF = () => {
    const validMedications = medications.filter(m => m.name && m.dosage);
    if (validMedications.length === 0) {
      toast.error("Please add at least one medication");
      return;
    }

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    let yPosition = 20;

    // Header
    pdf.setFontSize(20);
    pdf.setFont("helvetica", "bold");
    pdf.text("Premedi Lanka Prescription", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 15;

    // Doctor and Patient Info
    pdf.setFontSize(12);
    pdf.setFont("helvetica", "normal");
    const patientName = appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : "Unknown";
    pdf.text(`Patient: ${patientName}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, yPosition);
    yPosition += 8;
    pdf.text(`Appointment: ${new Date(appointment.scheduledAt).toLocaleDateString()}`, 20, yPosition);
    yPosition += 15;

    // Medications
    pdf.setFontSize(14);
    pdf.setFont("helvetica", "bold");
    pdf.text("Medications", 20, yPosition);
    yPosition += 10;

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");

    validMedications.forEach((med, index) => {
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFont("helvetica", "bold");
      pdf.text(`${index + 1}. ${med.name}`, 20, yPosition);
      yPosition += 6;

      pdf.setFont("helvetica", "normal");
      pdf.text(`   Dosage: ${med.dosage}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`   Frequency: ${med.frequency}`, 25, yPosition);
      yPosition += 5;
      pdf.text(`   Duration: ${med.duration}`, 25, yPosition);
      yPosition += 5;
      if (med.instructions) {
        pdf.text(`   Instructions: ${med.instructions}`, 25, yPosition);
        yPosition += 5;
      }
      yPosition += 8;
    });

    // Notes
    if (notes) {
      if (yPosition > pageHeight - 50) {
        pdf.addPage();
        yPosition = 20;
      }

      pdf.setFontSize(14);
      pdf.setFont("helvetica", "bold");
      pdf.text("Additional Notes", 20, yPosition);
      yPosition += 10;

      pdf.setFontSize(10);
      pdf.setFont("helvetica", "normal");
      const splitNotes = pdf.splitTextToSize(notes, pageWidth - 40);
      pdf.text(splitNotes, 20, yPosition);
    }

    // Footer
    pdf.setFontSize(8);
    pdf.setFont("helvetica", "italic");
    pdf.text("This prescription is generated by Premedi Lanka. Please consult your doctor for any questions.", 
      pageWidth / 2, pageHeight - 10, { align: "center" });

    pdf.save(`prescription-${appointmentId}.pdf`);
    toast.success("Prescription PDF downloaded");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <p className="text-muted-foreground">Appointment not found</p>
        <Button onClick={() => navigate({ to: "/doctor" })} className="mt-4">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate({ to: "/patient/appointments" })}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-3">
              <img src="/logo.jpeg" alt="Logo" className="h-16 w-24 object-contain" />
              <Badge variant={appointment.type === "urgent" ? "destructive" : appointment.type === "normal" ? "default" : "default"} className={`text-xs ${appointment.type === "normal" ? "bg-yellow-500 text-white hover:bg-yellow-600" : ""}`}>
                {appointment.type === "urgent" ? "Urgent" : "Normal"}
              </Badge>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isDoctor && !appointment.doctorApproved && appointment.status !== "completed" && appointment.status !== "cancelled" && (
              <Button size="sm" onClick={handleAdmitPatient} className="bg-amber-600 hover:bg-amber-700 text-white gap-1.5">
                <CheckCircle2 className="h-4 w-4" /> Admit Patient
              </Button>
            )}
            {isDoctor && appointment.status !== "completed" && appointment.status !== "cancelled" && (
              <Button size="sm" variant="outline" onClick={handleCompleteSession}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Complete Session
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Video Meeting */}
        <div className="flex-1 bg-black">
          {appointment.jitsi?.meetingUrl ? (
            <iframe
              src={appointment.jitsi.meetingUrl}
              className="h-full w-full"
              allow="camera; microphone; fullscreen; display-capture"
              title="Video Consultation"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-white">
              <p className="text-lg">No meeting link available</p>
            </div>
          )}
        </div>

        {/* Right: Appointment Details & Prescription */}
        <div className="w-96 overflow-y-auto border-l bg-card">
          <div className="p-4 space-y-4">
            {/* Appointment Details */}
            <div className="rounded-[14px] p-[18px_16px_16px] relative text-white shadow-lg" style={{ background: 'linear-gradient(180deg, #4fa8bd 0%, #4098b0 100%)' }}>
              <h1 className="text-[16px]  text-center">Appointment Details</h1>

              <div className="flex items-center gap-[10px] py-[12px_0] border-b border-white/18 text-[13px]">
                <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  <User className="w-full h-full stroke-white/85" strokeWidth={1.8} fill="none" />
                </div>
                <div className="flex-1">{appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : "Unknown"}</div>
              </div>

              <div className="flex items-center gap-[10px] py-[12px_0] border-b border-white/18 text-[13px]">
                <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  <Mail className="w-full h-full stroke-white/85" strokeWidth={1.8} fill="none" />
                </div>
                <div className="flex-1 text-white/75 text-[12px]">{appointment.patient?.email || "No email"}</div>
              </div>

              <div className="flex items-center gap-[10px] py-[12px_0] border-b border-white/18 text-[13px]">
                <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                  <Calendar className="w-full h-full stroke-white/85" strokeWidth={1.8} fill="none" />
                </div>
                <div className="flex-1">{appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleDateString() : "Not scheduled"}</div>
              </div>

              <div className="flex items-center gap-[6px] py-[12px_0]">
                <div className="w-[14px] h-[14px] flex items-center justify-center">
                  <Clock className="w-full h-full stroke-white/85" strokeWidth={1.8} fill="none" />
                </div>
                <div className="flex-1 bg-white text-[#2d2d2d] rounded-[6px] px-[10px] py-[7px] flex items-center gap-[8px] text-[13px] font-semibold">
                  <Clock className="w-3.5 h-3.5 stroke-[#2d2d2d]" strokeWidth={1.8} fill="none" />
                  {appointment.scheduledAt ? new Date(appointment.scheduledAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : "Not scheduled"}
                </div>
              </div>

              <div className="py-[12px_2px] text-[13px] text-white/90 border-b border-white/18">
                {appointment.type === "urgent" ? "Urgent Consultation" : "Normal Consultation"}
              </div>

              {appointment.symptoms && (
                <div className="flex items-center gap-[10px] py-[12px_0] border-b border-white/18 text-[13px]">
                  <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                    <AlertCircle className="w-full h-full stroke-white/85" strokeWidth={1.8} fill="none" />
                  </div>
                  <div className="flex-1 text-white/85">{appointment.symptoms}</div>
                </div>
              )}

              {appointment.healthMetrics && (
                <div className="py-[12px_0] border-b border-white/18 text-[13px]">
                  <div className="flex items-center gap-[10px] py-[8px_0]">
                    <div className="w-4 h-4 flex-shrink-0 flex items-center justify-center">
                      <Activity className="w-full h-full stroke-white/85" strokeWidth={1.8} fill="none" />
                    </div>
                    <div className="flex-1 text-white/85">Health Metrics</div>
                  </div>
                  <div className="pl-[26px] space-y-1 text-[12px] text-white/75">
                    {appointment.healthMetrics.cholesterol?.value && (
                      <div className="flex justify-between">
                        <span>Cholesterol:</span>
                        <span className="font-medium">{appointment.healthMetrics.cholesterol.value} mg/dL</span>
                      </div>
                    )}
                    {appointment.healthMetrics.sugar?.value && (
                      <div className="flex justify-between">
                        <span>Blood Sugar:</span>
                        <span className="font-medium">{appointment.healthMetrics.sugar.value} mg/dL</span>
                      </div>
                    )}
                    {appointment.healthMetrics.bloodPressure?.value && (
                      <div className="flex justify-between">
                        <span>Blood Pressure:</span>
                        <span className="font-medium">{appointment.healthMetrics.bloodPressure.value}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-[10px] pt-[12px] text-[13px]">
                <span>Status:</span>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500"></span>
                  <span className="font-semibold">In call</span>
                </div>
              </div>
            </div>

            {/* Prescription Form - Only for Doctors */}
            {isDoctor && (
              <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Prescription
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {medications.map((med, index) => (
                  <div key={index} className="space-y-2 border-b pb-3 last:border-0">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm">Medication {index + 1}</Label>
                      {medications.length > 1 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMedication(index)}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                    <Input
                      placeholder="Medication name"
                      value={med.name}
                      onChange={(e) => updateMedication(index, "name", e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Dosage (e.g., 500mg)"
                      value={med.dosage}
                      onChange={(e) => updateMedication(index, "dosage", e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Frequency (e.g., Twice daily)"
                      value={med.frequency}
                      onChange={(e) => updateMedication(index, "frequency", e.target.value)}
                      className="text-sm"
                    />
                    <Input
                      placeholder="Duration (e.g., 7 days)"
                      value={med.duration}
                      onChange={(e) => updateMedication(index, "duration", e.target.value)}
                      className="text-sm"
                    />
                    <Textarea
                      placeholder="Instructions (e.g., Take after meals)"
                      value={med.instructions}
                      onChange={(e) => updateMedication(index, "instructions", e.target.value)}
                      className="text-sm resize-none"
                      rows={2}
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMedication}
                  className="w-full"
                >
                  <Plus className="mr-2 h-4 w-4" /> Add Medication
                </Button>
                <div>
                  <Label className="text-sm">Additional Notes</Label>
                  <Textarea
                    placeholder="Any additional notes for the patient..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="text-sm resize-none"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSavePrescription}
                    disabled={isSaving}
                    className="flex-1"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" /> Save
                      </>
                    )}
                  </Button>
                  <Button
                    onClick={() => setPreviewPrescription(true)}
                    variant="outline"
                    className="flex-1"
                  >
                    <Eye className="mr-2 h-4 w-4" /> Preview Prescription
                  </Button>
                </div>
              </CardContent>
            </Card>
            )}
          </div>
        </div>
      </div>

      {/* Prescription Preview Dialog */}
      <Dialog open={previewPrescription} onOpenChange={setPreviewPrescription}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Prescription Preview</span>
              <Button variant="ghost" size="sm" onClick={() => setPreviewPrescription(false)}>
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          <PrescriptionPadV2
            hospitalName="Medi Consult"
            slogan="Your Health, Our Priority"
            addressLine1={doctorProfile?.address || "123 Healthcare Street"}
            addressLine2={doctorProfile?.city || "Medical District, City 12345"}
            phone={doctorProfile?.phone || "0123456789"}
            email={doctorProfile?.email || "mediconsult@email.com"}
            website="www.mediconsult.com"
            patientName={appointment.patient ? `${appointment.patient.firstName} ${appointment.patient.lastName}` : ""}
            patientAge={appointment.patient?.age?.toString() || ""}
            patientSex={appointment.patient?.gender || ""}
            date={new Date().toLocaleDateString()}
            medications={medications}
            notes={notes}
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
