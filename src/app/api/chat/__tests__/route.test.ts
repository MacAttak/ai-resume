import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { auth } from '@clerk/nextjs/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { getConversation, addMessage } from '@/lib/conversation';
import { runDanielAgent } from '@/lib/agent';

// Mock all dependencies
vi.mock('@clerk/nextjs/server');
vi.mock('@/lib/rate-limit');
vi.mock('@/lib/conversation');
vi.mock('@/lib/agent');

describe('POST /api/chat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 if user is not authenticated', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'test message' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 429 if rate limit is exceeded', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-123' } as any);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: false,
      minuteRemaining: 0,
      dayRemaining: 50,
      resetMinute: new Date(Date.now() + 60000),
      resetDay: new Date(Date.now() + 86400000),
    });

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'test message' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(429);
    expect(data.error).toBe('Rate limit exceeded');
    expect(data.minuteRemaining).toBe(0);
    expect(data.dayRemaining).toBe(50);
  });

  it('returns 400 if message is missing', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-123' } as any);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      minuteRemaining: 10,
      dayRemaining: 100,
      resetMinute: new Date(Date.now() + 60000),
      resetDay: new Date(Date.now() + 86400000),
    });

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid message');
  });

  it('returns 400 if message is not a string', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-123' } as any);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      minuteRemaining: 10,
      dayRemaining: 100,
      resetMinute: new Date(Date.now() + 60000),
      resetDay: new Date(Date.now() + 86400000),
    });

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 123 }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid message');
  });

  it('successfully processes a valid chat message', async () => {
    const userId = 'user-123';
    const testMessage = 'What is your experience with data platforms?';
    const mockResponse = 'I have extensive experience with enterprise data platforms...';
    const mockHistory: any[] = [];

    vi.mocked(auth).mockResolvedValue({ userId } as any);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      minuteRemaining: 10,
      dayRemaining: 100,
      resetMinute: new Date(Date.now() + 60000),
      resetDay: new Date(Date.now() + 86400000),
    });
    vi.mocked(getConversation).mockResolvedValue({
      userId,
      messages: [],
      agentHistory: mockHistory,
    });
    vi.mocked(runDanielAgent).mockResolvedValue({
      response: mockResponse,
      updatedHistory: mockHistory,
      reasoning: 'Reasoning about data platforms',
    });
    vi.mocked(addMessage).mockResolvedValue({
      userId,
      messages: [],
      agentHistory: mockHistory,
    });

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: testMessage }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.response).toBe(mockResponse);
    expect(data.reasoning).toBe('Reasoning about data platforms');
    expect(data.latency).toBeGreaterThanOrEqual(0);
    expect(data.usage).toBeDefined();
    expect(data.usage.minuteRemaining).toBe(9);
    expect(data.usage.dayRemaining).toBe(99);

    // Verify agent was called correctly
    expect(runDanielAgent).toHaveBeenCalledWith(testMessage, mockHistory);
    expect(addMessage).toHaveBeenCalledTimes(2); // User message + assistant response
  });

  it('handles conversation history correctly', async () => {
    const userId = 'user-123';
    const existingHistory: any[] = [
      { role: 'user', content: [{ type: 'input_text', text: 'Previous message' }] },
    ];

    vi.mocked(auth).mockResolvedValue({ userId } as any);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      minuteRemaining: 10,
      dayRemaining: 100,
      resetMinute: new Date(Date.now() + 60000),
      resetDay: new Date(Date.now() + 86400000),
    });
    vi.mocked(getConversation).mockResolvedValue({
      userId,
      messages: [],
      agentHistory: existingHistory,
    });
    vi.mocked(runDanielAgent).mockResolvedValue({
      response: 'Response',
      updatedHistory: existingHistory,
    });
    vi.mocked(addMessage).mockResolvedValue({
      userId,
      messages: [],
      agentHistory: existingHistory,
    });

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'New message' }),
    });

    await POST(request);

    expect(runDanielAgent).toHaveBeenCalledWith('New message', existingHistory);
  });

  it('returns 500 on internal server error', async () => {
    vi.mocked(auth).mockResolvedValue({ userId: 'user-123' } as any);
    vi.mocked(checkRateLimit).mockRejectedValue(new Error('Rate limit error'));

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'test message' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });

  it('handles agent execution errors gracefully', async () => {
    const userId = 'user-123';

    vi.mocked(auth).mockResolvedValue({ userId } as any);
    vi.mocked(checkRateLimit).mockResolvedValue({
      allowed: true,
      minuteRemaining: 10,
      dayRemaining: 100,
      resetMinute: new Date(Date.now() + 60000),
      resetDay: new Date(Date.now() + 86400000),
    });
    vi.mocked(getConversation).mockResolvedValue({
      userId,
      messages: [],
      agentHistory: [],
    });
    vi.mocked(runDanielAgent).mockRejectedValue(new Error('OpenAI API error'));

    const request = new NextRequest('http://localhost/api/chat', {
      method: 'POST',
      body: JSON.stringify({ message: 'test message' }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});

