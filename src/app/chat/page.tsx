import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';

export default async function ChatPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col">


      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
