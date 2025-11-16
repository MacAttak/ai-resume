"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "./ui/scroll-area";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Streamdown } from "streamdown";
import { Copy, Check, RotateCcw, ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
  id?: string;
};

function MessageActions({
  message,
  onCopy,
  onRegenerate,
  onFeedback
}: {
  message: Message;
  onCopy: () => void;
  onRegenerate?: () => void;
  onFeedback?: (positive: boolean) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={onCopy}>
          <Copy className="h-4 w-4 mr-2" />
          Copy message
        </DropdownMenuItem>
        {message.role === "assistant" && onRegenerate && (
          <DropdownMenuItem onClick={onRegenerate}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Regenerate
          </DropdownMenuItem>
        )}
        {message.role === "assistant" && onFeedback && (
          <>
            <DropdownMenuItem onClick={() => onFeedback(true)}>
              <ThumbsUp className="h-4 w-4 mr-2" />
              Helpful
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onFeedback(false)}>
              <ThumbsDown className="h-4 w-4 mr-2" />
              Not helpful
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MessageList({
  messages,
  isLoading,
  onRegenerate,
  onFeedback
}: {
  messages: Message[];
  isLoading: boolean;
  onRegenerate?: (messageIndex: number) => void;
  onFeedback?: (messageIndex: number, positive: boolean) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      const scrollElement = scrollRef.current;
      scrollElement.scrollTop = scrollElement.scrollHeight;
    }
  }, [messages, isLoading]);

  const handleCopy = async (content: string, index: number) => {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <ScrollArea className="h-full pr-4" ref={scrollRef}>
      <div className="space-y-6 py-4 px-4">
        {messages.map((message, index) => (
          <div
            key={`${index}-${message.content.length}`}
            className={`group flex gap-3 ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.role === "assistant" && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  DM
                </AvatarFallback>
              </Avatar>
            )}

            <div className="flex flex-col gap-1 max-w-[85%]">
              <div
                className={`rounded-2xl px-4 py-3 text-left ${
                  message.role === "user"
                    ? "bg-primary"
                    : "bg-muted"
                }`}
              >
                {message.role === "user" ? (
                  // User messages: simple text, no markdown - ensure good contrast and left alignment
                  <div 
                    className="whitespace-pre-wrap break-words text-left" 
                    style={{ color: 'hsl(var(--primary-foreground))' }}
                  >
                    {message.content}
                  </div>
                ) : (
                  // Assistant messages: render with Streamdown (handles streaming markdown)
                  // Streamdown includes remarkGfm, remarkMath, and other plugins by default
                  <Streamdown isAnimating={isLoading && index === messages.length - 1}>
                    {message.content || ""}
                  </Streamdown>
                )}
              </div>
              
              {/* Message Actions */}
              {message.role === "assistant" && (
                <div className="flex items-center gap-2 px-1">
                  <MessageActions
                    message={message}
                    onCopy={() => handleCopy(message.content, index)}
                    onRegenerate={onRegenerate ? () => onRegenerate(index) : undefined}
                    onFeedback={onFeedback ? (positive) => onFeedback(index, positive) : undefined}
                  />
                  {copiedIndex === index && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      Copied
                    </span>
                  )}
                </div>
              )}
            </div>

            {message.role === "user" && (
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                  You
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 flex-shrink-0">
              <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                DM
              </AvatarFallback>
            </Avatar>
            <div className="rounded-2xl px-4 py-3 bg-muted">
              <div className="flex items-center gap-2">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <div className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span className="text-xs text-muted-foreground ml-2">Thinking...</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
