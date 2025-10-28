# Testing Guide

Comprehensive guide for testing the Keplear application.

## Table of Contents

- [Overview](#overview)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Testing Strategies](#testing-strategies)
- [Coverage Requirements](#coverage-requirements)
- [Continuous Integration](#continuous-integration)

---

## Overview

Keplear uses **Vitest** as its primary testing framework along with **React Testing Library** for component testing.

### Testing Philosophy

1. **Test behavior, not implementation** - Focus on what users see and interact with
2. **Write tests that give confidence** - Tests should catch real bugs
3. **Keep tests maintainable** - Avoid brittle tests that break on refactors
4. **Aim for high coverage** - Target 80%+ code coverage

---

## Test Structure

```
src/
├── components/
│   ├── Header.tsx
│   └── __tests__/
│       └── Header.test.tsx
├── hooks/
│   ├── useAudio.ts
│   └── __tests__/
│       └── useAudio.test.ts
├── utils/
│   ├── notes.ts
│   └── __tests__/
│       └── notes.test.ts
└── __tests__/
    ├── setup.ts           # Global test setup
    └── integration/       # Integration tests
```

### Test File Naming

- Component tests: `ComponentName.test.tsx`
- Hook tests: `useHookName.test.ts`
- Utility tests: `utilityName.test.ts`
- Integration tests: `featureName.integration.test.tsx`

---

## Running Tests

### All Tests

```bash
# Run all tests in watch mode (development)
npm run test

# Run all tests once (CI/CD)
npm run test:run

# Run with coverage report
npm run test:coverage
```

### Specific Test Suites

```bash
# Test hooks only
npm run test:hooks

# Test components only
npm run test:components

# Test utilities only
npm run test:utils

# Test integration tests
npm run test:integration
```

### Running Specific Files

```bash
# Run a specific test file
npx vitest src/components/__tests__/Header.test.tsx

# Run tests matching a pattern
npx vitest --grep "Header"
```

### Watch Mode Options

While in watch mode, you can:

- Press `a` to run all tests
- Press `f` to run only failed tests
- Press `p` to filter by filename
- Press `t` to filter by test name
- Press `q` to quit

---

## Writing Tests

### Unit Tests (Pure Functions)

Test utility functions in isolation:

```typescript
import { describe, it, expect } from 'vitest'
import { calculateScale, getNoteFromIndex } from '../notes'

describe('calculateScale', () => {
  it('should return correct notes for C major scale', () => {
    const result = calculateScale('C', 'major')
    expect(result).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  })

  it('should return correct notes for A minor scale', () => {
    const result = calculateScale('A', 'minor')
    expect(result).toEqual(['A', 'B', 'C', 'D', 'E', 'F', 'G'])
  })

  it('should handle edge cases', () => {
    expect(() => calculateScale('X', 'major')).toThrow()
  })
})

describe('getNoteFromIndex', () => {
  it('should return C for index 0', () => {
    expect(getNoteFromIndex(0)).toBe('C')
  })

  it('should wrap around after 12 notes', () => {
    expect(getNoteFromIndex(12)).toBe('C')
    expect(getNoteFromIndex(13)).toBe('C#')
  })
})
```

### Component Tests

Test React components using React Testing Library:

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Header } from '../Header'

describe('Header', () => {
  it('should render logo', () => {
    render(<Header />)
    expect(screen.getByAltText('Keplear')).toBeInTheDocument()
  })

  it('should render navigation links', () => {
    render(<Header />)
    expect(screen.getByText('Piano')).toBeInTheDocument()
    expect(screen.getByText('Guitar')).toBeInTheDocument()
    expect(screen.getByText('Bass')).toBeInTheDocument()
  })

  it('should toggle theme when button is clicked', () => {
    const onThemeToggle = vi.fn()
    render(<Header onThemeToggle={onThemeToggle} />)

    const themeButton = screen.getByRole('button', { name: /theme/i })
    fireEvent.click(themeButton)

    expect(onThemeToggle).toHaveBeenCalledTimes(1)
  })
})
```

### Hook Tests

Test custom hooks using `@testing-library/react`:

```typescript
import { renderHook, act } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { useAudio } from '../useAudio'

describe('useAudio', () => {
  it('should initialize with correct default state', () => {
    const { result } = renderHook(() => useAudio())

    expect(result.current.isInitialized).toBe(false)
    expect(result.current.isPlaying).toBe(false)
  })

  it('should initialize audio when initializeAudio is called', async () => {
    const { result } = renderHook(() => useAudio())

    await act(async () => {
      await result.current.initializeAudio()
    })

    expect(result.current.isInitialized).toBe(true)
  })

  it('should play note when playNote is called', async () => {
    const { result } = renderHook(() => useAudio())

    await act(async () => {
      await result.current.initializeAudio()
      result.current.playNote('C4')
    })

    expect(result.current.isPlaying).toBe(true)
  })
})
```

### Integration Tests

Test multiple components working together:

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { App } from '../App'

describe('Melody Generation Flow', () => {
  it('should generate and play melody', async () => {
    render(<App />)

    // Select instrument
    fireEvent.click(screen.getByText('Piano'))

    // Set parameters
    const bpmInput = screen.getByLabelText(/bpm/i)
    fireEvent.change(bpmInput, { target: { value: '120' } })

    // Generate melody
    const generateButton = screen.getByRole('button', { name: /generate/i })
    fireEvent.click(generateButton)

    // Wait for melody to appear
    await waitFor(() => {
      expect(screen.getByText(/melody generated/i)).toBeInTheDocument()
    })

    // Play melody
    const playButton = screen.getByRole('button', { name: /play/i })
    fireEvent.click(playButton)

    expect(screen.getByText(/playing/i)).toBeInTheDocument()
  })
})
```

---

## Testing Strategies

### 1. Mocking

#### Mocking Modules

```typescript
import { vi } from 'vitest'

// Mock entire module
vi.mock('../audioEngine', () => ({
  playNote: vi.fn(),
  stopNote: vi.fn(),
}))
```

#### Mocking Functions

```typescript
import { vi } from 'vitest'

const mockCallback = vi.fn()
const mockAsyncFn = vi.fn().mockResolvedValue('result')
const mockRejection = vi.fn().mockRejectedValue(new Error('failed'))
```

#### Mocking Tone.js

```typescript
vi.mock('tone', () => ({
  Sampler: vi.fn(() => ({
    triggerAttack: vi.fn(),
    triggerRelease: vi.fn(),
    dispose: vi.fn(),
    toDestination: vi.fn(),
  })),
  start: vi.fn(),
  context: {
    state: 'running',
  },
}))
```

### 2. Testing Async Code

```typescript
it('should load instrument samples', async () => {
  const { result } = renderHook(() => useAudio())

  await act(async () => {
    await result.current.loadInstrument('piano')
  })

  expect(result.current.isLoaded).toBe(true)
})
```

### 3. Testing User Interactions

```typescript
it('should select note on click', () => {
  render(<Keyboard />)

  const noteButton = screen.getByRole('button', { name: 'C4' })
  fireEvent.click(noteButton)

  expect(noteButton).toHaveClass('selected')
})
```

### 4. Testing Accessibility

```typescript
it('should have proper ARIA labels', () => {
  render(<Keyboard />)

  const keyboard = screen.getByRole('region', { name: /keyboard/i })
  expect(keyboard).toBeInTheDocument()

  const notes = screen.getAllByRole('button')
  notes.forEach(note => {
    expect(note).toHaveAttribute('aria-label')
  })
})
```

### 5. Snapshot Testing

```typescript
it('should match snapshot', () => {
  const { container } = render(<Header />)
  expect(container).toMatchSnapshot()
})
```

---

## Coverage Requirements

### Minimum Coverage Targets

- **Overall Coverage:** 80%
- **Critical Paths:** 95%
- **Utility Functions:** 90%
- **Components:** 75%
- **Hooks:** 85%

### Viewing Coverage

```bash
npm run test:coverage
```

This generates:

- Terminal report with coverage percentages
- HTML report in `coverage/` directory
- LCOV report for CI/CD integration

### Coverage Report

```
----------------------|---------|----------|---------|---------|
File                  | % Stmts | % Branch | % Funcs | % Lines |
----------------------|---------|----------|---------|---------|
All files             |   85.23 |    78.45 |   82.16 |   86.34 |
 components/          |   82.45 |    75.23 |   80.12 |   83.56 |
  Header.tsx          |   90.00 |    85.00 |   88.00 |   91.00 |
  Keyboard.tsx        |   78.50 |    70.00 |   75.00 |   80.00 |
 hooks/               |   88.90 |    82.34 |   85.67 |   89.23 |
  useAudio.ts         |   92.00 |    88.00 |   90.00 |   93.00 |
 utils/               |   91.23 |    86.78 |   89.45 |   92.34 |
  notes.ts            |   95.00 |    92.00 |   94.00 |   96.00 |
----------------------|---------|----------|---------|---------|
```

---

## Continuous Integration

### GitHub Actions Workflow

Tests automatically run on:

- Every push to `main` branch
- Every pull request
- Nightly builds

### Pre-commit Hooks

Husky runs these checks before each commit:

1. Lint TypeScript files
2. Lint CSS files
3. Type checking
4. Run affected tests

### Pre-push Hooks

Before pushing, ensure:

1. All tests pass
2. Coverage meets minimum requirements
3. No linting errors

---

## Debugging Tests

### Running Tests in Debug Mode

```bash
# Node inspect mode
node --inspect-brk node_modules/.bin/vitest --run

# VS Code debugging
# Add breakpoint and press F5
```

### Common Issues

**1. "Cannot find module"**

```typescript
// Check vite.config.ts has correct resolve aliases
resolve: {
  alias: {
    '@': path.resolve(__dirname, './src')
  }
}
```

**2. "Timeout error"**

```typescript
// Increase timeout for slow tests
it(
  'slow test',
  async () => {
    // test code
  },
  { timeout: 10000 }
)
```

**3. "Act warnings"**

```typescript
// Wrap state updates in act()
await act(async () => {
  await result.current.doSomething()
})
```

---

## Best Practices

### DO ✅

- Test user-facing behavior
- Use semantic queries (`getByRole`, `getByLabelText`)
- Write descriptive test names
- Keep tests isolated and independent
- Mock external dependencies
- Test edge cases and error states
- Use `describe` blocks for organization

### DON'T ❌

- Test implementation details
- Use `container.querySelector` (use semantic queries)
- Write tests that depend on other tests
- Leave console errors/warnings
- Skip tests (use `.only` temporarily)
- Test third-party libraries
- Write overly complex tests

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Vitest Coverage](https://vitest.dev/guide/coverage.html)

---

**Last Updated:** January 2025
**Maintainers:** Keplear Team
