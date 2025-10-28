# Contributing to Keplear

Thank you for your interest in contributing to Keplear! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Our Standards

**Positive behavior includes:**

- Being respectful and considerate
- Welcoming diverse perspectives
- Gracefully accepting constructive criticism
- Focusing on what is best for the community

**Unacceptable behavior includes:**

- Harassment, trolling, or insulting comments
- Personal or political attacks
- Publishing others' private information

---

## Getting Started

### Prerequisites

- Node.js v18.0.0 or higher
- npm v9.0.0 or higher
- Git

### Setup

1. **Fork the repository**

   ```bash
   # Click 'Fork' on GitHub
   ```

2. **Clone your fork**

   ```bash
   git clone https://github.com/YOUR_USERNAME/keplear.com.git
   cd keplear.com
   ```

3. **Install dependencies**

   ```bash
   npm install
   ```

4. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

---

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - New features
- `fix/*` - Bug fixes
- `refactor/*` - Code refactoring
- `docs/*` - Documentation updates

### Creating a Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b feature/your-feature-name
```

### Making Changes

1. Make your changes in the feature branch
2. Write or update tests as needed
3. Ensure all tests pass
4. Update documentation if necessary
5. Run linters and fix any issues

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Enable strict mode checks
- Provide type annotations for function parameters and return values
- Avoid `any` type - use `unknown` if necessary

**Example:**

```typescript
// ✓ Good
function calculateNotes(scale: Scale, root: Note): Note[] {
  // ...
}

// ✗ Bad
function calculateNotes(scale, root) {
  // ...
}
```

### React

- Use functional components with hooks
- Prefer named exports over default exports
- Use React.memo for expensive components
- Extract complex logic into custom hooks

**Component Structure:**

```typescript
import React, { useState, useCallback } from 'react'
import styles from './Component.module.css'

interface ComponentProps {
  title: string
  onAction: () => void
}

export function Component({ title, onAction }: ComponentProps) {
  const [state, setState] = useState(initial Value)

  const handleClick = useCallback(() => {
    // ...
  }, [])

  return (
    <div className={styles.container}>
      {/* JSX */}
    </div>
  )
}
```

### CSS

- Use CSS Modules for component-specific styles
- Use design tokens from `src/styles/tokens/`
- Follow kebab-case naming for classes
- Write mobile-first responsive styles

**Example:**

```css
/* ✓ Good - Using design tokens */
.header {
  padding: var(--space-4);
  color: var(--text-primary);
  background: var(--bg-primary);
}

/* ✗ Bad - Hardcoded values */
.header {
  padding: 16px;
  color: #1a1a1a;
  background: #ffffff;
}
```

### File Naming

- **Components:** PascalCase (`Header.tsx`)
- **Hooks:** camelCase with `use` prefix (`useAudio.ts`)
- **Utils:** camelCase (`notes.ts`)
- **CSS Modules:** PascalCase with `.module.css` (`Header.module.css`)
- **Regular CSS:** kebab-case (`common-components.css`)

---

## Commit Guidelines

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, missing semicolons)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```bash
feat(keyboard): add octave range control

Implement octave expansion controls for keyboard instrument.
Users can now extend the keyboard range by adding octaves
above or below the default C4-C5 range.

Closes #123
```

```bash
fix(audio): resolve memory leak in sampler cleanup

The Tone.js sampler instance was not being properly disposed,
causing memory leaks during instrument switching.

Fixes #456
```

---

## Pull Request Process

### Before Submitting

1. **Update your branch**

   ```bash
   git checkout main
   git pull origin main
   git checkout your-branch
   git rebase main
   ```

2. **Run all checks**

   ```bash
   npm run typecheck
   npm run lint
   npm run lint:css
   npm run test:run
   ```

3. **Update documentation**
   - Update README if adding features
   - Add JSDoc comments for new functions
   - Update ARCHITECTURE.md if changing patterns

### Submitting a Pull Request

1. Push your branch to your fork

   ```bash
   git push origin feature/your-feature-name
   ```

2. Open a pull request on GitHub

3. **PR Title Format:**

   ```
   [Type] Brief description
   ```

   Example: `[Feature] Add melody export functionality`

4. **PR Description Template:**

   ```markdown
   ## Description

   Brief description of changes

   ## Type of Change

   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update

   ## Testing

   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed

   ## Checklist

   - [ ] Code follows project style guidelines
   - [ ] Self-review completed
   - [ ] Comments added for complex code
   - [ ] Documentation updated
   - [ ] No new warnings generated
   ```

### Review Process

- At least one approval required
- All CI checks must pass
- No merge conflicts
- Code review feedback addressed

---

## Testing

### Running Tests

```bash
# All tests (watch mode)
npm run test

# All tests (run once)
npm run test:run

# With coverage
npm run test:coverage

# Specific test suite
npm run test:hooks
npm run test:components
npm run test:integration
```

### Writing Tests

**Unit Tests:**

```typescript
import { describe, it, expect } from 'vitest'
import { calculateScale } from './notes'

describe('calculateScale', () => {
  it('should return correct notes for C major scale', () => {
    const result = calculateScale('C', 'major')
    expect(result).toEqual(['C', 'D', 'E', 'F', 'G', 'A', 'B'])
  })
})
```

**Component Tests:**

```typescript
import { render, screen } from '@testing-library/react'
import { Header } from './Header'

describe('Header', () => {
  it('should render logo', () => {
    render(<Header />)
    expect(screen.getByAltText('Keplear')).toBeInTheDocument()
  })
})
```

---

## Questions?

If you have questions or need help:

1. Check existing documentation
2. Search closed issues
3. Open a new discussion on GitHub
4. Contact the maintainers

---

Thank you for contributing to Keplear! 🎹
