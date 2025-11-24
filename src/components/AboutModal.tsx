import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Info,
  Github,
  BookOpen,
  Cpu,
  Shield,
  Zap,
  Database,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function AboutModal({
  children,
}: {
  readonly children?: React.ReactNode;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" title="About Agent McCarthy">
            <Info className="h-5 w-5" />
            <span className="sr-only">About Agent McCarthy</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">
            About Agent McCarthy
          </DialogTitle>
          <DialogDescription className="text-center text-base mt-2">
            An interactive career agent powered by advanced AI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8 py-4">
          {/* AI Developed Preamble */}
          <div className="bg-primary/5 p-6 rounded-xl border border-primary/10 text-center">
            <p className="text-sm leading-relaxed text-muted-foreground">
              <span className="font-semibold text-foreground">
                AI Native Development:
              </span>{' '}
              This entire application was architected and built by AI agents (
              <span className="font-medium text-foreground">Claude Code</span>{' '}
              and{' '}
              <span className="font-medium text-foreground">
                Google Antigravity
              </span>
              ) under the guidance of Daniel McCarthy. It demonstrates the
              potential of human-AI collaboration in modern software
              engineering.
            </p>
          </div>

          {/* Technical Highlights Grid */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Cpu className="h-5 w-5 text-primary" />
              Technical Highlights
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Database className="h-4 w-4 text-primary" />
                    AI Stack
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Built with Next.js 14 (App Router), OpenAI AgentSDK for
                  orchestration, and Vercel AI SDK for streaming responses.
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" />
                    RAG Architecture
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Retrieval-Augmented Generation using vector embeddings to
                  ground responses in Daniel's actual professional experience.
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Security & Auth
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Secure authentication via Clerk, with robust rate limiting and
                  edge middleware protection.
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-primary" />
                    Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  Optimized for edge deployment on Vercel with sub-second
                  latency and streaming UI updates.
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Code & Docs - Centered */}
          <div className="text-center space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold">
              Source Code & Documentation
            </h3>
            <p className="text-sm text-muted-foreground max-w-lg mx-auto">
              Explore the codebase and detailed technical documentation to see
              how this agent was built.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                variant="outline"
                className="inline-flex items-center gap-2"
                asChild
              >
                <a
                  href="https://deepwiki.com/MacAttak/ai-resume"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <BookOpen className="h-5 w-5" />
                  <span>Read the Docs</span>
                </a>
              </Button>
              <Button
                variant="outline"
                className="inline-flex items-center gap-2"
                asChild
              >
                <a
                  href="https://github.com/MacAttak/ai-resume"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <Github className="h-5 w-5" />
                  <span>View on GitHub</span>
                </a>
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
