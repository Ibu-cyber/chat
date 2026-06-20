import { useState, useEffect, useRef } from "react";
import { getSocket } from "../socket";
import MessageBubble from "../components/MessageBubble";
import MessageInput from "../components/MessageInput";
import ImageViewer from "../components/ImageViewer";
import AudioRecorder from "../components/AudioRecorder";
import CallOverlay from "../components/CallOverlay";
import LoveCelebration from "../components/LoveCelebration";

const PC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function addCallLog(entry) {
  try {
    const logs = JSON.parse(localStorage.getItem("heartchat_call_logs") || "[]");
    logs.unshift({ ...entry, id: Date.now() });
    if (logs.length > 100) logs.length = 100;
    localStorage.setItem("heartchat_call_logs", JSON.stringify(logs));
  } catch {}
}

async function getMedia(video) {
  return navigator.mediaDevices.getUserMedia({ audio: true, video });
}

function createPeerConnection(stream, onRemoteStream, onIceCandidate, remoteAudioRef) {
  const pc = new RTCPeerConnection(PC_CONFIG);
  stream.getTracks().forEach((t) => pc.addTrack(t, stream));
  const receivedStreamRef = { current: null };
  pc.ontrack = (event) => {
    const remote = event.streams && event.streams[0]
      ? event.streams[0]
      : event.track
        ? new MediaStream([event.track])
        : null;
    if (remote) {
      if (!receivedStreamRef.current) {
        receivedStreamRef.current = remote;
        onRemoteStream(remote);
        if (remoteAudioRef && remoteAudioRef.current) {
          remoteAudioRef.current.srcObject = remote;
          remoteAudioRef.current.play().catch(() => {});
        }
      } else if (receivedStreamRef.current !== remote) {
        event.track && receivedStreamRef.current.addTrack(event.track);
      }
    }
  };
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate.toJSON ? event.candidate.toJSON() : event.candidate);
    }
  };
  pc.oniceconnectionstatechange = () => {
    console.log("ICE state:", pc.iceConnectionState);
  };
  return pc;
}

function ChatPage({ username, displayName, partnerName, partnerDisplayName, partnerNickname, partnerStatus, partnerOnline, selectedContact, onPartnerInfo, messages, onMobileBack, profilePhoto, partnerPhoto, chatBackground }) {
  const [typingUser, setTypingUser] = useState(null);
  const [viewingImage, setViewingImage] = useState(null);
  const [showRecorder, setShowRecorder] = useState(false);
  const [celebrationMessage, setCelebrationMessage] = useState(null);
  const messagesEndRef = useRef(null);

  const [callStatus, setCallStatus] = useState("idle");
  const [callType, setCallType] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);

  const callStatusRef = useRef("idle");
  const callTypeRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callStartTimeRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);

  function startCallRecording() {
    if (mediaRecorderRef.current) return;
    const tracks = [];
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getAudioTracks()) {
        tracks.push(t);
      }
    }
    if (remoteStreamRef.current) {
      for (const t of remoteStreamRef.current.getAudioTracks()) {
        tracks.push(t);
      }
    }
    if (tracks.length === 0) return;
    const combined = new MediaStream(tracks);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus" : "audio/webm";
    const recorder = new MediaRecorder(combined, { mimeType });
    recordingChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
  }

  function stopCallRecording() {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") { resolve(null); return; }
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType });
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        resolve(blob);
      };
      recorder.stop();
    });
  }

  async function uploadRecording(blob) {
    if (!blob) return null;
    const formData = new FormData();
    formData.append("file", blob, `call_${Date.now()}.webm`);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        return data.url;
      }
    } catch {}
    return null;
  }

  useEffect(() => {
    const socket = getSocket();

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

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

    socket.on("missed_call", (data) => {
      addCallLog({
        type: data.type,
        direction: "incoming",
        status: "missed",
        partner: partnerName,
        timestamp: data.timestamp,
        duration: 0,
      });
      const name = partnerNickname || partnerDisplayName || partnerName;
      const callTypeLabel = data.type === "video" ? "Video" : "Audio";
      const notification = new Notification(`${callTypeLabel} call from ${name}`, {
        body: "You missed a call while you were away.",
        icon: "/favicon.ico",
      });
      setTimeout(() => notification.close(), 5000);
    });

    socket.emit("get_partner_info");

    socket.on("incoming_call", (data) => {
      if (callStatusRef.current === "idle") {
        setCallType(data.type);
        callTypeRef.current = data.type;
        setCallStatus("ringing");
        callStatusRef.current = "ringing";
      }
    });

    socket.on("call_accepted", async () => {
      if (callStatusRef.current === "calling" && localStreamRef.current) {
        callStartTimeRef.current = Date.now();
        const stream = localStreamRef.current;
        const pc = createPeerConnection(
          stream,
          (remote) => { remoteStreamRef.current = remote; setRemoteStream(remote); startCallRecording(); },
          (candidate) => getSocket().emit("ice_candidate", { candidate }),
          remoteAudioRef
        );
        pcRef.current = pc;
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        getSocket().emit("offer", { offer: pc.localDescription });
        setCallStatus("connected");
        callStatusRef.current = "connected";
      }
    });

    socket.on("call_rejected", () => {
      if (callStatusRef.current === "calling") {
        addCallLog({
          type: callTypeRef.current,
          direction: "outgoing",
          status: "declined",
          partner: partnerName,
          timestamp: new Date().toISOString(),
        });
        cleanupCall();
        setCallStatus("idle");
        callStatusRef.current = "idle";
      }
    });

    socket.on("offer", async (data) => {
      if (callStatusRef.current === "ringing" && localStreamRef.current) {
        callStartTimeRef.current = Date.now();
        const stream = localStreamRef.current;
        const pc = createPeerConnection(
          stream,
          (remote) => { remoteStreamRef.current = remote; setRemoteStream(remote); startCallRecording(); },
          (candidate) => getSocket().emit("ice_candidate", { candidate }),
          remoteAudioRef
        );
        pcRef.current = pc;
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        getSocket().emit("answer", { answer: pc.localDescription });
        for (const c of pendingCandidatesRef.current) {
          await pc.addIceCandidate(c);
        }
        pendingCandidatesRef.current = [];
        setCallStatus("connected");
        callStatusRef.current = "connected";
      }
    });

    socket.on("answer", async (data) => {
      if (pcRef.current && !pcRef.current.remoteDescription) {
        try {
          await pcRef.current.setRemoteDescription(data.answer);
          for (const c of pendingCandidatesRef.current) {
            await pcRef.current.addIceCandidate(c);
          }
          pendingCandidatesRef.current = [];
        } catch (err) {
          console.error("Error setting remote description:", err);
        }
      }
    });

    socket.on("ice_candidate", async (data) => {
      if (pcRef.current) {
        try {
          if (pcRef.current.remoteDescription) {
            await pcRef.current.addIceCandidate(data.candidate);
          } else {
            pendingCandidatesRef.current.push(data.candidate);
          }
        } catch (err) {
          console.error("Error adding ICE candidate:", err);
        }
      }
    });

    socket.on("call_ended", async () => {
      if (callStatusRef.current === "idle") return;
      const duration = callStartTimeRef.current
        ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
        : 0;
      const blob = await stopCallRecording();
      const recordingUrl = await uploadRecording(blob);
      addCallLog({
        type: callTypeRef.current,
        direction: callStatusRef.current === "calling" ? "outgoing" : "incoming",
        status: duration > 0 ? "ended" : "missed",
        duration,
        recordingUrl,
        partner: partnerName,
        timestamp: new Date().toISOString(),
      });
      cleanupCall();
      setCallStatus("ended");
      callStatusRef.current = "ended";
      setTimeout(() => {
        setCallStatus("idle");
        callStatusRef.current = "idle";
        callStartTimeRef.current = null;
      }, 2000);
    });

    return () => {
      socket.off("user_typing");
      socket.off("user_stop_typing");
      socket.off("message_error");
      socket.off("partner_info");
      socket.off("missed_call");
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("call_rejected");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice_candidate");
      socket.off("call_ended");
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

  function cleanupCall() {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setIsMuted(false);
    pendingCandidatesRef.current = [];
  }

  async function startCall(type) {
    if (callStatusRef.current !== "idle") return;
    try {
      callTypeRef.current = type;
      setCallType(type);
      const stream = await getMedia(type === "video");
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallStatus("calling");
      callStatusRef.current = "calling";
      getSocket().emit("call_user", { caller: username, type });
    } catch (err) {
      console.error("Media error:", err);
      alert("Could not access camera/microphone. Please check permissions.");
    }
  }

  async function acceptCall() {
    if (callStatusRef.current !== "ringing") return;
    try {
      const stream = await getMedia(callTypeRef.current === "video");
      localStreamRef.current = stream;
      setLocalStream(stream);
      getSocket().emit("call_accepted", { callee: username });
    } catch (err) {
      console.error("Media error:", err);
      alert("Could not access camera/microphone. Please check permissions.");
      getSocket().emit("call_rejected", { callee: username });
      cleanupCall();
      setCallStatus("idle");
      callStatusRef.current = "idle";
    }
  }

  function rejectCall() {
    if (callStatusRef.current !== "ringing") return;
    addCallLog({
      type: callTypeRef.current,
      direction: "incoming",
      status: "declined",
      partner: partnerName,
      timestamp: new Date().toISOString(),
    });
    getSocket().emit("call_rejected", { callee: username });
    cleanupCall();
    setCallStatus("idle");
    callStatusRef.current = "idle";
  }

  async function endCall() {
    const duration = callStartTimeRef.current
      ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
      : 0;
    getSocket().emit("call_ended");
    const blob = await stopCallRecording();
    const recordingUrl = await uploadRecording(blob);
    addCallLog({
      type: callTypeRef.current,
      direction: callStatusRef.current === "calling" ? "outgoing" : "incoming",
      status: "ended",
      duration,
      recordingUrl,
      partner: partnerName,
      timestamp: new Date().toISOString(),
    });
    cleanupCall();
    setCallStatus("ended");
    callStatusRef.current = "ended";
    setTimeout(() => {
      setCallStatus("idle");
      callStatusRef.current = "idle";
      callStartTimeRef.current = null;
    }, 2000);
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }

  function handleSendMessage(text) {
    const socket = getSocket();
    if (socket && text.trim()) {
      socket.emit("send_message", { text: text.trim() });
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
            onClick={() => startCall("audio")}
            title="Audio call"
            disabled={!partnerName || callStatus !== "idle"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
          <button
            className="header-call-button header-call-video"
            onClick={() => startCall("video")}
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
        {showRecorder ? (
          <AudioRecorder
            onSend={(audioUrl) => {
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
            onAttachImage={() => document.getElementById("imageInput").click()}
            onAttachDocument={() => document.getElementById("docInput").click()}
            onRecordAudio={() => setShowRecorder(true)}
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

      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />

      {callStatus !== "idle" && (
        <CallOverlay
          status={callStatus}
          callType={callType}
          username={username}
          partnerName={partnerName}
          partnerDisplayName={partnerDisplayName}
          partnerNickname={partnerNickname}
          localStream={localStream}
          remoteStream={remoteStream}
          onAccept={acceptCall}
          onReject={rejectCall}
          onEnd={endCall}
          onToggleMute={toggleMute}
          isMuted={isMuted}
        />
      )}

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
