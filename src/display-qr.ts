import QRCode from 'qrcode';

export function initQrOverlay(lockNav: (locked: boolean) => void): void {
  const overlay = document.getElementById('qr-overlay')!;
  const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
  const urlText = document.getElementById('qr-url-text')!;
  const btn = document.getElementById('btn-qr')!;

  let isOpen = false;

  const controllerUrl = new URL('controller.html', window.location.href).href;

  // Render QR as large as practical for scanning from the back of a room
  const size = Math.min(window.innerHeight * 0.6, window.innerWidth * 0.6, 600);
  QRCode.toCanvas(canvas, controllerUrl, {
    width: size,
    margin: 0,
    color: { dark: '#000000', light: '#ffffff' },
  });

  urlText.textContent = controllerUrl;

  function toggle(): void {
    isOpen = !isOpen;
    overlay.style.display = isOpen ? 'flex' : 'none';
    btn.classList.toggle('active', isOpen);
    lockNav(isOpen);
  }

  btn.addEventListener('click', toggle);

  // Click anywhere on the overlay to dismiss
  overlay.addEventListener('click', () => {
    if (isOpen) toggle();
  });

  // Escape key dismisses the overlay
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isOpen) toggle();
  });
}
