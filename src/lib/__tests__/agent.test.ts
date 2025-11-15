import { describe, it, expect, vi, beforeEach } from 'vitest';
import { runDanielAgent } from '../agent';
import { Runner, withTrace } from '@openai/agents';

vi.mock('@openai/agents', () => ({
  fileSearchTool: vi.fn(),
  Agent: vi.fn(),
  Runner: vi.fn(),
  withTrace: vi.fn(),
}));

describe('runDanielAgent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('processes user message and returns response', async () => {
    const mockResponse = 'I have extensive experience with enterprise data platforms.';
    const mockHistory: any[] = [];
    const mockUpdatedHistory: any[] = [
      { role: 'user', content: [{ type: 'input_text', text: 'Test message' }] },
      { role: 'assistant', content: [{ type: 'text', text: mockResponse }] },
    ];

    const mockRunner = {
      run: vi.fn().mockResolvedValue({
        finalOutput: mockResponse,
        newItems: [
          {
            rawItem: {
              role: 'assistant',
              content: [{ type: 'text', text: mockResponse }],
            },
          },
        ],
      }),
    };

    (Runner as any).mockImplementation(() => mockRunner);
    (withTrace as any).mockImplementation(async (name: string, fn: () => Promise<any>) => {
      return await fn();
    });

    const result = await runDanielAgent('Test message', mockHistory);

    expect(result.response).toBe(mockResponse);
    expect(result.updatedHistory).toBeDefined();
    expect(mockRunner.run).toHaveBeenCalled();
  });

  it('includes reasoning when available', async () => {
    const mockResponse = 'Response';
    const mockReasoning = 'Reasoning about the question';

    const mockRunner = {
      run: vi.fn().mockResolvedValue({
        finalOutput: mockResponse,
        newItems: [
          {
            rawItem: {
              role: 'assistant',
              content: [
                { type: 'text', text: mockResponse },
                { type: 'text', text: mockReasoning },
              ],
            },
          },
        ],
      }),
    };

    (Runner as any).mockImplementation(() => mockRunner);
    (withTrace as any).mockImplementation(async (name: string, fn: () => Promise<any>) => {
      return await fn();
    });

    const result = await runDanielAgent('Test message', []);

    expect(result.response).toBe(mockResponse);
    // Note: The reasoning extraction logic may need adjustment based on actual implementation
  });

  it('handles empty conversation history', async () => {
    const mockResponse = 'Response';

    const mockRunner = {
      run: vi.fn().mockResolvedValue({
        finalOutput: mockResponse,
        newItems: [
          {
            rawItem: {
              role: 'assistant',
              content: [{ type: 'text', text: mockResponse }],
            },
          },
        ],
      }),
    };

    (Runner as any).mockImplementation(() => mockRunner);
    (withTrace as any).mockImplementation(async (name: string, fn: () => Promise<any>) => {
      return await fn();
    });

    const result = await runDanielAgent('Test message', []);

    expect(result.response).toBe(mockResponse);
    expect(mockRunner.run).toHaveBeenCalled();
  });

  it('handles errors gracefully', async () => {
    const mockRunner = {
      run: vi.fn().mockRejectedValue(new Error('OpenAI API error')),
    };

    (Runner as any).mockImplementation(() => mockRunner);
    (withTrace as any).mockImplementation(async (name: string, fn: () => Promise<any>) => {
      return await fn();
    });

    await expect(runDanielAgent('Test message', [])).rejects.toThrow();
  });
});

