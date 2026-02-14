import { wss } from "./server.js";
import { getSubscriber } from "./redis.js";

const subscriber = getSubscriber();

subscriber.subscribe("fixture.updated");

subscriber.on("message", (channel: string, message: string) => {
  if (channel !== "fixture.updated") return;

  for (const client of wss.clients) {
    if (client.readyState === 1) {
      client.send(message);
    }
  }
});

console.log("Realtime server running on ws://localhost:4000");
