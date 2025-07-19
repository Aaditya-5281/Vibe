import { WebSocketServer, WebSocket } from "ws"

interface User {
  socket: WebSocket
  room: string
  username: string
}

const wss = new WebSocketServer({ port: 8080 })

let allSockets: User[] = []
let userCount = 1

wss.on("connection", (socket) => {
  let assignedUser: User | null = null

  socket.on("message", (message) => {
    try {
      const parsedMessage = JSON.parse(message.toString())

      // Handle joining a room
      if (parsedMessage.type === "join") {
        const username = `User ${userCount++}`
        assignedUser = {
          socket,
          room: parsedMessage.payload.roomId,
          username
        }
        allSockets.push(assignedUser)

        // Send the username back to the client
        socket.send(JSON.stringify({
          type: "assign_username",
          payload: { username }
        }))
        return
      }

      // Handle chat message
      if (parsedMessage.type === "chat") {
        if (!assignedUser) return

        const { message: msgText } = parsedMessage.payload

        const broadcastPayload = JSON.stringify({
          type: "chat",
          payload: {
            message: msgText,
            username: assignedUser.username
          }
        })

        for (const user of allSockets) {
          if (user.room === assignedUser.room && user.socket !== socket) {
            user.socket.send(broadcastPayload)
          }
        }
      }
    } catch (err) {
      console.error("Error handling message:", err)
    }
  })

  socket.on("close", () => {
    allSockets = allSockets.filter(u => u.socket !== socket)
  })
})
