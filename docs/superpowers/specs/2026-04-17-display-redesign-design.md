# Display Page Redesign — Design Spec

**Date:** 2026-04-17  
**Status:** Approved

---

## Overview

Restructure the app so `display.html` is the entry point. The display page loads any website in a fullscreen iframe and overlays floating emoji reactions on top. A hover-reveal nav bar gives the presenter access to controls. The controller page is only reachable via the QR code shown in the nav bar overlay — no direct link is exposed anywhere.

---

## Page Structure

### Entry point change

- `display.html` becomes the start page (navigated to directly)
- `index.html` is removed — its QR-generation logic moves into the display page
- `controller.html` stays exactly as-is

### Display page — two states

**State 1 — Welcome (no URL set yet)**  
On first load, the page shows a centered prompt: a pill-shaped URL input and a "Go" button. Once the user submits a URL, the iframe fills the screen and the welcome prompt disappears. The submitted URL is persisted in `localStorage` so a page refresh restores the last URL without showing the welcome screen again.

**State 2 — Active**  
A fullscreen `<iframe>` fills the entire viewport. The emoji reaction container sits on top with `pointer-events: none` so all mouse and keyboard input passes through to the iframe naturally — slide navigation (arrow keys, spacebar) works without any extra code. The nav bar is hidden by default.

---

## Nav Bar

Revealed when the mouse enters the top ~60px of the viewport. Disappears when the mouse leaves that zone (with a short CSS transition). The bar uses a dark semi-transparent background with `backdrop-filter: blur`.

### Layout

```
[ ⏱ 00:00 ▶ ]  [ 👥 14 ]        [ url input ........... Go ]        [ 😶 ][ 🔇 ][ 🔦 Ctrl ][ ⊞ ] | [ ⤢ ]
       LEFT (status)                     CENTER (url bar)                    RIGHT (controls)
```

### Left — status area (always visible when nav is shown)

**Timer block**  
- Displays elapsed time in `MM:SS` format, counts up from `00:00`
- Single button to the right of the digits:
  - Idle: `▶` (green) — click to start counting
  - Running: `↺` (amber) — click to stop and reset to `00:00` in one action
  - No pause state
- Timer block border turns green while running

**Audience count chip**  
- Shows the number of devices currently subscribed to `workshop:reactions` via Ably channel presence
- Updates live as phones connect and disconnect

### Center — URL bar

- Pill-shaped input, fixed width (~340px), centered between flex spacers
- Shows the currently loaded URL
- Submitting a new URL (Enter or Go button) updates the iframe `src`
- Pressing Escape in the input reverts to the current URL without navigating

### Right — controls

All buttons are icon-only (except Ctrl hint on spotlight). From left to right:

| Button | Idle state | Active state |
|--------|-----------|--------------|
| 😶 Reactions | Reactions visible | Reactions muted (no new emojis rendered) |
| 🔇 Mute | Tab audio on | Tab muted via Web Audio context |
| 🔦 Spotlight | Shows `Ctrl` hint badge | Pulses amber while Ctrl is held |
| ⊞ QR | — | Highlighted while overlay is open |
| `\|` divider | — | — |
| ⤢ Fullscreen | — | Toggles browser fullscreen API |

---

## Overlays

### QR Code overlay

Triggered by the ⊞ button. A full-screen dark overlay (`rgba(0,0,0,0.93)`) appears **behind** the nav bar (nav z-index is higher). The overlay contains:
- "Scan to join" heading
- QR code rendered as large as practical (same `qrcode` library already in use), centred
- Controller URL as text below
- Dismiss: click anywhere on the overlay or press Escape

### Timer

No separate overlay — timer lives entirely in the nav bar left section.

---

## Spotlight / Laser pointer

- Hold `Ctrl` → a radial gradient vignette (`pointer-events: none`) appears over the iframe, darkening everything except a circle around the cursor
- The circle follows `mousemove` events in real time
- Release `Ctrl` → overlay disappears immediately
- The 🔦 button in the nav bar shows a small `Ctrl` badge at rest so the presenter knows the keyboard shortcut. While active, the button pulses amber.
- The spotlight overlay sits between the iframe and the emoji layer so emojis still appear on top

---

## iframe input passthrough

The emoji reaction container has `pointer-events: none`. All click, keyboard, and scroll events reach the iframe directly. No special code is needed — this is the default browser behaviour once the iframe is focused.

---

## Files changed

| File | Change |
|------|--------|
| `display.html` | Add welcome overlay, URL bar, nav bar, overlay markup |
| `src/display.ts` | Add all display-page logic (nav, timer, spotlight, QR, presence) |
| `src/index.ts` | Remove (logic absorbed into display.ts) |
| `index.html` | Remove |
| `controller.html` | No change |
| `src/controller.ts` | Add `channel.presence.enter()` on connect so the display can count active devices |

---

## Out of scope

- Countdown timer (counts up only for now)
- Multiple simultaneous overlays (only one open at a time)
- Slide navigation controls (iframe handles this natively)
- Back/forward iframe navigation buttons
