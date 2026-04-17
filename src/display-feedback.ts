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

    // Outer wrapper: floats up and fades out
    const wrapper = document.createElement('div');
    wrapper.className = 'float-icon';
    wrapper.style.left = `${Math.random() * 85}%`;

    // Random spin speed: 2–18s per rotation
    const spinDuration = (2 + Math.random() * 16).toFixed(2) + 's';
    const spinDelay = `${-(Math.random() * 18).toFixed(2)}s`;

    // Colored square: continuously rotates, starts at a random phase
    const square = document.createElement('div');
    square.className = 'float-icon-square';
    square.style.background = KIND_COLOR[kind];
    square.style.animation = `icon-spin ${spinDuration} linear infinite`;
    square.style.animationDelay = spinDelay;

    // Icon: black, counter-rotates at same speed to stay upright
    const icon = document.createElement('span');
    icon.className = 'material-symbols-sharp';
    icon.style.color = '#000';
    icon.style.fontSize = '2rem';
    icon.style.animation = `icon-counter-spin ${spinDuration} linear infinite`;
    icon.style.animationDelay = spinDelay;
    icon.textContent = KIND_ICON[kind];

    square.appendChild(icon);
    wrapper.appendChild(square);
    reactionContainer.appendChild(wrapper);
    wrapper.addEventListener('animationend', () => wrapper.remove());
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
