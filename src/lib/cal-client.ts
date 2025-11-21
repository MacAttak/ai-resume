/**
 * Cal.com API Client
 * Wrapper for Cal.com API v2 endpoints
 */

import type {
  CalAvailabilityParams,
  CalAvailabilityResponse,
  CalBookingRequest,
  CalBookingResponse,
  CalEventTypesResponse,
} from './cal-types';

const CAL_API_BASE = 'https://api.cal.com/v2';
const CAL_API_VERSION = '2024-08-13';
const REQUEST_TIMEOUT_MS = 60000; // 60 seconds (increased for poor network conditions)
const MAX_RETRIES = 3; // Increased retries for connection issues

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Make authenticated request to Cal.com API with retry logic
 */
async function calFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.CAL_API_KEY;

  if (!apiKey) {
    throw new Error('CAL_API_KEY is not configured');
  }

  const url = `${CAL_API_BASE}${endpoint}`;
  let lastError: Error | null = null;

  // Retry logic for connection timeouts
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'cal-api-version': CAL_API_VERSION,
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Cal.com API error: ${response.status} ${response.statusText}`;

        try {
          const errorJson = JSON.parse(errorText);
          // Handle different error formats from Cal.com API
          if (typeof errorJson.message === 'string') {
            errorMessage = errorJson.message;
          } else if (typeof errorJson.error === 'string') {
            errorMessage = errorJson.error;
          } else if (errorJson.message || errorJson.error) {
            // If message/error is an object, stringify it
            errorMessage = `${errorMessage} - ${JSON.stringify(errorJson.message || errorJson.error)}`;
          } else {
            // Include full error response for debugging
            errorMessage = `${errorMessage} - ${errorText}`;
          }
        } catch {
          // If error is not JSON, include raw text
          if (errorText) {
            errorMessage = `${errorMessage} - ${errorText}`;
          }
        }

        console.error('Cal.com API error:', { status: response.status, errorMessage, url });
        throw new Error(errorMessage);
      }

      // Success - return response
      return response.json();
    } catch (error) {
      lastError = error as Error;

      // Check if it's a timeout or connection error
      const isRetryable =
        error instanceof Error &&
        (error.name === 'AbortError' ||
         error.name === 'TimeoutError' ||
         error.message.includes('timeout') ||
         error.message.includes('ETIMEDOUT') ||
         error.message.includes('ECONNREFUSED') ||
         error.message.includes('ECONNRESET') ||
         error.message.includes('ENETUNREACH') ||
         error.message.includes('UND_ERR_CONNECT_TIMEOUT') ||
         error.message.includes('ConnectTimeoutError') ||
         error.message.includes('fetch failed') ||
         // @ts-ignore - Check cause chain for connection errors
         (error.cause && (
           error.cause.code === 'UND_ERR_CONNECT_TIMEOUT' ||
           error.cause.code === 'ETIMEDOUT' ||
           error.cause.code === 'ECONNREFUSED' ||
           error.cause.code === 'ECONNRESET'
         )));

      if (isRetryable && attempt < MAX_RETRIES) {
        // Progressive backoff: 2s, 4s, 8s (longer delays for connection issues)
        const backoffMs = Math.pow(2, attempt + 1) * 1000;
        console.warn(`Cal.com API request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}), retrying in ${backoffMs}ms...`, {
          error: error instanceof Error ? error.message : String(error),
          errorName: error instanceof Error ? error.name : 'Unknown',
          // @ts-ignore - Log error cause for debugging
          errorCause: error.cause ? {
            message: error.cause.message,
            code: error.cause.code,
            name: error.cause.name
          } : null,
          url,
        });
        await sleep(backoffMs);
        continue; // Retry
      }

      // Non-retryable error or max retries exceeded
      if (attempt === MAX_RETRIES) {
        console.error('Cal.com API request failed after all retries:', {
          attempts: MAX_RETRIES + 1,
          error: lastError?.message,
          url,
        });
      }

      throw error;
    }
  }

  // Should never reach here, but TypeScript needs this
  throw lastError || new Error('Cal.com API request failed');
}

/**
 * Cal.com API Client
 */
export const calClient = {
  /**
   * Get available time slots for booking
   * @param params.start ISO 8601 datetime in UTC (e.g., "2025-11-23T10:30:00.000Z")
   * @param params.end ISO 8601 datetime in UTC (e.g., "2025-12-07T10:30:00.000Z")
   * @param params.timeZone IANA timezone identifier (e.g., "Australia/Sydney") - not sent to API, used for display
   */
  async getAvailableSlots(
    params: CalAvailabilityParams
  ): Promise<CalAvailabilityResponse> {
    const searchParams = new URLSearchParams({
      eventTypeId: params.eventTypeId.toString(),
      startTime: params.start, // Already in ISO 8601 UTC format
      endTime: params.end, // Already in ISO 8601 UTC format
      format: 'range', // Request both start and end times for each slot
    });

    return calFetch<CalAvailabilityResponse>(`/slots/available?${searchParams}`);
  },

  /**
   * Create a new booking
   */
  async createBooking(
    data: CalBookingRequest
  ): Promise<CalBookingResponse> {
    return calFetch<CalBookingResponse>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Get event types for a user
   */
  async getEventTypes(username?: string): Promise<CalEventTypesResponse> {
    const searchParams = username
      ? new URLSearchParams({ username })
      : '';

    return calFetch<CalEventTypesResponse>(
      `/event-types${searchParams ? `?${searchParams}` : ''}`
    );
  },

  /**
   * Get a specific booking by ID
   */
  async getBooking(bookingId: number): Promise<CalBookingResponse> {
    return calFetch<CalBookingResponse>(`/bookings/${bookingId}`);
  },

  /**
   * Cancel a booking
   */
  async cancelBooking(
    bookingId: number,
    reason?: string
  ): Promise<CalBookingResponse> {
    return calFetch<CalBookingResponse>(`/bookings/${bookingId}`, {
      method: 'DELETE',
      body: reason ? JSON.stringify({ cancellationReason: reason }) : undefined,
    });
  },
};

/**
 * Helper to get event type ID by duration
 */
export function getEventTypeId(duration: '15min' | '30min'): number {
  const eventTypeId =
    duration === '15min'
      ? process.env.CAL_EVENT_TYPE_ID_15MIN
      : process.env.CAL_EVENT_TYPE_ID_30MIN;

  if (!eventTypeId) {
    throw new Error(`CAL_EVENT_TYPE_ID_${duration.toUpperCase()} is not configured`);
  }

  return parseInt(eventTypeId, 10);
}

/**
 * Helper to format datetime for display
 */
export function formatDateTime(isoString: string, timeZone: string): string {
  const date = new Date(isoString);
  return date.toLocaleString('en-AU', {
    timeZone,
    dateStyle: 'full',
    timeStyle: 'short',
  });
}

/**
 * Helper to check if a datetime is at least 24 hours in the future
 */
export function isAtLeast24HoursAway(datetime: string): boolean {
  const bookingTime = new Date(datetime);
  const now = new Date();
  const hoursUntil = (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  return hoursUntil >= 24;
}

/**
 * Helper to get hours until a datetime
 */
export function getHoursUntil(datetime: string): number {
  const bookingTime = new Date(datetime);
  const now = new Date();
  return (bookingTime.getTime() - now.getTime()) / (1000 * 60 * 60);
}
