import { vi } from 'vitest'

/**
 * Chainable Supabase mock client
 * Supports: .from().select().eq().single() etc.
 */
export function createMockSupabaseClient(overrides: Record<string, unknown> = {}) {
  const mockData = overrides.data ?? null
  const mockError = overrides.error ?? null
  const mockCount = overrides.count ?? 0

  const chainable = (): Record<string, unknown> => {
    const obj: Record<string, unknown> = {
      select: vi.fn().mockReturnValue(chainable()),
      insert: vi.fn().mockReturnValue(chainable()),
      update: vi.fn().mockReturnValue(chainable()),
      upsert: vi.fn().mockReturnValue(chainable()),
      delete: vi.fn().mockReturnValue(chainable()),
      eq: vi.fn().mockReturnValue(chainable()),
      neq: vi.fn().mockReturnValue(chainable()),
      gt: vi.fn().mockReturnValue(chainable()),
      lt: vi.fn().mockReturnValue(chainable()),
      gte: vi.fn().mockReturnValue(chainable()),
      lte: vi.fn().mockReturnValue(chainable()),
      in: vi.fn().mockReturnValue(chainable()),
      order: vi.fn().mockReturnValue(chainable()),
      limit: vi.fn().mockReturnValue(chainable()),
      range: vi.fn().mockReturnValue(chainable()),
      single: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
      maybeSingle: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
      then: vi
        .fn()
        .mockImplementation((resolve: (value: unknown) => unknown) =>
          Promise.resolve(resolve({ data: mockData, error: mockError, count: mockCount }))
        ),
    }
    return obj
  }

  return {
    from: vi.fn().mockReturnValue(chainable()),
    rpc: vi.fn().mockResolvedValue({ data: mockData, error: mockError }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      signUp: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: {}, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({
        data: { subscription: { unsubscribe: vi.fn() } },
      }),
    },
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
    removeChannel: vi.fn(),
  }
}

/**
 * Use in test files: vi.mock('../../lib/supabase', () => ({ supabase: createMockSupabaseClient() }))
 */
export const mockSupabase = createMockSupabaseClient()
