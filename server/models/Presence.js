const mongoose = require("mongoose");

const presenceSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  lastSeen: { type: Date },
});

module.exports = mongoose.model("Presence", presenceSchema);
