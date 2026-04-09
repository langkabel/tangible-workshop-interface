# Tangible Workshop Interface — Design Spec

## Ziel

Echtzeit-Feedback-System für Präsentationen. Zuhörer senden Emoji-Reaktionen über ihr Handy; diese erscheinen live auf einer projizierten Display-Seite. Ein ESP32 oder anderes Presenter-Gerät kann Custom-Events über Ably's REST API auf das Display senden.

## Randbedingungen

- Immer nur eine aktive Session (kein Raum-System)
- Kein Backend-Server — rein statische HTML/JS-Dateien
- Kein Build-Step, kein Bundler
- Keine Authentifizierung (komplett offen)
- Ably als einzige externe Abhängigkeit (CDN)

## Architektur

Drei statische Clients kommunizieren über Ably Pub/Sub:

```
┌─────────────────┐     workshop:reactions     ┌─────────────────┐
│ controller.html  │ ─────────────────────────► │   display.html   │
│ (Zuhörer-Handy)  │                            │   (Projektor)    │
└─────────────────┘                            └─────────────────┘
                                                        ▲
┌─────────────────┐     workshop:presenter              │
│     ESP32        │ ───────────────────────────────────┘
│ (Ably REST API)  │
└─────────────────┘
```

## Projektstruktur

```
tangible-workshop-interface/
├── display.html          # Projektor-Ansicht, abonniert beide Kanäle
├── controller.html       # Zuhörer-Interface, publiziert Emoji-Reaktionen
├── js/
│   ├── config.js         # Ably-Key + Kanalnamen
│   ├── display.js        # Subscribe + Render-Logik
│   └── controller.js     # Emoji-Publish-Logik
├── css/
│   └── styles.css        # Shared Styles
├── docs/
│   └── specs/
│       └── 2026-04-09-workshop-interface-design.md
└── CLAUDE.md
```

## Ably-Kanalstruktur

| Kanal | Richtung | Zweck |
|---|---|---|
| `workshop:reactions` | controller → display | Emoji-Reaktionen der Zuhörer |
| `workshop:presenter` | ESP32 → display | Custom-Events vom Presenter |

## Message-Schema

Alle Nachrichten teilen eine gemeinsame Basis:

```json
{
  "type": "<event-type>",
  "payload": { ... },
  "ts": 1712678400000
}
```

### Kanal `workshop:reactions`

| type | payload | Beschreibung |
|---|---|---|
| `emoji` | `{ "emoji": "🔥" }` | Emoji-Reaktion eines Zuhörers |

### Kanal `workshop:presenter`

| type | payload | Beschreibung |
|---|---|---|
| `custom` | `{ ... }` | Beliebige Daten vom ESP32/Presenter |

`ts` ist ein Unix-Timestamp in Millisekunden, gesetzt vom Sender.

Unbekannte `type`-Werte werden vom Display ignoriert — das macht das Schema vorwärtskompatibel und erweiterbar (z.B. für Polls, Text-Input).

## Ably-Integration

### CDN-Einbindung

```html
<script src="https://cdn.ably.com/lib/ably.min-2.js"></script>
```

### config.js

```js
const ABLY_API_KEY = "DEIN_KEY_HIER";
const CHANNELS = {
  reactions: "workshop:reactions",
  presenter: "workshop:presenter"
};
```

### controller.html

- Nutzt Ably Realtime-Client
- Verbindet sich beim Laden der Seite
- Publiziert `{ type: "emoji", payload: { emoji }, ts }` auf `workshop:reactions` bei Emoji-Tap

### display.html

- Nutzt Ably Realtime-Client
- Subscribt auf `workshop:reactions` und `workshop:presenter`
- Dispatcht intern je nach `type`-Feld an unterschiedliche Renderer
- Unbekannte Typen werden ignoriert

### ESP32

- Nutzt Ably REST API direkt (HTTP POST, Basic Auth)
- Kein SDK, kein Websocket nötig
- Endpoint: `POST https://rest.ably.io/channels/workshop%3Apresenter/messages`
- Body: `{ "name": "event", "data": "{\"type\":\"custom\",\"payload\":{...},\"ts\":...}" }`
- Auth-Header: `Authorization: Basic <base64(api-key)>`

## Erweiterbarkeit

Neue Input-Typen (z.B. Polls, Bewertungen, Freitext) erfordern nur:
1. Neuen `type`-String definieren
2. Renderer im display.js hinzufügen
3. UI-Element im controller.html hinzufügen

Kein Kanal- oder Schema-Umbau nötig.
