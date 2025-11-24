import '@testing-library/jest-dom';
import { vi } from 'vitest';
import { ReadableStream } from 'node:stream/web';
import { TextEncoder, TextDecoder } from 'node:util';

// Polyfill ReadableStream for tests
global.ReadableStream = ReadableStream as any;
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
  }),
  usePathname: () => '/chat',
  useSearchParams: () => new URLSearchParams(),
}));

// Mock Clerk
vi.mock('@clerk/nextjs', () => ({
  useUser: () => ({
    user: {
      id: 'test-user-id',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
    },
    isLoaded: true,
  }),
  useAuth: () => ({
    userId: 'test-user-id',
    isLoaded: true,
  }),
  ClerkProvider: ({ children }: { children: React.ReactNode }) => children,
  UserButton: ({ children }: { children?: React.ReactNode }) =>
    children || null,
}));

// Mock HoneyHive instrumentation (prevents OpenTelemetry errors in tests)
vi.mock('@/instrumentation', () => ({
  getHoneyHiveTracer: () => null,
  register: vi.fn(),
}));

// Mock environment variables
process.env.OPENAI_API_KEY = 'test-openai-key';
process.env.CLERK_SECRET_KEY = 'test-clerk-secret';
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'test-clerk-publishable';
process.env.KV_REST_API_URL = 'https://test-redis.upstash.io';
process.env.KV_REST_API_TOKEN = 'test-redis-token';
