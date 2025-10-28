# Assets Directory

This directory contains static assets used throughout the Keplear application.

## Structure

```
assets/
├── images/     # Application images (logos, backgrounds, screenshots)
├── icons/      # SVG icons and icon sets
└── fonts/      # Custom fonts (if not using CDN)
```

## Usage

### Importing Images

```typescript
import logo from '@assets/images/logo.png'

function Header() {
  return <img src={logo} alt="Keplear Logo" />
}
```

### Importing Icons

```typescript
import icon from '@assets/icons/music-note.svg'
```

## Guidelines

1. **Image Optimization**
   - Use WebP format for photographs
   - Use SVG for logos and icons
   - Compress images before committing

2. **Naming Conventions**
   - Use kebab-case for file names
   - Be descriptive: `user-avatar-placeholder.png` not `img1.png`

3. **Organization**
   - Group related assets in subdirectories
   - Keep assets close to where they're used when possible

4. **External Assets**
   - Fonts are loaded from Google Fonts CDN
   - Audio samples are loaded from tonejs-instruments CDN
   - Consider performance when adding new assets
