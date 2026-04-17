# Bauhaus Redesign — Design Spec

**Date:** 2026-04-17

## Overview

A full visual and structural redesign of the workshop interface. The top nav bar is replaced by a right-side hover sidebar on the display page. The controller is redesigned as a full-viewport remote control with 4 reaction buttons. A unified feedback message schema replaces the existing emoji system. Bauhaus design language (Space Mono, Material Symbols Sharp, no rounded corners, black/white + 4 accent colors) applies to both pages.

---

## 1. Visual Language

### Typography
- **Font:** Space Mono (Google Fonts) — `family=Space+Mono:wght@400;700`
- Bold (700) for headings and labels, regular (400) for body and counts
- All labels uppercase, tracked

### Icons
- **Font:** Material Symbols Sharp — `family=Material+Symbols+Sharp:opsz,wght,FILL,GRAD@24,200,0,0`
- Weight 200, not filled (FILL=0), no grade adjustment (GRAD=0)
- All icons use the Sharp variant (hard corners, no curves)

### Shape
- `border-radius: 0` everywhere — no rounded corners on any element
- 1px borders throughout for structure
- No shadows

### Color System
- **Base:** `#000000` background, `#ffffff` text and borders
- **4 Pantone accent colors** (Spring/Summer palette):

| Name | Hex | Assigned to |
|---|---|---|
| Gold | `#DACD65` | lightbulb (idea) |
| Burgundy | `#9A2B2E` | heart (liked it) |
| Blue | `#5085C3` | star (key point) |
| Teal | `#00666C` | replay (revisit) |

- Accent colors appear at **40% opacity** as bar fill backgrounds
- Accent colors at **100% opacity** for bar borders and icon tints on active state
- All other UI elements remain black and white

---

## 2. Display Sidebar

Replaces the existing top hover-nav bar entirely.

### Trigger
- Invisible 40px hover zone fixed to the **right edge** of the viewport, full height
- Sidebar slides in from the right on hover, slides back out on mouse leave

### Sidebar Panel
- **Width:** 240px expanded, 0px collapsed
- **Position:** fixed right, full height, z-index 50
- **Background:** `rgba(0, 0, 0, 0.93)` with `backdrop-filter: blur(16px)`
- **Border:** 1px solid `rgba(255, 255, 255, 0.08)` on left edge
- **Transition:** `transform 300ms ease` (translateX from right)
- All internal elements use Space Mono, sharp corners

### Section 1: Status
Positioned at top of sidebar.

- **Timer block:** shows elapsed time in `MM:SS` format (counts up). Single button: ▶ (green, starts timer) → ↺ (amber, resets timer). No pause.
- **Audience count:** people icon (Material Symbols Sharp `people`) + live count number. Updates via Ably presence on `workshop:reactions`.

### Section 2: Feedback Bars
One row per reaction kind, displayed in order: lightbulb, heart, star, replay.

Each row:
```
[icon]  [████████░░░░]  [count]
```

- **Icon:** Material Symbols Sharp, 18px, tinted with the kind's accent color
- **Bar:** horizontal, height 6px. Fill width = `(own count / max count) × 100%`. Fill background = accent color at 40% opacity. Fill border = accent color at 100% opacity.
- **Count:** Space Mono, 11px, right-aligned
- Bars update live as feedback messages arrive
- Counts reset to 0 on page reload (session-scoped)

### Section 3: Controls
Positioned at bottom of sidebar.

- **URL input** — compact text input + "GO" button. Loads new URL into iframe.
- **Reactions toggle** — icon button (`emoji_emotions`). Toggles floating reaction animations on/off. Active state: white background, black icon.
- **Spotlight toggle** — icon button (`highlight`). Activates spotlight overlay. Active state same as reactions toggle.
- **QR button** — icon button (`qr_code_2`). Opens full-screen QR overlay showing controller URL.
- **Fullscreen button** — icon button (`fullscreen`). Toggles browser fullscreen.

No mute button (cross-origin iframes cannot be controlled programmatically).

---

## 3. Controller Redesign

### Layout
Full-viewport layout. No scrolling.

```
┌─────────────────────────────┐
│  WORKSHOP           ● 4     │  ← header: title + audience count
├──────────────┬──────────────┤
│              │              │
│  lightbulb   │   favorite   │  ← top row
│    IDEA      │  LIKED IT    │
│              │              │
├──────────────┼──────────────┤
│              │              │
│    star      │    replay    │  ← bottom row
│  KEY POINT   │   REVISIT    │
│              │              │
└──────────────┴──────────────┘
│  ● connected                │  ← status bar
└─────────────────────────────┘
```

### Button Design
- Each button: 50% viewport width × ~45% viewport height (fills screen, 2×2 grid)
- Black background, 1px white border
- Icon: Material Symbols Sharp, ~48px, white at rest
- Label: Space Mono, 10px, uppercase, white at rest, letter-spacing 0.1em
- Icon above label, both centered
- On press: background flashes to accent color at 40% opacity, icon tints to full accent color
- No hover state needed (touch device)

### Button Definitions

| Position | Icon | Label | Kind | Accent |
|---|---|---|---|---|
| Top-left | `lightbulb` | IDEA | `lightbulb` | `#DACD65` |
| Top-right | `favorite` | LIKED IT | `heart` | `#9A2B2E` |
| Bottom-left | `star` | KEY POINT | `star` | `#5085C3` |
| Bottom-right | `replay` | REVISIT | `replay` | `#00666C` |

### Connection Status
Small bar at very bottom: green dot + "CONNECTED" or gray dot + "CONNECTING..." in Space Mono 9px.

---

## 4. Feedback Message Schema

### New message type: `feedback`

```typescript
interface FeedbackMessage {
  type: "feedback";
  payload: {
    kind: "lightbulb" | "heart" | "star" | "replay";
  };
  ts: number;
}
```

Published on channel: `workshop:reactions`

### Migration
The existing `EmojiMessage` type (`type: "emoji"`) is **removed**. The controller no longer sends emoji messages. The display no longer handles them. Both pages are deployed together so no backwards compatibility is needed.

Floating icon animation on the display is retained — incoming `feedback` messages trigger the same float-up animation using the Material Symbols Sharp icon name instead of an emoji character.

**Kind → icon name mapping** (used by both controller and display):

| Kind | Icon name |
|---|---|
| `lightbulb` | `lightbulb` |
| `heart` | `favorite` |
| `star` | `star` |
| `replay` | `replay` |

---

## 5. File Structure

| File | Change |
|---|---|
| `index.html` | Remove top nav hover zone + nav bar HTML. Add right sidebar HTML. |
| `controller.html` | Full redesign: 2×2 grid layout, Space Mono, sharp corners. |
| `src/styles.css` | Add Bauhaus design tokens, sidebar styles, controller styles. Remove nav-btn styles. |
| `src/types/messages.ts` | Add `FeedbackMessage`. Remove `EmojiMessage`. Update `WorkshopMessage` union. |
| `src/display.ts` | Remove nav hover logic, emoji subscription. Add sidebar hover logic, feedback subscription. |
| `src/display-sidebar.ts` | New file: sidebar hover show/hide, controls wiring (reactions toggle, spotlight, QR, fullscreen, URL). |
| `src/display-feedback.ts` | New file: feedback bar state (counts per kind), bar width updates, floating icon animation. |
| `src/display-timer.ts` | No change. |
| `src/display-spotlight.ts` | No change. |
| `src/display-qr.ts` | No change (lockNav callback removed — no nav to lock). |
| `src/display-presence.ts` | No change. |
| `src/controller.ts` | Replace emoji send with feedback send. Remove emoji button wiring. Add 4 reaction button wiring. |

---

## 6. Out of Scope

- Clarity check (got it / lost me) — removed from this iteration
- Mute button — removed (cross-origin iframe limitation)
- Persistent feedback counts across sessions
- Presenter device (ESP32) — no changes to `workshop:presenter` channel
