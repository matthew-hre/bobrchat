import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { NextResponse } from "next/server";

import { syncSubscriptionFromPolarState } from "~/features/subscriptions/queries";
import { serverEnv } from "~/lib/env";

export async function POST(req: Request) {
  const secret = serverEnv.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhooks not configured" }, { status: 500 });
  }

  const body = await req.text();

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  try {
    const event = validateEvent(body, headers, secret);

    if (event.type === "customer.state_changed") {
      const state = event.data;

      await syncSubscriptionFromPolarState({
        userId: state.externalId ?? undefined,
        polarCustomerId: state.id,
        activeSubscriptions: state.activeSubscriptions.map(sub => ({
          id: sub.id,
          productId: sub.productId,
        })),
        isDeleted: state.deletedAt !== null,
      });
    }

    return NextResponse.json({ received: true }, { status: 202 });
  }
  catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
    }
    throw error;
  }
}
