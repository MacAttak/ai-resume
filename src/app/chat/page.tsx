import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { ChatInterface } from '@/components/chat-interface';
import { UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';

export default async function ChatPage() {
  const { userId } = await auth();
  if (!userId) redirect('/');

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="border-b p-4 flex justify-between items-center">
        <Link href="/" className="text-xl font-bold hover:underline">
          Daniel McCarthy - AI Resume
        </Link>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <UserButton />
        </div>
      </header>

      {/* Chat Interface */}
      <div className="flex-1 overflow-hidden">
        <ChatInterface />
      </div>
    </div>
  );
}
