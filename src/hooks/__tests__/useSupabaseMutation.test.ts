import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useSupabaseMutation } from '../useSupabaseMutation'
import { clearCache } from '../useQueryCache'

beforeEach(() => {
  clearCache()
})

describe('useSupabaseMutation', () => {
  it('starts in idle state', () => {
    const mutationFn = vi.fn()
    const { result } = renderHook(() => useSupabaseMutation(mutationFn))

    expect(result.current.isLoading).toBe(false)
    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeUndefined()
  })

  it('mutateAsync executes and returns data', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: 1, name: 'test' })

    const { result } = renderHook(() => useSupabaseMutation(mutationFn))

    let data: unknown
    await act(async () => {
      data = await result.current.mutateAsync({ name: 'test' })
    })

    expect(data).toEqual({ id: 1, name: 'test' })
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data).toEqual({ id: 1, name: 'test' })
    expect(result.current.isLoading).toBe(false)
  })

  it('handles errors correctly', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('insert failed'))

    const { result } = renderHook(() => useSupabaseMutation(mutationFn))

    await act(async () => {
      try {
        await result.current.mutateAsync('bad-data')
      } catch {
        // expected
      }
    })

    expect(result.current.isError).toBe(true)
    expect(result.current.error?.message).toBe('insert failed')
    expect(result.current.isSuccess).toBe(false)
  })

  it('mutate swallows errors', async () => {
    const mutationFn = vi.fn().mockRejectedValue(new Error('fail'))

    const { result } = renderHook(() => useSupabaseMutation(mutationFn))

    // mutate should not throw
    await act(async () => {
      await result.current.mutate('data')
    })

    expect(result.current.isError).toBe(true)
  })

  it('calls onSuccess callback', async () => {
    const onSuccess = vi.fn()
    const mutationFn = vi.fn().mockResolvedValue({ id: 1 })

    const { result } = renderHook(() => useSupabaseMutation(mutationFn, { onSuccess }))

    await act(async () => {
      await result.current.mutateAsync({ name: 'test' })
    })

    expect(onSuccess).toHaveBeenCalledWith({ id: 1 }, { name: 'test' })
  })

  it('calls onError callback with context', async () => {
    const onError = vi.fn()
    const onMutate = vi.fn().mockReturnValue({ previousData: [1, 2] })
    const mutationFn = vi.fn().mockRejectedValue(new Error('failed'))

    const { result } = renderHook(() => useSupabaseMutation(mutationFn, { onMutate, onError }))

    await act(async () => {
      try {
        await result.current.mutateAsync('vars')
      } catch {
        // expected
      }
    })

    expect(onError).toHaveBeenCalled()
    expect(onError.mock.calls[0][0].message).toBe('failed')
    expect(onError.mock.calls[0][1]).toBe('vars')
    expect(onError.mock.calls[0][2]).toEqual({ previousData: [1, 2] })
  })

  it('calls onSettled on success', async () => {
    const onSettled = vi.fn()
    const mutationFn = vi.fn().mockResolvedValue('ok')

    const { result } = renderHook(() => useSupabaseMutation(mutationFn, { onSettled }))

    await act(async () => {
      await result.current.mutateAsync('vars')
    })

    expect(onSettled).toHaveBeenCalledWith('ok', null, 'vars')
  })

  it('calls onSettled on error', async () => {
    const onSettled = vi.fn()
    const mutationFn = vi.fn().mockRejectedValue(new Error('boom'))

    const { result } = renderHook(() => useSupabaseMutation(mutationFn, { onSettled }))

    await act(async () => {
      try {
        await result.current.mutateAsync('vars')
      } catch {
        // expected
      }
    })

    expect(onSettled).toHaveBeenCalledWith(undefined, expect.any(Error), 'vars')
  })

  it('calls onMutate for optimistic updates', async () => {
    const onMutate = vi.fn().mockReturnValue('rollback-context')
    const mutationFn = vi.fn().mockResolvedValue('done')

    const { result } = renderHook(() => useSupabaseMutation(mutationFn, { onMutate }))

    await act(async () => {
      await result.current.mutateAsync('vars')
    })

    expect(onMutate).toHaveBeenCalledWith('vars')
  })

  it('reset clears state back to idle', async () => {
    const mutationFn = vi.fn().mockResolvedValue({ id: 1 })

    const { result } = renderHook(() => useSupabaseMutation(mutationFn))

    await act(async () => {
      await result.current.mutateAsync('data')
    })

    expect(result.current.isSuccess).toBe(true)

    act(() => {
      result.current.reset()
    })

    expect(result.current.isSuccess).toBe(false)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.isError).toBe(false)
    expect(result.current.data).toBeUndefined()
    expect(result.current.error).toBeUndefined()
  })
})
