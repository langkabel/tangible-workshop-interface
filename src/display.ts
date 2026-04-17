import "./styles.css";
import { client, CHANNELS } from "./lib/ably";
import type { FeedbackMessage } from "./types/messages";
import { isExternalMessage } from "./types/messages";
import type { InboundMessage } from "ably";
import { initTimer } from "./display-timer";
import { initSpotlight } from "./display-spotlight";
import { initQrOverlay } from "./display-qr";
import { initPresence } from "./display-presence";

// ---------------------------------------------------------------------------
// DOM elements
// ---------------------------------------------------------------------------
const iframe = document.getElementById("display-iframe") as HTMLIFrameElement;
const welcomeOverlay = document.getElementById("welcome-overlay")!;
const welcomeForm = document.getElementById("welcome-form") as HTMLFormElement;
const welcomeUrlInput = document.getElementById(
  "welcome-url-input",
) as HTMLInputElement;
const navBar = document.getElementById("nav-bar")!;
const navHoverZone = document.getElementById("nav-hover-zone")!;
const navUrlForm = document.getElementById("nav-url-form") as HTMLFormElement;
const navUrlInput = document.getElementById(
  "nav-url-input",
) as HTMLInputElement;
const reactionContainer = document.getElementById("reaction-container")!;
const btnReactions = document.getElementById("btn-reactions")!;
const btnMute = document.getElementById("btn-mute")!;
const btnFullscreen = document.getElementById("btn-fullscreen")!;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const STORAGE_KEY = "display-url";
let currentUrl = localStorage.getItem(STORAGE_KEY) || "";
let reactionsMuted = false;
let navLocked = false; // true when an overlay is open

// ---------------------------------------------------------------------------
// URL / iframe management
// ---------------------------------------------------------------------------
function loadUrl(url: string): void {
  currentUrl = url;
  localStorage.setItem(STORAGE_KEY, url);
  iframe.src = url;
  navUrlInput.value = url;
  welcomeOverlay.style.display = "none";
}

welcomeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = welcomeUrlInput.value.trim();
  if (url) loadUrl(url);
});

navUrlForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = navUrlInput.value.trim();
  if (url) loadUrl(url);
});

navUrlInput.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    navUrlInput.value = currentUrl;
    navUrlInput.blur();
  }
});

// Restore last URL from localStorage
if (currentUrl) {
  loadUrl(currentUrl);
}

// ---------------------------------------------------------------------------
// Nav bar hover show/hide
// ---------------------------------------------------------------------------
function showNav(): void {
  navBar.classList.remove("-translate-y-full", "opacity-0");
  navBar.classList.add("translate-y-0", "opacity-100");
}

function hideNav(): void {
  if (navLocked) return;
  navBar.classList.add("-translate-y-full", "opacity-0");
  navBar.classList.remove("translate-y-0", "opacity-100");
}

function lockNav(locked: boolean): void {
  navLocked = locked;
  if (locked) showNav();
}

navHoverZone.addEventListener("mouseenter", showNav);
navHoverZone.addEventListener("mouseleave", hideNav);

// ---------------------------------------------------------------------------
// Emoji rendering
// ---------------------------------------------------------------------------
function renderEmoji(emoji: string): void {
  if (reactionsMuted) return;
  const el = document.createElement("span");
  el.className =
    "absolute bottom-0 text-5xl animate-float-up pointer-events-none";
  el.textContent = emoji;
  el.style.left = `${Math.random() * 90}%`;
  reactionContainer.appendChild(el);
  el.addEventListener("animationend", () => el.remove());
}

// ---------------------------------------------------------------------------
// Reactions toggle
// ---------------------------------------------------------------------------
btnReactions.addEventListener("click", () => {
  reactionsMuted = !reactionsMuted;
  btnReactions.classList.toggle("active", reactionsMuted);
});

// ---------------------------------------------------------------------------
// Mute toggle (visual only — cross-origin iframes cannot be muted programmatically)
// ---------------------------------------------------------------------------
btnMute.addEventListener("click", () => {
  btnMute.classList.toggle("active");
});

// ---------------------------------------------------------------------------
// Fullscreen
// ---------------------------------------------------------------------------
btnFullscreen.addEventListener("click", () => {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen();
  }
});

// ---------------------------------------------------------------------------
// Ably subscriptions
// ---------------------------------------------------------------------------
const reactionsChannel = client.channels.get(CHANNELS.reactions);
const presenterChannel = client.channels.get(CHANNELS.presenter);

function handleReaction(msg: InboundMessage): void {
  const data = msg.data as FeedbackMessage;
  if (data.type === "feedback") {
    renderEmoji(data.payload.kind); // temporary — replaced in Task 5
  }
}

function handlePresenter(msg: InboundMessage): void {
  if (isExternalMessage(msg.data)) {
    console.log("Presenter event:", msg.data);
  }
}

reactionsChannel.subscribe("event", handleReaction);
presenterChannel.subscribe("event", handlePresenter);

client.connection.on("connected", () =>
  console.log("Ably connected (display)"),
);
client.connection.on("failed", (err) =>
  console.error("Ably connection failed:", err),
);

// ---------------------------------------------------------------------------
// Initialize feature modules
// ---------------------------------------------------------------------------
initTimer();
initSpotlight();
initQrOverlay(lockNav);
initPresence(reactionsChannel);
