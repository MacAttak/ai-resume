import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import Link from 'next/link';
import { AboutModal } from '@/components/AboutModal';
import Image from 'next/image';
import { Database, Brain, Users } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b p-4 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Agent McCarthy</h1>
        <div className="flex gap-2 items-center">
          <AboutModal />
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
        <div className="max-w-3xl text-center space-y-8 relative">
          {/* Background glow */}
          <div className="absolute inset-0 -z-10 flex items-center justify-center">
            <div className="w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          </div>

          {/* Mascot hero */}
          <div className="flex justify-center">
            <Image
              src="/macattak.png"
              alt="Agent McCarthy"
              width={160}
              height={160}
              className="rounded-full shadow-xl ring-4 ring-primary/20"
              priority
            />
          </div>

          {/* Gradient heading */}
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Chat with Agent McCarthy
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Ask about my data platform architecture, AI engineering experience,
            team leadership, or technical expertise across the full data and AI
            stack.
          </p>

          {/* Feature cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <div className="p-5 bg-primary/5 border border-primary/10 hover:bg-primary/10 rounded-xl transition-colors">
              <Database className="h-6 w-6 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Data Platforms</h3>
              <p className="text-sm text-muted-foreground">
                Enterprise platforms: Snowflake, Teradata, AWS &amp; Azure
              </p>
            </div>
            <div className="p-5 bg-primary/5 border border-primary/10 hover:bg-primary/10 rounded-xl transition-colors">
              <Brain className="h-6 w-6 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">AI Engineering</h3>
              <p className="text-sm text-muted-foreground">
                RAG systems, LangGraph, production ML/AI
              </p>
            </div>
            <div className="p-5 bg-primary/5 border border-primary/10 hover:bg-primary/10 rounded-xl transition-colors">
              <Users className="h-6 w-6 text-primary mx-auto mb-3" />
              <h3 className="font-semibold mb-2">Team Leadership</h3>
              <p className="text-sm text-muted-foreground">
                Building high-performing technical teams
              </p>
            </div>
          </div>

          {/* CTA buttons */}
          <div className="pt-6 flex flex-wrap justify-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <Button size="lg" className="rounded-xl px-8">
                  Get Started
                </Button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link href="/chat">
                <Button size="lg" className="rounded-xl px-8">
                  Start Chatting
                </Button>
              </Link>
            </SignedIn>
            <AboutModal>
              <Button variant="outline" size="lg" className="rounded-xl px-8">
                About Project
              </Button>
            </AboutModal>
          </div>
        </div>
      </main>
    </div>
  );
}
