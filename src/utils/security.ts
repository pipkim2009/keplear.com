/**
 * Security Utilities
 * Provides input sanitization, validation, and rate limiting for security
 */

/**
 * Password validation requirements
 */
export interface PasswordRequirements {
  minLength: boolean
  hasUppercase: boolean
  hasLowercase: boolean
  hasNumber: boolean
  hasSpecialChar: boolean
}

export interface PasswordValidationResult {
  isValid: boolean
  requirements: PasswordRequirements
  strength: 'weak' | 'medium' | 'strong'
  message: string
}

/**
 * Validates password against security requirements
 * Requires: 8+ chars, uppercase, lowercase, number
 */
export function validatePassword(password: string): PasswordValidationResult {
  const requirements: PasswordRequirements = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /\d/.test(password),
    hasSpecialChar: /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)
  }

  // Count how many requirements are met
  const metCount = Object.values(requirements).filter(Boolean).length

  // Must have at least: minLength, uppercase, lowercase, number (4 requirements)
  const isValid = requirements.minLength &&
                  requirements.hasUppercase &&
                  requirements.hasLowercase &&
                  requirements.hasNumber

  // Calculate strength
  let strength: 'weak' | 'medium' | 'strong'
  if (metCount <= 2) {
    strength = 'weak'
  } else if (metCount <= 4) {
    strength = 'medium'
  } else {
    strength = 'strong'
  }

  // Generate helpful message
  let message = ''
  if (!requirements.minLength) {
    message = 'Password must be at least 8 characters'
  } else if (!requirements.hasUppercase) {
    message = 'Add an uppercase letter'
  } else if (!requirements.hasLowercase) {
    message = 'Add a lowercase letter'
  } else if (!requirements.hasNumber) {
    message = 'Add a number'
  } else if (!requirements.hasSpecialChar) {
    message = 'Add a special character for extra security'
  } else {
    message = 'Strong password'
  }

  return { isValid, requirements, strength, message }
}

/**
 * Sanitizes user input to prevent XSS attacks
 * Escapes HTML special characters
 */
export function sanitizeInput(input: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  }

  return input.replace(/[&<>"'`=/]/g, char => htmlEntities[char] || char)
}

/**
 * Sanitizes input for use in URLs
 */
export function sanitizeUrlInput(input: string): string {
  return encodeURIComponent(input.trim())
}

/**
 * Validates and sanitizes username
 */
export function sanitizeUsername(username: string): string {
  // Remove any characters that aren't alphanumeric or underscore
  return username.replace(/[^a-zA-Z0-9_]/g, '').slice(0, 20)
}

/**
 * Validates username format
 */
export function isValidUsername(username: string): boolean {
  return (
    username.length >= 3 &&
    username.length <= 20 &&
    /^[a-zA-Z0-9_]+$/.test(username)
  )
}

/**
 * Rate limiter for client-side protection
 * Prevents rapid-fire requests
 */
export class RateLimiter {
  private attempts: Map<string, number[]> = new Map()
  private readonly maxAttempts: number
  private readonly windowMs: number

  constructor(maxAttempts: number = 5, windowMs: number = 60000) {
    this.maxAttempts = maxAttempts
    this.windowMs = windowMs
  }

  /**
   * Check if action is allowed
   * @param key - Unique identifier for the action (e.g., 'login', 'signup')
   * @returns true if action is allowed, false if rate limited
   */
  isAllowed(key: string): boolean {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []

    // Filter out attempts outside the window
    const recentAttempts = attempts.filter(time => now - time < this.windowMs)
    this.attempts.set(key, recentAttempts)

    return recentAttempts.length < this.maxAttempts
  }

  /**
   * Record an attempt
   * @param key - Unique identifier for the action
   */
  recordAttempt(key: string): void {
    const now = Date.now()
    const attempts = this.attempts.get(key) || []
    attempts.push(now)
    this.attempts.set(key, attempts)
  }

  /**
   * Get remaining time until rate limit resets (in seconds)
   */
  getResetTime(key: string): number {
    const attempts = this.attempts.get(key) || []
    if (attempts.length === 0) return 0

    const oldestAttempt = Math.min(...attempts)
    const resetTime = oldestAttempt + this.windowMs
    const remainingMs = Math.max(0, resetTime - Date.now())

    return Math.ceil(remainingMs / 1000)
  }

  /**
   * Clear attempts for a key
   */
  clear(key: string): void {
    this.attempts.delete(key)
  }
}

// Global rate limiters for common actions
export const authRateLimiter = new RateLimiter(5, 60000) // 5 attempts per minute
export const apiRateLimiter = new RateLimiter(100, 60000) // 100 requests per minute

/**
 * Validates email format (if ever needed)
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if string contains potential script injection
 */
export function containsScriptInjection(input: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // onclick=, onerror=, etc.
    /data:/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /eval\s*\(/i,
    /expression\s*\(/i
  ]

  return dangerousPatterns.some(pattern => pattern.test(input))
}

/**
 * Safely parse JSON with error handling
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Generate a cryptographically random string
 * Useful for CSRF tokens, nonces, etc.
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Hash a string using SHA-256 (for non-password use cases)
 */
export async function hashString(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('')
}

/**
 * Security constants
 */
export const SECURITY_CONFIG = {
  /** Minimum password length */
  minPasswordLength: 8,
  /** Maximum password length */
  maxPasswordLength: 128,
  /** Maximum username length */
  maxUsernameLength: 20,
  /** Minimum username length */
  minUsernameLength: 3,
  /** Session timeout in milliseconds (30 minutes) */
  sessionTimeout: 30 * 60 * 1000,
  /** Rate limit for auth attempts */
  authRateLimit: {
    maxAttempts: 5,
    windowMs: 60000
  }
} as const

export default {
  validatePassword,
  sanitizeInput,
  sanitizeUrlInput,
  sanitizeUsername,
  isValidUsername,
  isValidEmail,
  containsScriptInjection,
  safeJsonParse,
  generateSecureToken,
  hashString,
  RateLimiter,
  authRateLimiter,
  apiRateLimiter,
  SECURITY_CONFIG
}
