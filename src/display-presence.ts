import type { RealtimeChannel } from 'ably';

export function initPresence(channel: RealtimeChannel): void {
  const countEl = document.getElementById('audience-count')!;

  async function updateCount(): Promise<void> {
    try {
      const members = await channel.presence.get();
      countEl.textContent = String(members.length);
    } catch {
      // Presence may not be available yet; leave count as-is
    }
  }

  channel.presence.subscribe(updateCount);
  updateCount();
}
