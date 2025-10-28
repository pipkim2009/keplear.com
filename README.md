# 🎹 Keplear

**Interactive music theory application for melody generation and practice**

Keplear is a modern web-based music learning platform that combines interactive instrument visualization with intelligent melody generation. Practice scales, chords, and ear training across keyboard, guitar, and bass instruments.

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-Private-red.svg)
![React](https://img.shields.io/badge/React-19.1-61DAFB.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6.svg)
![Vite](https://img.shields.io/badge/Vite-7.1-646CFF.svg)

---

## ✨ Features

### 🎼 Instruments

- **Keyboard/Piano** - 88 keys with octave range control (C1-C8)
- **Guitar** - 6 strings, 24 frets with multiple scale positions
- **Bass** - 4 strings, 24 frets with extended low range

### 🎵 Music Theory

- **Scales** - Major, Minor, Pentatonic, Dorian, Phrygian, Lydian, Mixolydian, and more
- **Chords** - Major, Minor, 7th, 9th, Diminished, Augmented, Sus chords
- **Scale Positions** - Practice scales across the fretboard in different positions
- **Chord Voicings** - Multiple fingering options for guitar/bass chords

### 🎹 Melody Generation

- **Intelligent Generation** - Create melodies from selected notes, scales, or chords
- **Tempo Control** - 1-999 BPM with precise timing
- **Pattern Length** - Generate sequences from 1-100 notes
- **Two Modes**:
  - **Arpeggiator** - Single-note melodic sequences
  - **Progression** - Full chord progressions with harmonic movement

### 🎧 Audio & Recording

- **High-Quality Samples** - Studio-quality piano, acoustic guitar, and electric bass
- **Auto-Recording** - Every melody is automatically recorded
- **Playback Controls** - Play, pause, seek, and download recordings
- **Audio Export** - Save your practice sessions as audio files

### 🎯 Ear Training

- **Show/Hide Notes** - Toggle note visibility for ear training exercises
- **Visual Feedback** - Real-time note highlighting during playback
- **Practice Modes** - Test your ability to identify notes by ear

### 🎨 User Experience

- **Light/Dark Themes** - Comfortable viewing in any environment
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Keyboard Navigation** - Full keyboard support for accessibility
- **Reduced Motion** - Respects user motion preferences (WCAG 2.1 AA compliant)

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** - v18.0.0 or higher
- **npm** - v9.0.0 or higher

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd keplear.com

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

The app will be available at `http://localhost:5173`

---

## 📜 Available Scripts

### Development

```bash
npm run dev          # Start development server with HMR
npm run build        # Build for production
npm run preview      # Preview production build locally
npm run typecheck    # Run TypeScript type checking
```

### Testing

```bash
npm run test              # Run tests in watch mode
npm run test:run          # Run tests once
npm run test:ui           # Open Vitest UI
npm run test:coverage     # Generate coverage report
npm run test:integration  # Run integration tests
npm run test:hooks        # Run hook tests
npm run test:components   # Run component tests
```

### Linting

```bash
npm run lint          # Run ESLint on TypeScript files
npm run lint:css      # Run StyleLint on CSS files
npm run lint:css:fix  # Auto-fix CSS issues
```

### Analysis

```bash
npm run analyze  # Analyze bundle size with rollup-plugin-visualizer
```

---

## 🏗️ Tech Stack

### Core

- **React 19** - UI library with latest features
- **TypeScript 5.7** - Type-safe development
- **Vite 7** - Lightning-fast build tool and dev server

### Audio

- **Tone.js 15** - Web Audio framework for synthesis and playback
- **Audio Samples** - High-quality instrument samples via tonejs-instruments

### State Management

- **React Context API** - Global state management
- **Custom Hooks** - Reusable business logic
- **Reducers** - Predictable state updates

### Styling

- **CSS Modules** - Scoped component styles
- **Design Tokens** - Consistent spacing, colors, typography, effects
- **CSS Custom Properties** - Dynamic theming

### Backend

- **Supabase** - Authentication and database
- **PostgreSQL** - Relational database

### Testing

- **Vitest** - Fast unit testing framework
- **React Testing Library** - Component testing utilities
- **@testing-library/user-event** - User interaction simulation

### Code Quality

- **ESLint** - JavaScript/TypeScript linting
- **StyleLint** - CSS linting
- **TypeScript Strict Mode** - Maximum type safety

---

## 📂 Project Structure

```
keplear.com/
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # Authentication components
│   │   ├── bass/           # Bass instrument
│   │   ├── common/         # Shared UI components
│   │   ├── guitar/         # Guitar instrument
│   │   ├── keyboard/       # Keyboard/piano instrument
│   │   ├── pages/          # Route pages
│   │   └── __tests__/      # Component tests
│   ├── contexts/           # React context providers
│   ├── hooks/              # Custom React hooks
│   │   └── __tests__/      # Hook tests
│   ├── utils/              # Utility functions
│   │   └── instruments/    # Instrument-specific utilities
│   ├── styles/             # CSS files
│   │   ├── components/     # Component-specific styles
│   │   ├── keyboard/       # Keyboard-specific styles
│   │   ├── modules/        # CSS Modules
│   │   ├── shared/         # Shared styles
│   │   └── tokens/         # Design tokens (colors, spacing, typography)
│   ├── types/              # TypeScript type definitions
│   ├── reducers/           # State reducers
│   ├── constants/          # Application constants
│   ├── lib/                # Third-party library integrations
│   ├── test/               # Test configuration and setup
│   └── __tests__/          # Integration tests
├── public/                 # Static assets
├── docs/                   # Documentation
├── dist/                   # Build output (gitignored)
└── node_modules/           # Dependencies (gitignored)
```

---

## 🎨 Design System

Keplear uses a comprehensive design token system for consistent styling:

- **Colors** - Complete color palette with light/dark theme support
- **Spacing** - Standardized spacing scale (4px base)
- **Typography** - Font sizes, weights, and line heights
- **Effects** - Shadows, borders, animations, and transitions

All tokens are defined in `src/styles/tokens/` and used throughout the application via CSS custom properties.

---

## 🔐 Environment Variables

Create a `.env` file in the root directory:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

See `.env.example` for a complete template.

---

## 🧪 Testing

Keplear has comprehensive test coverage across:

- **Unit Tests** - Individual functions and hooks
- **Component Tests** - React component behavior
- **Integration Tests** - Full user workflows

Run tests with:

```bash
npm run test              # Watch mode
npm run test:coverage     # With coverage report
```

---

## 📱 Browser Support

Keplear supports modern browsers with Web Audio API:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14.1+

**Note:** Web Audio API requires user interaction before audio can play.

---

## 🎯 Accessibility

Keplear is built with accessibility in mind:

- ✅ WCAG 2.1 Level AA compliant
- ✅ Keyboard navigation support
- ✅ Screen reader compatible
- ✅ Reduced motion support
- ✅ High contrast focus indicators
- ✅ Semantic HTML throughout

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development process.

### Development Workflow

1. Create a feature branch
2. Make your changes
3. Run tests: `npm run test`
4. Run linting: `npm run lint && npm run lint:css`
5. Type check: `npm run typecheck`
6. Create a pull request

---

## 📄 License

This project is private and proprietary.

---

## 👥 Authors

**Keplear Team**

---

## 🙏 Acknowledgments

- [Tone.js](https://tonejs.github.io/) - Web Audio framework
- [tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) - High-quality instrument samples
- [React](https://react.dev/) - UI library
- [Vite](https://vitejs.dev/) - Build tool
- [Supabase](https://supabase.com/) - Backend infrastructure

---

## 📞 Support

For support, please contact: support@keplear.com

---

**Made with ❤️ by the Keplear team**
