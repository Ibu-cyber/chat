import { useState, useEffect, useCallback, useRef } from "react";
import { getSocket, connectToServer } from "./socket";
import { ThemeProvider } from "./context/ThemeContext";
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";
import ChatPage from "./pages/ChatPage";
import CallHistory from "./components/CallHistory";
import CallOverlay from "./components/CallOverlay";
import ProfileModal from "./components/ProfileModal";
import MediaGallery from "./components/MediaGallery";
import "./styles/App.css";

const PC_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
  ],
};

function formatLastSeen(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return `last seen today at ${time}`;
  if (isYesterday) return `last seen yesterday at ${time}`;
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `last seen on ${month}/${day} at ${time}`;
}

function getSavedSession() {
  try {
    return JSON.parse(localStorage.getItem("heartchat_session") || "null");
  } catch {
    return null;
  }
}

function App() {
  const savedSession = getSavedSession();
  const [currentUser, setCurrentUser] = useState(savedSession?.username || null);
  const [isReconnecting, setIsReconnecting] = useState(!!savedSession);
  const [partnerName, setPartnerName] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState(null);
  const [allPresence, setAllPresence] = useState({});
  const [messages, setMessages] = useState([]);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [chatBackground, setChatBackground] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [partnerPhoto, setPartnerPhoto] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [partnerDisplayName, setPartnerDisplayName] = useState(null);
  const [partnerNickname, setPartnerNickname] = useState(null);

  // ---- Call state ----
  const [callStatus, setCallStatus] = useState("idle");
  const [callType, setCallType] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [missedCallCount, setMissedCallCount] = useState(0);

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

  // Auto-reconnect from saved session on mount
  useEffect(() => {
    if (!savedSession || !savedSession.username || !savedSession.password) return;
    const socket = connectToServer(savedSession.username, savedSession.password);
    socket.on("connect", () => {
      setIsReconnecting(false);
    });
    socket.on("connect_error", () => {
      localStorage.removeItem("heartchat_session");
      setCurrentUser(null);
      setIsReconnecting(false);
    });
  }, []);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    try {
      const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
      setProfilePhoto(saved.photo || null);
      setChatBackground(saved.bg || null);
      setDisplayName(saved.displayName || null);
      setPartnerNickname(saved.partnerNickname || null);
    } catch {
      setProfilePhoto(null);
      setChatBackground(null);
      setDisplayName(null);
      setPartnerNickname(null);
    }
  }, [currentUser]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handlePresence(data) {
      setAllPresence((prev) => ({ ...prev, [data.username]: data }));
    }

    function handlePartnerInfoData(data) {
      handlePartnerInfo(data.partnerName, data.partnerOnline, data.partnerLastSeen);
      if (data.partnerPhoto) setPartnerPhoto(data.partnerPhoto);
      if (data.sharedBg) setChatBackground(data.sharedBg);
      if (data.partnerDisplayName) setPartnerDisplayName(data.partnerDisplayName);
    }

    function handlePartnerProfileUpdate(data) {
      setPartnerPhoto(data.photoUrl);
    }

    function handlePartnerDisplayNameUpdate(data) {
      setPartnerDisplayName(data.displayName);
    }

    function handlePartnerBgUpdate(data) {
      setChatBackground(data.bgUrl);
      try {
        const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
        saved.bg = data.bgUrl;
        localStorage.setItem("profile_" + currentUser, JSON.stringify(saved));
      } catch {}
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    socket.emit("request_missed_calls");

    socket.on("presence_update", handlePresence);
    socket.on("partner_info", handlePartnerInfoData);
    socket.on("partner_profile_update", handlePartnerProfileUpdate);
    socket.on("partner_display_name_update", handlePartnerDisplayNameUpdate);
    socket.on("partner_bg_update", handlePartnerBgUpdate);

    // ---- Call signaling ----
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
          (candidate) => getSocket().emit("ice_candidate", { candidate })
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
        addCallLog({ type: callTypeRef.current, direction: "outgoing", status: "declined", partner: partnerName, timestamp: new Date().toISOString() });
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
          (candidate) => getSocket().emit("ice_candidate", { candidate })
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
      if (duration === 0) setMissedCallCount((c) => c + 1);
      cleanupCall();
      setCallStatus("ended");
      callStatusRef.current = "ended";
      setTimeout(() => { setCallStatus("idle"); callStatusRef.current = "idle"; callStartTimeRef.current = null; }, 2000);
    });

    socket.on("missed_calls_list", (calls) => {
      for (const call of calls) {
        addCallLog({ type: call.type, direction: "incoming", status: "missed", partner: partnerName, timestamp: call.timestamp, duration: 0 });
      }
      if (calls.length > 0) {
        setMissedCallCount((c) => c + calls.length);
        const name = partnerNickname || partnerDisplayName || partnerName;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`Missed call from ${name}`, { body: `You missed ${calls.length} call(s) while away.` });
        }
      }
    });

    socket.emit("get_partner_info");
    return () => {
      socket.off("presence_update", handlePresence);
      socket.off("partner_info", handlePartnerInfoData);
      socket.off("partner_profile_update", handlePartnerProfileUpdate);
      socket.off("partner_display_name_update", handlePartnerDisplayNameUpdate);
      socket.off("partner_bg_update", handlePartnerBgUpdate);
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("call_rejected");
      socket.off("offer");
      socket.off("answer");
      socket.off("ice_candidate");
      socket.off("call_ended");
      socket.off("missed_calls_list");
    };
  }, [currentUser]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("load_messages", (loadedMessages) => {
      setMessages(loadedMessages);
    });

    socket.on("new_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("message_status_update", (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, status: data.status } : m
        )
      );
    });

    // Request message history AFTER listener is registered
    // (avoids race condition where server sends messages before client is listening)
    socket.emit("request_messages");

    return () => {
      socket.off("load_messages");
      socket.off("new_message");
      socket.off("message_status_update");
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();
    if (!socket) return;
    const unread = messages.filter(
      (m) => m.sender !== currentUser && m.status === "delivered"
    );
    for (const m of unread) {
      socket.emit("message_read", { messageId: m._id });
    }
  }, [messages, currentUser]);

  useEffect(() => {
    if (!partnerName) return;
    const p = allPresence[partnerName];
    if (p) {
      setPartnerOnline(p.online);
      if (p.online) {
        setPartnerLastSeen(null);
      } else {
        setPartnerLastSeen(p.lastSeen || null);
      }
    }
  }, [partnerName, allPresence]);

  function addCallLog(entry) {
    try {
      const logs = JSON.parse(localStorage.getItem("heartchat_call_logs") || "[]");
      logs.unshift({ ...entry, id: Date.now() });
      if (logs.length > 100) logs.length = 100;
      localStorage.setItem("heartchat_call_logs", JSON.stringify(logs));
    } catch {}
  }

  function loadMissedCallCount() {
    try {
      const logs = JSON.parse(localStorage.getItem("heartchat_call_logs") || "[]");
      return logs.filter((l) => l.status === "missed").length;
    } catch { return 0; }
  }

  function startCallRecording() {
    if (mediaRecorderRef.current) return;
    const tracks = [];
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getAudioTracks()) tracks.push(t);
    }
    if (remoteStreamRef.current) {
      for (const t of remoteStreamRef.current.getAudioTracks()) tracks.push(t);
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
      if (res.ok) { const data = await res.json(); return data.url; }
    } catch {}
    return null;
  }

  function createPeerConnection(stream, onRemoteStream, onIceCandidate) {
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
          if (remoteAudioRef.current) {
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

  async function getMedia(video) {
    return navigator.mediaDevices.getUserMedia({ audio: true, video });
  }

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
    if (callStatusRef.current !== "idle" || !partnerName) return;
    try {
      callTypeRef.current = type;
      setCallType(type);
      const stream = await getMedia(type === "video");
      localStreamRef.current = stream;
      setLocalStream(stream);
      setCallStatus("calling");
      callStatusRef.current = "calling";
      getSocket().emit("call_user", { caller: currentUser, type });
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
      getSocket().emit("call_accepted", { callee: currentUser });
    } catch (err) {
      console.error("Media error:", err);
      alert("Could not access camera/microphone. Please check permissions.");
      getSocket().emit("call_rejected", { callee: currentUser });
      cleanupCall();
      setCallStatus("idle");
      callStatusRef.current = "idle";
    }
  }

  function rejectCall() {
    if (callStatusRef.current !== "ringing") return;
    addCallLog({ type: callTypeRef.current, direction: "incoming", status: "declined", partner: partnerName, timestamp: new Date().toISOString() });
    getSocket().emit("call_rejected", { callee: currentUser });
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
    addCallLog({ type: callTypeRef.current, direction: callStatusRef.current === "calling" ? "outgoing" : "incoming", status: "ended", duration, recordingUrl, partner: partnerName, timestamp: new Date().toISOString() });
    cleanupCall();
    setCallStatus("ended");
    callStatusRef.current = "ended";
    setTimeout(() => { setCallStatus("idle"); callStatusRef.current = "idle"; callStartTimeRef.current = null; }, 2000);
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

  function handleProfilePhotoChange(url) {
    setProfilePhoto(url);
    try {
      const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
      saved.photo = url;
      localStorage.setItem("profile_" + currentUser, JSON.stringify(saved));
    } catch {}
    const socket = getSocket();
    if (socket) socket.emit("profile_update", { photoUrl: url });
  }

  function handleChatBackgroundChange(url) {
    setChatBackground(url);
    try {
      const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
      saved.bg = url;
      localStorage.setItem("profile_" + currentUser, JSON.stringify(saved));
    } catch {}
    const socket = getSocket();
    if (socket) socket.emit("bg_update", { bgUrl: url });
  }

  function handleDisplayNameChange(name) {
    const newName = name.trim() || null;
    setDisplayName(newName);
    try {
      const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
      saved.displayName = newName;
      localStorage.setItem("profile_" + currentUser, JSON.stringify(saved));
    } catch {}
    const socket = getSocket();
    if (socket) socket.emit("display_name_update", { displayName: newName });
  }

  function handlePartnerNicknameChange(name) {
    const newName = name.trim() || null;
    setPartnerNickname(newName);
    try {
      const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
      saved.partnerNickname = newName;
      localStorage.setItem("profile_" + currentUser, JSON.stringify(saved));
    } catch {}
  }

  function handleLoginSuccess(username) {
    setCurrentUser(username);
  }

  function handleLogout() {
    setCurrentUser(null);
    setPartnerName(null);
    setSelectedContact(null);
    setActiveTab("chat");
    setShowMobileChat(false);
    localStorage.removeItem("heartchat_session");
  }

  function handleMobileSelectContact(contact) {
    setSelectedContact(contact);
    setShowMobileChat(true);
  }

  function handleMobileBack() {
    setShowMobileChat(false);
    setActiveTab("chat");
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    if (isMobile) setShowMobileChat(true);
  }

  const handlePartnerInfo = useCallback((name, online, lastSeen) => {
    setPartnerName(name);
    setPartnerOnline(!!online);
    if (!online && lastSeen) {
      setPartnerLastSeen(lastSeen);
    } else {
      setPartnerLastSeen(null);
    }
    setSelectedContact((prev) => prev || name);
  }, []);

  function getStatusText() {
    if (partnerOnline) return "online";
    if (partnerLastSeen) return formatLastSeen(partnerLastSeen);
    return "offline";
  }

  function renderDesktop() {
    return (
      <>
        <Sidebar
          username={currentUser}
          displayName={displayName}
          partnerName={partnerName}
          partnerDisplayName={partnerDisplayName}
          partnerNickname={partnerNickname}
          partnerStatus={getStatusText()}
          partnerOnline={partnerOnline}
          selectedContact={selectedContact}
          onSelectContact={setSelectedContact}
          onLogout={handleLogout}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          profilePhoto={profilePhoto}
          partnerPhoto={partnerPhoto}
          onOpenProfile={() => setShowProfile(true)}
          onPartnerNicknameChange={handlePartnerNicknameChange}
          missedCallCount={missedCallCount}
          onClearMissedCalls={() => setMissedCallCount(0)}
        />
        {activeTab === "chat" ? (
          <ChatPage
            username={currentUser}
            displayName={displayName}
            partnerName={partnerName}
            partnerDisplayName={partnerDisplayName}
            partnerNickname={partnerNickname}
            partnerStatus={getStatusText()}
            partnerOnline={partnerOnline}
            selectedContact={selectedContact}
            onPartnerInfo={handlePartnerInfo}
            messages={messages}
            profilePhoto={profilePhoto}
            partnerPhoto={partnerPhoto}
            chatBackground={chatBackground}
            callStatus={callStatus}
            onStartCall={startCall}
          />
        ) : activeTab === "media" ? (
          <MediaGallery messages={messages} partnerName={partnerName} partnerDisplayName={partnerDisplayName} partnerNickname={partnerNickname} />
        ) : (
          <CallHistory username={currentUser} partnerName={partnerName} partnerNickname={partnerNickname} profilePhoto={profilePhoto} />
        )}
      </>
    );
  }

  function renderMobile() {
    if (showMobileChat) {
      return activeTab === "chat" ? (
          <ChatPage
            username={currentUser}
            displayName={displayName}
            partnerName={partnerName}
            partnerDisplayName={partnerDisplayName}
            partnerNickname={partnerNickname}
            partnerStatus={getStatusText()}
            partnerOnline={partnerOnline}
            selectedContact={selectedContact}
            onPartnerInfo={handlePartnerInfo}
            messages={messages}
            onMobileBack={handleMobileBack}
            profilePhoto={profilePhoto}
            partnerPhoto={partnerPhoto}
            chatBackground={chatBackground}
            callStatus={callStatus}
            onStartCall={startCall}
          />
      ) : activeTab === "media" ? (
        <MediaGallery messages={messages} partnerName={partnerName} partnerDisplayName={partnerDisplayName} partnerNickname={partnerNickname} />
      ) : (
        <CallHistory username={currentUser} partnerName={partnerName} partnerNickname={partnerNickname} onMobileBack={handleMobileBack} profilePhoto={profilePhoto} />
      );
    }
    return (
      <Sidebar
        username={currentUser}
        displayName={displayName}
        partnerName={partnerName}
        partnerDisplayName={partnerDisplayName}
        partnerNickname={partnerNickname}
        partnerStatus={getStatusText()}
        partnerOnline={partnerOnline}
        selectedContact={selectedContact}
        onSelectContact={handleMobileSelectContact}
        onLogout={handleLogout}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        profilePhoto={profilePhoto}
        partnerPhoto={partnerPhoto}
        onOpenProfile={() => setShowProfile(true)}
        onPartnerNicknameChange={handlePartnerNicknameChange}
        missedCallCount={missedCallCount}
        onClearMissedCalls={() => setMissedCallCount(0)}
      />
    );
  }

  return (
    <ThemeProvider>
      <div className="app-container">
        {isReconnecting ? (
          <div className="login-screen">
            <div className="login-card" style={{ textAlign: "center", padding: "50px 35px" }}>
              <div style={{ fontSize: "48px", marginBottom: "20px", animation: "heartBeat 1.5s ease-in-out infinite" }}>💕</div>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: "22px", color: "var(--accent)", marginBottom: "10px" }}>Reconnecting...</h2>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>Just a moment, getting you back in</p>
            </div>
          </div>
        ) : currentUser === null ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            <div className={`chat-layout ${isMobile ? "chat-layout-mobile" : ""}`}>
              {isMobile ? renderMobile() : renderDesktop()}
            </div>
            <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: "none" }} />
            {callStatus !== "idle" && (
              <CallOverlay
                status={callStatus}
                callType={callType}
                username={currentUser}
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
            {showProfile && (
              <ProfileModal
                username={currentUser}
                profilePhoto={profilePhoto}
                onProfilePhotoChange={handleProfilePhotoChange}
                chatBackground={chatBackground}
                onChatBackgroundChange={handleChatBackgroundChange}
                onClose={() => setShowProfile(false)}
              />
            )}
          </>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
