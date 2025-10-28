# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Comprehensive project documentation (README, ARCHITECTURE, CONTRIBUTING)
- CSS architecture documentation (src/styles/README.md)
- Development tooling configuration (.editorconfig, .prettierrc, .nvmrc)
- Environment variables template (.env.example)
- Organized asset directory structure (src/assets/)
- Public directory with robots.txt
- Pre-commit hooks with Husky and lint-staged
- GitHub issue and PR templates
- MIT License
- This changelog

### Changed

- Bass instrument theme from green to red
- Horizontal scrollbar behavior: only shows when needed (overflow: auto)
- Guitar string positioning to match bass visual approach
- Scale/Chord toggle switch positioning and sizing for pixel-perfect alignment
- CSS overflow properties to use shorthand syntax (linting compliance)

### Fixed

- CSS linting errors in Bass.css, Guitar.css, and Keyboard.css
- Unnecessary horizontal scrollbars appearing on instruments
- Toggle switch offset issues in scale options menu

### Removed

- 12 unnecessary markdown documentation files
- Duplicate MelodyControls.css from components folder

## [1.0.0] - 2025-01-XX

### Added

- Initial release of Keplear
- Three virtual instruments: Keyboard (Piano), Guitar, Bass
- Intelligent melody generation with AI-powered suggestions
- Music theory integration: scales, chords, modes
- Real-time audio playback using Tone.js
- Audio recording and export functionality
- Light/Dark theme support
- Responsive design for mobile and desktop
- User authentication with Supabase
- TypeScript throughout for type safety
- Comprehensive design token system
- WCAG 2.1 AA accessibility compliance

[Unreleased]: https://github.com/yourusername/keplear.com/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/keplear.com/releases/tag/v1.0.0
