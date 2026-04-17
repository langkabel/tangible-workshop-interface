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
