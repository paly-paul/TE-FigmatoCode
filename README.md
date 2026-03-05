# TE-FigmatoCode
SIXFE Frontend

A web application that converts Figma designs into production-ready frontend code across multiple frameworks.

## Features

- **Figma Integration** — Paste a Figma file URL to begin conversion
- **Framework Support** — React, Vue, HTML/CSS, Tailwind CSS, React Native
- **Conversion History** — Persisted locally; review and re-use past results
- **Clean Code Output** — Readable, structured, copy-ready output

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript |
| Build | Vite 5 |
| Routing | React Router v6 |
| State | Zustand (with persistence) |
| Styling | CSS Modules |
| Testing | Vitest + Testing Library |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Project Structure

```
src/
├── components/       # Shared UI components (Navbar, Layout, CodePreview)
├── pages/            # Route-level page components
├── store/            # Zustand state management
├── test/             # Test setup and unit tests
├── App.tsx           # Root component with routing
├── main.tsx          # Entry point
└── index.css         # Global styles / CSS variables
```
