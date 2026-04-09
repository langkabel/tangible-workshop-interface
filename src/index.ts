import './styles.css';
import QRCode from 'qrcode';

const controllerUrl = new URL('controller.html', window.location.href).href;
const displayUrl = new URL('display.html', window.location.href).href;

// Render QR code to canvas
const canvas = document.getElementById('qr-canvas') as HTMLCanvasElement;
QRCode.toCanvas(canvas, controllerUrl, {
  width: 300,
  margin: 0,
  color: {
    dark: '#000000',
    light: '#ffffff',
  },
});

// Show URL as text for people who can't scan
const urlEl = document.getElementById('controller-url')!;
urlEl.textContent = controllerUrl;

// Set link hrefs dynamically
const displayLink = document.getElementById('display-link') as HTMLAnchorElement;
displayLink.href = displayUrl;

const controllerLink = document.getElementById('controller-link') as HTMLAnchorElement;
controllerLink.href = controllerUrl;
