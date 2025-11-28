/**
 * Custom OpenAI Agent Tools for Cal.com Integration
 */

import { tool } from '@openai/agents';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';
import {
  calClient,
  getEventTypeId,
  formatDateTime,
  isAtLeast24HoursAway,
  getHoursUntil,
} from './cal-client';
import { calLogger } from './logger';

const DEFAULT_TIMEZONE = 'Australia/Sydney';

// Context storage for current user (set by agent stream before tool execution)
let currentUserId: string | undefined;

/**
 * Convert UTC slots to local date groupings
 */
function regroupSlotsByLocalDate(
  slots: Record<string, Array<{ time: string }>>,
  timeZone: string
): Record<string, Date[]> {
  const slotsByLocalDate: Record<string, Date[]> = {};

  for (const utcDate of Object.keys(slots)) {
    const daySlots = slots[utcDate];

    for (const slot of daySlots) {
      const slotTime = new Date(slot.time);

      // Get the local date in the target timezone (e.g., "2025-11-24" in Sydney time)
      const localDateString = slotTime
        .toLocaleDateString('en-AU', {
          timeZone,
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .split('/')
        .reverse()
        .join('-'); // Convert "24/11/2025" to "2025-11-24"

      if (!slotsByLocalDate[localDateString]) {
        slotsByLocalDate[localDateString] = [];
      }
      slotsByLocalDate[localDateString].push(slotTime);
    }
  }

  return slotsByLocalDate;
}

/**
 * Group consecutive time slots into ranges
 */
function groupConsecutiveTimes(times: Date[], timeZone: string): string[] {
  const timeRanges: string[] = [];
  let rangeStart = times[0];
  let rangeEnd = times[0];

  for (let i = 1; i < times.length; i++) {
    const timeDiff = times[i].getTime() - rangeEnd.getTime();

    // If slots are consecutive (15 min apart), extend the range
    if (timeDiff === 15 * 60 * 1000) {
      rangeEnd = times[i];
    } else {
      // Save current range and start new one
      timeRanges.push(formatTimeRange(rangeStart, rangeEnd, timeZone));
      rangeStart = times[i];
      rangeEnd = times[i];
    }
  }

  // Add final range
  timeRanges.push(formatTimeRange(rangeStart, rangeEnd, timeZone));
  return timeRanges;
}

/**
 * Format technical details section with UTC timestamps
 */
function formatTechnicalDetails(
  sortedDates: string[],
  slotsByLocalDate: Record<string, Date[]>,
  timeZone: string
): string {
  let details = '\n\n---\n**Technical Details (for booking):**\n';
  details += 'When booking, use these EXACT UTC timestamps:\n\n';

  for (const localDate of sortedDates) {
    const times = slotsByLocalDate[localDate];
    const dayName = times[0].toLocaleDateString('en-AU', {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    details += `${dayName}:\n`;

    for (const time of times) {
      const localTime = time.toLocaleTimeString('en-AU', {
        timeZone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      details += `  • ${localTime} = \`${time.toISOString()}\`\n`;
    }
  }

  return details;
}

/**
 * Format available slots for display in a concise, user-friendly format
 */
function formatAvailableSlots(
  slots: Record<string, Array<{ time: string }>>,
  timeZone: string
): string {
  if (Object.keys(slots).length === 0) {
    return 'No available slots found in the requested date range. Please try different dates.';
  }

  // Convert all slots to timezone-aware dates and regroup by local date
  const slotsByLocalDate = regroupSlotsByLocalDate(slots, timeZone);

  // Sort dates and format each day
  const sortedDates = Object.keys(slotsByLocalDate).sort((a, b) =>
    a.localeCompare(b)
  );
  const formattedDays: string[] = [];

  for (const localDate of sortedDates) {
    const times = slotsByLocalDate[localDate].toSorted(
      (a, b) => a.getTime() - b.getTime()
    );

    // Format day name using first slot's time
    const dayName = times[0].toLocaleDateString('en-AU', {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });

    // Group consecutive times into ranges
    const timeRanges = groupConsecutiveTimes(times, timeZone);
    formattedDays.push(`**${dayName}**: ${timeRanges.join(', ')}`);
  }

  // Build response with user-friendly format
  let response = `I have availability over the next two weeks:\n\n${formattedDays.join('\n')}`;

  // Add technical details section with UTC timestamps for booking
  response += formatTechnicalDetails(sortedDates, slotsByLocalDate, timeZone);
  response += '\nWhich day and time works best for you?';

  // For debugging - include raw slot mapping
  calLogger.debug('Formatted availability with UTC mapping', {
    formatted: formattedDays,
    slotsByLocalDate: Object.fromEntries(
      Object.entries(slotsByLocalDate).map(([date, times]) => [
        date,
        times.map((t) => t.toISOString()),
      ])
    ),
  });

  return response;
}

/**
 * Format a time range for display
 */
function formatTimeRange(start: Date, end: Date, timeZone: string): string {
  const formatTime = (date: Date) =>
    date.toLocaleTimeString('en-AU', {
      timeZone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const startTime = formatTime(start);

  // If it's a single slot (start === end), just show one time
  if (start.getTime() === end.getTime()) {
    return startTime;
  }

  // Calculate end time of the last slot (add 15 minutes)
  const actualEnd = new Date(end.getTime() + 15 * 60 * 1000);
  const endTime = formatTime(actualEnd);

  return `${startTime}-${endTime}`;
}

/**
 * Tool: Get current date/time in Sydney
 */
export const getCurrentDateTime = tool({
  name: 'get_current_datetime',
  description:
    'Get the current date and time in Sydney, Australia timezone. ' +
    'ONLY USE when actively processing a meeting booking request that the user explicitly initiated. ' +
    'DO NOT USE for general conversation, career questions, or hypothetical scheduling discussions.',
  parameters: z.object({}),
  async execute() {
    const now = new Date();
    const sydneyTime = new Date(
      now.toLocaleString('en-US', { timeZone: DEFAULT_TIMEZONE })
    );

    // Calculate safe dates for booking (48 hours out to be safe with 24hr rule)
    const safeStartDate = new Date(sydneyTime);
    safeStartDate.setDate(safeStartDate.getDate() + 2);

    const twoWeeksOut = new Date(safeStartDate);
    twoWeeksOut.setDate(twoWeeksOut.getDate() + 14);

    return JSON.stringify({
      currentDate: sydneyTime.toISOString().split('T')[0],
      currentTime: sydneyTime.toTimeString().split(' ')[0],
      timezone: DEFAULT_TIMEZONE,
      currentDateTime: sydneyTime.toLocaleString('en-AU'),
      safeStartDate: safeStartDate.toISOString().split('T')[0],
      suggestedEndDate: twoWeeksOut.toISOString().split('T')[0],
    });
  },
});

/**
 * Tool: Check meeting availability
 */
export const checkMeetingAvailability = tool({
  name: 'check_meeting_availability',
  description:
    "Check Daniel McCarthy's available time slots for 15-minute meetings. " +
    'ONLY USE when the user has EXPLICITLY asked to book, schedule, or arrange a meeting with Daniel. ' +
    "DO NOT USE for: questions about Daniel's career, experience, general availability inquiries, or any conversational questions. " +
    'By default checks next 2 weeks starting 48 hours from now.',
  parameters: z.object({
    startDate: z
      .string()
      .nullable()
      .optional()
      .describe(
        'Optional: Start date in YYYY-MM-DD format. If not provided, automatically uses 2 days from now (safe for 24hr rule).'
      ),
    endDate: z
      .string()
      .nullable()
      .optional()
      .describe(
        'Optional: End date in YYYY-MM-DD format. If not provided, automatically uses 2 weeks from start.'
      ),
    timezone: z
      .string()
      .nullable()
      .optional()
      .describe(
        'Optional: Timezone for displaying slots (default: Australia/Sydney)'
      ),
  }),
  async execute({ startDate, endDate, timezone }) {
    try {
      const now = new Date(); // Current time in UTC
      const finalTimezone = timezone || DEFAULT_TIMEZONE;

      // Calculate start time: either provided date or 24 hours + 1 hour buffer from now
      let startTime: Date;
      if (startDate) {
        // User provided a specific date - start from beginning of that day in UTC
        startTime = new Date(`${startDate}T00:00:00.000Z`);
      } else {
        // Default: 25 hours from now (24hr minimum + 1hr buffer)
        startTime = new Date(now.getTime() + 25 * 60 * 60 * 1000);
      }

      // Calculate end time: either provided date or 2 weeks from start
      let endTime: Date;
      if (endDate) {
        // User provided a specific end date - end at 23:59:59 of that day in UTC
        endTime = new Date(`${endDate}T23:59:59.999Z`);
      } else {
        // Default: 2 weeks from start time
        endTime = new Date(startTime.getTime() + 14 * 24 * 60 * 60 * 1000);
      }

      // Get event type ID for 15min meetings
      const eventTypeId = getEventTypeId('15min');

      // Fetch available slots - Cal.com API expects ISO 8601 timestamps in UTC
      calLogger.debug('Requesting Cal.com slots', {
        eventTypeId,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        timeZone: finalTimezone,
      });

      const response = await calClient.getAvailableSlots({
        eventTypeId,
        start: startTime.toISOString(),
        end: endTime.toISOString(),
        timeZone: finalTimezone,
      });

      calLogger.debug('Cal.com slots response', { slots: response });

      if (response.status !== 'success') {
        return 'I encountered an issue checking availability. Please try again or contact support.';
      }

      if (
        !response.data?.slots ||
        Object.keys(response.data.slots).length === 0
      ) {
        return `No available slots found between ${startTime.toISOString()} and ${endTime.toISOString()}. This might be because all slots are within the 24-hour minimum notice period, or there are no available times in this date range.`;
      }

      return formatAvailableSlots(response.data.slots, finalTimezone);
    } catch (error) {
      calLogger.error('check_meeting_availability error', error);
      return `I encountered an error while checking availability: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`;
    }
  },
});

/**
 * Tool: Book a meeting
 */
export const bookMeeting = tool({
  name: 'book_meeting',
  description:
    'Book a 15-minute meeting with Daniel McCarthy at a specific date and time. ' +
    'PREREQUISITE: Only invoke AFTER (1) user explicitly requested a meeting, (2) you called check_meeting_availability, (3) you called get_user_details, and (4) user selected a specific time. ' +
    'DO NOT invoke unless ALL prerequisites are met. ' +
    'Use the EXACT UTC timestamp from the availability results (e.g., "2025-11-24T01:00:00.000Z"). Do NOT convert times.',
  parameters: z.object({
    datetime: z
      .string()
      .describe(
        'Meeting start time - MUST be the exact UTC timestamp from check_meeting_availability results (e.g., "2025-11-24T01:00:00.000Z"). Do NOT create or convert timestamps - copy the exact value from the API response.'
      ),
    attendeeName: z
      .string()
      .describe('Full name of the person booking the meeting'),
    attendeeEmail: z
      .string()
      .email()
      .describe('Email address of the person booking the meeting'),
    attendeeTimezone: z
      .string()
      .default(DEFAULT_TIMEZONE)
      .describe('Timezone of the attendee (default: Australia/Sydney)'),
    notes: z
      .string()
      .nullable()
      .optional()
      .describe('Optional notes or agenda for the meeting'),
  }),
  async execute({
    datetime,
    attendeeName,
    attendeeEmail,
    attendeeTimezone,
    notes,
  }) {
    try {
      // STRICT VALIDATION: Require exact UTC format with 'Z' suffix
      if (!datetime.endsWith('Z')) {
        calLogger.warn('Invalid datetime format - must end with Z', {
          provided: datetime,
          expected: 'UTC format like "2025-11-24T01:00:00.000Z"',
        });

        return `Invalid datetime format: "${datetime}". The time MUST be in UTC format with "Z" suffix (e.g., "2025-11-24T01:00:00.000Z"). Look at the "Technical Details (for booking)" section from the availability response and copy the EXACT UTC timestamp shown there. DO NOT construct timestamps yourself.`;
      }

      // Parse and validate it's a valid ISO 8601 datetime
      const parsedDate = new Date(datetime);
      if (Number.isNaN(parsedDate.getTime())) {
        return `Invalid datetime: "${datetime}" is not a valid ISO 8601 timestamp. Please use the exact UTC timestamp from the availability response.`;
      }

      // Normalize to ensure consistent format
      const utcDatetime = parsedDate.toISOString();

      calLogger.debug('Validating booking datetime', {
        provided: datetime,
        normalized: utcDatetime,
        isExactMatch: datetime === utcDatetime,
      });

      // Validate 24-hour minimum notice
      if (!isAtLeast24HoursAway(utcDatetime)) {
        const hoursUntil = getHoursUntil(utcDatetime);
        return `I cannot book meetings less than 24 hours in advance. The requested time (${formatDateTime(utcDatetime, attendeeTimezone)}) is only ${hoursUntil.toFixed(1)} hours away. Please choose a time slot at least 24 hours from now.`;
      }

      // Get event type ID for 15min meetings
      const eventTypeId = getEventTypeId('15min');

      // Re-check availability before booking to prevent race conditions
      // Query a 1-hour window (±30 minutes) around the target slot
      // Note: Cal.com's API requires reasonable time windows (hours/days, not milliseconds)
      calLogger.debug('Re-checking availability before booking', {
        datetime: utcDatetime,
        eventTypeId,
      });

      const availabilityCheck = await calClient.getAvailableSlots({
        eventTypeId,
        start: new Date(
          new Date(utcDatetime).getTime() - 30 * 60 * 1000
        ).toISOString(), // 30 min before
        end: new Date(
          new Date(utcDatetime).getTime() + 30 * 60 * 1000
        ).toISOString(), // 30 min after
        timeZone: attendeeTimezone,
      });

      // Check if the requested slot is still available
      const isStillAvailable = Object.values(
        availabilityCheck.data?.slots || {}
      ).some((slots) => slots.some((slot) => slot.time === utcDatetime));

      calLogger.debug('Availability re-check result', {
        slotsFound: Object.keys(availabilityCheck.data?.slots || {}).length,
        targetSlot: utcDatetime,
        isStillAvailable,
        availableSlots: Object.values(availabilityCheck.data?.slots || {})
          .flat()
          .map((s) => s.time),
      });

      if (!isStillAvailable) {
        return `The requested time slot (${formatDateTime(utcDatetime, attendeeTimezone)}) is no longer available. It may have just been booked. Please check availability again and choose a different time.`;
      }

      // Log booking params - sanitized by calLogger automatically
      calLogger.debug('Creating booking', {
        start: utcDatetime,
        eventTypeId,
        attendeeName,
        attendeeEmail,
        attendeeTimezone,
      });

      // Create booking
      const response = await calClient.createBooking({
        start: utcDatetime,
        eventTypeId,
        attendee: {
          name: attendeeName,
          email: attendeeEmail,
          timeZone: attendeeTimezone,
        },
        metadata: {
          userId: currentUserId || 'unknown',
          source: 'ai-resume-chat',
          notes: notes || '',
        },
      });

      if (response.status !== 'success') {
        return 'I encountered an issue creating the booking. The time slot may no longer be available. Please check availability again.';
      }

      const booking = response.data;
      const formattedTime = formatDateTime(booking.start, attendeeTimezone);

      calLogger.info('Meeting booked successfully', { bookingId: booking.uid });

      return `✅ Meeting successfully booked!\n\n**Details:**\n• Date & Time: ${formattedTime}\n• Duration: 15 minutes\n• Attendee: ${attendeeName} (${attendeeEmail})\n• Booking ID: ${booking.uid}\n\nYou'll receive a confirmation email at ${attendeeEmail} with calendar invite and meeting details. Looking forward to speaking with you!`;
    } catch (error) {
      calLogger.error('book_meeting error', error);
      return `I encountered an error while booking the meeting: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or contact support.`;
    }
  },
});

/**
 * Tool: Get user details from Clerk
 */
export const getUserDetails = tool({
  name: 'get_user_details',
  description:
    "Get the authenticated user's name and email from Clerk for meeting booking. " +
    'ONLY USE when the user has explicitly requested to book a meeting AND you are starting the booking workflow. ' +
    'DO NOT USE preemptively or for general conversation. ' +
    'After retrieval, ask the user to CONFIRM these details before booking.',
  parameters: z.object({}),
  async execute() {
    try {
      if (!currentUserId) {
        return JSON.stringify({
          name: '',
          email: '',
          hasName: false,
          hasEmail: false,
          error: 'User not authenticated',
        });
      }

      const client = await clerkClient();
      const user = await client.users.getUser(currentUserId);

      const name =
        user.fullName || user.firstName || user.username || 'Unknown';
      const email =
        user.emailAddresses.find((e) => e.id === user.primaryEmailAddressId)
          ?.emailAddress || 'No email found';

      calLogger.debug('Retrieved user details', {
        hasName: !!user.fullName || !!user.firstName,
        hasEmail: !!user.primaryEmailAddressId,
      });

      return JSON.stringify({
        name,
        email,
        hasName: !!user.fullName || !!user.firstName,
        hasEmail: !!user.primaryEmailAddressId,
      });
    } catch (error) {
      calLogger.error('get_user_details error', error);
      return JSON.stringify({
        name: '',
        email: '',
        hasName: false,
        hasEmail: false,
        error: 'Could not retrieve user details',
      });
    }
  },
});

/**
 * Set the current user ID for tool execution context
 */
export function setCalToolsUserId(userId: string | undefined) {
  currentUserId = userId;
}

/**
 * Export all Cal.com tools
 */
export function createCalendarTools() {
  return [
    getCurrentDateTime,
    checkMeetingAvailability,
    bookMeeting,
    getUserDetails,
  ];
}
