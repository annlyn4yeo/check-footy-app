import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.REALTIME_PORT ?? 4000);

export const wss = new WebSocketServer({ port: PORT });

export const fixtureSubscriptions = new Map<number, Set<WebSocket>>();
const socketSubscriptions = new Map<WebSocket, Set<number>>();

wss.on("connection", (socket: WebSocket) => {
  console.log("Client connected");

  socketSubscriptions.set(socket, new Set());

  // Heartbeat state
  (socket as any).isAlive = true;

  socket.on("pong", () => {
    (socket as any).isAlive = true;
  });

  socket.on("message", (raw: Buffer) => {
    try {
      const data = JSON.parse(raw.toString());

      if (data.type === "subscribe" && typeof data.fixtureId === "number") {
        const fixtureId = data.fixtureId;

        const fixtureSet =
          fixtureSubscriptions.get(fixtureId) ?? new Set<WebSocket>();

        fixtureSet.add(socket);
        fixtureSubscriptions.set(fixtureId, fixtureSet);

        socketSubscriptions.get(socket)?.add(fixtureId);

        console.log(`Client subscribed to fixture ${fixtureId}`);
      }
    } catch {
      // Ignore malformed payload
    }
  });

  socket.on("close", () => {
    cleanupSocket(socket);
    console.log("Client disconnected");
  });
});

const HEARTBEAT_INTERVAL = 30_000;

setInterval(() => {
  for (const client of wss.clients) {
    if ((client as any).isAlive === false) {
      cleanupSocket(client as WebSocket);
      client.terminate();
      continue;
    }

    (client as any).isAlive = false;
    client.ping();
  }
}, HEARTBEAT_INTERVAL);

function cleanupSocket(socket: WebSocket) {
  const fixtures = socketSubscriptions.get(socket);
  if (!fixtures) return;

  for (const fixtureId of fixtures) {
    const set = fixtureSubscriptions.get(fixtureId);
    set?.delete(socket);

    if (set && set.size === 0) {
      fixtureSubscriptions.delete(fixtureId);
    }
  }

  socketSubscriptions.delete(socket);
}

console.log(`Realtime server running on ws://localhost:${PORT}`);
