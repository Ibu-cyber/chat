// =============================================
// FILE: socket.js — Manages the real-time connection
// =============================================
// This file creates and configures the Socket.IO
// connection between our React app and the server.
// It's used by other components to send & receive
// messages instantly.

// ---------- 1. IMPORT SOCKET.IO CLIENT ----------
import { io } from "socket.io-client";

// ---------- 2. CREATE THE CONNECTION ----------
// 'socket' is our connection to the server.
// This will be imported by other components.
let socket = null;

// ---------- 3. FUNCTION TO CONNECT WITH AUTH ----------
// This is called when the user logs in with their
// username and password.
export function connectToServer(username, password) {
  // Disconnect any existing connection first
  if (socket) {
    socket.disconnect();
  }

  // Create a new connection, sending the credentials
  // Server checks these against the .env file
  socket = io({
    auth: {
      username: username, // Your name
      password: password, // Your secret password
    },
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    transports: ["websocket", "polling"],
  });

  // Return the socket for use by the calling code
  return socket;
}

// ---------- 4. GET THE CURRENT SOCKET ----------
// Other components call this to access the
// socket after connecting.
export function getSocket() {
  return socket;
}

// ---------- 5. DISCONNECT ----------
export function disconnectFromServer() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
