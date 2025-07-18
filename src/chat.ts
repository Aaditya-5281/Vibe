import { WebSocketServer, WebSocket } from "ws";

// Start a WebSocket server on port 8080
const wss = new WebSocketServer({ port: 8080 });

// Each connected user has a socket and the room they joined
interface User {
  socket: WebSocket;
  room: string;
}

// Track all connected users
let allSockets: User[] = [];

wss.on("connection", (socket) => {
  console.log("User connected");

  socket.on("message", (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString());

      if (parsedMessage.type === "join") {
        // Add user to room
        const roomId = parsedMessage.payload.roomId;

        // Remove if already exists
        allSockets = allSockets.filter((u) => u.socket !== socket);

        allSockets.push({ socket, room: roomId });
        console.log(`User joined room: ${roomId}`);
        return;
      }

      if (parsedMessage.type === "chat") {
        const currentUser = allSockets.find((u) => u.socket === socket);

        if (!currentUser) {
          socket.send(
            JSON.stringify({
              type: "error",
              payload: "Join a room first!",
            })
          );
          return;
        }

        // Broadcast message to others in the same room
        allSockets.forEach((user) => {
          if (
            user.room === currentUser.room &&
            user.socket !== currentUser.socket &&
            user.socket.readyState === WebSocket.OPEN
          ) {
            user.socket.send(message.toString());
          }
        });
      }
    } catch (err) {
      console.error("Failed to handle message:", err);
      socket.send(
        JSON.stringify({ type: "error", payload: "Invalid message format" })
      );
    }
  });

  socket.on("close", () => {
    allSockets = allSockets.filter((u) => u.socket !== socket);
    console.log("User disconnected");
  });
});
