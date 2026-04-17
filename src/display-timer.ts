export function initTimer(): void {
  const display = document.getElementById('timer-display')!;
  const btn = document.getElementById('timer-btn')!;
  const block = document.getElementById('timer-block')!;

  let running = false;
  let startTime = 0;
  let intervalId: number | undefined;

  function formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  function tick(): void {
    display.textContent = formatTime(Date.now() - startTime);
  }

  function start(): void {
    running = true;
    startTime = Date.now();
    intervalId = window.setInterval(tick, 200);
    tick();

    btn.textContent = '↺';
    btn.title = 'Stop & reset';
    btn.classList.remove(
      'bg-[rgba(34,197,94,0.15)]', 'text-[#4ade80]', 'border-[rgba(34,197,94,0.3)]'
    );
    btn.classList.add(
      'bg-[rgba(251,191,36,0.15)]', 'text-[#fbbf24]', 'border-[rgba(251,191,36,0.3)]'
    );

    block.classList.add('border-[rgba(34,197,94,0.35)]');
    display.classList.remove('text-[#475569]');
    display.classList.add('text-[#4ade80]');
  }

  function reset(): void {
    running = false;
    window.clearInterval(intervalId);

    display.textContent = '00:00';
    btn.textContent = '▶';
    btn.title = 'Start';
    btn.classList.remove(
      'bg-[rgba(251,191,36,0.15)]', 'text-[#fbbf24]', 'border-[rgba(251,191,36,0.3)]'
    );
    btn.classList.add(
      'bg-[rgba(34,197,94,0.15)]', 'text-[#4ade80]', 'border-[rgba(34,197,94,0.3)]'
    );

    block.classList.remove('border-[rgba(34,197,94,0.35)]');
    display.classList.add('text-[#475569]');
    display.classList.remove('text-[#4ade80]');
  }

  btn.addEventListener('click', () => {
    if (running) reset();
    else start();
  });
}
