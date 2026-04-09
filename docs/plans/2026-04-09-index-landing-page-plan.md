# Index Landing Page Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a projector-friendly landing page (`index.html`) with a dynamically generated QR code linking to the controller page, plus links to both controller and display.

**Architecture:** Third Vite entry point following the exact same pattern as controller/display. `src/index.ts` uses the `qrcode` npm package to render a QR code to a canvas at runtime, with the URL derived from `window.location` so it works in any environment.

**Tech Stack:** Vite, TypeScript, Tailwind CSS v3, vite-plugin-html, qrcode (npm)

---

## File Map

| File | Responsibility |
|---|---|
| `index.html` | Entry point: EJS head include, centered dark layout, canvas + links |
| `src/index.ts` | Runtime URL construction, QR render to canvas, link href assignment |
| `vite.config.ts` | Add third page entry (existing file) |

---

### Task 1: Install QR Code Dependency

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install packages**

```bash
npm install qrcode
npm install -D @types/qrcode
```

- [ ] **Step 2: Verify install**

```bash
node -e "require('qrcode'); console.log('qrcode OK')"
```

Expected: `qrcode OK`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: add qrcode dependency for landing page"
```

---

### Task 2: Create Index Page and Update Vite Config

**Files:**
- Create: `index.html`
- Create: `src/index.ts`
- Modify: `vite.config.ts`

- [ ] **Step 1: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="de">
<%- include('./components/head.html', { title: 'Workshop' }) %>
<body class="font-sans flex flex-col items-center justify-center min-h-screen bg-[#1a1a2e] text-white">
  <h1 class="mb-8 text-3xl font-bold">Scan to join</h1>

  <div class="bg-white rounded-xl p-4 mb-4">
    <canvas id="qr-canvas"></canvas>
  </div>

  <p id="controller-url" class="text-sm text-gray-400 mb-8 select-all"></p>

  <div class="flex gap-4">
    <a
      id="display-link"
      class="px-6 py-3 rounded-xl bg-[#16213e] text-white no-underline transition-colors duration-100 hover:bg-[#0f3460]"
      target="_blank"
    >
      Open Display
    </a>
    <a
      id="controller-link"
      class="px-6 py-3 rounded-xl bg-[#16213e] text-white no-underline transition-colors duration-100 hover:bg-[#0f3460]"
      target="_blank"
    >
      Open Controller
    </a>
  </div>

  <script type="module" src="/src/index.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Create `src/index.ts`**

```typescript
import './styles.css';
import QRCode from 'qrcode';

const controllerUrl = new URL('controller.html', window.location.href).href;
const displayUrl = new URL('display.html', window.location.href).href;

// Render QR code to canvas
const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
QRCode.toCanvas(canvas, controllerUrl, {
  width: 300,
  margin: 0,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
});

// Show URL as text for people who can't scan
const urlEl = document.getElementById('controller-url')!;
urlEl.textContent = controllerUrl;

// Set link hrefs dynamically
const displayLink = document.getElementById('display-link') as HTMLAnchorElement;
displayLink.href = displayUrl;

const controllerLink = document.getElementById('controller-link') as HTMLAnchorElement;
controllerLink.href = controllerUrl;
```

- [ ] **Step 3: Update `vite.config.ts`**

Add `index.html` to the `pages` array inside `createHtmlPlugin` (after the existing `display.html` entry):

```typescript
{
  filename: 'index.html',
  template: 'index.html',
  injectOptions: {
    ejsOptions: {
      filename: resolve(__dirname, 'index.html'),
    },
  },
},
```

Add `index.html` to the `rollupOptions.input` object:

```typescript
input: {
  index: resolve(__dirname, 'index.html'),
  controller: resolve(__dirname, 'controller.html'),
  display: resolve(__dirname, 'display.html'),
},
```

The full updated `vite.config.ts`:

```typescript
import { resolve } from 'path';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  base: '/tangible-workshop-interface/',
  plugins: [
    createHtmlPlugin({
      minify: true,
      pages: [
        {
          filename: 'index.html',
          template: 'index.html',
          injectOptions: {
            ejsOptions: {
              filename: resolve(__dirname, 'index.html'),
            },
          },
        },
        {
          filename: 'controller.html',
          template: 'controller.html',
          injectOptions: {
            ejsOptions: {
              filename: resolve(__dirname, 'controller.html'),
            },
          },
        },
        {
          filename: 'display.html',
          template: 'display.html',
          injectOptions: {
            ejsOptions: {
              filename: resolve(__dirname, 'display.html'),
            },
          },
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        controller: resolve(__dirname, 'controller.html'),
        display: resolve(__dirname, 'display.html'),
      },
    },
  },
});
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Verify build**

```bash
npx vite build
```

Expected: build succeeds, `dist/index.html`, `dist/controller.html`, and `dist/display.html` all exist.

- [ ] **Step 6: Verify dev server**

```bash
npx vite dev
```

Open `http://localhost:5173/tangible-workshop-interface/index.html`. Expected:
- Dark background, centered layout
- QR code renders (pointing to controller.html URL)
- Controller URL shown as text below QR
- Both links work (open in new tab)

- [ ] **Step 7: Commit**

```bash
git add index.html src/index.ts vite.config.ts
git commit -m "feat: add index landing page with QR code"
```
