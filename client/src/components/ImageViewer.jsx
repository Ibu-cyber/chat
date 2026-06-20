// =============================================
// FILE: ImageViewer.jsx — View photos full-screen
// =============================================
// When you click on a photo in the chat, this
// component opens it up nice and big so you
// can see all the details. Click anywhere or
// press Escape to close it.

// ---------- 1. IMPORTS ----------
import { useEffect } from "react";

// ---------- 2. THE IMAGE VIEWER COMPONENT ----------
function ImageViewer({ imageUrl, onClose }) {
  // ---------- 3. CLOSE ON ESCAPE KEY ----------
  // When the user presses the Escape key, close the viewer
  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    // Listen for key presses
    document.addEventListener("keydown", handleKeyDown);

    // Cleanup: stop listening when component is removed
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // ---------- 4. RENDER ----------
  return (
    // The overlay covers the entire screen (dark background)
    <div className="image-viewer-overlay" onClick={onClose}>
      {/* Close button in the top-right corner */}
      <button className="image-viewer-close" onClick={onClose}>
        ✕
      </button>

      {/* The actual image */}
      <img
        className="image-viewer-image"
        src={imageUrl}
        alt="Enlarged photo"
        onClick={(e) => e.stopPropagation()} // Clicking the image doesn't close it
      />
    </div>
  );
}

// ---------- 5. EXPORT ----------
export default ImageViewer;
