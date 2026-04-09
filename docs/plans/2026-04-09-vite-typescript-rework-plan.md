# Vite + TypeScript Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rework the existing plain HTML/JS workshop interface to use Vite, TypeScript, Tailwind CSS v3, and vite-plugin-html for shared HTML components, deployed to GitHub Pages.

**Architecture:** Two HTML entry points at root (`controller.html`, `display.html`) use EJS includes for shared components. TypeScript source in `src/`, Tailwind for all styling, Ably via npm package. GitHub Actions builds with secret-injected env var and deploys to `gh-pages` branch.

**Tech Stack:** Vite, TypeScript, Tailwind CSS v3, vite-plugin-html, Ably (npm), GitHub Actions

---

## File Map

| File | Responsibility |
|---|---|
| `package.json` | Dependencies, scripts (`dev`, `build`, `preview`) |
| `vite.config.ts` | MPA input, vite-plugin-html, base URL |
| `tsconfig.json` | Strict TS config, Vite client types |
| `tailwind.config.ts` | Content paths, custom float-up animation |
| `postcss.config.js` | PostCSS plugins: tailwindcss + autoprefixer |
| `.env.example` | Placeholder Ably key (committed) |
| `.env` | Real Ably key (gitignored) |
| `src/styles.css` | Tailwind directives |
| `src/types/messages.ts` | Message interfaces, type guard |
| `src/lib/ably.ts` | Shared Ably client, channel constants |
| `src/controller.ts` | Controller page logic, emoji publish |
| `src/display.ts` | Display page logic, subscribe + render |
| `components/head.html` | Shared `<head>` partial (meta, title) |
| `components/emoji-grid.html` | Emoji grid HTML shell with Tailwind classes |
| `controller.html` | Controller entry point (EJS includes) |
| `display.html` | Display entry point (EJS includes) |
| `.github/workflows/deploy.yml` | Build + deploy to GitHub Pages |

---

### Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.js`, `.env.example`, `.env`
- Modify: `.gitignore`

- [ ] **Step 1: Initialize package.json**

```bash
npm init -y
```

- [ ] **Step 2: Install dependencies**

```bash
npm install ably
npm install -D vite typescript vite-plugin-html tailwindcss@^3 postcss autoprefixer
```

Note: Tailwind v3 is pinned explicitly — v4 uses a different config format.

- [ ] **Step 3: Create `vite.config.ts`**

```typescript
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  base: '/tangible-workshop-interface/',
  plugins: [
    createHtmlPlugin({
      minify: true,
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        controller: resolve(__dirname, 'controller.html'),
        display: resolve(__dirname, 'display.html'),
      },
    },
  },
});
```

- [ ] **Step 4: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "types": ["vite/client"],
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

- [ ] **Step 5: Create `tailwind.config.ts`**

```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./*.html', './components/**/*.html', './src/**/*.ts'],
  theme: {
    extend: {
      keyframes: {
        'float-up': {
          '0%': { opacity: '1', transform: 'translateY(0) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-100vh) scale(1.5)' },
        },
      },
      animation: {
        'float-up': 'float-up 3s ease-out forwards',
      },
    },
  },
} satisfies Config;
```

- [ ] **Step 6: Create `postcss.config.js`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 7: Create `.env.example`**

```
VITE_ABLY_API_KEY=
```

- [ ] **Step 8: Create `.env`**

Copy the user's existing Ably API key from the current `js/config.js` into `.env`:

```
VITE_ABLY_API_KEY=<key from js/config.js>
```

- [ ] **Step 9: Update `.gitignore`**

Replace the current `.gitignore` contents with:

```
.superpowers/
node_modules/
dist/
.env
```

This removes the old `js/config.js` entry (file will be deleted later) and adds `node_modules/`, `dist/`, and `.env`.

- [ ] **Step 10: Add scripts to `package.json`**

Edit `package.json` to set `"type": "module"` and add scripts:

```json
{
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 11: Verify scaffold**

```bash
npx vite --version
npx tsc --version
```

Both commands should print version numbers without errors.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json tailwind.config.ts postcss.config.js .env.example .gitignore
git commit -m "feat: scaffold Vite + TypeScript + Tailwind project"
```

Do NOT commit `.env` or `node_modules/`.

---

### Task 2: TypeScript Message Types

**Files:**
- Create: `src/types/messages.ts`

- [ ] **Step 1: Create `src/types/messages.ts`**

```typescript
// Internal message — controller -> display (we own the shape)
export interface EmojiMessage {
  type: 'emoji';
  payload: { emoji: string };
  ts: number;
}

// External message — ESP32 -> display via Ably REST (untrusted)
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

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/types/messages.ts
git commit -m "feat: add TypeScript message types and type guard"
```

---

### Task 3: Ably Client Module

**Files:**
- Create: `src/lib/ably.ts`

- [ ] **Step 1: Create `src/lib/ably.ts`**

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

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/ably.ts
git commit -m "feat: add shared Ably client module"
```

---

### Task 4: Tailwind Base Styles

**Files:**
- Create: `src/styles.css`

- [ ] **Step 1: Create `src/styles.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

Tailwind's preflight (included via `@tailwind base`) replaces the old manual CSS reset. The float-up animation is defined in `tailwind.config.ts`.

- [ ] **Step 2: Commit**

```bash
git add src/styles.css
git commit -m "feat: add Tailwind CSS entry point"
```

---

### Task 5: HTML Components

**Files:**
- Create: `components/head.html`, `components/emoji-grid.html`

- [ ] **Step 1: Create `components/head.html`**

```html
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><%= title %></title>
</head>
```

The `title` variable is passed from the including HTML file via EJS: `<%- include('./components/head.html', { title: 'Workshop Controller' }) %>`.

- [ ] **Step 2: Create `components/emoji-grid.html`**

```html
<div id="emoji-grid" class="grid grid-cols-4 gap-4 max-w-xs w-full"></div>
```

The grid shell uses Tailwind classes. Emoji buttons are populated dynamically by `src/controller.ts`.

- [ ] **Step 3: Commit**

```bash
git add components/head.html components/emoji-grid.html
git commit -m "feat: add shared HTML components"
```

---

### Task 6: Controller Page

**Files:**
- Modify: `controller.html`
- Create: `src/controller.ts`

- [ ] **Step 1: Rewrite `controller.html`**

Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="de">
<%- include('./components/head.html', { title: 'Workshop Controller' }) %>
<body class="font-sans flex flex-col items-center py-8 px-4 min-h-screen bg-[#1a1a2e] text-white">
  <h1 class="mb-6 text-2xl">Reaktionen</h1>
  <%- include('./components/emoji-grid.html') %>

  <script type="module" src="/src/controller.ts"></script>
</body>
</html>
```

All styling uses Tailwind utility classes. No CSS file link needed — Vite injects the built CSS from the `import './styles.css'` in the TS entry.

- [ ] **Step 2: Create `src/controller.ts`**

```typescript
import './styles.css';
import { client, CHANNELS } from './lib/ably';
import type { EmojiMessage } from './types/messages';

const EMOJIS = ['👍', '👎', '😂', '🔥', '❤️', '👏', '🎉', '😮'];

const reactionsChannel = client.channels.get(CHANNELS.reactions);
const grid = document.getElementById('emoji-grid')!;

EMOJIS.forEach((emoji) => {
  const btn = document.createElement('button');
  btn.className =
    'text-[2.5rem] p-3 border-none rounded-xl bg-[#16213e] cursor-pointer transition-[transform,background] duration-100 select-none active:scale-90 active:bg-[#0f3460]';
  btn.textContent = emoji;
  btn.addEventListener('click', () => {
    const msg: EmojiMessage = {
      type: 'emoji',
      payload: { emoji },
      ts: Date.now(),
    };
    reactionsChannel.publish('event', msg);
  });
  grid.appendChild(btn);
});

client.connection.on('connected', () => {
  console.log('Ably connected (controller)');
});

client.connection.on('failed', (err) => {
  console.error('Ably connection failed:', err);
});
```

- [ ] **Step 3: Verify build**

```bash
npx vite build
```

Expected: build succeeds, `dist/controller.html` exists.

- [ ] **Step 4: Verify in browser**

```bash
npx vite dev
```

Open `http://localhost:5173/controller.html`. Expected:
- Dark background, 4-column emoji grid
- Console shows `Ably connected (controller)` (requires `.env` with valid key)
- Buttons have active press effect

- [ ] **Step 5: Commit**

```bash
git add controller.html src/controller.ts
git commit -m "feat: rewrite controller with TypeScript and Tailwind"
```

---

### Task 7: Display Page

**Files:**
- Modify: `display.html`
- Create: `src/display.ts`

- [ ] **Step 1: Rewrite `display.html`**

Replace the entire file with:

```html
<!DOCTYPE html>
<html lang="de">
<%- include('./components/head.html', { title: 'Workshop Display' }) %>
<body class="bg-black min-h-screen overflow-hidden relative">
  <div id="reaction-container" class="absolute inset-0 pointer-events-none"></div>

  <script type="module" src="/src/display.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/display.ts`**

```typescript
import './styles.css';
import { client, CHANNELS } from './lib/ably';
import type { EmojiMessage } from './types/messages';
import { isExternalMessage } from './types/messages';
import type { Types } from 'ably';

const reactionsChannel = client.channels.get(CHANNELS.reactions);
const presenterChannel = client.channels.get(CHANNELS.presenter);
const container = document.getElementById('reaction-container')!;

function renderEmoji(emoji: string): void {
  const el = document.createElement('span');
  el.className = 'absolute bottom-0 text-5xl animate-float-up pointer-events-none';
  el.textContent = emoji;
  el.style.left = `${Math.random() * 90}%`;

  container.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function handleReaction(msg: Types.Message): void {
  const data = msg.data as EmojiMessage;
  if (data.type === 'emoji') {
    renderEmoji(data.payload.emoji);
  }
}

function handlePresenter(msg: Types.Message): void {
  if (isExternalMessage(msg.data)) {
    console.log('Presenter event:', msg.data);
  }
}

reactionsChannel.subscribe('event', handleReaction);
presenterChannel.subscribe('event', handlePresenter);

client.connection.on('connected', () => {
  console.log('Ably connected (display)');
});

client.connection.on('failed', (err) => {
  console.error('Ably connection failed:', err);
});
```

- [ ] **Step 3: Verify build**

```bash
npx vite build
```

Expected: build succeeds, `dist/display.html` exists alongside `dist/controller.html`.

- [ ] **Step 4: Verify in browser**

```bash
npx vite dev
```

Open `http://localhost:5173/display.html` in one tab and `http://localhost:5173/controller.html` in another. Expected:
- Display: black full-screen page, console shows `Ably connected (display)`
- Click an emoji on controller → floating emoji appears on display, animates upward, fades out

- [ ] **Step 5: Commit**

```bash
git add display.html src/display.ts
git commit -m "feat: rewrite display with TypeScript and Tailwind"
```

---

### Task 8: Remove Old Files

**Files:**
- Delete: `js/config.js`, `js/controller.js`, `js/display.js`, `css/styles.css`

- [ ] **Step 1: Delete old source files**

```bash
rm -rf js/ css/
```

- [ ] **Step 2: Verify build still works**

```bash
npx vite build
```

Expected: build succeeds — no references to the old files remain.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove old plain JS and CSS files"
```

---

### Task 9: GitHub Actions Deployment

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create `.github/workflows/deploy.yml`**

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

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deploy to Pages"
```

---

### Task 10: End-to-End Verification

No new files. Manual verification task.

- [ ] **Step 1: Clean build**

```bash
rm -rf dist/
npx vite build
```

Expected: `dist/` contains `controller.html`, `display.html`, and `assets/` with bundled JS and CSS.

- [ ] **Step 2: Preview production build**

```bash
npx vite preview
```

Open `http://localhost:4173/tangible-workshop-interface/controller.html` and `http://localhost:4173/tangible-workshop-interface/display.html`.

Note: the preview URL includes the `base` path (`/tangible-workshop-interface/`).

- [ ] **Step 3: Test emoji flow**

1. Open display page in one tab
2. Open controller page in another tab
3. Click emoji buttons — floating emojis should appear on display
4. Console should show no errors on either page

- [ ] **Step 4: Test type safety**

```bash
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 5: Commit (if fixes were needed)**

```bash
git add -A
git commit -m "fix: adjustments from end-to-end verification"
```

Only commit if changes were made during verification. If everything passed clean, skip this step.

---

### Post-Implementation: GitHub Setup

These are one-time manual steps the user must do in the GitHub web UI:

1. **Add secret:** Repo → Settings → Secrets and variables → Actions → New repository secret → Name: `VITE_ABLY_API_KEY`, Value: the restricted Ably key
2. **Enable Pages:** Repo → Settings → Pages → Source: Deploy from a branch → Branch: `gh-pages` / `/ (root)`
3. **Push to main:** merge the `dev` branch into `main` to trigger the first deploy
4. **Verify:** visit `https://vectorinus.github.io/tangible-workshop-interface/controller.html`
