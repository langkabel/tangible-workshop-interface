# Index Landing Page — Design Spec

## Goal

Add an `index.html` landing page that displays a QR code linking to the controller page. Used as a projector "join" screen before the session starts. The QR code URL is generated dynamically at runtime so the page works identically in local dev and on GitHub Pages.

## Constraints

- Full-screen dark presentation — shown on projector
- QR code URL built from `window.location` at runtime, no config needed
- Follows existing Vite + TypeScript + Tailwind + vite-plugin-html patterns
- No new architectural patterns — just a third page entry point

## Architecture

```
index.html  ──► src/index.ts  ──► qrcode (npm)
                                  window.location (runtime URL)
```

Two new files. `vite.config.ts` gets a third entry in both `pages` and `rollupOptions.input`.

## URL Construction

```typescript
const controllerUrl = new URL('controller.html', window.location.href).href;
const displayUrl = new URL('display.html', window.location.href).href;
```

Resolves correctly in all environments:
- GitHub Pages: `https://vectorinus.github.io/tangible-workshop-interface/controller.html`
- Local dev: `http://localhost:5173/tangible-workshop-interface/controller.html`

## Page Layout

Full-screen, vertically and horizontally centered, dark background matching the existing theme (`bg-[#1a1a2e] text-white`):

```
┌─────────────────────────────┐
│                             │
│     Scan to join            │
│                             │
│      ┌──────────┐           │
│      │  QR CODE │           │
│      │  (300px) │           │
│      └──────────┘           │
│                             │
│   controller URL (small)    │
│                             │
│  [Open Display] [Open Controller] │
│                             │
└─────────────────────────────┘
```

- QR code: `<canvas>` rendered by `qrcode`, ~300×300px, wrapped in `bg-white rounded-xl p-4`
- URL text: small, muted, shown below QR for people who can't scan
- Two links: "Open Display" and "Open Controller", each opening in a new tab (`target="_blank"`)
- No navigation, header, or extra chrome

## New Files

| File | Responsibility |
|---|---|
| `index.html` | Entry point with EJS includes, body layout |
| `src/index.ts` | Runtime URL construction, QR code render |

## Modified Files

| File | Change |
|---|---|
| `vite.config.ts` | Add `index.html` to `pages` array and `rollupOptions.input` |

## New Dependencies

```bash
npm install qrcode
npm install -D @types/qrcode
```

`qrcode` renders to `<canvas>`. `@types/qrcode` provides TypeScript definitions.
