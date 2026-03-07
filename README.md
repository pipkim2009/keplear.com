# Keplear

Interactive music ear training web app for keyboard, guitar, and bass.

## Tech Stack

- **Frontend:** React 19 + TypeScript 5.8 + Vite 7
- **Backend:** Supabase (PostgreSQL + Auth + Realtime)
- **Audio:** Tone.js
- **Styling:** CSS Modules
- **Deployment:** Vercel

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Environment Variables

Copy `.env.example` to `.env` and fill in values:

| Variable                 | Required | Description                |
| ------------------------ | -------- | -------------------------- |
| `VITE_SUPABASE_URL`      | Yes      | Supabase project URL       |
| `VITE_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous key     |
| `VITE_SENTRY_DSN`        | No       | Sentry error reporting DSN |

## Project Structure

```
src/
├── components/
│   ├── pages/          # Route-level page components
│   ├── layout/         # Header, navigation
│   ├── instruments/    # Keyboard, Guitar, Bass displays
│   ├── auth/           # Login, Signup, UserMenu
│   ├── onboarding/     # New user wizard
│   ├── dashboard/      # Dashboard widgets
│   ├── common/         # Shared UI components
│   └── stems/          # Audio stem separation
├── contexts/           # React contexts (Auth, Instrument, Translation)
├── hooks/              # Custom hooks
├── reducers/           # State reducers
├── styles/             # CSS Modules
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
└── lib/                # External service clients (Supabase)
```

## Scripts

| Command            | Description                |
| ------------------ | -------------------------- |
| `npm run dev`      | Start dev server           |
| `npm run build`    | Production build           |
| `npm test`         | Run tests in watch mode    |
| `npm run test:run` | Run tests once             |
| `npm run lint`     | Lint TypeScript/JavaScript |
| `npm run lint:css` | Lint CSS files             |

## License

Private
