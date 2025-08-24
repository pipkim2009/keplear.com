# 🎹 Keplear

A beautiful, interactive piano web application for melody generation and practice. Built with modern web technologies and featuring a realistic 3D piano interface with authentic piano sounds.

## ✨ Features

- **🎹 Realistic Piano Interface**: Two-octave piano (C4 to B5) with authentic 3D design
- **🔊 Real Piano Samples**: High-quality Salamander Grand Piano samples via Tone.js
- **🎵 Melody Generation**: Select two notes and generate unique 8-note melodies within that range
- **🎨 Dark/Light Mode**: Complete theme switching with professional Sun/Moon icons
- **💫 Beautiful Animations**: Smooth key press animations and hover effects
- **📱 Responsive Design**: Works on desktop and mobile devices
- **🎯 Color-Coded Feedback**: 
  - Piano Blue: Selected notes
  - Piano Green: Generated melody notes
  - Piano White/Black: Authentic piano key colors

## 🛠️ Tech Stack

### Frontend Framework
- **React 18** - Modern React with hooks
- **TypeScript** - Type-safe JavaScript
- **Vite** - Fast build tool and development server

### Styling & UI
- **Pure CSS** - Custom 3D piano styling for realistic appearance
- **Lucide React** - Professional SVG icon library

### Audio & Music
- **Tone.js** - Web Audio framework for real piano samples
- **Web Audio API** - Browser-based audio synthesis and playback
- **Salamander Grand Piano** - High-quality piano sample library

### Development Tools
- **ESLint** - Code linting and quality
- **PostCSS** - CSS processing
- **Autoprefixer** - CSS vendor prefixing

## 🎨 Design System

### Color Palette
- **Primary**: `#8000ff` (Purple) - Buttons, accents, and interactive elements
- **Background Light**: `#d2d2f9` (Light Purple) - Light mode background
- **Background Dark**: `#121212` (Black) - Dark mode background
- **Text Light**: `#121212` (Black) - Text on light backgrounds
- **Text Dark**: `#d2d2f9` (Light Purple) - Text on dark backgrounds

### Piano Colors (Preserved for Authenticity)
- **Piano White**: Authentic ivory/white piano keys
- **Piano Black**: Authentic black piano keys
- **Piano Blue**: Selected note highlighting
- **Piano Green**: Melody note highlighting

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd keplear.com
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to the displayed local URL (usually `http://localhost:5173`)

### Build for Production

```bash
npm run build
```

## 🎹 How to Use

1. **Select Notes**: Click two piano keys to define your melody range
2. **Generate**: Click "Generate Melody" to create a unique 8-note sequence
3. **Play**: Click "Play Melody" to hear your generated melody
4. **Theme Toggle**: Use the Sun/Moon button to switch between light and dark modes
5. **Practice**: Use the visual feedback to practice playing the generated melody

## 🎵 Audio Features

- **Real Piano Samples**: Authentic Salamander Grand Piano recordings
- **Multiple Velocity Layers**: Natural piano dynamics
- **Proper ADSR Envelope**: Realistic attack, decay, sustain, and release
- **Cross-browser Compatibility**: Works in all modern browsers
- **Auto-context Management**: Handles Web Audio context automatically

## 🎨 Piano Design Features

- **3D Realistic Appearance**: Authentic piano key styling with depth and shadows
- **Proper Key Proportions**: Realistic white and black key sizing
- **Smooth Animations**: Key press effects with proper scaling and movement
- **Authentic Layout**: Correct black key positioning between white keys
- **Visual Feedback**: Hover effects and selection states

## 📱 Responsive Design

- **Desktop Optimized**: Full-featured experience on larger screens
- **Mobile Friendly**: Touch-friendly piano keys and interface
- **Adaptive Layout**: Adjusts to different screen sizes
- **Performance Optimized**: Smooth animations across devices

## 🌙 Dark Mode

- **Complete Theme System**: All UI elements properly themed
- **Piano Preservation**: Piano maintains authentic colors in both modes
- **Smooth Transitions**: Animated theme switching
- **Professional Icons**: Lucide React Sun/Moon icons

## 🔧 Development

### Project Structure
```
src/
├── components/
│   └── Piano.tsx          # Main piano component
├── App.tsx                # App wrapper
├── index.css              # Global styles and resets
└── main.tsx               # React app entry point
```

### Key Components
- **Piano.tsx**: Complete piano interface with audio, styling, and interaction logic
- **Tone.js Integration**: Real piano sample playback
- **CSS-in-JS Styling**: Dynamic theming and 3D piano appearance
- **State Management**: React hooks for selection, melody, and theme state

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 🎵 Credits

- **Piano Samples**: Salamander Grand Piano sample library
- **Icons**: Lucide React icon library
- **Audio Framework**: Tone.js Web Audio framework

---

Built with ❤️ and lots of ☕ for piano enthusiasts and music learners everywhere! 🎹✨