import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { apiUrl } from "@/lib/api-config";

const FinalizeInput = z.object({
  paymentId: z.string(),
});

export const finalizeAppointmentPayment = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => FinalizeInput.parse(input))
  .handler(async ({ data }) => {
    const request = getRequest();
    const cookieHeader = request.headers.get("cookie") || "";

    const url = apiUrl(`/payments/${data.paymentId}/simulate-success`);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Simulated payment failed");
    }

    const json = await res.json();
    return {
      ok: true,
      appointmentId: json.data?.appointment?._id,
      meetingUrl: json.data?.appointment?.jitsi?.meetingUrl,
    };
  });
