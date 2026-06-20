// =============================================
// FILE: index.js — The main server (heart of the app)
// =============================================
// This file starts the server, handles real-time
// messaging via WebSockets, and connects everything.
// When you run "npm start", this is the file that runs.

// =======================================
// SECTION 1: IMPORT ALL THE THINGS WE NEED
// =======================================

// Load environment variables from .env file
// (your MongoDB URI, usernames, passwords, etc.)
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });

const express = require("express"); // Web framework for handling HTTP requests
const http = require("http"); // Built-in Node module for creating servers
const { Server } = require("socket.io"); // Real-time WebSocket library
const cors = require("cors"); // Allows different origins to connect
const path = require("path"); // Helps with file/folder paths
const connectDatabase = require("./db"); // Our MongoDB connection
const Message = require("./models/Message"); // The Message blueprint
const uploadRouter = require("./routes/upload"); // File upload handler

// =======================================
// SECTION 2: CREATE THE SERVER
// =======================================

const app = express(); // Create the Express app
const server = http.createServer(app); // Wrap it in an HTTP server (needed for Socket.IO)

// ---------- Socket.IO Setup ----------
// Socket.IO adds real-time communication.
// When you send a message, it's instantly delivered
// to the other person through this connection.
const io = new Server(server, {
  cors: {
    origin: "*", // Allow connections from anywhere (our React app)
    methods: ["GET", "POST"],
  },
});

// =======================================
// SECTION 3: AUTHENTICATION — Only allow the two of you
// =======================================

// This runs EVERY TIME someone tries to connect to the chat.
// Think of it as a bouncer at a club — only lets in
// people whose names are on the list.
io.use((socket, next) => {
  // Get the username and password sent by the client
  const { username, password } = socket.handshake.auth;

  // Check if the credentials match Person 1 (you) from .env
  const isUser1 = username === process.env.USER_1_NAME && password === process.env.USER_1_PASSWORD;

  // Check if the credentials match Person 2 (your partner) from .env
  const isUser2 = username === process.env.USER_2_NAME && password === process.env.USER_2_PASSWORD;

  // If either person is trying to connect, let them in!
  if (isUser1 || isUser2) {
    // Save the username on the socket so we can use it later
    // (to know who sent each message)
    socket.username = username;
    console.log(` Person connected: ${username}`);
    next(); // Allow the connection
  } else {
    // If the credentials don't match, block them
    console.log(` BLOCKED: Someone tried to connect with username "${username}"`);
    next(new Error("Invalid username or password. Only the two of you can use this chat."));
  }
});

// =======================================
// SECTION 4: DATABASE CONNECTION
// =======================================

// Connect to MongoDB Atlas before accepting any requests
connectDatabase();

// =======================================
// SECTION 5: MIDDLEWARE (things that run on every request)
// =======================================

app.use(cors()); // Allow requests from the React app
app.use(express.json()); // Understand JSON data from the client

// Make the "uploads" folder publicly accessible
// This way, when the chat shows a photo, the browser can load it
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// In production, serve the built React app from the client/dist folder
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "..", "client", "dist")));
}

// ---------- Upload Route ----------
// When the client uploads a photo or audio, it goes here
app.use("/api/upload", uploadRouter);

// =======================================
// SECTION 6: SOCKET.IO EVENT HANDLING
// =======================================
// This is where the real-time magic happens.
// When someone does something (sends a message, types, etc.),
// Socket.IO lets us instantly tell the other person.

const userPresence = {};
const userProfiles = {};
const displayNames = {};
const missedCalls = {};
let sharedBg = null;

io.on("connection", async (socket) => {
  const username = socket.username;
  const partnerName = username === process.env.USER_1_NAME
    ? process.env.USER_2_NAME
    : process.env.USER_1_NAME;

  socket.join(username);

  // ---------- Mark user online & notify partner ----------
  userPresence[username] = { online: true };
  socket.broadcast.emit("presence_update", { username, online: true });

  // Send partner's presence to the newly connected user
  const partnerPresence = userPresence[partnerName];
  if (partnerPresence) {
    socket.emit("presence_update", { username: partnerName, ...partnerPresence });
  }

  // ---------- Mark undelivered messages from partner as delivered ----------
  try {
    const undelivered = await Message.find({
      sender: partnerName,
      status: "sent",
    });
    if (undelivered.length > 0) {
      const ids = undelivered.map((m) => m._id);
      await Message.updateMany({ _id: { $in: ids } }, { status: "delivered" });
      for (const id of ids) {
        io.emit("message_status_update", { messageId: id, status: "delivered" });
      }
      console.log(`  Marked ${undelivered.length} messages as delivered for ${username}`);
    }

    const partnerProfile = userProfiles[partnerName] || {};
    socket.emit("partner_info", {
      partnerName,
      partnerOnline: partnerPresence ? partnerPresence.online : false,
      partnerLastSeen: partnerPresence ? partnerPresence.lastSeen : null,
      partnerPhoto: partnerProfile.photo || null,
      partnerDisplayName: displayNames[partnerName] || null,
      sharedBg,
    });

    if (missedCalls[username] && missedCalls[username].length > 0) {
      for (const call of missedCalls[username]) {
        socket.emit("missed_call", call);
      }
      missedCalls[username] = [];
    }
  } catch (error) {
    console.error("Error loading messages:", error.message);
  }

  // ---------- Listen for new text messages ----------
  socket.on("send_message", async (data) => {
    try {
      const newMessage = new Message({
        sender: socket.username,
        text: data.text || "",
        imageUrl: data.imageUrl || null,
        audioUrl: data.audioUrl || null,
        fileUrl: data.fileUrl || null,
        fileName: data.fileName || null,
      });

      const savedMessage = await newMessage.save();

      const partnerOnline = userPresence[partnerName]?.online ?? false;

      if (partnerOnline) {
        savedMessage.status = "delivered";
        await Message.findByIdAndUpdate(savedMessage._id, { status: "delivered" });
      }

      io.emit("new_message", savedMessage.toObject ? savedMessage.toObject() : savedMessage);
    } catch (error) {
      console.error("Error saving message:", error.message);
      socket.emit("message_error", "Failed to save message. Please try again.");
    }
  });

  // ---------- Listen for message history request ----------
  socket.on("request_messages", async () => {
    try {
      const recentMessages = await Message.find()
        .sort({ createdAt: -1 })
        .limit(100)
        .sort({ createdAt: 1 });
      socket.emit("load_messages", recentMessages);
      console.log(`  Sent ${recentMessages.length} messages to ${socket.username} (on request)`);
    } catch (error) {
      console.error("Error loading messages on request:", error.message);
    }
  });

  // ---------- Listen for message delivery/read receipts ----------
  socket.on("message_delivered", async (data) => {
    try {
      const msg = await Message.findByIdAndUpdate(
        data.messageId,
        { status: "delivered" },
        { new: true }
      );
      if (msg) io.emit("message_status_update", { messageId: data.messageId, status: "delivered" });
    } catch (error) {
      console.error("Error marking message delivered:", error.message);
    }
  });

  socket.on("message_read", async (data) => {
    try {
      const msg = await Message.findByIdAndUpdate(
        data.messageId,
        { status: "read" },
        { new: true }
      );
      if (msg) io.emit("message_status_update", { messageId: data.messageId, status: "read" });
    } catch (error) {
      console.error("Error marking message read:", error.message);
    }
  });

  // ---------- Listen for typing indicators ----------
  // When someone is typing, show "typing..." to the other person
  socket.on("typing", () => {
    // Tell the other person (everyone except the sender) that someone is typing
    socket.broadcast.emit("user_typing", {
      username: socket.username,
    });
  });

  // ---------- Listen for stop typing ----------
  socket.on("stop_typing", () => {
    socket.broadcast.emit("user_stop_typing");
  });

  // ---------- On-demand partner info (fixes race condition) ----------
  socket.on("get_partner_info", () => {
    const partnerPresence = userPresence[partnerName];
    socket.emit("partner_info", {
      partnerName,
      partnerOnline: partnerPresence ? partnerPresence.online : false,
      partnerLastSeen: partnerPresence ? partnerPresence.lastSeen : null,
    });
    if (partnerPresence) {
      socket.emit("presence_update", { username: partnerName, ...partnerPresence });
    }
    const partnerProfile = userProfiles[partnerName] || {};
    socket.emit("partner_info", {
      partnerName,
      partnerOnline: partnerPresence ? partnerPresence.online : false,
      partnerLastSeen: partnerPresence ? partnerPresence.lastSeen : null,
      partnerPhoto: partnerProfile.photo || null,
      partnerDisplayName: displayNames[partnerName] || null,
      sharedBg,
    });
  });

  // ---------- Display name sharing ----------
  socket.on("display_name_update", (data) => {
    displayNames[socket.username] = data.displayName;
    socket.broadcast.emit("partner_display_name_update", { displayName: data.displayName });
  });

  // ---------- Profile photo sharing ----------
  socket.on("profile_update", (data) => {
    userProfiles[socket.username] = { ...(userProfiles[socket.username] || {}), photo: data.photoUrl };
    socket.broadcast.emit("partner_profile_update", { username: socket.username, photoUrl: data.photoUrl });
  });

  // ---------- Chat background sharing ----------
  socket.on("bg_update", (data) => {
    sharedBg = data.bgUrl;
    socket.broadcast.emit("partner_bg_update", { bgUrl: data.bgUrl });
  });

  // ---------- Audio/Video Call Signaling ----------
  socket.on("call_user", (data) => {
    io.to(partnerName).emit("incoming_call", data);
    const partnerOnline = userPresence[partnerName]?.online ?? false;
    if (!partnerOnline) {
      if (!missedCalls[partnerName]) missedCalls[partnerName] = [];
      missedCalls[partnerName].push({
        caller: data.caller,
        type: data.type,
        timestamp: new Date().toISOString(),
      });
      if (missedCalls[partnerName].length > 10) missedCalls[partnerName].shift();
    }
  });

  socket.on("call_accepted", (data) => {
    io.to(partnerName).emit("call_accepted", data);
  });

  socket.on("call_rejected", (data) => {
    io.to(partnerName).emit("call_rejected", data);
  });

  socket.on("offer", (data) => {
    io.to(partnerName).emit("offer", data);
  });

  socket.on("answer", (data) => {
    io.to(partnerName).emit("answer", data);
  });

  socket.on("ice_candidate", (data) => {
    io.to(partnerName).emit("ice_candidate", data);
  });

  socket.on("call_ended", () => {
    io.to(partnerName).emit("call_ended");
  });

  // ---------- When someone disconnects ----------
  socket.on("disconnect", () => {
    console.log(` Person disconnected: ${socket.username}`);
    const lastSeen = new Date().toISOString();
    userPresence[socket.username] = { online: false, lastSeen };
    socket.broadcast.emit("presence_update", { username: socket.username, online: false, lastSeen });
    io.to(partnerName).emit("call_ended");
  });
});

// =======================================
// SECTION 7: START THE SERVER
// =======================================

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log("");
  console.log("  ╔═══════════════════════════════════╗");
  console.log("  ║      ❤️ HEARTCHAT IS RUNNING ❤️     ║");
  console.log("  ╚═══════════════════════════════════╝");
  console.log("");
  console.log(`  Server: http://localhost:${PORT}`);
  console.log("  Waiting for you and your partner to connect...");
  console.log("");
});
