/**
 * TypeScript types for Cal.com API v2
 * API Documentation: https://api.cal.com/v2/docs
 */

export interface CalEventType {
  id: number;
  slug: string;
  title: string;
  lengthInMinutes: number;
  description?: string;
  locations?: CalLocation[];
}

export interface CalLocation {
  type: string;
  link?: string;
  address?: string;
}

export interface CalTimeSlot {
  time: string; // ISO 8601 format - the start time of the slot
}

export interface CalAvailabilityResponse {
  status: 'success' | 'error';
  data: {
    slots: {
      [date: string]: CalTimeSlot[];
    };
  };
}

export interface CalBookingAttendee {
  name: string;
  email: string;
  timeZone: string;
  phoneNumber?: string;
  language?: string;
}

export interface CalBookingRequest {
  start: string; // ISO 8601 format in UTC
  eventTypeId: number;
  attendee: CalBookingAttendee;
  guests?: string[]; // Additional email addresses
  location?: string;
  metadata?: Record<string, string>;
  lengthInMinutes?: number; // For variable-length events
}

export interface CalBooking {
  id: number;
  uid: string;
  title: string;
  description?: string;
  start: string; // ISO 8601 format
  end: string; // ISO 8601 format
  status: 'ACCEPTED' | 'PENDING' | 'CANCELLED';
  attendees: Array<{
    name: string;
    email: string;
    timeZone: string;
  }>;
}

export interface CalBookingResponse {
  status: 'success' | 'error';
  data: CalBooking;
}

export interface CalEventTypesResponse {
  status: 'success' | 'error';
  data: CalEventType[];
}

export interface CalWebhookPayload {
  triggerEvent:
    | 'BOOKING_CREATED'
    | 'BOOKING_RESCHEDULED'
    | 'BOOKING_CANCELLED'
    | 'BOOKING_PAYMENT_INITIATED'
    | 'BOOKING_PAID';
  createdAt: string;
  payload: {
    booking: CalBooking;
    organizer: {
      name: string;
      email: string;
      timeZone: string;
    };
    attendees: Array<{
      name: string;
      email: string;
      timeZone: string;
    }>;
    metadata?: Record<string, string>;
  };
}

export type CalMeetingDuration = '15min' | '30min';

export interface CalAvailabilityParams {
  eventTypeId: number;
  start: string; // ISO 8601 datetime in UTC (e.g., "2025-11-23T10:30:00.000Z")
  end: string; // ISO 8601 datetime in UTC (e.g., "2025-12-07T10:30:00.000Z")
  timeZone: string; // IANA timezone identifier for display (e.g., "Australia/Sydney")
}
