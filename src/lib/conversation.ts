import { kv } from "@vercel/kv";
import { ConversationState, Message } from "./agent-config";
import { AgentInputItem } from "@openai/agents";
import { CONVERSATION_TTL } from "./constants";

export async function getConversation(userId: string): Promise<ConversationState | null> {
  const key = `conversation:${userId}`;
  return await kv.get<ConversationState>(key);
}

export async function saveConversation(state: ConversationState): Promise<void> {
  const key = `conversation:${state.userId}`;
  await kv.set(key, state, { ex: CONVERSATION_TTL });
}

export async function clearConversation(userId: string): Promise<void> {
  const key = `conversation:${userId}`;
  await kv.del(key);
}

export async function addMessage(
  userId: string,
  message: Message,
  agentHistory: AgentInputItem[]
): Promise<ConversationState> {
  let conversation = await getConversation(userId);

  if (!conversation) {
    conversation = {
      userId,
      messages: [],
      agentHistory: []
    };
  }

  conversation.messages.push(message);
  conversation.agentHistory = agentHistory;

  await saveConversation(conversation);
  return conversation;
}
