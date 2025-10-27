# CSS Logical Properties - Future RTL Support Guide

## Overview

This guide documents how to prepare the Keplear codebase for Right-to-Left (RTL) language support using CSS Logical Properties.

## Current Status

The codebase currently uses **physical properties** (left, right, top, bottom). For future internationalization, consider migrating to **logical properties** (inline-start, inline-end, block-start, block-end).

## Quick Reference

### Horizontal (Inline Axis)

| Physical Property | Logical Property | Notes |
|------------------|------------------|-------|
| `margin-left` | `margin-inline-start` | Start of reading direction |
| `margin-right` | `margin-inline-end` | End of reading direction |
| `padding-left` | `padding-inline-start` | |
| `padding-right` | `padding-inline-end` | |
| `border-left` | `border-inline-start` | |
| `border-right` | `border-inline-end` | |
| `left: 0` | `inset-inline-start: 0` | Positioning |
| `right: 0` | `inset-inline-end: 0` | Positioning |
| `text-align: left` | `text-align: start` | Alignment |
| `text-align: right` | `text-align: end` | Alignment |

### Vertical (Block Axis)

| Physical Property | Logical Property | Notes |
|------------------|------------------|-------|
| `margin-top` | `margin-block-start` | Top in LTR/RTL |
| `margin-bottom` | `margin-block-end` | Bottom in LTR/RTL |
| `top: 0` | `inset-block-start: 0` | Positioning |
| `bottom: 0` | `inset-block-end: 0` | Positioning |

## Example Refactoring

### Before (Physical)
```css
.control-button {
  margin-left: 10px;          /* Always left */
  padding-right: 20px;        /* Always right */
  border-left: 1px solid;     /* Always left */
  text-align: left;           /* Always left */
}

.tooltip {
  position: absolute;
  left: 0;                    /* Always left */
  right: auto;                /* Always right */
}
```

### After (Logical)
```css
.control-button {
  margin-inline-start: 10px;  /* Start of line (left in LTR, right in RTL) */
  padding-inline-end: 20px;   /* End of line (right in LTR, left in RTL) */
  border-inline-start: 1px solid; /* Start border */
  text-align: start;          /* Align to start */
}

.tooltip {
  position: absolute;
  inset-inline-start: 0;      /* Start edge */
  inset-inline-end: auto;     /* End edge */
}
```

## Implementation Strategy

### Phase 1: New Components (Recommended)
All **new** CSS should use logical properties by default.

### Phase 2: Gradual Migration (Optional)
Refactor existing components when:
1. Making significant changes to a component
2. Preparing for RTL language support
3. Working on layout-heavy sections

### Phase 3: Automated Migration (Future)
Use tools like:
- `postcss-logical` - Automatically converts to logical properties
- `stylelint-plugin-logical` - Enforces logical property usage

## Browser Support

**Logical Properties are well-supported:**
- ✅ Chrome 69+ (2018)
- ✅ Firefox 41+ (2015)
- ✅ Safari 12.1+ (2019)
- ✅ Edge 79+ (2020)

**Coverage:** 95%+ of global users

## When NOT to Use Logical Properties

1. **When direction must be fixed**
   - Geometric properties (box-shadow offsets)
   - Transform translations that relate to visual space
   - Border radius (though `border-start-start-radius` exists)

2. **Musical notation positioning**
   - Piano keys, guitar frets are physical visual representations
   - May want to keep physical properties for instruments

## Example: Header Component

### Current Implementation
```css
/* src/styles/Header.css */
.header {
  padding-left: 20px;
  padding-right: 20px;
}

.logo {
  margin-right: 15px;
}
```

### Future RTL-Ready Implementation
```css
/* src/styles/Header.css */
.header {
  padding-inline-start: 20px;
  padding-inline-end: 20px;
  /* Or simply: padding-inline: 20px; */
}

.logo {
  margin-inline-end: 15px;
}
```

### With RTL Support Active
```html
<html dir="rtl">
  <!-- Logo now correctly appears on the right -->
  <!-- Text flows right-to-left -->
  <!-- Margins and padding flip automatically -->
</html>
```

## Testing RTL Layout

### Quick Test
```javascript
// In browser console or add to app
document.documentElement.dir = 'rtl';
```

### Permanent RTL Mode
```html
<!-- public/index.html -->
<html lang="ar" dir="rtl">
```

## Resources

- [MDN: CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties)
- [CSS Tricks: Logical Properties](https://css-tricks.com/css-logical-properties/)
- [RTL Styling 101](https://rtlstyling.com/posts/rtl-styling)

## Recommendation

**For Keplear:**
1. ✅ Document logical properties (this file)
2. ⏳ Use in new components going forward
3. ⏳ Consider migration when adding RTL language support
4. ⏳ Keep physical properties for instrument visual layouts

**Priority:** Low (until RTL support is requested)

**Benefit:** Future-proof, better semantic CSS
