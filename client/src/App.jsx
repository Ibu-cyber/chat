import { useState, useEffect, useCallback } from "react";
import { getSocket } from "./socket";
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";
import ChatPage from "./pages/ChatPage";
import CallHistory from "./components/CallHistory";
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

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [partnerName, setPartnerName] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState(null);
  const [allPresence, setAllPresence] = useState({});
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handlePresence(data) {
      setAllPresence((prev) => ({ ...prev, [data.username]: data }));
    }

    socket.on("presence_update", handlePresence);
    socket.emit("get_partner_info");
    return () => socket.off("presence_update", handlePresence);
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

  function handleLoginSuccess(username) {
    setCurrentUser(username);
  }

  function handleLogout() {
    setCurrentUser(null);
    setPartnerName(null);
    setSelectedContact(null);
    setActiveTab("chat");
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

  return (
    <div className="app-container">
      {currentUser === null ? (
        <LoginScreen onLoginSuccess={handleLoginSuccess} />
      ) : (
        <div className="chat-layout">
          <Sidebar
            username={currentUser}
            partnerName={partnerName}
            partnerStatus={getStatusText()}
            partnerOnline={partnerOnline}
            selectedContact={selectedContact}
            onSelectContact={setSelectedContact}
            onLogout={handleLogout}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          {activeTab === "chat" ? (
            <ChatPage
              username={currentUser}
              partnerName={partnerName}
              partnerStatus={getStatusText()}
              partnerOnline={partnerOnline}
              selectedContact={selectedContact}
              onPartnerInfo={handlePartnerInfo}
              messages={messages}
            />
          ) : (
            <CallHistory username={currentUser} partnerName={partnerName} />
          )}
        </div>
      )}
    </div>
  );
}

export default App;
