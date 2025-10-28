# CSS Architecture & Design System

This document explains the CSS architecture, design token system, and styling conventions used in Keplear.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Design Token System](#design-token-system)
- [File Organization](#file-organization)
- [Naming Conventions](#naming-conventions)
- [Theme System](#theme-system)
- [Best Practices](#best-practices)

---

## Architecture Overview

Keplear uses a **hybrid CSS architecture** combining:

1. **Design Tokens** - CSS custom properties for consistency
2. **CSS Modules** - Scoped component styles
3. **Global Styles** - Shared utilities and base styles

### Why This Approach?

- ✅ **Performance** - No runtime CSS-in-JS overhead
- ✅ **Consistency** - Single source of truth via tokens
- ✅ **Maintainability** - Organized, predictable structure
- ✅ **Theming** - Easy light/dark mode switching
- ✅ **Accessibility** - WCAG 2.1 AA compliant

---

## Design Token System

All design values are centralized in `src/styles/tokens/` to ensure consistency and maintainability.

### Token Categories

```
tokens/
├── colors.css       # Color palette and semantic colors
├── spacing.css      # Spacing scale (padding, margin, gaps)
├── typography.css   # Font sizes, weights, line heights
├── effects.css      # Shadows, borders, focus states
└── index.css        # Imports all tokens
```

### 1. Colors (`tokens/colors.css`)

**Primary Brand Colors:**

```css
--primary-purple: #8000ff;
--primary-purple-dark: #6600cc;
--primary-purple-light: #9933ff;
```

**Semantic Color Scales:**

```css
/* Purple (primary actions) */
--purple-400, --purple-500, --purple-600, --purple-700, --purple-800

/* Blue (informational) */
--blue-400, --blue-500, --blue-600, --blue-700, --blue-800

/* Green (success, guitar theme) */
--green-400, --green-500, --green-600, --green-700, --green-800

/* Red (error, bass theme) */
--red-400, --red-500, --red-600, --red-700, --red-800

/* Amber/Orange (warnings, highlights) */
--amber-400, --amber-500, --amber-600
--orange-400, --orange-500, --orange-600
```

**Alpha Transparency Variants:**

```css
--primary-purple-alpha-20: rgba(128, 0, 255, 0.2);
--blue-alpha-60: rgba(59, 130, 246, 0.6);
--green-alpha-20: rgba(34, 197, 94, 0.2);
```

**Gradients:**

```css
--light-bg-gradient-1: #fef3c7; /* Amber 100 */
--light-bg-gradient-2: #ddd6fe; /* Purple 200 */
--light-bg-gradient-3: #bfdbfe; /* Blue 200 */
--light-bg-gradient-4: #fecaca; /* Red 200 */
```

**Theme-Specific Semantic Colors:**

```css
.light {
  --bg-primary: #ffffff;
  --bg-secondary: #f5f5f5;
  --text-primary: #1a1a1a;
  --text-secondary: #666666;
  --border-color: #e5e5e5;
}

.dark {
  --bg-primary: #1a1a1a;
  --bg-secondary: #2d2d2d;
  --text-primary: #f5f5f5;
  --text-secondary: #b3b3b3;
  --border-color: #404040;
}
```

### 2. Spacing (`tokens/spacing.css`)

**Spacing Scale (0.25rem increments):**

```css
--space-1: 0.25rem; /* 4px */
--space-2: 0.5rem; /* 8px */
--space-3: 0.75rem; /* 12px */
--space-4: 1rem; /* 16px */
--space-5: 1.25rem; /* 20px */
--space-6: 1.5rem; /* 24px */
--space-8: 2rem; /* 32px */
--space-10: 2.5rem; /* 40px */
--space-12: 3rem; /* 48px */
--space-16: 4rem; /* 64px */
```

**Usage:**

```css
.container {
  padding: var(--space-4); /* 16px */
  margin-bottom: var(--space-6); /* 24px */
  gap: var(--space-3); /* 12px */
}
```

### 3. Typography (`tokens/typography.css`)

**Font Sizes:**

```css
--text-xs: 0.75rem; /* 12px */
--text-sm: 0.875rem; /* 14px */
--text-base: 1rem; /* 16px */
--text-lg: 1.125rem; /* 18px */
--text-xl: 1.25rem; /* 20px */
--text-2xl: 1.5rem; /* 24px */
--text-3xl: 1.875rem; /* 30px */
```

**Font Weights:**

```css
--font-normal: 400;
--font-medium: 500;
--font-semibold: 600;
--font-bold: 700;
```

**Line Heights:**

```css
--leading-tight: 1.25;
--leading-normal: 1.5;
--leading-relaxed: 1.75;
```

**Usage:**

```css
.heading {
  font-size: var(--text-2xl);
  font-weight: var(--font-bold);
  line-height: var(--leading-tight);
}
```

### 4. Effects (`tokens/effects.css`)

**Shadows:**

```css
--shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
```

**Border Radius:**

```css
--rounded-sm: 0.125rem; /* 2px */
--rounded: 0.25rem; /* 4px */
--rounded-md: 0.375rem; /* 6px */
--rounded-lg: 0.5rem; /* 8px */
--rounded-xl: 0.75rem; /* 12px */
--rounded-full: 9999px;
```

**Focus States (WCAG Compliant):**

```css
--focus-ring-color: var(--primary-purple);
--focus-ring-width: 3px;
--focus-ring-offset: 2px;
--focus-ring-shadow: 0 0 0 4px var(--primary-purple-alpha-20);
```

**Usage:**

```css
button:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
  box-shadow: var(--focus-ring-shadow);
}
```

**Transitions:**

```css
--transition-fast: 150ms ease;
--transition-base: 300ms ease;
--transition-slow: 500ms ease;
```

---

## File Organization

### Structure

```
styles/
├── tokens/              # Design tokens (imported first)
│   ├── colors.css
│   ├── spacing.css
│   ├── typography.css
│   ├── effects.css
│   └── index.css
├── modules/             # Modular CSS patterns
│   ├── ThemeModule.css
│   ├── InstrumentModule.css
│   └── ControlModule.css
├── shared/              # Shared component styles
│   ├── instruments.css
│   ├── fretboard.css
│   └── ui-components.css
├── components/          # Component-specific styles
│   ├── ControlButtons.css
│   ├── InputControls.css
│   └── RecordingControls.css
├── keyboard/            # Keyboard instrument styles
│   ├── KeyboardControls.css
│   └── KeyboardHighlighting.css
├── common-components.css   # Global component styles
├── Keyboard.css            # Main keyboard styles
├── Guitar.css              # Main guitar styles
├── Bass.css                # Main bass styles
├── Controls.css            # Global controls
├── Header.css              # App header
└── index.css               # Main entry point
```

### Import Order

The main `index.css` imports files in this order:

1. **Tokens** (foundation)
2. **Modules** (reusable patterns)
3. **Shared** (cross-component styles)
4. **Components** (specific components)
5. **Instruments** (keyboard, guitar, bass)
6. **Global** (header, controls)

---

## Naming Conventions

### CSS Classes

**Use kebab-case for all class names:**

```css
/* ✓ Good */
.note-button {
}
.melody-controls {
}
.scale-options-container {
}

/* ✗ Bad */
.noteButton {
}
.MelodyControls {
}
.scale_options_container {
}
```

### BEM Methodology (Optional but Recommended)

For complex components, use BEM (Block-Element-Modifier):

```css
/* Block */
.instrument-selector {
}

/* Element (child of block) */
.instrument-selector__card {
}
.instrument-selector__icon {
}

/* Modifier (variant of block or element) */
.instrument-selector--active {
}
.instrument-selector__card--disabled {
}
```

### Token Naming

Tokens follow a semantic hierarchy:

```css
/* ✓ Good - Semantic naming */
--color-category-variant
--primary-purple
--text-primary
--space-4

/* ✗ Bad - Non-semantic */
--color1
--main-text
--spacing-medium
```

---

## Theme System

### How Theming Works

1. **Theme class applied to `<html>` element:**

   ```html
   <html class="light">
     or
     <html class="dark"></html>
   </html>
   ```

2. **Theme-specific tokens defined:**

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

3. **Components use semantic tokens:**
   ```css
   .container {
     background: var(--bg-primary);
     color: var(--text-primary);
   }
   ```

### Instrument Themes

Each instrument has a unique color theme:

- **Keyboard/Piano** - Purple (`--purple-*`)
- **Guitar** - Green (`--green-*`)
- **Bass** - Red (`--red-*`)

**Implementation:**

```css
/* Guitar-specific styles */
.guitar-container {
  --instrument-primary: var(--green-500);
  --instrument-hover: var(--green-600);
  --instrument-alpha: var(--green-alpha-20);
}

/* Use instrument tokens */
.fret-marker {
  background: var(--instrument-primary);
}

.fret-marker:hover {
  background: var(--instrument-hover);
}
```

---

## Best Practices

### 1. Always Use Design Tokens

**✓ Good:**

```css
.button {
  padding: var(--space-4);
  color: var(--text-primary);
  background: var(--primary-purple);
  border-radius: var(--rounded-md);
}
```

**✗ Bad:**

```css
.button {
  padding: 16px;
  color: #1a1a1a;
  background: #8000ff;
  border-radius: 6px;
}
```

### 2. Mobile-First Responsive Design

**✓ Good:**

```css
/* Mobile styles first (default) */
.container {
  padding: var(--space-4);
}

/* Desktop enhancements */
@media (min-width: 768px) {
  .container {
    padding: var(--space-8);
  }
}
```

### 3. Use Logical Properties for RTL Support

**✓ Good (future-proof):**

```css
.element {
  margin-inline-start: var(--space-4);
  padding-block: var(--space-2);
}
```

**⚠️ Acceptable (current standard):**

```css
.element {
  margin-left: var(--space-4);
  padding-top: var(--space-2);
  padding-bottom: var(--space-2);
}
```

### 4. Accessibility Requirements

**Focus states (required):**

```css
button:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
```

**Reduced motion support (required):**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

**Color contrast (WCAG AA):**

- Text on background: minimum 4.5:1 ratio
- Large text (18pt+): minimum 3:1 ratio
- Interactive elements: minimum 3:1 ratio

### 5. Avoid !important

Only use `!important` for:

- Utility classes that must override everything
- Accessibility overrides (reduced motion)
- Third-party library overrides (last resort)

**✓ Good:**

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
  }
}
```

**✗ Bad:**

```css
.button {
  background: red !important; /* Don't do this */
}
```

### 6. Performance Optimization

**Use efficient selectors:**

```css
/* ✓ Fast - class selector */
.button {
}

/* ✗ Slow - complex selector */
div > ul > li > a.button {
}
```

**Minimize expensive properties:**

```css
/* Avoid excessive use of: */
box-shadow: ...;
filter: blur(...);
backdrop-filter: ...;
```

**Use CSS containment:**

```css
.isolated-component {
  contain: layout style paint;
}
```

---

## Common Patterns

### Card Component

```css
.card {
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: var(--rounded-lg);
  padding: var(--space-6);
  box-shadow: var(--shadow-md);
  transition: all var(--transition-base);
}

.card:hover {
  box-shadow: var(--shadow-lg);
  border-color: var(--primary-purple);
}
```

### Button Component

```css
.button {
  padding: var(--space-3) var(--space-6);
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--white);
  background: var(--primary-purple);
  border: none;
  border-radius: var(--rounded-md);
  cursor: pointer;
  transition: all var(--transition-fast);
}

.button:hover {
  background: var(--primary-purple-dark);
  transform: translateY(-1px);
}

.button:focus-visible {
  outline: var(--focus-ring-width) solid var(--focus-ring-color);
  outline-offset: var(--focus-ring-offset);
}
```

### Form Input

```css
.input {
  width: 100%;
  padding: var(--space-3);
  font-size: var(--text-base);
  color: var(--text-primary);
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: var(--rounded-md);
  transition: border-color var(--transition-fast);
}

.input:focus {
  outline: none;
  border-color: var(--primary-purple);
  box-shadow: var(--focus-ring-shadow);
}
```

---

## Testing Your CSS

### Visual Regression Testing

1. Test in both light and dark themes
2. Test all responsive breakpoints
3. Test with different text sizes (browser zoom)
4. Test keyboard navigation (focus states)
5. Test with reduced motion enabled

### Browser Testing

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Android)

### Accessibility Testing

- ✅ Keyboard navigation works
- ✅ Focus indicators are visible
- ✅ Color contrast meets WCAG AA
- ✅ Reduced motion is respected
- ✅ Screen reader compatible

---

## Questions?

For more information:

- See `ARCHITECTURE.md` for overall architecture
- See `CONTRIBUTING.md` for development workflow
- Check design token files in `src/styles/tokens/`

---

**Last Updated:** January 2025
**Maintainers:** Keplear Team
