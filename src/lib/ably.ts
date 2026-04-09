import Ably from 'ably';

export const CHANNELS = {
  reactions: 'workshop:reactions',
  presenter: 'workshop:presenter',
} as const;

export const client = new Ably.Realtime({
  key: import.meta.env.VITE_ABLY_API_KEY,
});
