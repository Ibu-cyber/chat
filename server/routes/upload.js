// =============================================
// FILE: upload.js — Handles file uploads (photos & audio)
// =============================================
// When you send a photo or voice message in the chat,
// the file first gets uploaded here. This route saves
// the file to the server and returns a URL so the
// message can link to it.

// ---------- 1. IMPORTS ----------
const express = require("express");
const multer = require("multer");
const path = require("path");

// Create a router (a mini-app for just this feature)
const router = express.Router();

// ---------- 2. CONFIGURE FILE STORAGE ----------
// "multer" is a tool that handles file uploads.
// Here we tell it WHERE to save files and WHAT to name them.
const storage = multer.diskStorage({
  // Where to save uploaded files
  destination: function (req, file, callback) {
    // Save files to the "uploads" folder inside the server folder
    callback(null, path.join(__dirname, "..", "uploads"));
  },

  // What to name the saved file
  filename: function (req, file, callback) {
    // Create a unique name using the current timestamp
    // Example: "photo_1695123456789.jpg"
    const uniqueSuffix = Date.now() + "_" + Math.round(Math.random() * 1000);
    const extension = path.extname(file.originalname); // Get .jpg, .png, .webm, etc.
    callback(null, file.fieldname + "_" + uniqueSuffix + extension);
  },
});

// ---------- 3. FILE FILTER ----------
// Only allow images and audio files (reject everything else)
function fileFilter(req, file, callback) {
  // List of allowed file types
  const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const allowedAudioTypes = ["audio/webm", "audio/ogg", "audio/mp3", "audio/mpeg", "audio/wav"];

  // Check if the uploaded file is an image or audio
  if (allowedImageTypes.includes(file.mimetype) || allowedAudioTypes.includes(file.mimetype)) {
    callback(null, true); // Accept the file
  } else {
    callback(new Error("Only images and audio files are allowed!"), false); // Reject
  }
}

// ---------- 4. CREATE THE UPLOAD MIDDLEWARE ----------
const upload = multer({
  storage: storage, // Where & how to save
  fileFilter: fileFilter, // What types to allow
  limits: {
    fileSize: 10 * 1024 * 1024, // Max 10MB per file
  },
});

// ---------- 5. THE UPLOAD ROUTE ----------
// When the client sends a file to POST /api/upload...
router.post("/", upload.single("file"), (req, res) => {
  // "file" is the name of the field in the form data

  // Check if a file was actually sent
  if (!req.file) {
    return res.status(400).json({ error: "No file was uploaded." });
  }

  // Build the URL that the chat can use to show this file
  // Example: "/uploads/photo_1695123456789.jpg"
  const fileUrl = "/uploads/" + req.file.filename;

  // Determine if this is an image or audio (for the client to know)
  const isImage = req.file.mimetype.startsWith("image/");

  // Send back the URL and type
  res.json({
    url: fileUrl, // The web address of the uploaded file
    type: isImage ? "image" : "audio", // Whether it's a photo or voice message
  });
});

// ---------- 6. ERROR HANDLING ----------
// If multer encounters an error (file too large, wrong type, etc.)
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors (e.g., file too large)
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({ error: "File is too large. Maximum size is 10MB." });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    // Other errors (e.g., wrong file type)
    return res.status(400).json({ error: err.message });
  }
  next();
});

// ---------- 7. EXPORT THE ROUTER ----------
module.exports = router;
