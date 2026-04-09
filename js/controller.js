const EMOJIS = ["👍", "👎", "😂", "🔥", "❤️", "👏", "🎉", "😮"];

const ably = new Ably.Realtime({ key: ABLY_API_KEY });
const reactionsChannel = ably.channels.get(CHANNELS.reactions);

const grid = document.getElementById("emoji-grid");

EMOJIS.forEach((emoji) => {
  const btn = document.createElement("button");
  btn.className = "emoji-btn";
  btn.textContent = emoji;
  btn.addEventListener("click", () => {
    reactionsChannel.publish("event", {
      type: "emoji",
      payload: { emoji },
      ts: Date.now(),
    });
  });
  grid.appendChild(btn);
});

ably.connection.on("connected", () => {
  console.log("Ably connected (controller)");
});

ably.connection.on("failed", (err) => {
  console.error("Ably connection failed:", err);
});
