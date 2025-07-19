import { createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";

// Create a raw HTTP server
const server = createServer();
const wss = new WebSocketServer({ server });

interface User {
  socket: WebSocket;
  room: string;
}

const users: User[] = [];

function broadcastToRoom(roomId: string, message: string, sender?: WebSocket) {
  users.forEach((user) => {
    if (
      user.room === roomId &&
      user.socket !== sender &&
      user.socket.readyState === WebSocket.OPEN
    ) {
      user.socket.send(message);
    }
  });
}

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  ws.on("message", (data: Buffer) => {
    try {
      const msg = JSON.parse(data.toString());
      console.log("Parsed:", msg);

      if (msg.type === "join") {
        const roomId = msg.payload?.roomId;

        if (!roomId) {
          return ws.send(
            JSON.stringify({ type: "error", payload: "roomId is required!" })
          );
        }

        users.push({ socket: ws, room: roomId });
        console.log(" All Sockets:", users.length);
        ws.send(
          JSON.stringify({ type: "joined", payload: `Joined room ${roomId}` })
        );
      }

      if (msg.type === "chat") {
        const user = users.find((u) => u.socket === ws);

        if (!user) {
          return ws.send(
            JSON.stringify({ type: "error", payload: "Join a room first!" })
          );
        }

        const chatPayload = {
          type: "chat",
          payload: { text: msg.payload?.text || "", room: user.room },
        };

        const messageStr = JSON.stringify(chatPayload);
        broadcastToRoom(user.room, messageStr, ws);
        console.log("Broadcasted to room:", user.room);
      }
    } catch (err) {
      console.error("Error parsing message:", err);
      ws.send(
        JSON.stringify({ type: "error", payload: "Invalid message format" })
      );
    }
  });

  ws.on("close", () => {
    const index = users.findIndex((u) => u.socket === ws);
    if (index !== -1) {
      console.log(" Client disconnected");
      users.splice(index, 1);
    }
  });
});

server.listen(8080, () => {
  console.log("WebSocket server listening on ws://localhost:8080");
});
