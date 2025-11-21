# AI Resume - Chat with Daniel McCarthy

An AI-powered resume assistant built with Next.js, OpenAI AgentSDK, and modern web technologies.

## Architecture

```
Next.js (Vercel) → OpenAI AgentSDK → GPT-5 + File Search + Cal.com Tools
        ↓                                    ↓
Clerk Auth + Upstash Redis              Cal.com API v2
```

**📄 Full Architecture Documentation:** [docs/architecture.md](docs/architecture.md)

## Tech Stack

- **Framework**: Next.js 16 with App Router
- **UI**: Tailwind CSS + shadcn/ui components + Dark Mode
- **Auth**: Clerk
- **AI Agent**: OpenAI AgentSDK with File Search + Custom Cal.com Tools
- **Meeting Booking**: Cal.com API v2
- **Rate Limiting**: Upstash Redis
- **Conversation State**: Upstash Redis (via Vercel KV SDK)
- **Deployment**: Vercel

## Project Status: ✅ COMPLETE & PRODUCTION READY

### ✅ All Features Implemented

1. **Project Setup** ✅
   - Next.js 16 project with TypeScript and React 19
   - Tailwind CSS configuration
   - All dependencies installed

2. **Backend/API** ✅
   - Agent module with OpenAI AgentSDK ([src/lib/agent.ts](src/lib/agent.ts))
   - Cal.com integration with custom agent tools ([src/lib/cal-tools.ts](src/lib/cal-tools.ts), [src/lib/cal-client.ts](src/lib/cal-client.ts))
   - Conversation state management ([src/lib/conversation.ts](src/lib/conversation.ts))
   - Rate limiting with Redis ([src/lib/rate-limit.ts](src/lib/rate-limit.ts))
   - Chat API route with streaming ([src/app/api/chat/stream/route.ts](src/app/api/chat/stream/route.ts))
   - Usage stats endpoint ([src/app/api/usage/route.ts](src/app/api/usage/route.ts))
   - Clear conversation endpoint ([src/app/api/conversation/clear/route.ts](src/app/api/conversation/clear/route.ts))
   - Cal.com webhook handler ([src/app/api/cal/webhook/route.ts](src/app/api/cal/webhook/route.ts))

3. **Frontend Components** ✅
   - shadcn/ui base components (Button, Input, Card, Textarea, Alert, Badge, Avatar, Dialog)
   - Chat interface with modern UX and streaming
   - Message list with markdown rendering & syntax highlighting
   - Usage stats display with quota badges
   - Auto-resizing chat input
   - Dark mode support with toggle
   - Meeting booking button with Cal.com embed modal

4. **Authentication & Pages** ✅
   - Clerk authentication integrated
   - Landing page with feature highlights
   - Protected chat page
   - Middleware for route protection

5. **Modern UX Enhancements** ✅
   - Dark mode toggle (light/dark/system)
   - Code syntax highlighting with copy button
   - Auto-scroll to latest message
   - Suggested questions that work
   - Improved message bubbles and spacing
   - Theme-aware components

6. **AI-Powered Meeting Booking** ✅
   - Conversational booking through AI agent
   - Custom Cal.com tools for availability checking and booking
   - Smart timezone handling (UTC internal, Sydney display)
   - Tool-based time conversion (no LLM calculations)
   - 24-hour minimum notice enforcement
   - Network resilience with retry logic
   - Inline Cal.com booking embed as fallback
   - Webhook integration for booking events
   - **📄 Full Cal.com Integration Guide:** [docs/CALCOM_INTEGRATION.md](docs/CALCOM_INTEGRATION.md)

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

You'll need:

- OpenAI API key and project ID
- Clerk publishable and secret keys
- Upstash Redis URL and token
- Vercel KV credentials (auto-added when deploying)
- Cal.com API key and event type IDs (for meeting booking)

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

| Variable                            | Description                                          | Required |
| ----------------------------------- | ---------------------------------------------------- | -------- |
| `OPENAI_API_KEY`                    | OpenAI API key for AgentSDK                          | Yes      |
| `OPENAI_PROJECT_ID`                 | OpenAI project ID (optional, for project resources)  | No       |
| `PRODUCTION_MODEL`                  | Production model override (default: gpt-5.1)         | No       |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key                                | Yes      |
| `CLERK_SECRET_KEY`                  | Clerk secret key                                     | Yes      |
| `UPSTASH_REDIS_REST_URL`            | Upstash Redis URL                                    | Yes      |
| `UPSTASH_REDIS_REST_TOKEN`          | Upstash Redis token                                  | Yes      |
| `KV_REST_API_URL`                   | Vercel KV URL (auto-added)                           | Yes      |
| `KV_REST_API_TOKEN`                 | Vercel KV token (auto-added)                         | Yes      |
| `CAL_API_KEY`                       | Cal.com API v2 key (for meeting booking)             | Yes*     |
| `CAL_EVENT_TYPE_ID_15MIN`           | Cal.com event type ID for 15min meetings             | Yes*     |
| `CAL_EVENT_TYPE_ID_30MIN`           | Cal.com event type ID for 30min meetings             | Yes*     |
| `NEXT_PUBLIC_CAL_USERNAME`          | Cal.com username for inline booking embed            | Yes*     |
| `CAL_WEBHOOK_SECRET`                | Cal.com webhook secret for signature verification    | No       |

\* Required for meeting booking functionality

## Features

- **AI-Powered Chat**: Chat with an AI agent trained on Daniel's professional experience
- **File Search RAG**: Retrieves accurate information from uploaded resume documents
- **Meeting Booking**: Book meetings conversationally through the AI agent or inline Cal.com embed
- **Smart Time Management**: Tool-based timezone conversion (UTC internal, Sydney display) with zero LLM calculations
- **Conversation History**: Maintains context across multiple messages
- **Rate Limiting**: 10 messages/minute, 100 messages/day per user
- **Authentication**: Secure user authentication with Clerk
- **Real-time Responses**: Streaming responses from the AI agent
- **Dark Mode**: Full theme support with light/dark/system modes
- **Network Resilience**: Automatic retries with exponential backoff for Cal.com API calls

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── cal/webhook/route.ts    # Cal.com webhook handler ✅
│   │   ├── chat/
│   │   │   └── stream/route.ts     # Streaming chat endpoint ✅
│   │   ├── conversation/
│   │   │   ├── route.ts            # Get conversation history ✅
│   │   │   └── clear/route.ts      # Clear conversation ✅
│   │   └── usage/route.ts          # Usage stats ✅
│   ├── chat/
│   │   └── page.tsx                # Protected chat page ✅
│   ├── sign-in/[[...sign-in]]/page.tsx  # Clerk sign-in ✅
│   ├── sign-up/[[...sign-up]]/page.tsx  # Clerk sign-up ✅
│   ├── layout.tsx                  # Root layout with providers ✅
│   ├── page.tsx                    # Landing page ✅
│   └── globals.css                 # Global styles ✅
├── components/
│   ├── ui/                         # shadcn/ui components ✅
│   ├── booking-button.tsx          # Meeting booking button ✅
│   ├── booking-modal.tsx           # Cal.com embed modal ✅
│   ├── chat-input.tsx              # Auto-resizing input ✅
│   ├── chat-interface.tsx          # Main chat component ✅
│   ├── message-list.tsx            # Message rendering ✅
│   ├── theme-provider.tsx          # Dark mode provider ✅
│   ├── theme-toggle.tsx            # Theme switcher ✅
│   └── usage-display.tsx           # Rate limit display ✅
├── lib/
│   ├── agent.ts                    # OpenAI AgentSDK wrapper ✅
│   ├── agent-config.ts             # Agent instructions & config ✅
│   ├── cal-client.ts               # Cal.com API client ✅
│   ├── cal-tools.ts                # Custom Cal.com agent tools ✅
│   ├── cal-types.ts                # Cal.com TypeScript types ✅
│   ├── conversation.ts             # Conversation state (Redis) ✅
│   ├── rate-limit.ts               # Rate limiting ✅
│   └── utils.ts                    # Utility functions ✅
├── middleware.ts                   # Clerk auth middleware ✅
└── docs/
    ├── architecture.md             # Architecture documentation ✅
    └── CALCOM_INTEGRATION.md       # Cal.com setup guide ✅
```

## Key Technical Decisions

### Time Management Architecture
Research showed that LLMs have architectural limitations with temporal calculations, leading to off-by-one errors and timezone mistakes. Our implementation follows industry best practices:

- **Tools handle ALL time conversions** - The LLM never calculates dates or converts timezones
- **ISO 8601 UTC internally** - All API calls use UTC timestamps with 'Z' suffix
- **Local timezone for display** - Sydney (Australia/Sydney) timezone for user-facing times
- **UTC timestamp mappings** - Tool responses include exact UTC timestamps for the LLM to copy, not calculate

This architecture eliminates LLM temporal reasoning errors while maintaining a clean UX.

### Cal.com API Integration
- **30-minute availability window** - Wide enough for Cal.com's date-grouped API while preventing race conditions
- **Network resilience** - 60s timeout, 3 retries, exponential backoff (2s, 4s, 8s)
- **Smart date regrouping** - Slots regrouped by local Sydney date instead of UTC date key
- **Dual booking paths** - Conversational AI agent tools + inline Cal.com embed fallback

See [docs/CALCOM_INTEGRATION.md](docs/CALCOM_INTEGRATION.md) for comprehensive setup and implementation details.

## Contributing

Contributions are welcome! Feel free to open issues or submit pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**Daniel McCarthy**

- GitHub: [@MacAttak](https://github.com/MacAttak)
