import { fixtureSubscriptions } from "./server.js";
import { getSubscriber } from "./redis.js";
import { WebSocket } from "ws";

const subscriber = getSubscriber();

subscriber.subscribe("fixture.updated");

subscriber.on("message", (channel: string, message: string) => {
  if (channel !== "fixture.updated") return;

  // Backpressure guard (simple size check)
  if (message.length > 50_000) {
    console.warn("Dropping oversized message");
    return;
  }

  const event = JSON.parse(message);
  const fixtureId = event.providerFixtureId;

  const clients = fixtureSubscriptions.get(fixtureId);
  if (!clients) return;

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
});
