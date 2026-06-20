// =============================================
// FILE: Message.js — How messages look in the database
// =============================================
// This file defines the "shape" of a message.
// Think of it like a blueprint: every message
// saved to MongoDB will follow this structure.

// ---------- 1. IMPORT MONGOOSE ----------
const mongoose = require("mongoose");

// ---------- 2. DEFINE THE MESSAGE SCHEMA ----------
// A "schema" is just a description of what fields
// a message has and what type of data each field holds.
const messageSchema = new mongoose.Schema({
  // Who sent this message? (Your name or your partner's name)
  sender: {
    type: String,
    required: true, // Every message MUST have a sender
  },

  // The text content of the message
  // If the message is a photo or audio, this will be empty
  text: {
    type: String,
    default: "", // Default to empty string if no text
  },

  // Web address of an uploaded image (if this is a photo message)
  // Example: "/uploads/photo_123456789.jpg"
  imageUrl: {
    type: String,
    default: null, // null means "no image"
  },

  // Web address of an uploaded audio recording (if voice message)
  audioUrl: {
    type: String,
    default: null, // null means "no audio"
  },

  // Message delivery status: "sent" | "delivered" | "read"
  status: {
    type: String,
    enum: ["sent", "delivered", "read"],
    default: "sent",
  },

  // When was this message sent?
  // MongoDB will automatically set this to the current time
  createdAt: {
    type: Date,
    default: Date.now, // Auto-set to current date/time
  },
});

// ---------- 3. CREATE THE MODEL ----------
// A "model" is what we use to actually save, read,
// update, and delete messages in the database.
// "Message" will be the name of the collection in MongoDB.
const Message = mongoose.model("Message", messageSchema);

// ---------- 4. EXPORT THE MODEL ----------
// Other files can now use Message to interact with
// the messages collection in MongoDB.
// Example: Message.find() to get all messages
module.exports = Message;
