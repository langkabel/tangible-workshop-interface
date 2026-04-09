# Workshop Interface Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a real-time presentation feedback system where audience members send emoji reactions via `controller.html`, visible on `display.html`, with ESP32 support via Ably REST API.

**Architecture:** Pure static HTML/JS — no backend, no bundler. Ably CDN handles all Pub/Sub. Two channels: `workshop:reactions` (audience → display) and `workshop:presenter` (ESP32 → display). Shared config in `js/config.js`.

**Tech Stack:** HTML, vanilla JS, Ably Realtime SDK (CDN), CSS

---

## File Map

| File | Responsibility |
|---|---|
| `js/config.js` | Ably API key, channel name constants |
| `js/controller.js` | Connect to Ably, publish emoji events on tap |
| `js/display.js` | Subscribe to both channels, dispatch to renderers, animate emojis |
| `controller.html` | Audience mobile UI — emoji button grid |
| `display.html` | Projector UI — full-screen reaction canvas |
| `css/styles.css` | Shared styles: mobile-first controller, full-screen display |

---

### Task 1: Ably Configuration

**Files:**
- Create: `js/config.js`

- [ ] **Step 1: Create `js/config.js`**

```js
const ABLY_API_KEY = "DEIN_KEY_HIER";

const CHANNELS = {
  reactions: "workshop:reactions",
  presenter: "workshop:presenter",
};
```

- [ ] **Step 2: Commit**

```bash
git add js/config.js
git commit -m "feat: add Ably config with channel names"
```

---

### Task 2: Controller — Emoji Input Page

**Files:**
- Create: `controller.html`
- Create: `js/controller.js`

- [ ] **Step 1: Create `controller.html`**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workshop Controller</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body class="controller">
  <h1>Reaktionen</h1>
  <div id="emoji-grid" class="emoji-grid"></div>

  <script src="https://cdn.ably.com/lib/ably.min-2.js"></script>
  <script src="js/config.js"></script>
  <script src="js/controller.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `js/controller.js`**

```js
const EMOJIS = ["👍", "👎", "😂", "🔥", "❤️", "👏", "🎉", "😮"];

const ably = new Ably.Realtime({ key: ABLY_API_KEY });
const reactionsChannel = ably.channels.get(CHANNELS.reactions);

const grid = document.getElementById("emoji-grid");

EMOJIS.forEach((emoji) => {
  const btn = document.createElement("button");
  btn.className = "emoji-btn";
  btn.textContent = emoji;
  btn.addEventListener("click", () => {
    reactionsChannel.publish("event", {
      type: "emoji",
      payload: { emoji },
      ts: Date.now(),
    });
  });
  grid.appendChild(btn);
});

ably.connection.on("connected", () => {
  console.log("Ably connected (controller)");
});

ably.connection.on("failed", (err) => {
  console.error("Ably connection failed:", err);
});
```

- [ ] **Step 3: Verify in browser**

Open `controller.html` in a browser. Expected:
- 8 emoji buttons rendered in a grid
- Console shows `Ably connected (controller)` (requires valid API key)
- Clicking a button publishes to `workshop:reactions` (verify in Ably dashboard or console)

- [ ] **Step 4: Commit**

```bash
git add controller.html js/controller.js
git commit -m "feat: add controller page with emoji buttons and Ably publish"
```

---

### Task 3: Display — Reaction Visualization Page

**Files:**
- Create: `display.html`
- Create: `js/display.js`

- [ ] **Step 1: Create `display.html`**

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Workshop Display</title>
  <link rel="stylesheet" href="css/styles.css">
</head>
<body class="display">
  <div id="reaction-container" class="reaction-container"></div>

  <script src="https://cdn.ably.com/lib/ably.min-2.js"></script>
  <script src="js/config.js"></script>
  <script src="js/display.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `js/display.js`**

```js
const ably = new Ably.Realtime({ key: ABLY_API_KEY });
const reactionsChannel = ably.channels.get(CHANNELS.reactions);
const presenterChannel = ably.channels.get(CHANNELS.presenter);
const container = document.getElementById("reaction-container");

function renderEmoji(emoji) {
  const el = document.createElement("span");
  el.className = "floating-emoji";
  el.textContent = emoji;

  // Random horizontal position
  el.style.left = Math.random() * 90 + "%";

  container.appendChild(el);

  // Remove after animation ends
  el.addEventListener("animationend", () => el.remove());
}

function handleReaction(msg) {
  const data = msg.data;
  if (data.type === "emoji") {
    renderEmoji(data.payload.emoji);
  }
  // Unknown types are silently ignored
}

function handlePresenter(msg) {
  const data = msg.data;
  console.log("Presenter event:", data);
  // Custom event handling goes here as the project evolves
}

reactionsChannel.subscribe("event", handleReaction);
presenterChannel.subscribe("event", handlePresenter);

ably.connection.on("connected", () => {
  console.log("Ably connected (display)");
});

ably.connection.on("failed", (err) => {
  console.error("Ably connection failed:", err);
});
```

- [ ] **Step 3: Verify in browser**

Open `display.html` in a browser. Expected:
- Blank full-screen page
- Console shows `Ably connected (display)`
- When an emoji is published from `controller.html`, a floating emoji appears and animates upward

- [ ] **Step 4: Commit**

```bash
git add display.html js/display.js
git commit -m "feat: add display page with emoji rendering and dual-channel subscribe"
```

---

### Task 4: CSS Styles

**Files:**
- Create: `css/styles.css`

- [ ] **Step 1: Create `css/styles.css`**

```css
/* === Reset === */
*, *::before, *::after {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* === Controller (mobile) === */
.controller {
  font-family: system-ui, sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 2rem 1rem;
  min-height: 100vh;
  background: #1a1a2e;
  color: #fff;
}

.controller h1 {
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.emoji-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  max-width: 320px;
  width: 100%;
}

.emoji-btn {
  font-size: 2.5rem;
  padding: 0.75rem;
  border: none;
  border-radius: 12px;
  background: #16213e;
  cursor: pointer;
  transition: transform 0.1s, background 0.1s;
  user-select: none;
  -webkit-user-select: none;
}

.emoji-btn:active {
  transform: scale(0.9);
  background: #0f3460;
}

/* === Display (projector) === */
.display {
  background: #000;
  min-height: 100vh;
  overflow: hidden;
  position: relative;
}

.reaction-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.floating-emoji {
  position: absolute;
  bottom: 0;
  font-size: 3rem;
  animation: float-up 3s ease-out forwards;
  pointer-events: none;
}

@keyframes float-up {
  0% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
  100% {
    opacity: 0;
    transform: translateY(-100vh) scale(1.5);
  }
}
```

- [ ] **Step 2: Verify in browser**

Reload both pages:
- `controller.html`: dark background, 4-column emoji grid, buttons shrink on tap
- `display.html`: black full-screen, floating emojis animate upward and fade out

- [ ] **Step 3: Commit**

```bash
git add css/styles.css
git commit -m "feat: add styles for controller grid and display float animation"
```

---

### Task 5: End-to-End Verification

No new files. This is a manual verification task.

- [ ] **Step 1: Set Ably key**

Edit `js/config.js` and replace `"DEIN_KEY_HIER"` with a real Ably API key from the Ably dashboard.

- [ ] **Step 2: Open both pages**

Open `display.html` in one browser tab/window (simulates projector).
Open `controller.html` in another tab or on a phone (simulates audience).

- [ ] **Step 3: Test audience flow**

Tap emoji buttons on `controller.html`. Expected on `display.html`:
- Each tap spawns a floating emoji at a random horizontal position
- Emoji animates upward over 3 seconds and fades out
- Multiple rapid taps show multiple concurrent emojis

- [ ] **Step 4: Test ESP32 flow (curl)**

Simulate an ESP32 event with curl:

```bash
ABLY_KEY="your-api-key-here"
curl -X POST "https://rest.ably.io/channels/workshop%3Apresenter/messages" \
  -u "$ABLY_KEY" \
  -H "Content-Type: application/json" \
  -d '{"name":"event","data":"{\"type\":\"custom\",\"payload\":{\"action\":\"test\"},\"ts\":1712678400000}"}'
```

Expected on `display.html`:
- Console shows `Presenter event: { type: "custom", payload: { action: "test" }, ts: ... }`

- [ ] **Step 5: Commit config (without real key)**

Make sure `js/config.js` has `"DEIN_KEY_HIER"` (not the real key) before committing:

```bash
git add -A
git commit -m "feat: complete initial workshop interface setup"
```

---

### Task 6: Add .gitignore

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```
.superpowers/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add gitignore for superpowers brainstorm files"
```
