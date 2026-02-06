/**
 * Environment variable validation
 * Validates required VITE_* vars exist before React renders
 */

const REQUIRED_ENV_VARS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

// Optional: VITE_SENTRY_DSN — enables error reporting when set

interface EnvValidationResult {
  valid: boolean
  missing: string[]
}

export function validateEnv(): EnvValidationResult {
  const missing: string[] = []

  for (const varName of REQUIRED_ENV_VARS) {
    if (!import.meta.env[varName]) {
      missing.push(varName)
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  }
}

export function assertEnv(): void {
  const result = validateEnv()
  if (!result.valid) {
    const message = `Missing required environment variables: ${result.missing.join(', ')}`
    console.error(message)
    throw new Error(message)
  }
}
