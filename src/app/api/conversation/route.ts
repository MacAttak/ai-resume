import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getConversation } from "@/lib/conversation";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET() {
  try {
    // 1. Verify authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 2. Get conversation history
    const conversation = await getConversation(userId);

    // 3. Get current rate limit status
    const rateLimitStatus = await checkRateLimit(userId);

    return NextResponse.json({
      messages: conversation?.messages || [],
      usage: {
        minuteRemaining: rateLimitStatus.minuteRemaining,
        dayRemaining: rateLimitStatus.dayRemaining,
        resetMinute: rateLimitStatus.resetMinute,
        resetDay: rateLimitStatus.resetDay
      }
    });

  } catch (error) {
    console.error("Conversation API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

