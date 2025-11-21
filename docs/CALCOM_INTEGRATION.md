# Cal.com Meeting Booking Integration

This document describes the Cal.com integration that enables meeting booking through both a traditional UI and AI agent conversation.

## Features

### 1. **Traditional UI Booking**
- "Book a Meeting" button in the chat interface header
- Simple modal for 15-minute meetings
- Inline Cal.com embed for selecting time slots
- Direct calendar integration

### 2. **AI Agent Booking**
- Natural conversation-based booking
- Agent checks availability and shows time slots
- Confirms user details before booking
- Enforces 24-hour minimum notice period
- 15-minute meetings for quick chats

### 3. **Webhook Integration**
- Receives booking confirmations from Cal.com
- Logs all booking events
- Signature verification for security

## Setup Instructions

### 1. Cal.com Configuration

1. **Create Cal.com Account**
   - Sign up at [cal.com](https://cal.com)
   - Set up a 15-minute event type:
     - Example: https://cal.com/chatwithdan/15min

2. **Generate API Key**
   - Go to Settings → Developer → API Keys
   - Create a new API key
   - Copy the key (starts with `cal_live_...`)

3. **Get Event Type ID** ⚠️ IMPORTANT
   - Go to [cal.com/event-types](https://cal.com/event-types)
   - Click on your 15-minute event
   - Look at the browser address bar URL
   - Copy the number after `/event-types/`
   - **Example:** `https://app.cal.com/event-types/123456` → Event ID is `123456`
   - You'll need this ID for your environment variables

4. **Set up Webhook** (Optional but recommended)
   - Go to Settings → Developer → Webhooks
   - Add webhook URL: `https://your-domain.com/api/cal/webhook`
   - Subscribe to events: BOOKING_CREATED, BOOKING_RESCHEDULED, BOOKING_CANCELLED
   - Generate and save the webhook secret

### 2. Environment Variables

Add the following to your `.env.local`:

```bash
# Cal.com API Configuration
CAL_API_KEY=cal_live_your_api_key_here

# Cal.com Event Type ID (15-minute meeting)
# Find this by going to cal.com/event-types and copying the number from the URL
CAL_EVENT_TYPE_ID_15MIN=123456

# Webhook Secret (generate with: openssl rand -base64 32)
# Use this same secret when setting up the webhook in Cal.com
CAL_WEBHOOK_SECRET=4otgE9c2Kfw0BtEyqxNLEAgxsiox444NPkxw1g96D+k=

# Your Cal.com username
CAL_USERNAME=chatwithdan
```

### 3. Deploy

Deploy your application and the webhook will automatically be available at:
```
https://your-domain.com/api/cal/webhook
```

## Architecture

### Backend Components

1. **`src/lib/cal-types.ts`**
   - TypeScript types for Cal.com API
   - Request/response interfaces

2. **`src/lib/cal-client.ts`**
   - Cal.com API client wrapper
   - Helper functions for booking, availability checks
   - Date validation utilities

3. **`src/lib/cal-tools.ts`**
   - Custom OpenAI agent tools:
     - `check_meeting_availability` - Query available time slots
     - `book_meeting` - Create bookings
     - `get_user_details` - Fetch user info from Clerk

4. **`src/app/api/cal/webhook/route.ts`**
   - Webhook endpoint
   - Signature verification
   - Event logging

### Frontend Components

1. **`src/components/booking-button.tsx`**
   - Booking button in chat header
   - Opens booking modal

2. **`src/components/booking-modal.tsx`**
   - Duration selection (15min/30min)
   - Cal.com inline embed
   - Responsive design

3. **`src/components/ui/dialog.tsx`**
   - Radix UI dialog primitive
   - Shadcn/ui compatible

## Agent Tool Usage

The AI agent has access to three tools for booking meetings:

### 1. `check_meeting_availability`

Checks available time slots for a date range.

**Parameters:**
- `duration`: "15min" or "30min"
- `startDate`: YYYY-MM-DD (must be at least 24 hours from now)
- `endDate`: YYYY-MM-DD
- `timezone`: Default "Australia/Sydney"

**Example:**
```
User: "What times are you available next week?"
Agent: [Uses check_meeting_availability with next week's dates]
```

### 2. `get_user_details`

Retrieves the authenticated user's name and email from Clerk.

**No parameters required** - uses the current authenticated user's context.

**Example:**
```
User: "Book me for Tuesday at 2pm"
Agent: [Uses get_user_details to pre-fill attendee info]
       "I have you as John Doe (john@example.com). Is that correct?"
```

### 3. `book_meeting`

Creates a meeting booking.

**Parameters:**
- `duration`: "15min" or "30min"
- `datetime`: ISO 8601 format (e.g., "2025-11-22T14:00:00")
- `attendeeName`: Full name
- `attendeeEmail`: Email address
- `attendeeTimezone`: Default "Australia/Sydney"
- `notes`: Optional meeting notes

**Example:**
```
User: "Yes, book it"
Agent: [Uses book_meeting with confirmed details]
       "Meeting booked! You'll receive a confirmation email..."
```

## 24-Hour Minimum Notice

The system enforces a 24-hour minimum notice period for all bookings:

- **Agent Tools:** Validation in both `check_meeting_availability` and `book_meeting`
- **User Feedback:** Clear error messages explaining the requirement
- **Client-Side:** UI prevents selection of slots within 24 hours

## Email Confirmations

Cal.com automatically sends email confirmations to:
- **Daniel:** Organizer notification
- **Attendee:** Calendar invite with meeting details

## Testing

### Test Agent Booking Flow

1. Start a conversation in the chat
2. Ask: "Can I book a time to chat?"
3. Follow the agent's prompts
4. Verify 24-hour enforcement
5. Check email confirmation

### Test UI Booking Flow

1. Click "Book a Meeting" button in chat header
2. Select duration (15min or 30min)
3. Choose a time slot
4. Complete booking form
5. Check email confirmation

### Test Webhook

1. Create a booking (via UI or agent)
2. Check application logs for webhook event
3. Verify signature was validated
4. Confirm event details were logged

## Security

- **API Key:** Never exposed to client, server-side only
- **Webhook Signature:** HMAC SHA-256 verification
- **Authentication:** Clerk-based user authentication
- **Rate Limiting:** Existing rate limits apply to agent tools

## Troubleshooting

### "CAL_API_KEY is not configured"
- Ensure `.env.local` has `CAL_API_KEY=cal_live_...`
- Restart development server after adding env vars

### "24 hours in advance" error
- Check system timezone vs. user timezone
- Verify date calculations are in UTC

### Webhook not receiving events
- Verify webhook URL is publicly accessible
- Check Cal.com webhook settings
- Verify `CAL_WEBHOOK_SECRET` matches

### Tools not appearing in agent
- Check `userId` is passed to agent
- Verify tools are included in agent config
- Check build logs for tool registration errors

## Future Enhancements

Potential improvements:
- Reschedule/cancel functionality
- Multiple calendar support
- Team member scheduling
- Recurring meetings
- Custom availability rules
- Meeting type recommendations based on conversation context

## API Reference

### Cal.com API v2

Documentation: https://cal.com/docs/api-reference

Used endpoints:
- `GET /v2/slots` - Get available slots
- `POST /v2/bookings` - Create booking
- `GET /v2/event-types` - List event types
- `GET /v2/bookings/:id` - Get booking details

## Support

For issues related to:
- **Cal.com API:** https://cal.com/docs
- **OpenAI Agents SDK:** https://github.com/openai/agents-sdk
- **This integration:** Create an issue in the repository
