# Vite + TypeScript Rework — Design Spec

## Goal

Rework the existing plain HTML/JS workshop interface to use Vite as bundler, TypeScript for all logic, Tailwind CSS for styles, and `vite-plugin-html` for shared HTML components. Hosted on GitHub Pages via GitHub Actions.

## Constraints

- Two entry points: `controller.html` (mobile) and `display.html` (projector)
- No backend server — pure static files
- Ably API key via `.env` (gitignored), injected as GitHub Secret at build time
- GitHub Pages base URL: `/tangible-workshop-interface/`

## Architecture

```
controller.html  ──► src/controller.ts ──► src/lib/ably.ts
display.html     ──► src/display.ts    ──► src/lib/ably.ts
                                               │
                                       src/types/messages.ts
```

## Project Structure

```
tangible-workshop-interface/
├── controller.html              # Vite entry point (uses EJS includes)
├── display.html                 # Vite entry point (uses EJS includes)
├── components/
│   ├── head.html                # Shared <head>: meta, Tailwind, title param
│   └── emoji-grid.html          # Emoji button grid shell for controller
├── src/
│   ├── types/
│   │   └── messages.ts          # All Ably message types + type guard
│   ├── lib/
│   │   └── ably.ts              # Shared Ably client + channel constants
│   ├── controller.ts            # Controller page logic
│   └── display.ts               # Display page logic
├── .env                         # VITE_ABLY_API_KEY (gitignored)
├── .env.example                 # Empty placeholder, committed
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── .github/
    └── workflows/
        └── deploy.yml
```

## HTML Components (vite-plugin-html)

`controller.html` and `display.html` use EJS include syntax:

```html
<%- include('./components/head.html', { title: 'Controller' }) %>
<body>
  <%- include('./components/emoji-grid.html') %>
  <script type="module" src="/src/controller.ts"></script>
</body>
```

`components/emoji-grid.html` provides the HTML shell (`<div id="emoji-grid">` with Tailwind classes). The emoji buttons are populated dynamically by `src/controller.ts`.

## TypeScript Types

All message types live in `src/types/messages.ts`:

```typescript
// Internal message — controller → display (we own the shape)
export interface EmojiMessage {
  type: 'emoji';
  payload: { emoji: string };
  ts: number;
}

// External message — ESP32 → display via Ably REST (untrusted)
export interface PresenterPayload {
  // define fields when ESP32 event schema is known
}

export interface ExternalMessage {
  type: string;
  payload: PresenterPayload;
  ts: number;
}

// Extend this union as new message types are added
export type WorkshopMessage = EmojiMessage | ExternalMessage;

export function isExternalMessage(data: unknown): data is ExternalMessage {
  return (
    typeof data === 'object' &&
    data !== null &&
    'type' in data &&
    typeof (data as Record<string, unknown>).type === 'string' &&
    'ts' in data &&
    typeof (data as Record<string, unknown>).ts === 'number'
  );
}
```

Adding a new message type later: define the interface, add it to `WorkshopMessage`, TypeScript will flag unhandled cases in any `switch` on `type`.

## Ably Client

`src/lib/ably.ts` exports a single shared client and channel constants:

```typescript
import Ably from 'ably';

export const CHANNELS = {
  reactions: 'workshop:reactions',
  presenter: 'workshop:presenter',
} as const;

export const client = new Ably.Realtime({
  key: import.meta.env.VITE_ABLY_API_KEY,
});
```

Ably is installed as an npm package (`npm install ably`) — includes its own TypeScript definitions, no CDN script tag needed.

## Build Config

**`vite.config.ts`**
```typescript
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  base: '/tangible-workshop-interface/',
  plugins: [createHtmlPlugin({ minify: true })],
  build: {
    rollupOptions: {
      input: {
        controller: 'controller.html',
        display: 'display.html',
      },
    },
  },
});
```

**`tailwind.config.ts`**
```typescript
export default {
  content: ['./*.html', './components/**/*.html', './src/**/*.ts'],
};
```

**`tsconfig.json`**
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

## GitHub Pages Deployment

**`.github/workflows/deploy.yml`**
```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run build
        env:
          VITE_ABLY_API_KEY: ${{ secrets.VITE_ABLY_API_KEY }}
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**One-time GitHub setup:**
1. Repo → Settings → Secrets → Actions → add `VITE_ABLY_API_KEY`
2. Repo → Settings → Pages → Source: `gh-pages` branch

## Environment Variables

| File | Committed | Purpose |
|---|---|---|
| `.env` | No (gitignored) | Local dev key |
| `.env.example` | Yes | Empty template for new devs |

## Packages

| Package | Purpose |
|---|---|
| `vite` | Bundler + dev server |
| `typescript` | Type checking |
| `ably` | Realtime SDK (includes TS types) |
| `vite-plugin-html` | HTML component includes + minification |
| `tailwindcss` | Utility CSS |
| `autoprefixer` | PostCSS vendor prefixes |
| `postcss` | CSS pipeline |
