import { useState, useEffect, useRef } from "react";
import { getSocket } from "../socket";
import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";
import ImageViewer from "../components/ImageViewer";
import AudioRecorder from "../components/AudioRecorder";
import LoveCelebration from "../components/LoveCelebration";

function ChatPage({ username, displayName, partnerName, partnerDisplayName, partnerNickname, partnerStatus, partnerOnline, selectedContact, onPartnerInfo, messages, onMobileBack, profilePhoto, partnerPhoto, chatBackground, callStatus, onStartCall }) {
  const [typingUser, setTypingUser] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const socket = getSocket();

    socket.on("user_typing", (data) => {
      if (data.username !== username) {
        setTypingUser(data.username);
      }
    });

    socket.on("user_stop_typing", () => {
      setTypingUser(null);
    });

    socket.on("message_error", (errorMessage) => {
      alert(errorMessage);
    });

    socket.on("partner_info", (data) => {
      if (onPartnerInfo) {
        onPartnerInfo(data.partnerName, data.partnerOnline, data.partnerLastSeen);
      }
    });

    socket.emit("get_partner_info");

    return () => {
      socket.off("user_typing");
      socket.off("user_stop_typing");
      socket.off("message_error");
      socket.off("partner_info");
    };
  }, [username, onPartnerInfo]);

  const loveWords = [
    "i love you", "love you", "i love u", "love u",
    "❤️", "💕", "💗", "💖", "💘",
    "my love", "sweetheart", "darling", "babe", "baby",
    "miss you", "i miss you", "kiss", "hug",
    "forever", "always", "you're mine", "you are mine",
    "i need you", "love of my life", "my heart",
    "beautiful", "handsome", "gorgeous", "my everything",
  ];

  function containsLoveWord(text) {
    if (!text) return false;
    const lower = text.toLowerCase();
    return loveWords.some((word) => lower.includes(word));
  }

  useEffect(() => {
    if (messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last.text && containsLoveWord(last.text)) {
        setCelebrationMessage(last);
      }
    }
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function handleSendMessage(text) {
    const socket = getSocket();
    if (socket && text.trim()) {
      const msgData = { text: text.trim() };
      if (replyTo) {
        msgData.replyTo = { _id: replyTo._id, text: replyTo.text, sender: replyTo.sender, imageUrl: replyTo.imageUrl, audioUrl: replyTo.audioUrl, fileUrl: replyTo.fileUrl };
        setReplyTo(null);
      }
      socket.emit("send_message", msgData);
    }
    }

  function handleSendFile(fileUrl, fileType, fileName) {
    const socket = getSocket();
    if (!socket) return;
    const messageData = {};
    if (fileType === "image") {
      messageData.imageUrl = fileUrl;
    } else if (fileType === "audio") {
      messageData.audioUrl = fileUrl;
    } else if (fileType === "file") {
      messageData.fileUrl = fileUrl;
      messageData.fileName = fileName || "Document";
    }
    messageData.text = "";
    if (replyTo) {
      messageData.replyTo = { _id: replyTo._id, text: replyTo.text, sender: replyTo.sender, imageUrl: replyTo.imageUrl, audioUrl: replyTo.audioUrl, fileUrl: replyTo.fileUrl };
      setReplyTo(null);
    }
    socket.emit("send_message", messageData);
  }

  function handleTyping() {
    const socket = getSocket();
    if (socket) socket.emit("typing");
  }

  function handleStopTyping() {
    const socket = getSocket();
    if (socket) socket.emit("stop_typing");
  }

  function handleReply(message) {
    setReplyTo(message);
  }

  function handleDelete(messageId) {
    const socket = getSocket();
    if (socket) socket.emit("delete_message", { messageId });
  }

  console.log("[DEBUG] ChatPage render", { messagesCount: messages.length, partnerName });

  return (
    <div className="chat-panel">
      <div className="chat-panel-header">
        {onMobileBack && (
          <button className="mobile-back-button" onClick={onMobileBack} title="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
        <div className="chat-panel-contact">
          <div className="panel-avatar">
            {partnerPhoto ? (
              <img src={partnerPhoto} alt="" className="avatar-img" />
            ) : (
              partnerName ? (partnerNickname || partnerDisplayName || partnerName).charAt(0).toUpperCase() : "?"
            )}
          </div>
          <div className="panel-contact-info">
            <span className="panel-contact-name">
              {partnerNickname || partnerDisplayName || partnerName || "Loading..."}
            </span>
            <span className={`panel-contact-status ${partnerOnline ? "status-online" : "status-offline"}`}>{partnerStatus}</span>
          </div>
        </div>
        <div className="panel-header-actions">
          <button
            className="header-call-button header-call-audio"
            onClick={() => onStartCall("audio")}
            title="Audio call"
            disabled={!partnerName || callStatus !== "idle"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
          <button
            className="header-call-button header-call-video"
            onClick={() => onStartCall("video")}
            title="Video call"
            disabled={!partnerName || callStatus !== "idle"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="messages-container" style={chatBackground ? { backgroundImage: `url(${chatBackground})`, backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "transparent" } : {}}>
        <span className="floating-heart" style={{ top: "15%", left: "3%", fontSize: "22px", animationDelay: "0s", opacity: "0.08" }}>💕</span>
        <span className="floating-heart" style={{ top: "28%", right: "5%", fontSize: "16px", animationDelay: "1.5s", opacity: "0.1" }}>❤️</span>
        <span className="floating-heart" style={{ top: "50%", left: "8%", fontSize: "18px", animationDelay: "3s", opacity: "0.07" }}>💖</span>
        <span className="floating-heart" style={{ top: "65%", right: "8%", fontSize: "14px", animationDelay: "0.8s", opacity: "0.09" }}>💗</span>
        <span className="floating-heart" style={{ top: "80%", left: "5%", fontSize: "20px", animationDelay: "2.2s", opacity: "0.06" }}>😘</span>
        <span className="floating-heart" style={{ top: "10%", right: "12%", fontSize: "15px", animationDelay: "4s", opacity: "0.08" }}>💕</span>

        {messages.length === 0 ? (
          <div className="messages-empty">
            <p>No messages yet...</p>
            <p className="messages-empty-hint">Say something sweet! 💕</p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg._id}
              message={msg}
              isOwn={msg.sender === username}
              partnerDisplayName={partnerDisplayName}
              partnerNickname={partnerNickname}
              onImageClick={(url) => setViewingImage(url)}
              onReply={handleReply}
              onDelete={handleDelete}
            />
          ))
        )}

        {typingUser && (
          <div className="typing-indicator">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-text">{partnerNickname || partnerDisplayName || typingUser} is typing...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="input-area">
        {replyTo && (
          <div className="reply-bar">
            <div className="reply-bar-line" />
            <div className="reply-bar-content">
              <span className="reply-bar-sender">{replyTo.sender === username ? "You" : (partnerNickname || partnerDisplayName || replyTo.sender)}</span>
              <span className="reply-bar-text">{replyTo.text || (replyTo.imageUrl ? "Photo" : replyTo.audioUrl ? "Voice message" : replyTo.fileUrl ? "Document" : "")}</span>
            </div>
            <button className="reply-bar-close" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        )}
        {showRecorder ? (
          <AudioRecorder
            onSend={(audioUrl) => {
              if (replyTo) setReplyTo(null);
              handleSendFile(audioUrl, "audio");
              setShowRecorder(false);
            }}
            onCancel={() => setShowRecorder(false)}
          />
        ) : (
          <MessageInput
            onSend={handleSendMessage}
            onTyping={handleTyping}
            onStopTyping={handleStopTyping}
            onAttachImage={() => { handleStopTyping(); document.getElementById("imageInput").click(); }}
            onAttachDocument={() => { handleStopTyping(); document.getElementById("docInput").click(); }}
            onRecordAudio={() => { handleStopTyping(); setShowRecorder(true); }}
          />
        )}

        <input
          id="imageInput"
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
              const formData = new FormData();
              formData.append("file", file);
              const response = await fetch("/api/upload", { method: "POST", body: formData });
              if (!response.ok) {
                const error = await response.json();
                alert(error.error || "Failed to upload image.");
                return;
              }
              const result = await response.json();
              handleSendFile(result.url, result.type);
            } catch {
              alert("Failed to upload image. Is the server running?");
            }
            e.target.value = "";
          }}
        />
        <input
          id="docInput"
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.rtf"
          hidden
          onChange={async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
              const formData = new FormData();
              formData.append("file", file);
              const response = await fetch("/api/upload", { method: "POST", body: formData });
              if (!response.ok) {
                const error = await response.json();
                alert(error.error || "Failed to upload document.");
                return;
              }
              const result = await response.json();
              handleSendFile(result.url, result.type, result.fileName);
            } catch {
              alert("Failed to upload document. Is the server running?");
            }
            e.target.value = "";
          }}
        />
      </div>

      {viewingImage && (
        <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
      )}

      {celebrationMessage && (
        <LoveCelebration
          message={celebrationMessage}
          onComplete={() => setCelebrationMessage(null)}
        />
      )}
    </div>
  );
}

export default ChatPage;
