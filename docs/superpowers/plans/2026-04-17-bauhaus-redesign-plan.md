# Bauhaus Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the top nav bar with a right-side hover sidebar, redesign the controller as a full-viewport 2×2 remote control, and replace emoji reactions with a unified feedback message system using Bauhaus visual language.

**Architecture:** `src/types/messages.ts` defines `FeedbackMessage`; `src/display-feedback.ts` handles bar state and floating icon animation; `src/display-sidebar.ts` handles sidebar show/hide and control wiring; `display.ts` orchestrates all modules. Both pages use Space Mono + Material Symbols Sharp (wght 200), no border-radius, black/white + 4 Pantone accent colors.

**Tech Stack:** Vite, TypeScript, Tailwind CSS, Ably Realtime, Google Fonts (Space Mono, Material Symbols Sharp)

---

### Task 1: Message schema migration

**Files:**
- Modify: `src/types/messages.ts`
- Modify: `src/display.ts` (import + handler only — keeps nav logic intact)
- Modify: `src/controller.ts` (import only — keeps emoji loop intact)

- [ ] **Step 1: Replace src/types/messages.ts**

```typescript
// Internal message — controller -> display (we own the shape)
export type FeedbackKind = "lightbulb" | "heart" | "star" | "replay";

export interface FeedbackMessage {
  type: "feedback";
  payload: { kind: FeedbackKind };
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

export type WorkshopMessage = FeedbackMessage | ExternalMessage;

export function isExternalMessage(data: unknown): data is ExternalMessage {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof (data as Record<string, unknown>).type === "string" &&
    "ts" in data &&
    typeof (data as Record<string, unknown>).ts === "number"
  );
}
```

- [ ] **Step 2: Update display.ts import and handleReaction**

In `src/display.ts`, change line 3 from:
```typescript
import type { EmojiMessage } from "./types/messages";
```
To:
```typescript
import type { FeedbackMessage } from "./types/messages";
```

Replace the `handleReaction` function:
```typescript
function handleReaction(msg: InboundMessage): void {
  const data = msg.data as FeedbackMessage;
  if (data.type === "feedback") {
    renderEmoji(data.payload.kind); // temporary — replaced in Task 5
  }
}
```

- [ ] **Step 3: Update controller.ts import and message type**

In `src/controller.ts`, change line 3 from:
```typescript
import type { EmojiMessage } from "./types/messages";
```
To:
```typescript
import type { FeedbackMessage } from "./types/messages";
```

Inside the `btn.addEventListener("click", ...)` callback, replace:
```typescript
const msg: EmojiMessage = {
  type: "emoji",
  payload: { emoji },
  ts: Date.now(),
};
```
With:
```typescript
const msg: FeedbackMessage = {
  type: "feedback",
  payload: { kind: "lightbulb" }, // temporary placeholder — replaced in Task 8
  ts: Date.now(),
};
```

- [ ] **Step 4: Build**

```bash
npm run build
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 5: Commit**

```bash
git add src/types/messages.ts src/display.ts src/controller.ts
git commit -m "feat: add FeedbackMessage type, migrate display and controller imports"
```

---

### Task 2: Create display-feedback.ts

**Files:**
- Create: `src/display-feedback.ts`

- [ ] **Step 1: Create the file**

```typescript
import type { RealtimeChannel } from 'ably';
import type { InboundMessage } from 'ably';
import type { FeedbackKind, FeedbackMessage } from './types/messages';

const KIND_ICON: Record<FeedbackKind, string> = {
  lightbulb: 'lightbulb',
  heart: 'favorite',
  star: 'star',
  replay: 'replay',
};

const KIND_COLOR: Record<FeedbackKind, string> = {
  lightbulb: '#DACD65',
  heart: '#9A2B2E',
  star: '#5085C3',
  replay: '#00666C',
};

export function initFeedback(
  reactionsChannel: RealtimeChannel,
  reactionContainer: HTMLElement,
  getReactionsMuted: () => boolean,
): void {
  const counts: Record<FeedbackKind, number> = {
    lightbulb: 0,
    heart: 0,
    star: 0,
    replay: 0,
  };

  function updateBars(): void {
    const max = Math.max(1, ...Object.values(counts));
    (Object.keys(counts) as FeedbackKind[]).forEach((kind) => {
      const row = document.querySelector<HTMLElement>(
        `.feedback-row[data-kind="${kind}"]`,
      );
      if (!row) return;
      const fill = row.querySelector<HTMLElement>('.bar-fill');
      const countEl = row.querySelector<HTMLElement>('.bar-count');
      if (fill) fill.style.width = `${(counts[kind] / max) * 100}%`;
      if (countEl) countEl.textContent = String(counts[kind]);
    });
  }

  function renderFloatingIcon(kind: FeedbackKind): void {
    if (getReactionsMuted()) return;
    const el = document.createElement('span');
    el.className =
      'material-symbols-sharp absolute bottom-0 animate-float-up pointer-events-none';
    el.style.left = `${Math.random() * 90}%`;
    el.style.color = KIND_COLOR[kind];
    el.style.fontSize = '3rem';
    el.textContent = KIND_ICON[kind];
    reactionContainer.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
  }

  reactionsChannel.subscribe('event', (msg: InboundMessage) => {
    const data = msg.data as FeedbackMessage;
    if (data.type === 'feedback') {
      const kind = data.payload.kind;
      if (kind in counts) {
        counts[kind]++;
        updateBars();
        renderFloatingIcon(kind);
      }
    }
  });
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/display-feedback.ts
git commit -m "feat: add display-feedback module for bar state and floating icon animation"
```

---

### Task 3: Create display-sidebar.ts

**Files:**
- Create: `src/display-sidebar.ts`

- [ ] **Step 1: Create the file**

```typescript
export function initSidebar(opts: {
  currentUrl: () => string;
  onUrlLoad: (url: string) => void;
  onReactionsToggle: () => void;
}): void {
  const hoverZone = document.getElementById('sidebar-hover-zone')!;
  const sidebar = document.getElementById('sidebar')!;
  const urlForm = document.getElementById('sidebar-url-form') as HTMLFormElement;
  const urlInput = document.getElementById(
    'sidebar-url-input',
  ) as HTMLInputElement;
  const btnReactions = document.getElementById('btn-reactions')!;
  const btnFullscreen = document.getElementById('btn-fullscreen')!;

  function openSidebar(): void {
    sidebar.classList.add('sidebar-open');
  }

  function closeSidebar(): void {
    sidebar.classList.remove('sidebar-open');
  }

  hoverZone.addEventListener('mouseenter', openSidebar);
  hoverZone.addEventListener('mouseleave', closeSidebar);
  sidebar.addEventListener('mouseenter', openSidebar);
  sidebar.addEventListener('mouseleave', closeSidebar);

  urlInput.value = opts.currentUrl();

  urlForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();
    if (url) opts.onUrlLoad(url);
  });

  urlInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      urlInput.value = opts.currentUrl();
      urlInput.blur();
    }
  });

  btnReactions.addEventListener('click', () => {
    opts.onReactionsToggle();
    btnReactions.classList.toggle('sb-btn-active');
  });

  btnFullscreen.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen();
  });
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/display-sidebar.ts
git commit -m "feat: add display-sidebar module for hover show/hide and control wiring"
```

---

### Task 4: Redesign index.html

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace index.html**

```html
<!doctype html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Workshop Display</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@24,200,0,0&display=swap"
      rel="stylesheet"
    />
  </head>
  <body class="bg-black min-h-screen overflow-hidden relative">

    <!-- Fullscreen iframe (z-0) -->
    <iframe
      id="display-iframe"
      class="absolute inset-0 w-full h-full border-none z-0"
      src=""
      allow="autoplay; fullscreen; clipboard-write"
      allowfullscreen
      referrerpolicy="no-referrer"
      footer="false"
    ></iframe>

    <!-- Spotlight overlay (z-10) -->
    <div
      id="spotlight-overlay"
      class="absolute inset-0 z-10 pointer-events-none"
      style="display: none"
    ></div>

    <!-- Reaction container (z-20) -->
    <div
      id="reaction-container"
      class="absolute inset-0 pointer-events-none z-20"
    ></div>

    <!-- Welcome overlay (z-30) -->
    <div
      id="welcome-overlay"
      class="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black"
    >
      <h1
        class="text-white text-2xl mb-6 font-bold"
        style="font-family: 'Space Mono', monospace; letter-spacing: 0.08em"
      >WORKSHOP DISPLAY</h1>
      <form id="welcome-form" class="flex gap-2 w-full max-w-md px-4">
        <input
          id="welcome-url-input"
          type="url"
          placeholder="https://..."
          class="flex-1 bg-black border border-white px-4 py-3 text-white text-sm outline-none"
          style="font-family: 'Space Mono', monospace; border-radius: 0"
          required
        />
        <button
          type="submit"
          class="bg-white text-black px-6 py-3 font-bold text-sm"
          style="font-family: 'Space Mono', monospace; border-radius: 0"
        >GO</button>
      </form>
    </div>

    <!-- QR overlay (z-[60], above sidebar) -->
    <div
      id="qr-overlay"
      class="absolute inset-0 z-[60] flex-col items-center justify-center bg-black/[0.93]"
      style="display: none"
    >
      <h2
        class="text-white text-2xl font-bold mb-4"
        style="font-family: 'Space Mono', monospace; letter-spacing: 0.08em"
      >SCAN TO JOIN</h2>
      <div class="bg-white p-6">
        <canvas id="qr-canvas"></canvas>
      </div>
      <p
        id="qr-url-text"
        class="text-[#64748b] text-sm mt-3"
        style="font-family: 'Space Mono', monospace"
      ></p>
      <p
        class="text-[#334155] text-xs mt-2"
        style="font-family: 'Space Mono', monospace"
      >CLICK ANYWHERE OR PRESS ESC TO CLOSE</p>
    </div>

    <!-- Sidebar hover zone (z-50, 40px strip on right edge) -->
    <div id="sidebar-hover-zone" class="fixed top-0 right-0 w-10 h-full z-50"></div>

    <!-- Sidebar panel (z-50) -->
    <div id="sidebar" class="sidebar">

      <!-- Section 1: Status -->
      <div class="sb-section">
        <div id="timer-block" class="sb-timer-block">
          <span
            id="timer-display"
            class="text-sm font-mono text-[#475569]"
            style="font-variant-numeric: tabular-nums; font-family: 'Space Mono', monospace; min-width: 44px"
          >00:00</span>
          <button
            id="timer-btn"
            type="button"
            class="w-[28px] h-[28px] flex items-center justify-center text-sm cursor-pointer bg-[rgba(34,197,94,0.15)] text-[#4ade80] border border-[rgba(34,197,94,0.3)]"
            style="border-radius: 0"
            title="Start"
          >▶</button>
        </div>
        <div class="sb-audience">
          <span class="material-symbols-sharp sb-icon">people</span>
          <span id="audience-count" class="sb-count">0</span>
        </div>
      </div>

      <div class="sb-divider"></div>

      <!-- Section 2: Feedback bars -->
      <div class="sb-section">
        <div class="sb-label">FEEDBACK</div>

        <div class="feedback-row" data-kind="lightbulb">
          <span class="material-symbols-sharp sb-icon" style="color: #DACD65">lightbulb</span>
          <div class="bar-track">
            <div class="bar-fill" style="border-color: #DACD65; background: rgba(218,205,101,0.4); width: 0%"></div>
          </div>
          <span class="bar-count">0</span>
        </div>

        <div class="feedback-row" data-kind="heart">
          <span class="material-symbols-sharp sb-icon" style="color: #9A2B2E">favorite</span>
          <div class="bar-track">
            <div class="bar-fill" style="border-color: #9A2B2E; background: rgba(154,43,46,0.4); width: 0%"></div>
          </div>
          <span class="bar-count">0</span>
        </div>

        <div class="feedback-row" data-kind="star">
          <span class="material-symbols-sharp sb-icon" style="color: #5085C3">star</span>
          <div class="bar-track">
            <div class="bar-fill" style="border-color: #5085C3; background: rgba(80,133,195,0.4); width: 0%"></div>
          </div>
          <span class="bar-count">0</span>
        </div>

        <div class="feedback-row" data-kind="replay">
          <span class="material-symbols-sharp sb-icon" style="color: #00666C">replay</span>
          <div class="bar-track">
            <div class="bar-fill" style="border-color: #00666C; background: rgba(0,102,108,0.4); width: 0%"></div>
          </div>
          <span class="bar-count">0</span>
        </div>
      </div>

      <div class="sb-divider"></div>

      <!-- Section 3: Controls -->
      <div class="sb-section">
        <form id="sidebar-url-form" class="sb-url-form">
          <input
            id="sidebar-url-input"
            type="url"
            placeholder="https://..."
            class="sb-url-input"
          />
          <button type="submit" class="sb-btn">GO</button>
        </form>
        <div class="sb-icon-row">
          <button id="btn-reactions" type="button" class="sb-icon-btn" title="Toggle reactions">
            <span class="material-symbols-sharp">emoji_emotions</span>
          </button>
          <button id="btn-spotlight" type="button" class="sb-icon-btn" title="Spotlight (ESC to exit)">
            <span class="material-symbols-sharp">highlight</span>
          </button>
          <button id="btn-qr" type="button" class="sb-icon-btn" title="Show QR code">
            <span class="material-symbols-sharp">qr_code_2</span>
          </button>
          <button id="btn-fullscreen" type="button" class="sb-icon-btn" title="Fullscreen">
            <span class="material-symbols-sharp">fullscreen</span>
          </button>
        </div>
      </div>

    </div>

    <script type="module" src="/src/display.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "refactor: replace top nav with right-side sidebar HTML"
```

---

### Task 5: Update display.ts

**Files:**
- Modify: `src/display.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import "./styles.css";
import { client, CHANNELS } from "./lib/ably";
import { isExternalMessage } from "./types/messages";
import type { InboundMessage } from "ably";
import { initTimer } from "./display-timer";
import { initSpotlight } from "./display-spotlight";
import { initQrOverlay } from "./display-qr";
import { initPresence } from "./display-presence";
import { initSidebar } from "./display-sidebar";
import { initFeedback } from "./display-feedback";

// ---------------------------------------------------------------------------
// DOM elements
// ---------------------------------------------------------------------------
const iframe = document.getElementById("display-iframe") as HTMLIFrameElement;
const welcomeOverlay = document.getElementById("welcome-overlay")!;
const welcomeForm = document.getElementById("welcome-form") as HTMLFormElement;
const welcomeUrlInput = document.getElementById(
  "welcome-url-input",
) as HTMLInputElement;
const reactionContainer = document.getElementById("reaction-container")!;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const STORAGE_KEY = "display-url";
let currentUrl = localStorage.getItem(STORAGE_KEY) || "";
let reactionsMuted = false;

// ---------------------------------------------------------------------------
// URL / iframe management
// ---------------------------------------------------------------------------
function loadUrl(url: string): void {
  currentUrl = url;
  localStorage.setItem(STORAGE_KEY, url);
  iframe.src = url;
  welcomeOverlay.style.display = "none";
}

welcomeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = welcomeUrlInput.value.trim();
  if (url) loadUrl(url);
});

if (currentUrl) {
  loadUrl(currentUrl);
}

// ---------------------------------------------------------------------------
// Ably subscriptions
// ---------------------------------------------------------------------------
const reactionsChannel = client.channels.get(CHANNELS.reactions);
const presenterChannel = client.channels.get(CHANNELS.presenter);

function handlePresenter(msg: InboundMessage): void {
  if (isExternalMessage(msg.data)) {
    console.log("Presenter event:", msg.data);
  }
}

presenterChannel.subscribe("event", handlePresenter);

client.connection.on("connected", () =>
  console.log("Ably connected (display)"),
);
client.connection.on("failed", (err) =>
  console.error("Ably connection failed:", err),
);

// ---------------------------------------------------------------------------
// Initialize feature modules
// ---------------------------------------------------------------------------
initTimer();
initSpotlight();
initQrOverlay(() => {}); // No nav to lock in sidebar design
initPresence(reactionsChannel);
initSidebar({
  currentUrl: () => currentUrl,
  onUrlLoad: loadUrl,
  onReactionsToggle: () => {
    reactionsMuted = !reactionsMuted;
  },
});
initFeedback(reactionsChannel, reactionContainer, () => reactionsMuted);
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/display.ts
git commit -m "refactor: update display.ts — remove nav logic, wire sidebar and feedback modules"
```

---

### Task 6: Update styles.css

**Files:**
- Modify: `src/styles.css`

- [ ] **Step 1: Replace the entire file**

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@24,200,0,0&display=swap');

@tailwind base;
@tailwind components;
@tailwind utilities;

/* ── Material Symbols Sharp ───────────────────────────────────────── */
.material-symbols-sharp {
  font-family: 'Material Symbols Sharp';
  font-weight: normal;
  font-style: normal;
  font-size: 24px;
  display: inline-block;
  line-height: 1;
  text-transform: none;
  letter-spacing: normal;
  white-space: nowrap;
  direction: ltr;
  -webkit-font-feature-settings: 'liga';
  font-feature-settings: 'liga';
}

/* ── Sidebar panel ────────────────────────────────────────────────── */
.sidebar {
  position: fixed;
  top: 0;
  right: 0;
  height: 100%;
  width: 240px;
  z-index: 50;
  background: rgba(0, 0, 0, 0.93);
  backdrop-filter: blur(16px);
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  transform: translateX(100%);
  transition: transform 300ms ease;
  display: flex;
  flex-direction: column;
  font-family: 'Space Mono', monospace;
  overflow-y: auto;
}

.sidebar-open {
  transform: translateX(0);
}

/* ── Sidebar sections ─────────────────────────────────────────────── */
.sb-section {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.sb-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.sb-label {
  font-size: 9px;
  color: #555;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: 'Space Mono', monospace;
}

.sb-timer-block {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sb-audience {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #666;
  font-size: 12px;
  font-family: 'Space Mono', monospace;
}

.sb-count {
  color: #fff;
  font-weight: 700;
  font-size: 13px;
  font-family: 'Space Mono', monospace;
}

.sb-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* ── Feedback bars ────────────────────────────────────────────────── */
.feedback-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.bar-track {
  flex: 1;
  height: 6px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  overflow: hidden;
}

.bar-fill {
  height: 100%;
  width: 0%;
  border-right: 1px solid;
  transition: width 300ms ease;
}

.bar-count {
  font-size: 11px;
  color: #555;
  font-family: 'Space Mono', monospace;
  min-width: 20px;
  text-align: right;
}

/* ── Sidebar controls ─────────────────────────────────────────────── */
.sb-url-form {
  display: flex;
  gap: 6px;
}

.sb-url-input {
  flex: 1;
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  padding: 6px 8px;
  outline: none;
  border-radius: 0;
  min-width: 0;
}

.sb-url-input:focus {
  border-color: rgba(255, 255, 255, 0.6);
}

.sb-btn {
  background: #fff;
  color: #000;
  border: none;
  font-family: 'Space Mono', monospace;
  font-size: 10px;
  font-weight: 700;
  padding: 6px 10px;
  cursor: pointer;
  letter-spacing: 0.05em;
  border-radius: 0;
  white-space: nowrap;
}

.sb-icon-row {
  display: flex;
  gap: 6px;
}

.sb-icon-btn {
  background: #000;
  color: rgba(255, 255, 255, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.12);
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border-radius: 0;
  transition: background 150ms, color 150ms;
  flex-shrink: 0;
}

.sb-icon-btn:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.sb-icon-btn.active,
.sb-btn-active {
  background: #fff !important;
  color: #000 !important;
}

/* ── Spotlight active state ───────────────────────────────────────── */
.sb-icon-btn.spotlight-active {
  background: rgba(234, 179, 8, 0.18);
  border-color: rgba(234, 179, 8, 0.5);
  color: #fde047;
  animation: spotlight-pulse 1.2s ease-in-out infinite;
}

@keyframes spotlight-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(234, 179, 8, 0.25); }
  50%       { box-shadow: 0 0 0 5px rgba(234, 179, 8, 0.08); }
}

/* ── Controller layout ────────────────────────────────────────────── */
.ctrl-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: 1fr 1fr;
  flex: 1;
  min-height: 0;
}

.ctrl-btn {
  background: #000;
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  font-family: 'Space Mono', monospace;
  border-radius: 0;
  transition: background 80ms;
  padding: 0;
}

.ctrl-icon {
  font-family: 'Material Symbols Sharp';
  font-weight: normal;
  font-style: normal;
  font-size: 48px;
  display: inline-block;
  line-height: 1;
  -webkit-font-feature-settings: 'liga';
  font-feature-settings: 'liga';
}

.ctrl-label {
  font-size: 10px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-family: 'Space Mono', monospace;
}
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/styles.css
git commit -m "style: replace nav-btn styles with Bauhaus sidebar and controller CSS"
```

---

### Task 7: Redesign controller.html

**Files:**
- Modify: `controller.html`

- [ ] **Step 1: Replace controller.html**

```html
<!DOCTYPE html>
<html lang="de">
  <head>
    <meta charset="UTF-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no"
    />
    <title>Workshop Controller</title>
    <link
      href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@24,200,0,0&display=swap"
      rel="stylesheet"
    />
  </head>
  <body
    style="
      margin: 0;
      background: #000;
      color: #fff;
      font-family: 'Space Mono', monospace;
      height: 100dvh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    "
  >
    <!-- Header -->
    <header
      style="
        padding: 12px 16px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-shrink: 0;
      "
    >
      <span style="font-size: 11px; font-weight: 700; letter-spacing: 0.15em">WORKSHOP</span>
      <div style="display: flex; align-items: center; gap: 6px; font-size: 11px; color: #555">
        <span
          style="
            font-family: 'Material Symbols Sharp';
            font-size: 16px;
            font-weight: normal;
            line-height: 1;
          "
        >people</span>
        <span id="audience-count-ctrl">0</span>
      </div>
    </header>

    <!-- 2×2 reaction grid -->
    <div class="ctrl-grid">
      <button class="ctrl-btn" id="btn-lightbulb" data-kind="lightbulb" data-color="#DACD65">
        <span class="ctrl-icon">lightbulb</span>
        <span class="ctrl-label">IDEA</span>
      </button>
      <button class="ctrl-btn" id="btn-heart" data-kind="heart" data-color="#9A2B2E">
        <span class="ctrl-icon">favorite</span>
        <span class="ctrl-label">LIKED IT</span>
      </button>
      <button class="ctrl-btn" id="btn-star" data-kind="star" data-color="#5085C3">
        <span class="ctrl-icon">star</span>
        <span class="ctrl-label">KEY POINT</span>
      </button>
      <button class="ctrl-btn" id="btn-replay" data-kind="replay" data-color="#00666C">
        <span class="ctrl-icon">replay</span>
        <span class="ctrl-label">REVISIT</span>
      </button>
    </div>

    <!-- Status bar -->
    <div
      style="
        padding: 8px 16px;
        border-top: 1px solid rgba(255,255,255,0.08);
        display: flex;
        align-items: center;
        gap: 6px;
        flex-shrink: 0;
      "
    >
      <span
        id="ctrl-status-dot"
        style="width: 6px; height: 6px; background: #555; display: inline-block; flex-shrink: 0"
      ></span>
      <span
        id="ctrl-status-text"
        style="font-size: 9px; letter-spacing: 0.12em; color: #555"
      >CONNECTING...</span>
    </div>

    <script type="module" src="/src/controller.ts"></script>
  </body>
</html>
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add controller.html
git commit -m "refactor: redesign controller as full-viewport 2x2 remote control"
```

---

### Task 8: Rewrite controller.ts

**Files:**
- Modify: `src/controller.ts`

- [ ] **Step 1: Replace the entire file**

```typescript
import "./styles.css";
import { client, CHANNELS } from "./lib/ably";
import type { FeedbackMessage, FeedbackKind } from "./types/messages";

const reactionsChannel = client.channels.get(CHANNELS.reactions);
reactionsChannel.presence.enter();

// ---------------------------------------------------------------------------
// Connection status
// ---------------------------------------------------------------------------
const statusDot = document.getElementById('ctrl-status-dot')!;
const statusText = document.getElementById('ctrl-status-text')!;

function setStatus(connected: boolean): void {
  statusDot.style.background = connected ? '#4ade80' : '#555';
  statusText.style.color = connected ? '#4ade80' : '#555';
  statusText.textContent = connected ? 'CONNECTED' : 'CONNECTING...';
}

// ---------------------------------------------------------------------------
// Audience count
// ---------------------------------------------------------------------------
async function updateAudienceCount(): Promise<void> {
  try {
    const members = await reactionsChannel.presence.get();
    const el = document.getElementById('audience-count-ctrl');
    if (el) el.textContent = String(members.length);
  } catch {
    // presence may not be available yet
  }
}

reactionsChannel.presence.subscribe(updateAudienceCount);

// ---------------------------------------------------------------------------
// Reaction buttons
// ---------------------------------------------------------------------------
document
  .querySelectorAll<HTMLButtonElement>('.ctrl-btn[data-kind]')
  .forEach((btn) => {
    const kind = btn.dataset.kind as FeedbackKind;
    const color = btn.dataset.color!;
    const icon = btn.querySelector<HTMLElement>('.ctrl-icon')!;

    btn.addEventListener('click', () => {
      // Flash accent color feedback
      btn.style.background = color + '29'; // ~16% opacity
      icon.style.color = color;
      setTimeout(() => {
        btn.style.background = '';
        icon.style.color = '';
      }, 180);

      const msg: FeedbackMessage = {
        type: 'feedback',
        payload: { kind },
        ts: Date.now(),
      };
      reactionsChannel.publish('event', msg);
    });
  });

// ---------------------------------------------------------------------------
// Ably connection events
// ---------------------------------------------------------------------------
client.connection.on('connected', () => {
  console.log('Ably connected (controller)');
  setStatus(true);
  updateAudienceCount();
});

client.connection.on('disconnected', () => setStatus(false));
client.connection.on('failed', (err) => {
  console.error('Ably connection failed:', err);
  setStatus(false);
});
```

- [ ] **Step 2: Build**

```bash
npm run build
```
Expected: exits 0, no TypeScript errors.

- [ ] **Step 3: Manual verification — display page**

Run `npm run dev`, open `http://localhost:5173`:
- Hover right edge of viewport → sidebar slides in from right ✓
- Timer block: 00:00, green ▶ button ✓
- FEEDBACK section: 4 rows (lightbulb/heart/star/replay) with empty bars ✓
- Controls: URL input + GO button, 4 icon buttons ✓
- URL input loads URL into iframe ✓
- Reactions toggle (emoji_emotions) turns white/black ✓
- Spotlight button activates spotlight, amber pulse animation ✓
- QR button shows full-screen QR overlay (above sidebar) ✓
- Fullscreen button toggles fullscreen ✓

- [ ] **Step 4: Manual verification — controller page**

Open `http://localhost:5173/controller.html` (or scan the QR code):
- Full-black page, WORKSHOP header, audience count ✓
- 4 large equal buttons filling the screen ✓
- Each button: icon centered above label, Space Mono uppercase text ✓
- Tapping a button briefly flashes the accent color ✓
- Status bar shows CONNECTED in green when Ably connects ✓
- Tapping controller buttons causes icons to float up on the display page ✓
- Sidebar feedback bars grow and count updates live ✓

- [ ] **Step 5: Commit**

```bash
git add src/controller.ts
git commit -m "feat: rewrite controller with 4 feedback buttons and connection status"
```
