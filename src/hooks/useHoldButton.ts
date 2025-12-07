import { useRef, useCallback } from 'react'

interface UseHoldButtonOptions {
  /** Function to call on each tick */
  onTick: (currentValue: number) => number
  /** Current value ref to read from */
  valueRef: React.MutableRefObject<number>
  /** Callback to update the value */
  setValue: (value: number) => void
  /** Optional callback when hold starts */
  onStart?: () => void
  /** Optional callback when hold ends */
  onEnd?: () => void
  /** Interval in ms between ticks (default: 200) */
  interval?: number
}

interface UseHoldButtonReturn {
  /** Start the hold action */
  start: () => void
  /** Stop the hold action */
  stop: () => void
  /** Whether currently holding */
  isHolding: React.MutableRefObject<boolean>
}

/**
 * Hook for creating hold-to-increment/decrement button behavior
 * Eliminates duplicated hold-down logic across components
 */
export function useHoldButton({
  onTick,
  valueRef,
  setValue,
  onStart,
  onEnd,
  interval = 200
}: UseHoldButtonOptions): UseHoldButtonReturn {
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const isHolding = useRef(false)

  const start = useCallback(() => {
    isHolding.current = true
    onStart?.()

    // First tick immediately
    const newValue = onTick(valueRef.current)
    valueRef.current = newValue
    setValue(newValue)

    // Clear any existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Start repeating
    intervalRef.current = setInterval(() => {
      const newValue = onTick(valueRef.current)
      valueRef.current = newValue
      setValue(newValue)
    }, interval)
  }, [onTick, valueRef, setValue, onStart, interval])

  const stop = useCallback(() => {
    isHolding.current = false
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    onEnd?.()
  }, [onEnd])

  return { start, stop, isHolding }
}

/**
 * Creates increment/decrement handlers using useHoldButton
 * Convenience wrapper for the common pattern
 */
export function useIncrementDecrement(
  valueRef: React.MutableRefObject<number>,
  setValue: (value: number) => void,
  setDisplay: (display: string) => void,
  options: {
    min: number
    max: number
    onStart?: () => void
    onEnd?: () => void
  }
) {
  const { min, max, onStart, onEnd } = options

  const increment = useHoldButton({
    valueRef,
    setValue: (val) => {
      setValue(val)
      setDisplay(val.toString())
    },
    onTick: (current) => Math.min(current + 1, max),
    onStart,
    onEnd
  })

  const decrement = useHoldButton({
    valueRef,
    setValue: (val) => {
      setValue(val)
      setDisplay(val.toString())
    },
    onTick: (current) => Math.max(current - 1, min),
    onStart,
    onEnd
  })

  return { increment, decrement }
}
