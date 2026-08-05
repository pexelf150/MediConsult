import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, CalendarClock, Check, X, AlertCircle, Clock } from "lucide-react";
import { apiUrl } from "@/lib/api-config";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/doctor/reschedule-requests")({
  component: DoctorRescheduleRequests,
});

function DoctorRescheduleRequests() {
  const qc = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const { data: requests, isLoading } = useQuery({
    queryKey: ["doctor-reschedule-requests"],
    queryFn: async () => {
      const response = await fetch(apiUrl('/reschedule/doctor/requests'), {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch reschedule requests');
      }
      const result = await response.json();
      return result.data;
    },
    refetchInterval: 10000,
  });

  const handleApprove = async (requestId: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(apiUrl(`/reschedule/${requestId}/approve`), {
        method: 'PATCH',
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to approve request');
      }

      toast.success('Reschedule request approved');
      qc.invalidateQueries({ queryKey: ["doctor-reschedule-requests"] });
      setSelectedRequest(null);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    setActionLoading(true);
    try {
      const response = await fetch(apiUrl(`/reschedule/${selectedRequest._id}/reject`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rejectionReason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to reject request');
      }

      toast.success('Reschedule request rejected');
      qc.invalidateQueries({ queryKey: ["doctor-reschedule-requests"] });
      setSelectedRequest(null);
      setRejectionReason("");
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusStyles = {
      pending: 'bg-amber-100 text-amber-800 border-amber-200',
      approved: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      rejected: 'bg-red-100 text-red-800 border-red-200',
      cancelled: 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return (
      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border ${statusStyles[status as keyof typeof statusStyles] || statusStyles.pending}`}>
        {status === 'pending' && <Clock className="h-3 w-3" />}
        {status === 'approved' && <Check className="h-3 w-3" />}
        {status === 'rejected' && <X className="h-3 w-3" />}
        {status === 'cancelled' && <AlertCircle className="h-3 w-3" />}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-10">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const pendingRequests = requests?.filter((r: any) => r.status === 'pending') || [];
  const processedRequests = requests?.filter((r: any) => r.status !== 'pending') || [];

  return (
    <div className="grid gap-6">
      <header>
        <h1 className="text-2xl tracking-tight">Reschedule Requests</h1>
        <p className="text-sm text-muted-foreground">
          Manage appointment reschedule requests from your patients
        </p>
      </header>

      {pendingRequests.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            <Clock className="h-4 w-4" /> Pending Requests ({pendingRequests.length})
          </h2>
          <div className="grid gap-3">
            {pendingRequests.map((request: any) => (
              <div key={request._id} className="rounded-xl border bg-card p-4 shadow-soft">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(request.status)}
                      <span className="text-sm font-medium">
                        {request.patient?.firstName} {request.patient?.lastName}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          From: {new Date(request.originalScheduledAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          To: {new Date(request.requestedScheduledAt).toLocaleString()}
                        </span>
                      </div>
                      {request.reason && (
                        <div className="text-muted-foreground">
                          <span className="font-medium">Reason: </span>
                          {request.reason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(request);
                        setRejectionReason("");
                      }}
                    >
                      <X className="mr-1.5 h-4 w-4" /> Reject
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request._id)}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-1.5 h-4 w-4" />
                      )}
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          <AlertCircle className="h-4 w-4" /> Processed Requests ({processedRequests.length})
        </h2>
        {processedRequests.length === 0 ? (
          <p className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
            No processed requests yet.
          </p>
        ) : (
          <div className="grid gap-3">
            {processedRequests.map((request: any) => (
              <div key={request._id} className="rounded-xl border bg-card p-4 shadow-soft opacity-75">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(request.status)}
                      <span className="text-sm font-medium">
                        {request.patient?.firstName} {request.patient?.lastName}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          From: {new Date(request.originalScheduledAt).toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <CalendarClock className="h-4 w-4" />
                        <span>
                          To: {new Date(request.requestedScheduledAt).toLocaleString()}
                        </span>
                      </div>
                      {request.rejectionReason && (
                        <div className="text-red-600">
                          <span className="font-medium">Rejection reason: </span>
                          {request.rejectionReason}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {request.reviewedAt && (
                      <span>Processed: {new Date(request.reviewedAt).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Reject Confirmation Dialog */}
      <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Reschedule Request</DialogTitle>
            <DialogDescription>
              Are you sure you want to reject this reschedule request?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="rejection-reason">Rejection Reason (Optional)</Label>
              <Input
                id="rejection-reason"
                placeholder="Why are you rejecting this request?"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSelectedRequest(null)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleReject} disabled={actionLoading}>
              {actionLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Reject Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
