import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { getConversation } from "@/lib/conversation";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [rateLimitStatus, conversation] = await Promise.all([
    checkRateLimit(userId),
    getConversation(userId)
  ]);

  return NextResponse.json({
    minuteRemaining: rateLimitStatus.minuteRemaining,
    dayRemaining: rateLimitStatus.dayRemaining,
    resetMinute: rateLimitStatus.resetMinute,
    resetDay: rateLimitStatus.resetDay,
    messageCount: conversation?.messages.length || 0
  });
}
