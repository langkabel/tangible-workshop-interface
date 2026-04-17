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
