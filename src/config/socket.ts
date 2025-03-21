import http from "http"
import { Server } from "socket.io"

// Create a server instance - replace with your actual server if you have one
const server = http.createServer()

// Initialize Socket.IO with the server
export const io = new Server(server, {
  cors: {
    origin: "*", // Update with your actual origin restrictions
    methods: ["GET", "POST"],
  },
})

// Socket connection handler
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id)

  // Handle user joining a room (e.g., for user-specific notifications)
  socket.on("join", (room) => {
    socket.join(room)
    console.log(`Socket ${socket.id} joined room: ${room}`)
  })

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id)
  })
})

export default io
