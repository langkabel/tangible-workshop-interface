const ably = new Ably.Realtime({ key: ABLY_API_KEY });
const reactionsChannel = ably.channels.get(CHANNELS.reactions);
const presenterChannel = ably.channels.get(CHANNELS.presenter);
const container = document.getElementById("reaction-container");

function renderEmoji(emoji) {
  const el = document.createElement("span");
  el.className = "floating-emoji";
  el.textContent = emoji;

  // Random horizontal position
  el.style.left = Math.random() * 90 + "%";

  container.appendChild(el);

  // Remove after animation ends
  el.addEventListener("animationend", () => el.remove());
}

function handleReaction(msg) {
  const data = msg.data;
  if (data.type === "emoji") {
    renderEmoji(data.payload.emoji);
  }
  // Unknown types are silently ignored
}

function handlePresenter(msg) {
  const data = msg.data;
  console.log("Presenter event:", data);
  // Custom event handling goes here as the project evolves
}

reactionsChannel.subscribe("event", handleReaction);
presenterChannel.subscribe("event", handlePresenter);

ably.connection.on("connected", () => {
  console.log("Ably connected (display)");
});

ably.connection.on("failed", (err) => {
  console.error("Ably connection failed:", err);
});
