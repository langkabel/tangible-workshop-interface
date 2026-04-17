# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Real-time audience feedback system for presentations. Audience members open `controller.html` on their phones and send emoji reactions; reactions appear live on `index.html` (projected). An ESP32 or other presenter device can publish custom events directly to Ably's REST API to trigger effects on the display.

No build step, no backend server — pure static HTML/JS files using Ably for Pub/Sub.

## Ably Channel Structure

- `workshop:reactions` — audience → display (emoji events)
- `workshop:presenter` — ESP32/presenter → display (custom events)

## Message Schema

All messages share a base shape:

```json
{ "type": "<event-type>", "payload": { ... }, "ts": 1234567890 }
```

Reaction example: `{ "type": "emoji", "payload": { "emoji": "🔥" }, "ts": ... }`  
Presenter example: `{ "type": "custom", "payload": { ... }, "ts": ... }`

## ESP32 Integration

Devices publish to `workshop:presenter` via Ably's REST API:

```
POST https://rest.ably.io/channels/workshop:presenter/messages
Authorization: Basic <base64(api-key)>
Content-Type: application/json

{ "name": "event", "data": { "type": "custom", "payload": { ... }, "ts": ... } }
```
