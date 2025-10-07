# 🎹 Keplear

**Interactive ear training with keyboard, guitar, and bass**

A modern web application for music ear training featuring three professional instruments, comprehensive music theory integration, intelligent melody generation, and audio recording capabilities. Built with TypeScript, React, and Tone.js.

---

## ✨ Features

### 🎸 **Three Professional Instruments**

- **Keyboard**: Octave range control (1-8), selection modes (range/multi), studio-quality piano samples
- **Guitar**: 24-fret visualization, scale positions, chord shapes, acoustic guitar samples
- **Bass**: 4-string bass optimized for low-end practice, 24-fret fretboard, electric bass samples

### 🎵 **Comprehensive Music Theory**

- **11 Scales Per Instrument**: Major, Natural Minor, Pentatonic Major/Minor, Dorian, Phrygian, Lydian, Mixolydian, Locrian, Harmonic Minor, Blues, Chromatic (Bass)
- **10-12 Chords Per Instrument**: Major, Minor, Dom7, Maj7, Min7, Diminished, Augmented, Sus2, Sus4, Add9, Min9, Maj9
- **Multiple Positions**: Different fretboard positions and chord voicings
- **Multi-Application**: Apply multiple scales and chords simultaneously
- **Visual Highlighting**: See scale/chord notes highlighted on instruments with root note indicators

### 🎼 **Intelligent Melody Generation**

- **Dual Generation Modes**: Arpeggiator (sequential notes) and Progression (chord-based)
- **Customizable Parameters**: 1-999 BPM, 1-100 beats per melody
- **Smart Generation**: Adapts to selected notes, applied scales, and chords
- **Change Detection**: Visual indicator when parameters change

### 🎧 **Audio Recording & Playback**

- **Auto-Recording**: Automatic recording on melody generation
- **Professional Playback**: Custom audio player with play/pause, seek, progress bar, volume control
- **Download Recordings**: Save your practice sessions as audio files
- **Clean Audio**: High-quality recording using Tone.js Recorder

### 👁️ **Learning Features**

- **Show/Hide Notes**: Toggle melody note display for ear training
- **Visual Feedback**: Note highlighting during playback
- **Educational Flow**: Try identifying notes by ear before revealing answers

---

## 🛠️ Tech Stack

**Frontend**
- React 19 with TypeScript 5.8
- Vite 7.1 for fast builds
- CSS Custom Properties design system

**Audio**
- Tone.js 15 - Web Audio framework
- High-quality instrument samples from tonejs-instruments
- Professional audio recording and playback

**Backend**
- Supabase - PostgreSQL database
- User authentication and session management
- Row-level security

**Development**
- ESLint 9 with strict TypeScript rules
- Professional JSDoc documentation
- Optimized with React.memo and useCallback

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ (LTS recommended)
- npm 9+ or yarn 3+

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Add your Supabase credentials to .env.local

# Start development server
npm run dev
```

### Build Commands

```bash
# Development
npm run dev

# Type checking
npm run build

# Linting
npm run lint

# Production build
npm run build && npm run preview
```

---

## 🎯 How to Use

### Sandbox Mode

1. **Select Instrument**: Choose between Keyboard, Guitar, or Bass
2. **Apply Scales/Chords**: Open the Scales/Chords panel and apply music theory concepts
3. **Customize Settings**: Adjust BPM (1-999), Beats (1-100), and Chord Mode (Arpeggiator/Progression)
4. **Generate Melody**: Click "Generate Melody" to create a melody from your selections
5. **Practice**: Listen to the auto-recorded audio, use playback controls, and toggle note visibility
6. **Download**: Save your recordings for later practice

### Keyboard-Specific

- **Octave Range**: Use the dual-range slider to set octave range (1-8)
- **Selection Modes**: Choose Range Select (2 notes) or Multi Select (multiple individual notes)

### Guitar/Bass-Specific

- **Scale Positions**: Select specific fretboard positions (e.g., "Frets 0-4") or "Entire Fretboard"
- **Chord Shapes**: Choose different voicings and positions up the neck
- **Visual Learning**: See scale boxes and chord shapes highlighted on the fretboard

---

## 📁 Project Structure

```
src/
├── components/
│   ├── pages/           # Page components (Home, Practice)
│   ├── common/          # Shared components (ScaleChordOptions, AudioPlayer)
│   ├── guitar/          # Guitar-specific components
│   ├── keyboard/        # Keyboard-specific components
│   └── bass/            # Bass-specific components
├── contexts/            # React Context (InstrumentContext, ThemeContext, AuthContext)
├── hooks/               # Custom hooks (useAudio, useMelodyGenerator)
├── utils/               # Utilities (scales, chords, audio helpers)
├── constants/           # Configuration and constants
├── lib/                 # External integrations (Supabase)
├── styles/              # CSS modules
└── types/               # TypeScript definitions
```

---

## 🎨 Key Design Patterns

- **Context + Reducer**: Global state management for instruments, audio, and auth
- **Custom Hooks**: Reusable audio and melody generation logic
- **Error Boundaries**: Graceful error handling with circuit breaker pattern
- **Performance Optimization**: React.memo, useCallback, useMemo throughout
- **Type Safety**: Comprehensive TypeScript coverage with strict mode

---

## ⚙️ Configuration

### Audio Settings

```typescript
const AUDIO_CONFIG = {
  minBpm: 60,
  maxBpm: 200,
  maxMelodyLength: 16,
  keyboardDuration: '0.3',
  guitarDuration: '0.5',
  bassDuration: '0.7'
}
```

### Theme Customization

```css
:root {
  --primary-purple: #9333ea;
  --text-primary-light: #121212;
  --text-primary-dark: #d2d2f9;
  --bg-primary-light: #ffffff;
  --bg-primary-dark: #121212;
}
```

---

## 📊 Performance

- **Bundle Size**: ~694KB total (186KB gzipped)
- **First Contentful Paint**: <1.5s
- **Lighthouse Score**: 95+ performance
- **Optimizations**: Code splitting, tree shaking, asset compression, React optimizations

---

## 🔒 Security

- **Authentication**: JWT-based sessions with Supabase
- **Password Security**: Bcrypt hashing with salt rounds
- **Input Validation**: Client and server-side validation
- **Data Encryption**: All data encrypted at rest
- **Privacy-First**: Username-only auth, no email required

---

## 🌍 Deployment

### Environment Variables

```bash
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

### Recommended Platforms

- **Vercel** - Automatic deployments from Git
- **Netlify** - Static hosting with edge functions
- **Railway** - Full-stack deployment

### Build for Production

```bash
npm run build
npm run preview  # Test production build locally
```

---

## 🙏 Acknowledgments

- **[Tone.js](https://tonejs.github.io/)** - Web Audio framework
- **[Supabase](https://supabase.com/)** - Backend infrastructure
- **[tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments)** - High-quality instrument samples
- **[Lucide](https://lucide.dev/)** - Icon library
- **[Vite](https://vitejs.dev/)** - Build tool

---

## 📝 License

This project is **proprietary software**. All rights reserved. Unauthorized copying, modification, distribution, or use of this software is strictly prohibited.

---

<div align="center">

**Built for musicians who learn by ear**

[🎹 **Try Keplear**](https://keplear.com)

</div>
