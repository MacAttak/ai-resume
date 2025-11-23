import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Info } from "lucide-react";
import Link from "next/link";

interface AboutModalProps {
  children?: React.ReactNode;
}

export function AboutModal({ children }: AboutModalProps) {
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
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold flex items-center gap-2">
            🤖 Agent McCarthy
          </DialogTitle>
          <DialogDescription>
            A production-grade conversational AI platform demonstrating enterprise-level AI engineering.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="bg-muted/50 p-4 rounded-lg border">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              ✨ AI Developed
            </h3>
            <p className="text-sm text-muted-foreground text-left">
              This entire application was architected and built by AI agents (Claude Code and Google Antigravity) 
              under the guidance of Daniel McCarthy. It serves as a living demonstration of modern AI-assisted 
              software engineering.
            </p>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Technical Highlights</h3>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <li className="flex gap-2">
                <span className="font-medium">🧠 AI Stack:</span>
                <span className="text-muted-foreground">OpenAI AgentSDK + GPT-5 (o3-mini)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">🔍 RAG:</span>
                <span className="text-muted-foreground">Hybrid vector/keyword file search</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">⚡ Performance:</span>
                <span className="text-muted-foreground">&lt;2s response, streaming, edge deployed</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium">🛡️ Security:</span>
                <span className="text-muted-foreground">Clerk Auth, Rate Limiting, Input Validation</span>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Source Code & Docs</h3>
            <div className="flex flex-wrap gap-4">
              <Button asChild variant="outline">
                <Link href="https://github.com/MacAttak/ai-resume" target="_blank" rel="noopener noreferrer">
                  View on GitHub
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="https://deepwiki.com/MacAttak/ai-resume" target="_blank" rel="noopener noreferrer">
                  Read Documentation
                </Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Transparency is key. Explore the codebase to understand how enterprise-grade AI agents are built.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
