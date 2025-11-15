import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { runDanielAgent } from "@/lib/agent";
import { checkRateLimit } from "@/lib/rate-limit";
import { getConversation, addMessage } from "@/lib/conversation";

export const runtime = "nodejs"; // Agent SDK requires Node runtime
export const maxDuration = 30; // 30 second timeout for agent processing

export async function POST(req: NextRequest) {
  try {
    // 1. Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Check rate limits
    const rateLimitStatus = await checkRateLimit(userId);
    if (!rateLimitStatus.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          minuteRemaining: rateLimitStatus.minuteRemaining,
          dayRemaining: rateLimitStatus.dayRemaining,
          resetMinute: rateLimitStatus.resetMinute,
          resetDay: rateLimitStatus.resetDay
        },
        { status: 429 }
      );
    }

    // 3. Parse request
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "Invalid message" },
        { status: 400 }
      );
    }

    // 4. Get conversation history
    const conversation = await getConversation(userId);
    const agentHistory = conversation?.agentHistory || [];

    // 5. Run agent
    const startTime = Date.now();
    const { response, updatedHistory, reasoning } = await runDanielAgent(
      message,
      agentHistory
    );
    const latency = Date.now() - startTime;

    // 6. Save conversation state
    await addMessage(
      userId,
      { role: "user", content: message, timestamp: new Date() },
      updatedHistory
    );
    await addMessage(
      userId,
      { role: "assistant", content: response, timestamp: new Date() },
      updatedHistory
    );

    // 7. Return response with metadata
    return NextResponse.json({
      response,
      reasoning,
      latency,
      usage: {
        minuteRemaining: rateLimitStatus.minuteRemaining - 1,
        dayRemaining: rateLimitStatus.dayRemaining - 1,
        resetMinute: rateLimitStatus.resetMinute,
        resetDay: rateLimitStatus.resetDay
      }
    });

  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
