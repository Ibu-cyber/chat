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
const Presence = require("./models/Presence"); // For persisting lastSeen across restarts
const uploadRouter = require("./routes/upload"); // File upload handler
const archiver = require("archiver");
const AdmZip = require("adm-zip");
const fs = require("fs");

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



// ---------- Restore: upload a backup ZIP and restore messages to database ----------
const restoreUpload = require("multer")({ dest: require("path").join(__dirname, "uploads") });

app.post("/api/restore", restoreUpload.single("backup"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No backup file uploaded." });
    }

    const zip = new AdmZip(req.file.path);
    const entries = zip.getEntries();
    const msgEntry = entries.find(e => e.entryName === "messages.json");
    if (!msgEntry) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Backup file must contain messages.json" });
    }

    const messages = JSON.parse(msgEntry.getData().toString("utf8"));
    if (!Array.isArray(messages)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "messages.json must be an array" });
    }

    // Replace all messages in the database with backup messages
    const Message = require("./models/Message");
    await Message.deleteMany({});
    if (messages.length > 0) {
      await Message.insertMany(messages);
    }

    // Restore uploads folder if present
    const uploadsDir = path.join(__dirname, "uploads");
    const uploadEntry = entries.find(e => e.entryName.startsWith("uploads/") && !e.isDirectory);
    if (uploadEntry) {
      entries.forEach(entry => {
        if (entry.entryName.startsWith("uploads/") && !entry.isDirectory) {
          const relPath = entry.entryName.slice("uploads/".length);
          const outPath = path.join(uploadsDir, relPath);
          const outDir = path.dirname(outPath);
          if (!fs.existsSync(outDir)) {
            fs.mkdirSync(outDir, { recursive: true });
          }
          fs.writeFileSync(outPath, entry.getData());
        }
      });
    }

    // Clean up temp file
    fs.unlinkSync(req.file.path);

    console.log(`Restored ${messages.length} messages from backup`);
    res.json({ ok: true, count: messages.length });
  } catch (err) {
    console.error("Restore failed:", err);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: "Restore failed: " + err.message });
  }
});

// ---------- TURN credentials endpoint (returns configured ICE servers to client) ----------
const TURN_URL = process.env.TURN_URL || "";
const TURN_USERNAME = process.env.TURN_USERNAME || "";
const TURN_CREDENTIAL = process.env.TURN_CREDENTIAL || "";

app.get("/api/turn-credentials", (req, res) => {
  const iceServers = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
    { urls: "stun:stun3.l.google.com:19302" },
    { urls: "stun:stun4.l.google.com:19302" },
  ];

  if (TURN_URL && TURN_USERNAME && TURN_CREDENTIAL) {
    iceServers.push({
      urls: TURN_URL.split(",").map((url) => url.trim()).filter(Boolean),
      username: TURN_USERNAME,
      credential: TURN_CREDENTIAL,
    });
  }

  res.json({ iceServers, ttl: 86400 });
});

// ---------- Clear Call Logs (one-time, triggers clients to clear localStorage) ----------
app.post("/api/clear-logs", (req, res) => {
  io.emit("clear_call_logs");
  res.json({ ok: true });
});

// ---------- Backup: download all messages + uploads as ZIP ----------
app.get("/api/backup", async (req, res) => {
  try {
    const Message = require("./models/Message");
    const messages = await Message.find().sort({ createdAt: 1 }).lean();

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="heartchat_backup_${Date.now()}.zip"`);

    const archive = archiver("zip", { zlib: { level: 9 } });
    archive.pipe(res);

    archive.append(JSON.stringify(messages, null, 2), { name: "messages.json" });

    const uploadsDir = path.join(__dirname, "uploads");
    if (fs.existsSync(uploadsDir)) {
      archive.directory(uploadsDir, "uploads");
    }

    await archive.finalize();
  } catch (err) {
    console.error("Backup failed:", err);
    res.status(500).json({ error: "Backup failed" });
  }
});

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
const activeCalls = new Map();
let sharedBg = null;

function createCallId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function getActiveCallForUser(username) {
  for (const call of activeCalls.values()) {
    if ((call.caller === username || call.callee === username) && call.status !== "ended") {
      return call;
    }
  }
  return null;
}

function getPeerForCall(call, username) {
  if (!call) return null;
  return call.caller === username ? call.callee : call.caller;
}

function emitCallError(socket, message, callId = null) {
  socket.emit("call_error", { callId, message });
}

io.on("connection", async (socket) => {
  const username = socket.username;
  const partnerName = username === process.env.USER_1_NAME
    ? process.env.USER_2_NAME
    : process.env.USER_1_NAME;

  socket.join(username);

  // ---------- Mark user online & notify partner ----------
  userPresence[username] = { online: true };
  socket.broadcast.emit("presence_update", { username, online: true });

  // Load persisted lastSeen from DB (survives restarts)
  let partnerLastSeen = null;
  try {
    const p = await Presence.findOne({ username: partnerName });
    if (p && p.lastSeen) partnerLastSeen = p.lastSeen;
  } catch {}

  // Send partner's presence to the newly connected user
  const partnerPresence = userPresence[partnerName] || (partnerLastSeen ? { online: false, lastSeen: partnerLastSeen } : null);
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
  } catch (error) {
    console.error("Error loading messages:", error.message);
  }

  // ---------- Request missed calls (request-based, no race condition) ----------

  // ---------- Request missed calls (request-based, no race condition) ----------
  socket.on("request_missed_calls", () => {
    const calls = missedCalls[username] || [];
    if (calls.length > 0) {
      socket.emit("missed_calls_list", calls);
      missedCalls[username] = [];
    }
  });

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
        replyTo: data.replyTo || null,
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

  // ---------- Listen for message deletion ----------
  socket.on("delete_message", async (data) => {
    try {
      const msg = await Message.findById(data.messageId);
      if (!msg) return;
      if (msg.sender !== socket.username) return;
      await Message.findByIdAndDelete(data.messageId);
      io.emit("message_deleted", { messageId: data.messageId });
    } catch (error) {
      console.error("Error deleting message:", error.message);
    }
  });

  // ---------- Listen for message history request ----------
  socket.on("request_messages", async () => {
    try {
      const recentMessages = await Message.find()
        .sort({ createdAt: -1 })
        .limit(500)
        .sort({ createdAt: 1 });
      console.log(`  [request_messages] ${socket.username} requested — sending ${recentMessages.length} messages`);
      socket.emit("load_messages", recentMessages);
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
    const callId = data.callId || createCallId();
    const call = {
      id: callId,
      caller: username,
      callee: partnerName,
      type: data.type || "audio",
      status: "ringing",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    activeCalls.set(callId, call);

    io.to(partnerName).emit("incoming_call", {
      callId,
      caller: username,
      type: call.type,
      timestamp: new Date().toISOString(),
    });

    socket.emit("call_created", { callId, callee: partnerName, type: call.type });

    const partnerOnline = userPresence[partnerName]?.online ?? false;
    if (!partnerOnline) {
      if (!missedCalls[partnerName]) missedCalls[partnerName] = [];
      missedCalls[partnerName].push({
        caller: username,
        type: call.type,
        timestamp: new Date().toISOString(),
      });
      if (missedCalls[partnerName].length > 10) missedCalls[partnerName].shift();
    }
  });

  socket.on("call_accepted", (data) => {
    const call = activeCalls.get(data.callId) || getActiveCallForUser(username);
    if (!call || call.callee !== username) return emitCallError(socket, "Call no longer exists", data.callId);
    call.status = "accepted";
    call.updatedAt = Date.now();
    io.to(call.caller).emit("call_accepted", { callId: call.id, callee: username, type: call.type });
  });

  socket.on("call_rejected", (data) => {
    const call = activeCalls.get(data.callId) || getActiveCallForUser(username);
    const peer = getPeerForCall(call, username) || partnerName;
    if (call) {
      call.status = "ended";
      activeCalls.delete(call.id);
    }
    io.to(peer).emit("call_rejected", { callId: data.callId || call?.id, by: username });
  });

  socket.on("webrtc_offer", (data) => {
    const call = activeCalls.get(data.callId);
    const peer = getPeerForCall(call, username);
    if (!call || !peer) return emitCallError(socket, "Invalid offer call", data.callId);
    call.status = "connected";
    call.updatedAt = Date.now();
    io.to(peer).emit("webrtc_offer", { ...data, from: username });
  });

  socket.on("webrtc_answer", (data) => {
    const call = activeCalls.get(data.callId);
    const peer = getPeerForCall(call, username);
    if (!call || !peer) return emitCallError(socket, "Invalid answer call", data.callId);
    call.status = "connected";
    call.updatedAt = Date.now();
    io.to(peer).emit("webrtc_answer", { ...data, from: username });
  });

  socket.on("webrtc_ice_candidate", (data) => {
    const call = activeCalls.get(data.callId);
    const peer = getPeerForCall(call, username);
    if (!call || !peer || !data.candidate) return;
    io.to(peer).emit("webrtc_ice_candidate", { ...data, from: username });
  });

  // Backward-compatible event names for older clients during rolling deploys.
  socket.on("offer", (data) => {
    const call = activeCalls.get(data.callId) || getActiveCallForUser(username);
    const peer = getPeerForCall(call, username);
    if (!call || !peer) return;
    io.to(peer).emit("webrtc_offer", { ...data, callId: call.id, description: data.description || data.offer, from: username });
  });

  socket.on("answer", (data) => {
    const call = activeCalls.get(data.callId) || getActiveCallForUser(username);
    const peer = getPeerForCall(call, username);
    if (!call || !peer) return;
    io.to(peer).emit("webrtc_answer", { ...data, callId: call.id, description: data.description || data.answer, from: username });
  });

  socket.on("ice_candidate", (data) => {
    const call = activeCalls.get(data.callId) || getActiveCallForUser(username);
    const peer = getPeerForCall(call, username);
    if (!call || !peer || !data.candidate) return;
    io.to(peer).emit("webrtc_ice_candidate", { ...data, callId: call.id, from: username });
  });

  socket.on("call_reconnect", (data) => {
    const call = activeCalls.get(data.callId);
    const peer = getPeerForCall(call, username);
    if (!call || !peer) return;
    call.updatedAt = Date.now();
    io.to(peer).emit("call_peer_reconnected", { callId: call.id, username });
  });

  socket.on("call_ended", (data = {}) => {
    const call = activeCalls.get(data.callId) || getActiveCallForUser(username);
    const peer = getPeerForCall(call, username) || partnerName;
    if (call) {
      call.status = "ended";
      activeCalls.delete(call.id);
    }
    io.to(peer).emit("call_ended", { callId: data.callId || call?.id, by: username });
  });

  // ---------- When someone disconnects ----------
  socket.on("disconnect", () => {
    console.log(` Person disconnected: ${socket.username}`);
    const lastSeen = new Date().toISOString();
    userPresence[socket.username] = { online: false, lastSeen };
    socket.broadcast.emit("presence_update", { username: socket.username, online: false, lastSeen });
    const call = getActiveCallForUser(username);
    if (call) {
      const peer = getPeerForCall(call, username);
      io.to(peer).emit("call_peer_disconnected", { callId: call.id, username });
    }
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
