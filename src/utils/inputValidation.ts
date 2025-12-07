/**
 * Input validation utilities for numeric inputs
 * Extracted to eliminate duplicated validation logic
 */

interface NumericInputOptions {
  /** Maximum allowed value */
  max?: number
  /** Minimum allowed value */
  min?: number
  /** Allow leading zeros */
  allowLeadingZeros?: boolean
}

/**
 * Sanitizes a numeric input string
 * - Removes non-numeric characters
 * - Handles leading zeros
 * - Enforces max value
 */
export function sanitizeNumericInput(
  value: string,
  options: NumericInputOptions = {}
): string {
  const { max = 999, allowLeadingZeros = false } = options

  // Only allow numbers
  let numericValue = value.replace(/[^0-9]/g, '')

  // Remove leading zeros (unless allowing them)
  if (!allowLeadingZeros && numericValue.length > 1) {
    numericValue = numericValue.replace(/^0+/, '') || '0'
  }

  // Enforce max value
  if (numericValue !== '' && Number(numericValue) > max) {
    numericValue = max.toString()
  }

  return numericValue
}

/**
 * Validates and returns a numeric value or default
 * Used for blur/enter handlers
 */
export function parseNumericInput(
  displayValue: string,
  currentValue: number,
  defaultValue: number
): number {
  if (displayValue === '') {
    return defaultValue
  }

  const parsed = Number(displayValue)
  return isNaN(parsed) ? currentValue : parsed
}

/**
 * Creates change and blur handlers for a numeric input
 * Eliminates boilerplate for common input pattern
 */
export function createNumericInputHandlers(options: {
  getValue: () => number
  setValue: (value: number) => void
  getDisplay: () => string
  setDisplay: (display: string) => void
  defaultValue: number
  max?: number
  min?: number
}) {
  const { getValue, setValue, getDisplay, setDisplay, defaultValue, max = 999, min = 1 } = options

  const handleChange = (value: string) => {
    const sanitized = sanitizeNumericInput(value, { max })
    setDisplay(sanitized)
  }

  const handleBlur = () => {
    const display = getDisplay()
    if (display !== '' && !isNaN(Number(display))) {
      const clamped = Math.max(min, Math.min(max, Number(display)))
      setValue(clamped)
      setDisplay(clamped.toString())
    } else {
      setDisplay(getValue().toString())
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const display = getDisplay()
      if (display === '') {
        setValue(defaultValue)
        setDisplay(defaultValue.toString())
      } else if (!isNaN(Number(display))) {
        const clamped = Math.max(min, Math.min(max, Number(display)))
        setValue(clamped)
        setDisplay(clamped.toString())
      }
      e.currentTarget.blur()
    }
  }

  return { handleChange, handleBlur, handleKeyPress }
}
