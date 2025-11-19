import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-bold">Daniel McCarthy - AI Resume</h1>
        <div className="flex gap-2 items-center">
          <ThemeToggle />
          <SignedOut>
            <SignInButton mode="modal">
              <Button>Sign In</Button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <div className="flex gap-2 items-center">
              <Link href="/chat">
                <Button variant="outline">Go to Chat</Button>
              </Link>
              <UserButton />
            </div>
          </SignedIn>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-2xl text-center space-y-6">
          <h2 className="text-4xl font-bold">
            Chat with an AI powered by my professional experience
          </h2>
          <p className="text-xl text-muted-foreground">
            Ask about my data platform architecture, AI engineering experience,
            team leadership, or technical expertise across the full data and AI
            stack.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Data Platforms</h3>
              <p className="text-sm text-muted-foreground">
                Enterprise platforms: Snowflake, Teradata, Azure Data Lake
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">AI Engineering</h3>
              <p className="text-sm text-muted-foreground">
                RAG systems, LangGraph, production ML/AI
              </p>
            </div>
            <div className="p-4 border rounded-lg">
              <h3 className="font-semibold mb-2">Team Leadership</h3>
              <p className="text-sm text-muted-foreground">
                Building high-performing technical teams
              </p>
            </div>
          </div>

          <div className="pt-6">
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="lg">Get Started</Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/chat">
                <Button size="lg">Start Chatting</Button>
              </Link>
            </SignedIn>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t p-4 text-center text-sm text-muted-foreground">
        <p>Built with Next.js, OpenAI AgentSDK, and modern web technologies</p>
      </footer>
    </div>
  );
}
