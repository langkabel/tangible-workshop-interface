import "./styles.css";
import { client, CHANNELS } from "./lib/ably";
import type { EmojiMessage } from "./types/messages";

const EMOJIS = ["👍", "👎", "😂", "🔥", "❤️", "👏", "🎉", "😮"];

const reactionsChannel = client.channels.get(CHANNELS.reactions);
const grid = document.getElementById("emoji-grid")!;

EMOJIS.forEach((emoji) => {
  const btn = document.createElement("button");
  btn.className =
    "text-[2.5rem] p-3 border-none rounded-xl bg-[#16213e] cursor-pointer transition-[transform,background] duration-100 select-none active:scale-90 active:bg-[#0f3460]";
  btn.textContent = emoji;
  btn.addEventListener("click", () => {
    const msg: EmojiMessage = {
      type: "emoji",
      payload: { emoji },
      ts: Date.now(),
    };
    reactionsChannel.publish("event", msg);
  });
  grid.appendChild(btn);
});

client.connection.on("connected", () => {
  console.log("Ably connected (controller)");
});

client.connection.on("failed", (err) => {
  console.error("Ably connection failed:", err);
});
