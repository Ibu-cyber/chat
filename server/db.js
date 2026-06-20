// =============================================
// FILE: db.js — Connects to MongoDB Atlas
// =============================================
// This file handles the connection between our
// server and MongoDB Atlas (cloud database).
// All messages, photos, and audio files are
// stored in MongoDB through this connection.

// ---------- 1. IMPORT MONGOOSE ----------
// Mongoose is a tool that helps us talk to MongoDB
// in a simple, organized way.
const mongoose = require("mongoose");

// ---------- 2. CONNECT TO MONGODB ----------
// This function tries to connect to your MongoDB
// database using the connection string from .env
async function connectDatabase() {
  try {
    // Get the connection string from the .env file
    // (you set this up when you configured the app)
    const mongoURI = process.env.MONGODB_URI;

    // Try to connect to MongoDB Atlas
    // The options help avoid common connection warnings
    await mongoose.connect(mongoURI);

    console.log(" SUCCESS: Connected to MongoDB Atlas!");
    console.log("  Your messages will be saved in the cloud.");
  } catch (error) {
    // If connection fails, show the error and stop the server
    console.error(" ERROR: Could not connect to MongoDB");
    console.error("  Make sure your MONGODB_URI in .env is correct.");
    console.error("  Error details:", error.message);
    process.exit(1); // Stop the server
  }
}

// ---------- 3. EXPORT THE FUNCTION ----------
// Other files (like index.js) can call this function
// to connect to the database when the server starts.
module.exports = connectDatabase;
