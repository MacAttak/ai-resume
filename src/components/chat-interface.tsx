'use client';

import { useState, useEffect } from 'react';
import { MessageList } from './message-list';
import { ChatInput } from './chat-input';
import { UsageDisplay } from './usage-display';
import { BookingButton } from './booking-button';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { AlertCircle, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

export function ChatInterface() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const { toast } = useToast();
  const [usage, setUsage] = useState({
    minuteRemaining: 10,
    dayRemaining: 100,
  });

  // Load conversation history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const response = await fetch('/api/conversation');
        if (response.ok) {
          const data = await response.json();
          if (data.messages && Array.isArray(data.messages)) {
            // Convert stored messages to display format
            const displayMessages: Message[] = data.messages.map(
              (msg: any) => ({
                role: msg.role,
                content: msg.content,
              })
            );
            setMessages(displayMessages);
          }
          if (data.usage) {
            setUsage(data.usage);
          }
        }
      } catch (err) {
        console.error('Failed to load conversation history:', err);
      } finally {
        setIsLoadingHistory(false);
      }
    }

    loadHistory();
  }, []);

  const sendMessage = async (messageText: string, restoreInput?: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage = messageText.trim();
    setInput('');
    setError(null);

    // Add user message to chat immediately
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    // Add placeholder for streaming response
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        // Remove both user and placeholder messages on error
        setMessages((prev) => prev.slice(0, -2));

        const errorData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          setError(
            `Rate limit exceeded. ${errorData.dayRemaining || 0} messages remaining today.`
          );
        } else {
          setError(errorData.error || 'An error occurred');
        }
        // Restore input on error if provided
        if (restoreInput !== undefined) {
          setInput(restoreInput);
        }
        setIsLoading(false);
        return;
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) {
        throw new Error('No response body');
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'content') {
                // Update streaming message (immutable update)
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  if (
                    lastIndex >= 0 &&
                    newMessages[lastIndex].role === 'assistant'
                  ) {
                    newMessages[lastIndex] = {
                      ...newMessages[lastIndex],
                      content: newMessages[lastIndex].content + data.content,
                    };
                  }
                  return newMessages;
                });
              } else if (data.type === 'done') {
                // Update usage stats
                if (data.usage) {
                  setUsage({
                    minuteRemaining: data.usage.minuteRemaining,
                    dayRemaining: data.usage.dayRemaining,
                  });
                }
                setIsLoading(false);
              } else if (data.type === 'error') {
                setIsLoading(false);
                throw new Error(data.error || 'Stream error');
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      }
    } catch (err) {
      // Remove both user and placeholder messages on error
      setMessages((prev) => prev.slice(0, -2));
      setError('Failed to send message. Please try again.');
      console.error('Chat error:', err);
      // Restore input on error if provided
      if (restoreInput !== undefined) {
        setInput(restoreInput);
      }
      setIsLoading(false);
    }
  };

  const handleSubmit = async () => {
    await sendMessage(input, input);
  };

  const handleClearConversation = async () => {
    try {
      await fetch('/api/conversation/clear', { method: 'POST' });
      setMessages([]);
      setError(null);
    } catch (err) {
      console.error('Clear conversation error:', err);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      {/* Header - Fixed at top */}
      <div className="flex-shrink-0 flex justify-between items-center px-4 py-3 border-b bg-background">
        <h1 className="text-xl md:text-2xl font-bold">
          Chat with Daniel McCarthy
        </h1>
        <div className="flex gap-2 items-center">
          <UsageDisplay usage={usage} />
          <BookingButton />
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearConversation}
            disabled={messages.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Clear Chat</span>
          </Button>
        </div>
      </div>

      {/* Error Alert - Fixed below header */}
      {error && (
        <div className="flex-shrink-0 px-4 pt-3">
          <Alert variant="destructive" className="mb-0">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Messages Area - Scrollable, takes remaining space */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {isLoadingHistory ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-muted-foreground">Loading conversation...</div>
          </div>
        ) : messages.length === 0 && !isLoading ? (
          <div className="h-full flex items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-lg">
              <div>
                <h2 className="text-2xl font-semibold mb-2">
                  Start a conversation
                </h2>
                <p className="text-muted-foreground">
                  Ask me about my experience with data platforms, AI
                  engineering, team leadership, or any of my technical projects.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {[
                  'What data platforms have you worked with?',
                  'Tell me about your AI engineering experience',
                  "What's your leadership philosophy?",
                  'I want to book a time to chat with the real Dan!',
                ].map((suggestion, i) => (
                  <Button
                    key={i}
                    variant="outline"
                    className="text-left justify-start h-auto py-3 px-4 whitespace-normal hover:bg-accent transition-colors"
                    onClick={() => sendMessage(suggestion)}
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            isLoading={isLoading}
            onRegenerate={async (messageIndex) => {
              // Find the user message that prompted this response
              const userMessageIndex = messageIndex - 1;
              if (
                userMessageIndex >= 0 &&
                messages[userMessageIndex]?.role === 'user'
              ) {
                const userMessage = messages[userMessageIndex].content;
                // Remove the assistant message and regenerate
                setMessages((prev) => prev.slice(0, messageIndex));
                setIsLoading(true);
                await sendMessage(userMessage);
              } else {
                toast({
                  title: 'Cannot regenerate',
                  description: 'This message cannot be regenerated.',
                  variant: 'destructive',
                });
              }
            }}
            onFeedback={(messageIndex, positive) => {
              // Log feedback (could send to analytics API)
              console.log(
                `Feedback for message ${messageIndex}: ${positive ? 'positive' : 'negative'}`
              );
              toast({
                title: positive
                  ? 'Thanks for your feedback!'
                  : 'Feedback received',
                description: positive
                  ? "We're glad this was helpful."
                  : "We'll use this to improve responses.",
              });
            }}
          />
        )}
      </div>

      {/* Input - Fixed at bottom, always visible */}
      <div className="flex-shrink-0 border-t bg-background p-4 z-10">
        <ChatInput
          value={input}
          onChange={setInput}
          onSubmit={handleSubmit}
          disabled={isLoading}
        />
      </div>
    </div>
  );
}
