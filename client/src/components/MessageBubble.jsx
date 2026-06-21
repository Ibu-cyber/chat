import { useState } from "react";

function MessageBubble({ message, isOwn, partnerDisplayName, partnerNickname, onImageClick, onReply, onDelete }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRef, setAudioRef] = useState(null);

  function formatTime(dateString) {
    const date = new Date(dateString);
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  }

  function toggleAudio() {
    if (audioRef) {
      if (isPlaying) {
        audioRef.pause();
        audioRef.currentTime = 0;
      } else {
        audioRef.play();
      }
      setIsPlaying(!isPlaying);
    }
  }

  async function handleDownload(url, filename) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }

  function getImageFilename(url) {
    const parts = url.split("/");
    return parts[parts.length - 1] || "image.jpg";
  }

  function getAudioFilename(url) {
    const parts = url.split("/");
    return parts[parts.length - 1] || "audio.webm";
  }

  function getFileIcon(fileName) {
    if (!fileName) return "📄";
    const ext = fileName.split(".").pop().toLowerCase();
    if (["pdf"].includes(ext)) return "📕";
    if (["doc", "docx"].includes(ext)) return "📘";
    if (["xls", "xlsx", "csv"].includes(ext)) return "📊";
    if (["ppt", "pptx"].includes(ext)) return "📙";
    if (["zip", "rar"].includes(ext)) return "🗜️";
    if (["txt", "rtf"].includes(ext)) return "📄";
    return "📄";
  }

  function handleReplyClick(e) {
    e.stopPropagation();
    if (onReply) onReply(message);
  }

  function handleDeleteClick(e) {
    e.stopPropagation();
    if (onDelete) onDelete(message._id);
  }

  const replyPreview = message.replyTo ? (
    <div className="reply-preview">
      <div className="reply-preview-bar" />
      <div className="reply-preview-content">
        <span className="reply-preview-sender">{message.replyTo.sender === message.sender ? "You" : (partnerNickname || partnerDisplayName || message.replyTo.sender)}</span>
        <span className="reply-preview-text">{message.replyTo.text || (message.replyTo.imageUrl ? "Photo" : message.replyTo.audioUrl ? "Voice message" : message.replyTo.fileUrl ? "Document" : "")}</span>
      </div>
    </div>
  ) : null;

  return (
    <div className={`message-wrapper ${isOwn ? "message-own" : "message-other"}`}>
      {!isOwn && <span className="message-sender">{partnerNickname || partnerDisplayName || message.sender}</span>}

      <div className={`message-bubble ${isOwn ? "bubble-own" : "bubble-other"}`}>
        {replyPreview}

        {message.text && <p className="message-text">{message.text}</p>}

        {message.imageUrl && (
          <div className="message-image-container">
            <img
              src={message.imageUrl}
              alt="Shared photo"
              className="message-image"
              onClick={() => onImageClick(message.imageUrl)}
              loading="lazy"
            />
            <button
              className="media-download-button"
              onClick={() => handleDownload(message.imageUrl, getImageFilename(message.imageUrl))}
              title="Download image"
            >
              ⬇
            </button>
          </div>
        )}

        {message.audioUrl && (
          <div className="message-audio">
            <button className="audio-play-button" onClick={toggleAudio}>
              {isPlaying ? "⏸" : "▶️"}
            </button>
            <div className="audio-wave">
              <span className={`audio-bar ${isPlaying ? "playing" : ""}`}></span>
              <span className={`audio-bar ${isPlaying ? "playing" : ""}`}></span>
              <span className={`audio-bar ${isPlaying ? "playing" : ""}`}></span>
              <span className={`audio-bar ${isPlaying ? "playing" : ""}`}></span>
            </div>
            <button
              className="media-download-button audio-dl"
              onClick={() => handleDownload(message.audioUrl, getAudioFilename(message.audioUrl))}
              title="Download audio"
            >
              ⬇
            </button>
            <audio
              ref={(el) => setAudioRef(el)}
              src={message.audioUrl}
              onEnded={() => setIsPlaying(false)}
            />
          </div>
        )}

        {message.fileUrl && (
          <div className="message-document">
            <span className="doc-icon">{getFileIcon(message.fileName)}</span>
            <div className="doc-info">
              <span className="doc-name">{message.fileName || "Document"}</span>
            </div>
            <button
              className="media-download-button doc-dl"
              onClick={() => handleDownload(message.fileUrl, message.fileName || "document")}
              title="Download file"
            >
              ⬇
            </button>
          </div>
        )}

        <span className="message-time">{formatTime(message.createdAt)}</span>
        {isOwn && (
          <span className="message-status">
            {message.status === "read" ? (
              <svg className="status-read" width="18" height="12" viewBox="0 0 18 12" fill="none">
                <path d="M2 6.5L5.5 10L12.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 6.5L11 10L18 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : message.status === "delivered" ? (
              <svg className="status-delivered" width="18" height="12" viewBox="0 0 18 12" fill="none">
                <path d="M2 6.5L5.5 10L12.5 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 6.5L11 10L18 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg className="status-sent" width="13" height="10" viewBox="0 0 13 10" fill="none">
                <path d="M1.5 5.5L5 9L12 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </span>
        )}

        {onReply || onDelete ? (
          <div className="message-actions">
            {onReply && (
              <button className="message-action-btn reply-action" onClick={handleReplyClick} title="Reply" aria-label="Reply">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </button>
            )}
            {isOwn && onDelete && (
              <button className="message-action-btn delete-action" onClick={handleDeleteClick} title="Delete" aria-label="Delete">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default MessageBubble;
