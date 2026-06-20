import { useState, useEffect, useCallback } from "react";
import { getSocket, connectToServer } from "./socket";
import { ThemeProvider } from "./context/ThemeContext";
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";
import ChatPage from "./pages/ChatPage";
import CallHistory from "./components/CallHistory";
import ProfileModal from "./components/ProfileModal";
import MediaGallery from "./components/MediaGallery";
import "./styles/App.css";

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

    socket.on("presence_update", handlePresence);
    socket.on("partner_info", handlePartnerInfoData);
    socket.on("partner_profile_update", handlePartnerProfileUpdate);
    socket.on("partner_display_name_update", handlePartnerDisplayNameUpdate);
    socket.on("partner_bg_update", handlePartnerBgUpdate);
    socket.emit("get_partner_info");
    return () => {
      socket.off("presence_update", handlePresence);
      socket.off("partner_info", handlePartnerInfoData);
      socket.off("partner_profile_update", handlePartnerProfileUpdate);
      socket.off("partner_display_name_update", handlePartnerDisplayNameUpdate);
      socket.off("partner_bg_update", handlePartnerBgUpdate);
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
