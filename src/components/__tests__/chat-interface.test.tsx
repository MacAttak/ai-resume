import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInterface } from '../chat-interface';

// Mock fetch globally
global.fetch = vi.fn();

describe('ChatInterface', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockClear();
  });

  it('renders empty state with suggested questions', () => {
    render(<ChatInterface />);

    expect(screen.getByText('Start a conversation')).toBeInTheDocument();
    expect(screen.getByText(/Ask me about my experience/)).toBeInTheDocument();
    expect(screen.getByText("What data platforms have you worked with?")).toBeInTheDocument();
    expect(screen.getByText("Tell me about your AI engineering experience")).toBeInTheDocument();
    expect(screen.getByText("What's your leadership philosophy?")).toBeInTheDocument();
  });

  it('displays usage information', () => {
    render(<ChatInterface />);

    expect(screen.getByText(/100 \/ 100 messages today/)).toBeInTheDocument();
  });

  it('sends message when form is submitted', async () => {
    const user = userEvent.setup();
    const mockResponse = {
      response: 'Test response from Daniel',
      usage: {
        minuteRemaining: 9,
        dayRemaining: 99,
      },
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<ChatInterface />);

    const input = screen.getByPlaceholderText(/Ask about Daniel's experience/);
    await user.type(input, 'What is your experience?');
    
    // Find submit button by type
    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'What is your experience?' }),
      });
    });
  });

  it('displays error message when API call fails', async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Internal server error' }),
    });

    render(<ChatInterface />);

    const input = screen.getByPlaceholderText(/Ask about Daniel's experience/);
    await user.type(input, 'Test message');
    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Internal server error')).toBeInTheDocument();
    });
  });

  it('displays rate limit error with remaining count', async () => {
    const user = userEvent.setup();

    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({
        error: 'Rate limit exceeded',
        dayRemaining: 45,
      }),
    });

    render(<ChatInterface />);

    const input = screen.getByPlaceholderText(/Ask about Daniel's experience/);
    await user.type(input, 'Test message');
    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Rate limit exceeded.*45 messages remaining today/)).toBeInTheDocument();
    });
  });

  it('clears conversation when clear button is clicked', async () => {
    const user = userEvent.setup();

    // First send a message
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        response: 'Response',
        usage: { minuteRemaining: 9, dayRemaining: 99 },
      }),
    });

    render(<ChatInterface />);

    const input = screen.getByPlaceholderText(/Ask about Daniel's experience/);
    await user.type(input, 'Test message');
    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('Response')).toBeInTheDocument();
    });

    // Mock clear conversation
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
    });

    const clearButton = screen.getByRole('button', { name: /clear chat/i });
    await user.click(clearButton);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/conversation/clear', {
        method: 'POST',
      });
    });
  });

  it('disables input while loading', async () => {
    const user = userEvent.setup();

    let resolvePromise: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as any).mockReturnValueOnce(pendingPromise);

    render(<ChatInterface />);

    const input = screen.getByPlaceholderText(/Ask about Daniel's experience/);
    await user.type(input, 'Test message');
    const submitButton = screen.getByRole('button', { name: '' });
    await user.click(submitButton);

    await waitFor(() => {
      expect(input).toBeDisabled();
    });

    // Resolve the promise
    resolvePromise!({
      ok: true,
      json: async () => ({
        response: 'Response',
        usage: { minuteRemaining: 9, dayRemaining: 99 },
      }),
    });

    await waitFor(() => {
      expect(input).not.toBeDisabled();
    });
  });
});

