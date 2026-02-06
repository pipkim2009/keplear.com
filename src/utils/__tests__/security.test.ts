import { describe, it, expect, beforeEach } from 'vitest'
import {
  sanitizeInput,
  sanitizeUsername,
  isValidUsername,
  isValidEmail,
  containsScriptInjection,
  validatePassword,
  RateLimiter,
  safeJsonParse,
  SECURITY_CONFIG,
} from '../security'

describe('sanitizeInput', () => {
  it('escapes HTML special characters', () => {
    expect(sanitizeInput('<script>alert("xss")</script>')).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
    )
  })

  it('escapes ampersands', () => {
    expect(sanitizeInput('foo & bar')).toBe('foo &amp; bar')
  })

  it('escapes backticks and equals', () => {
    expect(sanitizeInput('`test=value`')).toBe('&#x60;test&#x3D;value&#x60;')
  })

  it('leaves safe strings unchanged', () => {
    expect(sanitizeInput('Hello World 123')).toBe('Hello World 123')
  })

  it('handles empty string', () => {
    expect(sanitizeInput('')).toBe('')
  })
})

describe('sanitizeUsername', () => {
  it('removes special characters', () => {
    expect(sanitizeUsername('user<script>')).toBe('userscript')
  })

  it('allows alphanumeric and underscore', () => {
    expect(sanitizeUsername('User_123')).toBe('User_123')
  })

  it('truncates to 20 characters', () => {
    expect(sanitizeUsername('a'.repeat(30))).toBe('a'.repeat(20))
  })

  it('removes spaces', () => {
    expect(sanitizeUsername('user name')).toBe('username')
  })
})

describe('isValidUsername', () => {
  it('accepts valid usernames', () => {
    expect(isValidUsername('user_123')).toBe(true)
    expect(isValidUsername('ABC')).toBe(true)
  })

  it('rejects too short', () => {
    expect(isValidUsername('ab')).toBe(false)
  })

  it('rejects too long', () => {
    expect(isValidUsername('a'.repeat(21))).toBe(false)
  })

  it('rejects special characters', () => {
    expect(isValidUsername('user@name')).toBe(false)
    expect(isValidUsername('user name')).toBe(false)
  })
})

describe('isValidEmail', () => {
  it('accepts valid emails', () => {
    expect(isValidEmail('test@example.com')).toBe(true)
    expect(isValidEmail('user.name@domain.co')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(isValidEmail('notanemail')).toBe(false)
    expect(isValidEmail('@no-user.com')).toBe(false)
    expect(isValidEmail('user@')).toBe(false)
    expect(isValidEmail('')).toBe(false)
  })
})

describe('containsScriptInjection', () => {
  it('detects script tags', () => {
    expect(containsScriptInjection('<script>alert(1)</script>')).toBe(true)
  })

  it('detects javascript: protocol', () => {
    expect(containsScriptInjection('javascript:alert(1)')).toBe(true)
  })

  it('detects event handlers', () => {
    expect(containsScriptInjection('<img onerror=alert(1)>')).toBe(true)
    expect(containsScriptInjection('onclick=doEvil()')).toBe(true)
  })

  it('detects iframe/object/embed', () => {
    expect(containsScriptInjection('<iframe src="evil">')).toBe(true)
    expect(containsScriptInjection('<object data="evil">')).toBe(true)
    expect(containsScriptInjection('<embed src="evil">')).toBe(true)
  })

  it('detects eval', () => {
    expect(containsScriptInjection('eval(code)')).toBe(true)
  })

  it('detects data: protocol', () => {
    expect(containsScriptInjection('data:text/html,<h1>evil</h1>')).toBe(true)
  })

  it('allows safe strings', () => {
    expect(containsScriptInjection('Hello World')).toBe(false)
    expect(containsScriptInjection('My Classroom 101')).toBe(false)
    expect(containsScriptInjection('user_123')).toBe(false)
  })
})

describe('validatePassword', () => {
  it('rejects passwords under 8 characters', () => {
    const result = validatePassword('Abc1')
    expect(result.isValid).toBe(false)
    expect(result.requirements.minLength).toBe(false)
  })

  it('requires uppercase letter', () => {
    const result = validatePassword('abcdefg1')
    expect(result.isValid).toBe(false)
    expect(result.requirements.hasUppercase).toBe(false)
  })

  it('requires lowercase letter', () => {
    const result = validatePassword('ABCDEFG1')
    expect(result.isValid).toBe(false)
    expect(result.requirements.hasLowercase).toBe(false)
  })

  it('requires a number', () => {
    const result = validatePassword('Abcdefgh')
    expect(result.isValid).toBe(false)
    expect(result.requirements.hasNumber).toBe(false)
  })

  it('accepts valid password without special char as medium', () => {
    const result = validatePassword('Abcdefg1')
    expect(result.isValid).toBe(true)
    expect(result.strength).toBe('medium')
  })

  it('rates strong password with special char', () => {
    const result = validatePassword('Abcdefg1!')
    expect(result.isValid).toBe(true)
    expect(result.strength).toBe('strong')
  })

  it('provides helpful message', () => {
    expect(validatePassword('short').message).toBe('Password must be at least 8 characters')
    expect(validatePassword('Abcdefg1!').message).toBe('Strong password')
  })
})

describe('RateLimiter', () => {
  let limiter: RateLimiter

  beforeEach(() => {
    limiter = new RateLimiter(3, 1000) // 3 attempts per second
  })

  it('allows actions under the limit', () => {
    expect(limiter.isAllowed('test')).toBe(true)
    limiter.recordAttempt('test')
    expect(limiter.isAllowed('test')).toBe(true)
    limiter.recordAttempt('test')
    expect(limiter.isAllowed('test')).toBe(true)
  })

  it('blocks actions at the limit', () => {
    limiter.recordAttempt('test')
    limiter.recordAttempt('test')
    limiter.recordAttempt('test')
    expect(limiter.isAllowed('test')).toBe(false)
  })

  it('tracks different keys independently', () => {
    limiter.recordAttempt('a')
    limiter.recordAttempt('a')
    limiter.recordAttempt('a')
    expect(limiter.isAllowed('a')).toBe(false)
    expect(limiter.isAllowed('b')).toBe(true)
  })

  it('clears attempts for a key', () => {
    limiter.recordAttempt('test')
    limiter.recordAttempt('test')
    limiter.recordAttempt('test')
    expect(limiter.isAllowed('test')).toBe(false)
    limiter.clear('test')
    expect(limiter.isAllowed('test')).toBe(true)
  })

  it('returns reset time', () => {
    limiter.recordAttempt('test')
    const resetTime = limiter.getResetTime('test')
    expect(resetTime).toBeGreaterThan(0)
    expect(resetTime).toBeLessThanOrEqual(1)
  })

  it('returns 0 reset time for unknown key', () => {
    expect(limiter.getResetTime('unknown')).toBe(0)
  })
})

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    expect(safeJsonParse('{"a":1}', {})).toEqual({ a: 1 })
  })

  it('returns fallback for invalid JSON', () => {
    expect(safeJsonParse('not json', { default: true })).toEqual({ default: true })
  })

  it('returns fallback for empty string', () => {
    expect(safeJsonParse('', null)).toBe(null)
  })
})

describe('SECURITY_CONFIG', () => {
  it('has expected values', () => {
    expect(SECURITY_CONFIG.minPasswordLength).toBe(8)
    expect(SECURITY_CONFIG.maxPasswordLength).toBe(128)
    expect(SECURITY_CONFIG.minUsernameLength).toBe(3)
    expect(SECURITY_CONFIG.maxUsernameLength).toBe(20)
    expect(SECURITY_CONFIG.authRateLimit.maxAttempts).toBe(5)
  })
})
