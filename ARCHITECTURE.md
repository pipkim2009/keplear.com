# Keplear Architecture

This document outlines the architectural decisions, patterns, and structure of the Keplear application.

## Table of Contents

- [Overview](#overview)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Architecture Patterns](#architecture-patterns)
- [Data Flow](#data-flow)
- [State Management](#state-management)
- [Styling Strategy](#styling-strategy)
- [Audio Architecture](#audio-architecture)
- [Performance Considerations](#performance-considerations)

---

## Overview

Keplear is a single-page application (SPA) built with React and TypeScript, designed for interactive music theory learning and practice. The application provides three virtual instruments (Keyboard, Guitar, Bass) with intelligent melody generation capabilities.

### Core Principles

1. **Component-Based Architecture** - Modular, reusable React components
2. **Type Safety** - Strict TypeScript throughout
3. **Separation of Concerns** - Clear boundaries between UI, logic, and state
4. **Performance First** - Optimized rendering and audio processing
5. **Accessibility** - WCAG 2.1 AA compliance

---

## Technology Stack

### Frontend

- **React 19** - UI library with hooks and concurrent features
- **TypeScript 5.7** - Static typing and improved DX
- **Vite 7** - Fast build tool and dev server

### Audio

- **Tone.js 15** - Web Audio API framework
- **tonejs-instruments** - High-quality instrument samples

### State Management

- **React Context API** - Global state (auth, instrument, settings)
- **useReducer** - Complex state transitions
- **Custom Hooks** - Reusable stateful logic

### Styling

- **CSS Modules** - Scoped component styles
- **Design Tokens** - Centralized design system
- **CSS Custom Properties** - Dynamic theming

### Backend

- **Supabase** - Authentication and database
- **PostgreSQL** - Relational data storage

### Testing

- **Vitest** - Unit and integration testing
- **React Testing Library** - Component testing

---

## Project Structure

```
src/
├── components/          # React components
│   ├── auth/           # Authentication UI
│   ├── bass/           # Bass instrument
│   ├── common/         # Shared components
│   ├── guitar/         # Guitar instrument
│   ├── keyboard/       # Keyboard/piano
│   └── pages/          # Page components
├── contexts/           # React contexts
│   ├── AuthContext.tsx
│   ├── InstrumentContext.tsx
│   └── ThemeContext.tsx
├── hooks/              # Custom hooks
│   ├── useAudio.ts
│   ├── useMelodyGenerator.ts
│   └── useScaleChordManagement.ts
├── utils/              # Pure functions
│   ├── audioExport.ts
│   ├── notes.ts
│   └── instruments/
├── styles/             # CSS files
│   ├── tokens/         # Design tokens
│   └── [components]    # Component styles
├── types/              # TypeScript types
├── reducers/           # State reducers
├── constants/          # App constants
└── lib/                # Third-party integrations
```

---

## Architecture Patterns

### 1. Feature-Based Organization

Components are organized by feature (auth, instruments) rather than by type:

```
components/
├── keyboard/
│   ├── Keyboard.tsx              # Main component
│   ├── KeyboardControls.tsx      # Sub-component
│   ├── KeyboardHighlighting.tsx  # Logic component
│   └── index.ts                  # Barrel export
```

**Benefits:**

- Co-location of related code
- Easier to find and modify features
- Better scalability

### 2. Container/Presentational Pattern

**Containers** (Smart Components):

- Manage state
- Handle business logic
- Connect to contexts
- Example: `Keyboard.tsx`

**Presentational** (Dumb Components):

- Receive props
- Render UI
- No state management
- Example: `KeyboardControls.tsx`

### 3. Custom Hooks Pattern

Complex logic is extracted into custom hooks:

```typescript
// useAudio.ts - Manages audio engine
function useAudio() {
  const [isInitialized, setIsInitialized] = useState(false)
  const samplerRef = useRef<Sampler | null>(null)

  const initializeAudio = useCallback(async () => {
    // Complex initialization logic
  }, [])

  return { isInitialized, playNote, stopNote, dispose }
}
```

**Benefits:**

- Reusable logic
- Testable in isolation
- Clean component code

### 4. Reducer Pattern

Complex state transitions use reducers:

```typescript
const [scaleOptions, dispatch] = useReducer(scaleOptionsReducer, initialState)

dispatch({ type: 'ADD_SCALE', payload: scale })
```

---

## Data Flow

### Unidirectional Data Flow

```
Context Provider → Component → Hooks → Utils
                     ↓
                  Events
                     ↓
                  Actions
                     ↓
                  Reducers
                     ↓
               Updated State
```

### Example: Note Selection Flow

1. User clicks a note on keyboard
2. `onClick` handler in `Keyboard.tsx`
3. Calls `handleNoteSelect` from `useKeyboardSelection` hook
4. Updates local state via reducer
5. Optionally updates `InstrumentContext`
6. UI re-renders with new selection

---

## State Management

### Global State (Context API)

**AuthContext**

- User authentication state
- Login/logout methods
- User profile data

**InstrumentContext**

- Current instrument selection
- Shared instrument state
- Instrument-agnostic data

**ThemeContext**

- Light/dark theme toggle
- Theme-specific styling

### Local State (useState/useReducer)

Each instrument maintains its own state:

- Selected notes
- Applied scales/chords
- Generation parameters (BPM, beats)
- Audio recording state

---

## Styling Strategy

### Design Token System

All design values are centralized in `src/styles/tokens/`:

**colors.css** - Color palette

```css
--primary-purple: #8000ff;
--blue-500: #3b82f6;
--green-500: #22c55e;
```

**spacing.css** - Spacing scale

```css
--space-4: 1rem;
--space-8: 2rem;
```

**typography.css** - Font system

```css
--text-lg: 1.125rem;
--font-bold: 700;
```

**effects.css** - Shadows, borders, animations

```css
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
```

### CSS Modules

Component-specific styles use CSS Modules for scoping:

```tsx
import styles from './Header.module.css'

function Header() {
  return <header className={styles.header}>...</header>
}
```

### Theming

Themes are applied via CSS classes on root element:

```css
.light {
  --bg-primary: #ffffff;
  --text-primary: #1a1a1a;
}

.dark {
  --bg-primary: #1a1a1a;
  --text-primary: #f5f5f5;
}
```

---

## Audio Architecture

### Tone.js Integration

**Audio Engine Lifecycle:**

1. **Initialization** - User interaction triggers audio context
2. **Sample Loading** - Load instrument samples from CDN
3. **Playback** - Play notes via Tone.js Sampler
4. **Recording** - Capture audio via MediaRecorder API
5. **Export** - Convert to downloadable audio file

### Audio Processing Flow

```
User Input → Tone.js Sampler → Web Audio API → Speakers
                ↓
           MediaRecorder
                ↓
            Blob/File
```

### Performance Optimizations

- Lazy loading of audio samples
- Sampler instance reuse
- Automatic cleanup on unmount
- Memory-efficient recording

---

## Performance Considerations

### Code Splitting

Vite automatically splits code by route:

```typescript
// Automatic chunking
const Home = lazy(() => import('./pages/Home'))
```

### React Optimizations

1. **React.memo** - Prevent unnecessary re-renders
2. **useCallback** - Memoize callbacks
3. **useMemo** - Memoize expensive calculations
4. **Lazy Loading** - Load components on demand

### Bundle Optimization

Configured in `vite.config.ts`:

- Manual chunk splitting for vendors
- CSS code splitting
- Tree shaking enabled
- Minification in production

---

## Security Considerations

### Environment Variables

Sensitive data stored in `.env`:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Note:** Supabase anon key is safe to expose (row-level security enforced)

### Authentication

- Supabase handles auth securely
- JWT tokens for API requests
- Row-level security policies

---

## Future Architecture Considerations

### Potential Improvements

1. **State Management**
   - Consider Zustand or Jotai for simpler global state
   - Redux Toolkit if state becomes very complex

2. **Routing**
   - Add React Router for multi-page navigation
   - Implement proper 404 handling

3. **API Layer**
   - Create dedicated `/services` directory
   - Centralize all Supabase calls

4. **Error Handling**
   - Integrate Sentry for error tracking
   - Implement error boundaries globally

5. **Performance**
   - Implement virtual scrolling for large lists
   - Add service worker for offline support

6. **Testing**
   - Add E2E tests with Playwright
   - Increase unit test coverage

---

## Architecture Decision Records (ADRs)

### ADR-001: Why React Context over Redux?

**Decision:** Use React Context API for state management

**Rationale:**

- Simpler API, less boilerplate
- Sufficient for current state complexity
- Built-in to React (no extra dependencies)
- Good performance with proper optimization

**Trade-offs:**

- Less scalable than Redux for very complex state
- No built-in dev tools (Redux DevTools)
- May need to refactor if state grows significantly

---

### ADR-002: Why CSS Modules over Styled-Components?

**Decision:** Use CSS Modules with design tokens

**Rationale:**

- Familiar CSS syntax
- Better performance (no runtime CSS-in-JS)
- Design tokens provide consistency
- Smaller bundle size

**Trade-offs:**

- Less dynamic than CSS-in-JS
- Requires more discipline for naming
- Theme switching requires CSS variables

---

## Contributing to Architecture

When making architectural changes:

1. Document the decision in this file
2. Update ADRs if changing foundational patterns
3. Ensure backward compatibility
4. Run all tests before committing
5. Update component documentation

---

**Last Updated:** January 2025
**Maintainers:** Keplear Team
