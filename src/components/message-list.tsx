'use client';

import { useEffect, useRef, useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Streamdown } from 'streamdown';
import { Copy, Check, RotateCcw, ThumbsUp, ThumbsDown, Bot } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { MoreVertical } from 'lucide-react';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  id?: string;
};

function MessageActions({
  message,
  onCopy,
  onRegenerate,
  onFeedback,
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
        {message.role === 'assistant' && onRegenerate && (
          <DropdownMenuItem onClick={onRegenerate}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Regenerate
          </DropdownMenuItem>
        )}
        {message.role === 'assistant' && onFeedback && (
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
  onFeedback,
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
        {messages.map((message, index) => {
          // Don't render empty assistant messages (placeholders for streaming)
          if (message.role === 'assistant' && !message.content) return null;

          return (
            <div
              key={message.id ?? `msg-${index}`}
              className={`group flex gap-3 ${
                message.role === 'user' ? 'justify-end animate-slide-in-bottom' : 'justify-start animate-slide-in-left'
              }`}
            >
              {message.role === 'assistant' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">DM</AvatarFallback>
                  <AvatarImage src="/macattak.png" alt="Agent McCarthy" className="absolute inset-0" />
                </Avatar>
              )}

              <div className="flex flex-col gap-1 max-w-[85%]">
                <div
                  className={`px-4 py-3 text-left ${
                    message.role === 'user' ? 'rounded-2xl rounded-tr-md bg-primary' : 'rounded-2xl rounded-tl-md bg-primary/5'
                  }`}
                >
                  {message.role === 'user' ? (
                    // User messages: simple text, no markdown - ensure good contrast and left alignment
                    <div className="whitespace-pre-wrap break-words text-left text-primary-foreground">
                      {message.content}
                    </div>
                  ) : (
                    // Assistant messages: render with Streamdown (handles streaming markdown)
                    // Streamdown includes remarkGfm, remarkMath, and other plugins by default
                    <Streamdown
                      isAnimating={isLoading && index === messages.length - 1}
                    >
                      {message.content || ''}
                    </Streamdown>
                  )}
                </div>

                {/* Message Actions */}
                {message.role === 'assistant' && (
                  <div className="flex items-center gap-2 px-1">
                    <MessageActions
                      message={message}
                      onCopy={() => handleCopy(message.content, index)}
                      onRegenerate={
                        onRegenerate ? () => onRegenerate(index) : undefined
                      }
                      onFeedback={
                        onFeedback
                          ? (positive) => onFeedback(index, positive)
                          : undefined
                      }
                    />
                    {copiedIndex === index && (
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Copied
                      </span>
                    )}
                    <span className="flex items-center gap-1 ml-auto">
                      <Bot className="h-3 w-3 text-primary/40" />
                      <span className="text-[10px] text-muted-foreground/70">AI-generated</span>
                    </span>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">
                    You
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          );
        })}

        {isLoading &&
          (!messages.length ||
            messages.at(-1)?.role !== 'assistant' ||
            !messages.at(-1)?.content) && (
            <div className="flex gap-3">
              <Avatar className="h-8 w-8 flex-shrink-0">
                <AvatarFallback className="text-xs bg-primary/10 text-primary font-semibold">DM</AvatarFallback>
                <AvatarImage src="/macattak.png" alt="Agent McCarthy" className="absolute inset-0" />
              </Avatar>
              <div className="rounded-2xl rounded-tl-md px-4 py-3 bg-primary/5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 bg-[length:200%_100%] animate-shimmer" />
                  <span className="text-xs text-muted-foreground">
                    Thinking...
                  </span>
                </div>
              </div>
            </div>
          )}
      </div>
    </ScrollArea>
  );
}
