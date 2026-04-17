export function initSpotlight(): void {
  const overlay = document.getElementById('spotlight-overlay')!;
  const btn = document.getElementById('btn-spotlight')!;

  let active = false;

  function activate(): void {
    if (active) return;
    active = true;
    overlay.style.display = 'block';
    btn.classList.add('spotlight-active');
  }

  function deactivate(): void {
    if (!active) return;
    active = false;
    overlay.style.display = 'none';
    btn.classList.remove('spotlight-active');
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Control') activate();
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Control') deactivate();
  });

  // Deactivate if window loses focus while Ctrl is held (user alt-tabs)
  window.addEventListener('blur', deactivate);

  document.addEventListener('mousemove', (e) => {
    if (!active) return;
    overlay.style.background =
      `radial-gradient(circle 100px at ${e.clientX}px ${e.clientY}px, transparent 0%, transparent 35%, rgba(0,0,0,0.82) 65%)`;
  });
}
