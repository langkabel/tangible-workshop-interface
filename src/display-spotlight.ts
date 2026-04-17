export function initSpotlight(): void {
  const overlay = document.getElementById('spotlight-overlay')!;
  const btn = document.getElementById('btn-spotlight')!;

  let active = false;

  function activate(): void {
    if (active) return;
    active = true;
    // Enable pointer-events so the overlay captures mousemove even over the iframe
    overlay.style.pointerEvents = 'auto';
    overlay.style.display = 'block';
    overlay.style.cursor = 'none';
    btn.classList.add('spotlight-active');
  }

  function deactivate(): void {
    if (!active) return;
    active = false;
    overlay.style.pointerEvents = 'none';
    overlay.style.display = 'none';
    overlay.style.cursor = '';
    btn.classList.remove('spotlight-active');
  }

  // Toggle via button click (primary — works even when iframe has focus)
  btn.addEventListener('click', () => {
    if (active) deactivate();
    else activate();
  });

  // Ctrl-hold as secondary shortcut (works when iframe doesn't have focus)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Control' && !active) activate();
  });

  document.addEventListener('keyup', (e) => {
    if (e.key === 'Control' && active) deactivate();
  });

  // ESC to deactivate
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && active) deactivate();
  });

  // Deactivate if window loses focus
  window.addEventListener('blur', deactivate);

  // Track mouse on the overlay itself (captures events over the iframe when active)
  overlay.addEventListener('mousemove', (e) => {
    overlay.style.background =
      `radial-gradient(circle 100px at ${e.clientX}px ${e.clientY}px, transparent 0%, transparent 35%, rgba(0,0,0,0.82) 65%)`;
  });
}
