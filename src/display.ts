import "./styles.css";
import { client, CHANNELS } from "./lib/ably";
import { isExternalMessage } from "./types/messages";
import type { InboundMessage } from "ably";
import { initTimer } from "./display-timer";
import { initSpotlight } from "./display-spotlight";
import { initQrOverlay } from "./display-qr";
import { initPresence } from "./display-presence";
import { initSidebar } from "./display-sidebar";
import { initFeedback } from "./display-feedback";

// ---------------------------------------------------------------------------
// DOM elements
// ---------------------------------------------------------------------------
const iframe = document.getElementById("display-iframe") as HTMLIFrameElement;
const welcomeOverlay = document.getElementById("welcome-overlay")!;
const welcomeForm = document.getElementById("welcome-form") as HTMLFormElement;
const welcomeUrlInput = document.getElementById(
  "welcome-url-input",
) as HTMLInputElement;
const reactionContainer = document.getElementById("reaction-container")!;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const STORAGE_KEY = "display-url";
let currentUrl = localStorage.getItem(STORAGE_KEY) || "";
let reactionsMuted = false;

// ---------------------------------------------------------------------------
// URL / iframe management
// ---------------------------------------------------------------------------
function loadUrl(url: string): void {
  currentUrl = url;
  localStorage.setItem(STORAGE_KEY, url);
  iframe.src = url;
  welcomeOverlay.style.display = "none";
}

welcomeForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const url = welcomeUrlInput.value.trim();
  if (url) loadUrl(url);
});

if (currentUrl) {
  loadUrl(currentUrl);
}

// ---------------------------------------------------------------------------
// Ably subscriptions
// ---------------------------------------------------------------------------
const reactionsChannel = client.channels.get(CHANNELS.reactions);
const presenterChannel = client.channels.get(CHANNELS.presenter);

function handlePresenter(msg: InboundMessage): void {
  if (isExternalMessage(msg.data)) {
    console.log("Presenter event:", msg.data);
  }
}

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
initQrOverlay(() => {}); // No nav to lock in sidebar design
initPresence(reactionsChannel);
initSidebar({
  currentUrl: () => currentUrl,
  onUrlLoad: loadUrl,
  onReactionsToggle: () => {
    reactionsMuted = !reactionsMuted;
  },
});
initFeedback(reactionsChannel, reactionContainer, () => reactionsMuted);
