# Display Page Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure the app so `display.html` is the entry point with a fullscreen iframe, emoji overlay, hover-reveal nav bar with presenter controls, and all supporting modules.

**Architecture:** The display page becomes a presentation shell: a fullscreen iframe shows any website, floating emoji reactions overlay it, and a hover-reveal nav bar provides presenter tools (timer, audience count, URL bar, reaction toggle, mute, spotlight, QR overlay, fullscreen). Feature modules are split into focused files (`display-timer.ts`, `display-spotlight.ts`, `display-qr.ts`, `display-presence.ts`) that export `init` functions called from the main `display.ts` entry point.

**Tech Stack:** TypeScript, Vite, Tailwind CSS, Ably Realtime (pub/sub + presence), qrcode (canvas rendering)

**Spec:** `docs/superpowers/specs/2026-04-17-display-redesign-design.md`

---

## File Structure

```
src/
  display.ts              — entry point: welcome screen, iframe, nav hover, emoji rendering, Ably subs, control toggles, wires up modules
  display-timer.ts        — Timer class: start/stop+reset, MM:SS display
  display-spotlight.ts    — Spotlight: Ctrl-hold, mouse-follow radial gradient
  display-qr.ts           — QR overlay: generate QR code, full-screen toggle
  display-presence.ts     — Audience count via Ably channel presence
  controller.ts           — existing + presence.enter() addition
  lib/ably.ts             — unchanged
  types/messages.ts       — unchanged
  styles.css              — add nav-btn component classes

display.html              — rewritten: full markup for all display page elements
controller.html           — unchanged
vite.config.ts            — remove index.html entry

DELETED:
  index.html
  src/index.ts
```

---

### Task 1: Remove index page and update build config

**Files:**
- Delete: `index.html`
- Delete: `src/index.ts`
- Modify: `vite.config.ts:4-15`

- [ ] **Step 1: Delete `index.html`**

```bash
git rm index.html
```

- [ ] **Step 2: Delete `src/index.ts`**

```bash
git rm src/index.ts
```

- [ ] **Step 3: Update `vite.config.ts` — remove `index` entry**

Replace the entire file content with:

```typescript
import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/tangible-workshop-interface/',
  build: {
    rollupOptions: {
      input: {
        display: resolve(__dirname, 'display.html'),
        controller: resolve(__dirname, 'controller.html'),
      },
    },
  },
}));
```

- [ ] **Step 4: Verify dev server starts**

Run: `npm run dev`
Expected: Vite starts without errors. Navigating to `http://localhost:5173/display.html` shows the existing (empty black) display page. No 404s for `/display.html` or `/controller.html`.

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts
git commit -m "refactor: remove index page, display.html is now the entry point"
```

---

### Task 2: Add nav-btn component classes to styles.css

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Add component classes and keyframe**

Replace the entire file content with:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer components {
  .nav-btn {
    @apply bg-white/5 border border-white/[0.09] rounded-lg text-[#94a3b8] px-2.5 h-[34px] text-[13px] cursor-pointer flex items-center gap-1 whitespace-nowrap;
  }
  .nav-btn.active {
    @apply bg-[rgba(37,99,235,0.25)] border-[#2563eb] text-[#93c5fd];
  }
}

.nav-btn.spotlight-active {
  background: rgba(234, 179, 8, 0.18);
  border-color: rgba(234, 179, 8, 0.5);
  color: #fde047;
  animation: spotlight-pulse 1.2s ease-in-out infinite;
}

@keyframes spotlight-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.25); }
  50% { box-shadow: 0 0 0 5px rgba(234, 179, 8, 0.08); }
}
```

- [ ] **Step 2: Verify Tailwind builds**

Run: `npm run dev`
Expected: No PostCSS or Tailwind errors in the console.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "feat: add nav-btn component classes and spotlight-pulse keyframe"
```

---

### Task 3: Rewrite display.html with complete markup

**Files:**
- Modify: `display.html`

The HTML defines the full z-index stack and all DOM elements referenced by TypeScript modules. IDs must match exactly — every module assumes these IDs exist.

**Z-index stack (bottom to top):**
- `z-0` — iframe
- `z-10` — spotlight overlay
- `z-20` — reaction container (emoji)
- `z-30` — welcome overlay / QR overlay (never coexist)
- `z-50` — nav hover zone + nav bar

- [ ] **Step 1: Replace `display.html` contents**

Replace the entire file content with:

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workshop Display</title>
</head>
<body class="bg-black min-h-screen overflow-hidden relative">

  <!-- Fullscreen iframe (z-0) -->
  <iframe id="display-iframe"
    class="absolute inset-0 w-full h-full border-none z-0"
    src="" allow="autoplay; fullscreen; clipboard-write"
    referrerpolicy="no-referrer">
  </iframe>

  <!-- Spotlight overlay (z-10, between iframe and emojis) -->
  <div id="spotlight-overlay"
    class="absolute inset-0 z-10 pointer-events-none"
    style="display: none;">
  </div>

  <!-- Emoji reaction container (z-20, pointer-events-none so clicks pass to iframe) -->
  <div id="reaction-container"
    class="absolute inset-0 pointer-events-none z-20">
  </div>

  <!-- Welcome overlay (z-30, visible on first load before URL is set) -->
  <div id="welcome-overlay"
    class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black">
    <h1 class="text-white text-2xl mb-6 font-bold">Workshop Display</h1>
    <form id="welcome-form" class="flex gap-2 w-full max-w-md px-4">
      <input id="welcome-url-input" type="url" placeholder="https://..."
        class="flex-1 bg-[#1e293b] border border-[#334155] rounded-full px-5 py-3 text-white text-sm outline-none focus:border-[#2563eb] transition-colors"
        required>
      <button type="submit"
        class="bg-[#2563eb] text-white px-6 py-3 rounded-xl font-medium hover:bg-[#1d4ed8] transition-colors">
        Go
      </button>
    </form>
    <p class="text-[#334155] text-xs mt-4">Enter a URL to display in the background</p>
  </div>

  <!-- QR overlay (z-30, full screen behind nav bar, starts hidden) -->
  <div id="qr-overlay"
    class="absolute inset-0 z-30 flex-col items-center justify-center bg-black/[0.93]"
    style="display: none;">
    <h2 class="text-white text-2xl font-bold mb-4">Scan to join</h2>
    <div class="bg-white rounded-2xl p-6">
      <canvas id="qr-canvas"></canvas>
    </div>
    <p id="qr-url-text" class="text-[#64748b] text-sm mt-3"></p>
    <p class="text-[#334155] text-xs mt-2">click anywhere or press ESC to close</p>
  </div>

  <!-- Nav hover zone (z-50, invisible trigger area at top of viewport) -->
  <div id="nav-hover-zone" class="fixed top-0 left-0 right-0 h-[60px] z-50">
    <nav id="nav-bar"
      class="absolute top-0 left-0 right-0 h-[52px] bg-[rgba(5,8,20,0.93)] backdrop-blur-xl border-b border-white/[0.06] px-3 flex items-center gap-2 -translate-y-full opacity-0 transition-all duration-300">

      <!-- LEFT: status area -->
      <div class="flex items-center gap-2 min-w-[160px]">
        <!-- Timer block -->
        <div id="timer-block"
          class="flex items-center gap-1 bg-white/5 border border-white/[0.08] rounded-[9px] px-2 py-1 h-[34px]">
          <span id="timer-display"
            class="text-sm font-bold font-mono text-[#475569] min-w-[44px]"
            style="font-variant-numeric: tabular-nums;">
            00:00
          </span>
          <button id="timer-btn" type="button"
            class="w-[28px] h-[28px] rounded-md flex items-center justify-center text-sm cursor-pointer bg-[rgba(34,197,94,0.15)] text-[#4ade80] border border-[rgba(34,197,94,0.3)]"
            title="Start">
            ▶
          </button>
        </div>
        <!-- Audience count -->
        <div class="flex items-center gap-1 bg-white/5 border border-white/[0.08] rounded-[9px] px-2 py-1 h-[34px] text-xs text-[#94a3b8]">
          👥 <span id="audience-count" class="text-[#60a5fa] font-bold text-sm">0</span>
        </div>
      </div>

      <!-- CENTER: URL bar -->
      <div class="flex-1 flex justify-center">
        <form id="nav-url-form" class="flex items-center gap-1.5 w-[340px]">
          <input id="nav-url-input" type="url" placeholder="https://..."
            class="flex-1 bg-[#1a2235] border border-[#2d3f55] rounded-2xl px-3.5 py-1.5 text-[#cbd5e1] text-xs outline-none focus:border-[#2563eb] transition-colors">
          <button type="submit"
            class="bg-[#2563eb] text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-[#1d4ed8] transition-colors">
            Go
          </button>
        </form>
      </div>

      <!-- RIGHT: controls -->
      <div class="flex items-center gap-1 min-w-[160px] justify-end">
        <button id="btn-reactions" type="button" class="nav-btn" title="Toggle reactions">😶</button>
        <button id="btn-mute" type="button" class="nav-btn" title="Toggle mute">🔇</button>
        <button id="btn-spotlight" type="button" class="nav-btn" title="Hold Ctrl for spotlight">
          🔦 <span class="text-[9px] font-semibold text-[#475569] bg-white/[0.07] border border-white/[0.12] rounded px-1 leading-tight">Ctrl</span>
        </button>
        <button id="btn-qr" type="button" class="nav-btn" title="Show QR code">⊞</button>
        <div class="w-px h-[22px] bg-white/[0.08] mx-0.5"></div>
        <button id="btn-fullscreen" type="button" class="nav-btn text-[#64748b]" title="Fullscreen">⤢</button>
      </div>

    </nav>
  </div>

  <script type="module" src="/src/display.ts"></script>
</body>
</html>
```

- [ ] **Step 2: Verify the page loads in the browser**

Run: `npm run dev`
Navigate to `http://localhost:5173/display.html`
Expected: Welcome overlay visible with URL input. No console errors (TypeScript hasn't been updated yet — the existing `display.ts` will error because `#reaction-container` still exists but other elements are new. This is expected; it gets fixed in Task 8).

- [ ] **Step 3: Commit**

```bash
git add display.html
git commit -m "feat: rewrite display.html with full nav bar, overlays, and iframe markup"
```

---

### Task 4: Create timer module (`src/display-timer.ts`)

**Files:**
- Create: `src/display-timer.ts`

The timer counts up from `00:00`. One button toggles between start (▶) and stop+reset (↺). No pause state.

- [ ] **Step 1: Create `src/display-timer.ts`**

```typescript
export function initTimer(): void {
  const display = document.getElementById('timer-display')!;
  const btn = document.getElementById('timer-btn')!;
  const block = document.getElementById('timer-block')!;

  let running = false;
  let startTime = 0;
  let intervalId: number | undefined;

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function tick(): void {
    display.textContent = formatTime(Date.now() - startTime);
  }

  function start(): void {
    running = true;
    startTime = Date.now();
    intervalId = window.setInterval(tick, 200);
    tick();

    btn.textContent = '↺';
    btn.title = 'Stop & reset';
    btn.classList.remove(
      'bg-[rgba(34,197,94,0.15)]', 'text-[#4ade80]', 'border-[rgba(34,197,94,0.3)]'
    );
    btn.classList.add(
      'bg-[rgba(251,191,36,0.15)]', 'text-[#fbbf24]', 'border-[rgba(251,191,36,0.3)]'
    );

    block.classList.add('border-[rgba(34,197,94,0.35)]');
    display.classList.remove('text-[#475569]');
    display.classList.add('text-[#4ade80]');
  }

  function reset(): void {
    running = false;
    window.clearInterval(intervalId);

    display.textContent = '00:00';
    btn.textContent = '▶';
    btn.title = 'Start';
    btn.classList.remove(
      'bg-[rgba(251,191,36,0.15)]', 'text-[#fbbf24]', 'border-[rgba(251,191,36,0.3)]'
    );
    btn.classList.add(
      'bg-[rgba(34,197,94,0.15)]', 'text-[#4ade80]', 'border-[rgba(34,197,94,0.3)]'
    );

    block.classList.remove('border-[rgba(34,197,94,0.35)]');
    display.classList.add('text-[#475569]');
    display.classList.remove('text-[#4ade80]');
  }

  btn.addEventListener('click', () => {
    if (running) reset();
    else start();
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors in `display-timer.ts` (other files may error until Task 8).

- [ ] **Step 3: Commit**

```bash
git add src/display-timer.ts
git commit -m "feat: add timer module — counts up, single start/stop+reset button"
```

---

### Task 5: Create spotlight module (`src/display-spotlight.ts`)

**Files:**
- Create: `src/display-spotlight.ts`

Hold Ctrl to activate a radial-gradient vignette that follows the cursor. Release Ctrl to deactivate. The spotlight button in the nav pulses amber while active.

- [ ] **Step 1: Create `src/display-spotlight.ts`**

```typescript
export function initSpotlight(): void {
  const overlay = document.getElementById('spotlight-overlay')!;
  const btn = document.getElementById('btn-spotlight')!;

  let active = false;

  function activate(): void {
    if (active) return;
    active = true;
    overlay.style.display = 'block';
    btn.classList.add('spotlight-active');
  }

  function deactivate(): void {
    if (!active) return;
    active = false;
    overlay.style.display = 'none';
    btn.classList.remove('spotlight-active');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Control') activate();
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Control') deactivate();
  });

  // Deactivate if window loses focus while Ctrl is held (user alt-tabs)
  window.addEventListener('blur', deactivate);

  document.addEventListener('mousemove', (e) => {
    if (!active) return;
    overlay.style.background =
      `radial-gradient(circle 100px at ${e.clientX}px ${e.clientY}px, transparent 0%, transparent 35%, rgba(0,0,0,0.82) 65%)`;
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors in `display-spotlight.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/display-spotlight.ts
git commit -m "feat: add spotlight module — Ctrl-hold activates cursor-following vignette"
```

---

### Task 6: Create QR overlay module (`src/display-qr.ts`)

**Files:**
- Create: `src/display-qr.ts`

Full-screen QR overlay triggered by the ⊞ button. Nav bar stays visible on top (z-index handles this). The QR code is rendered as large as practical for scanning from the back of a room.

The module accepts a `lockNav` callback to keep the nav bar visible while the overlay is open — this avoids a circular import with `display.ts`.

- [ ] **Step 1: Create `src/display-qr.ts`**

```typescript
import QRCode from 'qrcode';

export function initQrOverlay(lockNav: (locked: boolean) => void): void {
  const overlay = document.getElementById('qr-overlay')!;
  const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
  const urlText = document.getElementById('qr-url-text')!;
  const btn = document.getElementById('btn-qr')!;

  let isOpen = false;

  const controllerUrl = new URL('controller.html', window.location.href).href;

  // Render QR as large as practical for scanning from the back of a room
  const size = Math.min(window.innerHeight * 0.6, window.innerWidth * 0.6, 600);
  QRCode.toCanvas(canvas, controllerUrl, {
    width: size,
    margin: 0,
    color: { dark: '#000000', light: '#ffffff' },
  });

  urlText.textContent = controllerUrl;

  function toggle(): void {
    isOpen = !isOpen;
    overlay.style.display = isOpen ? 'flex' : 'none';
    btn.classList.toggle('active', isOpen);
    lockNav(isOpen);
  }

  btn.addEventListener('click', toggle);

  // Click anywhere on the overlay to dismiss
  overlay.addEventListener('click', () => {
    if (isOpen) toggle();
  });

  // Escape key dismisses the overlay
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) toggle();
  });
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors in `display-qr.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/display-qr.ts
git commit -m "feat: add QR overlay module — full-screen QR code for audience scanning"
```

---

### Task 7: Create presence module (`src/display-presence.ts`) and update controller

**Files:**
- Create: `src/display-presence.ts`
- Modify: `src/controller.ts:7`

The display subscribes to Ably channel presence to count connected controllers. The controller must call `presence.enter()` so it shows up in the count.

- [ ] **Step 1: Create `src/display-presence.ts`**

```typescript
import type { RealtimeChannel } from 'ably';

export function initPresence(channel: RealtimeChannel): void {
  const countEl = document.getElementById('audience-count')!;

  async function updateCount(): Promise<void> {
    try {
      const members = await channel.presence.get();
      countEl.textContent = String(members.length);
    } catch {
      // Presence may not be available yet; leave count as-is
    }
  }

  channel.presence.subscribe(updateCount);
  updateCount();
}
```

- [ ] **Step 2: Update `src/controller.ts` — add `presence.enter()`**

Add one line after line 7 (`const reactionsChannel = ...`):

```typescript
reactionsChannel.presence.enter();
```

The full file after the change:

```typescript
import "./styles.css";
import { client, CHANNELS } from "./lib/ably";
import type { EmojiMessage } from "./types/messages";

const EMOJIS = ["👍", "👎", "😂", "🔥", "❤️", "👏", "🎉", "😮"];

const reactionsChannel = client.channels.get(CHANNELS.reactions);
reactionsChannel.presence.enter();
const grid = document.getElementById("emoji-grid")!;

EMOJIS.forEach((emoji) => {
  const btn = document.createElement("button");
  btn.className =
    "text-[2.5rem] p-3 border-none rounded-xl bg-[#16213e] cursor-pointer transition-[transform,background] duration-100 select-none active:scale-90 active:bg-[#0f3460]";
  btn.textContent = emoji;
  btn.addEventListener("click", () => {
    const msg: EmojiMessage = {
      type: "emoji",
      payload: { emoji },
      ts: Date.now(),
    };
    reactionsChannel.publish("event", msg);
  });
  grid.appendChild(btn);
});

client.connection.on("connected", () => {
  console.log("Ably connected (controller)");
});

client.connection.on("failed", (err) => {
  console.error("Ably connection failed:", err);
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors in either file.

- [ ] **Step 4: Commit**

```bash
git add src/display-presence.ts src/controller.ts
git commit -m "feat: add audience presence count — controller enters, display tracks"
```

---

### Task 8: Rewrite `src/display.ts` — main entry point

**Files:**
- Modify: `src/display.ts`

This is the main orchestration file. It handles: welcome screen / iframe URL management (with localStorage persistence), nav bar hover show/hide, emoji rendering (migrated from old display.ts), Ably channel subscriptions (migrated), reactions toggle, mute toggle, fullscreen toggle. It imports and initializes all feature modules.

- [ ] **Step 1: Replace `src/display.ts` contents**

Replace the entire file content with:

```typescript
import './styles.css';
import { client, CHANNELS } from './lib/ably';
import type { EmojiMessage } from './types/messages';
import { isExternalMessage } from './types/messages';
import type { InboundMessage } from 'ably';
import { initTimer } from './display-timer';
import { initSpotlight } from './display-spotlight';
import { initQrOverlay } from './display-qr';
import { initPresence } from './display-presence';

// ---------------------------------------------------------------------------
// DOM elements
// ---------------------------------------------------------------------------
const iframe = document.getElementById('display-iframe') as HTMLIFrameElement;
const welcomeOverlay = document.getElementById('welcome-overlay')!;
const welcomeForm = document.getElementById('welcome-form') as HTMLFormElement;
const welcomeUrlInput = document.getElementById('welcome-url-input') as HTMLInputElement;
const navBar = document.getElementById('nav-bar')!;
const navHoverZone = document.getElementById('nav-hover-zone')!;
const navUrlForm = document.getElementById('nav-url-form') as HTMLFormElement;
const navUrlInput = document.getElementById('nav-url-input') as HTMLInputElement;
const reactionContainer = document.getElementById('reaction-container')!;
const btnReactions = document.getElementById('btn-reactions')!;
const btnMute = document.getElementById('btn-mute')!;
const btnFullscreen = document.getElementById('btn-fullscreen')!;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const STORAGE_KEY = 'display-url';
let currentUrl = localStorage.getItem(STORAGE_KEY) || '';
let reactionsMuted = false;
let navLocked = false; // true when an overlay is open

// ---------------------------------------------------------------------------
// URL / iframe management
// ---------------------------------------------------------------------------
function loadUrl(url: string): void {
  currentUrl = url;
  localStorage.setItem(STORAGE_KEY, url);
  iframe.src = url;
  navUrlInput.value = url;
  welcomeOverlay.style.display = 'none';
}

welcomeForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = welcomeUrlInput.value.trim();
  if (url) loadUrl(url);
});

navUrlForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = navUrlInput.value.trim();
  if (url) loadUrl(url);
});

navUrlInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    navUrlInput.value = currentUrl;
    navUrlInput.blur();
  }
});

// Restore last URL from localStorage
if (currentUrl) {
  loadUrl(currentUrl);
}

// ---------------------------------------------------------------------------
// Nav bar hover show/hide
// ---------------------------------------------------------------------------
function showNav(): void {
  navBar.classList.remove('-translate-y-full', 'opacity-0');
  navBar.classList.add('translate-y-0', 'opacity-100');
}

function hideNav(): void {
  if (navLocked) return;
  navBar.classList.add('-translate-y-full', 'opacity-0');
  navBar.classList.remove('translate-y-0', 'opacity-100');
}

function lockNav(locked: boolean): void {
  navLocked = locked;
  if (locked) showNav();
}

navHoverZone.addEventListener('mouseenter', showNav);
navHoverZone.addEventListener('mouseleave', hideNav);

// ---------------------------------------------------------------------------
// Emoji rendering
// ---------------------------------------------------------------------------
function renderEmoji(emoji: string): void {
  if (reactionsMuted) return;
  const el = document.createElement('span');
  el.className = 'absolute bottom-0 text-5xl animate-float-up pointer-events-none';
  el.textContent = emoji;
  el.style.left = `${Math.random() * 90}%`;
  reactionContainer.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

// ---------------------------------------------------------------------------
// Reactions toggle
// ---------------------------------------------------------------------------
btnReactions.addEventListener('click', () => {
  reactionsMuted = !reactionsMuted;
  btnReactions.classList.toggle('active', reactionsMuted);
});

// ---------------------------------------------------------------------------
// Mute toggle (visual only — cross-origin iframes cannot be muted programmatically)
// ---------------------------------------------------------------------------
btnMute.addEventListener('click', () => {
  btnMute.classList.toggle('active');
});

// ---------------------------------------------------------------------------
// Fullscreen
// ---------------------------------------------------------------------------
btnFullscreen.addEventListener('click', () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

// ---------------------------------------------------------------------------
// Ably subscriptions
// ---------------------------------------------------------------------------
const reactionsChannel = client.channels.get(CHANNELS.reactions);
const presenterChannel = client.channels.get(CHANNELS.presenter);

function handleReaction(msg: InboundMessage): void {
  const data = msg.data as EmojiMessage;
  if (data.type === 'emoji') {
    renderEmoji(data.payload.emoji);
  }
}

function handlePresenter(msg: InboundMessage): void {
  if (isExternalMessage(msg.data)) {
    console.log('Presenter event:', msg.data);
  }
}

reactionsChannel.subscribe('event', handleReaction);
presenterChannel.subscribe('event', handlePresenter);

client.connection.on('connected', () => console.log('Ably connected (display)'));
client.connection.on('failed', (err) => console.error('Ably connection failed:', err));

// ---------------------------------------------------------------------------
// Initialize feature modules
// ---------------------------------------------------------------------------
initTimer();
initSpotlight();
initQrOverlay(lockNav);
initPresence(reactionsChannel);
```

- [ ] **Step 2: Verify TypeScript compiles with zero errors**

Run: `npx tsc --noEmit`
Expected: Clean — zero errors across all files.

- [ ] **Step 3: Verify the full page works in the browser**

Run: `npm run dev`
Navigate to `http://localhost:5173/display.html`

Check each feature:
1. **Welcome screen** — visible on first load. Enter a URL (e.g. `https://example.com`), press Go. Iframe loads, welcome disappears.
2. **localStorage** — refresh the page. Welcome should NOT reappear; iframe reloads the saved URL.
3. **Nav hover** — move mouse to the very top of the viewport. Nav bar slides down. Move mouse away. Nav bar slides up.
4. **URL bar** — type a new URL in the nav bar input, press Go. Iframe updates.
5. **Timer** — click ▶. Timer counts up in MM:SS. Click ↺. Timer resets to 00:00 with ▶ button.
6. **QR overlay** — click ⊞. Full-screen QR appears. Nav bar stays visible. Click anywhere on overlay or press Escape. Overlay dismisses.
7. **Spotlight** — hold Ctrl. Dark vignette appears with a bright circle around cursor. Release Ctrl. Vignette disappears. Spotlight button pulses amber while held.
8. **Reactions toggle** — click 😶. Button highlights. Open controller on another tab, send emoji. No emoji appears on display. Click 😶 again to un-mute. Emojis appear again.
9. **Mute** — click 🔇. Button highlights. Click again. Toggles visual state.
10. **Fullscreen** — click ⤢. Browser goes fullscreen. Press Escape or click ⤢ again to exit.
11. **Audience count** — open controller in another tab. The 👥 count in the nav should show `1`. Open another controller tab → `2`.

- [ ] **Step 4: Commit**

```bash
git add src/display.ts
git commit -m "feat: rewrite display.ts — welcome screen, nav bar, emoji, and all presenter controls"
```

---

### Task 9: Final verification and cleanup

- [ ] **Step 1: Run the production build**

Run: `npm run build`
Expected: Build succeeds. Output in `dist/` contains `display.html`, `controller.html`, and bundled JS/CSS assets.

- [ ] **Step 2: Preview the production build**

Run: `npm run preview`
Navigate to the preview URL + `/display.html`.
Expected: Everything works the same as in dev mode.

- [ ] **Step 3: Verify controller page is unaffected**

Navigate to `/controller.html`.
Expected: Emoji grid displays correctly. Clicking emojis publishes to Ably. No console errors.

- [ ] **Step 4: Check for TypeScript errors**

Run: `npx tsc --noEmit`
Expected: Zero errors.

- [ ] **Step 5: Final commit (if any cleanup was needed)**

```bash
git add -A
git commit -m "chore: final cleanup after display page redesign"
```

Skip this step if no changes were needed.
