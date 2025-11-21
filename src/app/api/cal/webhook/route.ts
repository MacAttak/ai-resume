/**
 * Cal.com Webhook Handler
 * Receives and processes webhook events from Cal.com
 */

import { NextRequest } from 'next/server';
import crypto from 'crypto';
import type { CalWebhookPayload } from '@/lib/cal-types';

export const runtime = 'nodejs';

/**
 * Verify webhook signature from Cal.com
 */
function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
  secret: string
): boolean {
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac('sha256', secret);
  const digest = hmac.update(rawBody).digest('hex');

  return signature === digest;
}

/**
 * Handle webhook events
 */
async function handleWebhookEvent(payload: CalWebhookPayload): Promise<void> {
  const { triggerEvent, payload: eventPayload } = payload;

  console.log('Cal.com webhook received:', {
    event: triggerEvent,
    bookingId: eventPayload.booking.id,
    bookingUid: eventPayload.booking.uid,
    attendeeEmail: eventPayload.attendees[0]?.email,
    startTime: eventPayload.booking.start,
  });

  switch (triggerEvent) {
    case 'BOOKING_CREATED':
      // Log successful booking
      console.log('New booking created:', {
        id: eventPayload.booking.id,
        uid: eventPayload.booking.uid,
        title: eventPayload.booking.title,
        start: eventPayload.booking.start,
        attendees: eventPayload.attendees.map((a) => a.email),
        metadata: eventPayload.metadata,
      });

      // You could add analytics tracking, notifications, etc. here
      break;

    case 'BOOKING_RESCHEDULED':
      console.log('Booking rescheduled:', {
        id: eventPayload.booking.id,
        uid: eventPayload.booking.uid,
        newStart: eventPayload.booking.start,
      });
      break;

    case 'BOOKING_CANCELLED':
      console.log('Booking cancelled:', {
        id: eventPayload.booking.id,
        uid: eventPayload.booking.uid,
      });
      break;

    case 'BOOKING_PAYMENT_INITIATED':
    case 'BOOKING_PAID':
      // Handle payment events if needed
      console.log(`Payment event: ${triggerEvent}`, {
        id: eventPayload.booking.id,
      });
      break;

    default:
      console.log('Unknown webhook event:', triggerEvent);
  }
}

/**
 * POST /api/cal/webhook
 * Receive webhook events from Cal.com
 */
export async function POST(req: NextRequest) {
  try {
    // Get webhook secret
    const webhookSecret = process.env.CAL_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('CAL_WEBHOOK_SECRET is not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook secret not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get raw body and signature
    const rawBody = await req.text();
    const signature = req.headers.get('cal-signature');

    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse payload
    const payload: CalWebhookPayload = JSON.parse(rawBody);

    // Handle event
    await handleWebhookEvent(payload);

    // Return success
    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Webhook handler error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
