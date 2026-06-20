// =============================================
// FILE: upload.js — Handles file uploads (photos, audio & documents)
// =============================================
// When you send a photo, voice message, or document in the chat,
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
// Allow images, audio, and common document types
function fileFilter(req, file, callback) {
  const allowedImageTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  const allowedAudioTypes = ["audio/webm", "audio/ogg", "audio/mp3", "audio/mpeg", "audio/wav"];
  const allowedDocTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/vnd.ms-powerpoint",
    "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "text/plain",
    "text/csv",
    "application/zip",
    "application/x-rar-compressed",
    "application/rtf",
  ];

  if (
    allowedImageTypes.includes(file.mimetype) ||
    allowedAudioTypes.includes(file.mimetype) ||
    allowedDocTypes.includes(file.mimetype)
  ) {
    callback(null, true);
  } else {
    callback(new Error("Only images, audio, and documents are allowed!"), false);
  }
}

// ---------- 4. CREATE THE UPLOAD MIDDLEWARE ----------
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 20 * 1024 * 1024, // Max 20MB per file
  },
});

// ---------- 5. THE UPLOAD ROUTE ----------
router.post("/", upload.single("file"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file was uploaded." });
  }

  const fileUrl = "/uploads/" + req.file.filename;
  const isImage = req.file.mimetype.startsWith("image/");
  const isAudio = req.file.mimetype.startsWith("audio/");

  let type;
  if (isImage) type = "image";
  else if (isAudio) type = "audio";
  else type = "file";

  res.json({
    url: fileUrl,
    type: type,
    fileName: req.file.originalname,
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
