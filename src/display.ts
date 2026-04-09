import './styles.css';
import { client, CHANNELS } from './lib/ably';
import type { EmojiMessage } from './types/messages';
import { isExternalMessage } from './types/messages';
import type { InboundMessage } from 'ably';

const reactionsChannel = client.channels.get(CHANNELS.reactions);
const presenterChannel = client.channels.get(CHANNELS.presenter);
const container = document.getElementById('reaction-container')!;

function renderEmoji(emoji: string): void {
  const el = document.createElement('span');
  el.className = 'absolute bottom-0 text-5xl animate-float-up pointer-events-none';
  el.textContent = emoji;
  el.style.left = `${Math.random() * 90}%`;

  container.appendChild(el);
  el.addEventListener('animationend', () => el.remove());
}

function handleReaction(msg: InboundMessage): void {
  const data = msg.data as EmojiMessage;
  if (data.type === 'emoji') {
    renderEmoji(data.payload.emoji);
  }
}

function handlePresenter(msg: InboundMessage): void {
  if (isExternalMessage(msg.data)) {
    console.log('Presenter event:', msg.data);
  }
}

reactionsChannel.subscribe('event', handleReaction);
presenterChannel.subscribe('event', handlePresenter);

client.connection.on('connected', () => {
  console.log('Ably connected (display)');
});

client.connection.on('failed', (err) => {
  console.error('Ably connection failed:', err);
});
