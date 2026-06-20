// =============================================
// FILE: MessageInput.jsx — Type and send messages
// =============================================
// This is the text input at the bottom of the chat.
// Type a message, press Enter or click Send, and
// it's instantly delivered to your partner!

// ---------- 1. IMPORTS ----------
import { useState, useRef } from "react";

// ---------- 2. THE MESSAGE INPUT COMPONENT ----------
function MessageInput({ onSend, onTyping, onStopTyping, onAttachImage, onRecordAudio }) {
  // Track what the user is typing
  const [text, setText] = useState("");

  // Ref to track typing timeout
  const typingTimeoutRef = useRef(null);

  // ---------- 3. HANDLE SENDING ----------
  function handleSend() {
    // Don't send empty messages
    if (!text.trim()) return;

    // Send the message to the parent (ChatPage)
    onSend(text);

    // Clear the input field
    setText("");

    // Tell the server we stopped typing
    onStopTyping();
  }

  // ---------- 4. HANDLE KEY PRESS ----------
  function handleKeyDown(event) {
    // If the user presses Enter (without Shift), send the message
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault(); // Don't add a new line
      handleSend();
    }
  }

  // ---------- 5. HANDLE TYPING INDICATOR ----------
  function handleChange(event) {
    const newText = event.target.value;
    setText(newText);

    // Tell the other person we're typing
    onTyping();

    // Clear the previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // After 2 seconds of not typing, tell them we stopped
    typingTimeoutRef.current = setTimeout(() => {
      onStopTyping();
    }, 2000);
  }

  // ---------- 6. HANDLE SEND ON ENTER (for textarea) ----------
  function handleKeyUp(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      // Clear the typing timeout since message was sent
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    }
  }

  // ---------- 7. RENDER ----------
  return (
    <div className="message-input-container">
      {/* Attach image button */}
      <button
        className="input-action-button"
        onClick={onAttachImage}
        title="Send a photo"
      >
        📷
      </button>

      {/* Record audio button */}
      <button
        className="input-action-button"
        onClick={onRecordAudio}
        title="Record voice message"
      >
        🎤
      </button>

      {/* Text input area */}
      <textarea
        className="message-input"
        placeholder="Type a message..."
        value={text}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        rows={1}
      />

      {/* Send button */}
      <button
        className="send-button"
        onClick={handleSend}
        disabled={!text.trim()}
        title="Send message"
      >
        Send 💌
      </button>
    </div>
  );
}

// ---------- 8. EXPORT ----------
export default MessageInput;
