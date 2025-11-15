import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { clearConversation } from "@/lib/conversation";

export async function POST() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await clearConversation(userId);
  return NextResponse.json({ success: true });
}
