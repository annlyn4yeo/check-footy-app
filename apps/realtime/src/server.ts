import { WebSocketServer, WebSocket } from "ws";

const PORT = Number(process.env.REALTIME_PORT ?? 4000);

export const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (socket: WebSocket) => {
  console.log("Client connected");

  socket.on("close", () => {
    console.log("Client disconnected");
  });
});
