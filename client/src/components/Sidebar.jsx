import { useState, useRef, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";

function Sidebar({ username, displayName, partnerName, partnerDisplayName, partnerNickname, partnerStatus, partnerOnline, selectedContact, onSelectContact, onLogout, activeTab, onTabChange, profilePhoto, partnerPhoto, onOpenProfile, onPartnerNicknameChange, missedCallCount, onClearMissedCalls }) {
  const [editingNickname, setEditingNickname] = useState(false);
  const [nicknameInput, setNicknameInput] = useState(partnerNickname || "");
  const inputRef = useRef(null);

  useEffect(() => {
    if (editingNickname) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editingNickname]);

  function handleSave() {
    onPartnerNicknameChange(nicknameInput);
    setEditingNickname(false);
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") {
      setNicknameInput(partnerNickname || "");
      setEditingNickname(false);
    }
  }

  function getInitial(name) {
    return name ? name.charAt(0).toUpperCase() : "?";
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-user-avatar" onClick={onOpenProfile} title="Profile settings">
          {profilePhoto ? <img src={profilePhoto} alt="" className="avatar-img" /> : getInitial(displayName || username)}
        </div>
        <h1 className="sidebar-brand">HeartChat 💌</h1>
      </div>

      <div className="sidebar-contacts">
        <div className="sidebar-section-label">Chats</div>

        {partnerName ? (
          <div
            className={`sidebar-contact ${selectedContact === partnerName ? "contact-active" : ""}`}
            onClick={() => {
              if (!editingNickname) {
                onSelectContact(partnerName);
                onTabChange("chat");
              }
            }}
          >
            <div className="contact-avatar" onClick={(e) => { e.stopPropagation(); setEditingNickname(true); }} title="Set nickname">
              {partnerPhoto ? <img src={partnerPhoto} alt="" className="avatar-img" /> : getInitial(partnerNickname || partnerDisplayName || partnerName)}
            </div>
            <div className="contact-info">
              {editingNickname ? (
                <div className="contact-nickname-edit" onClick={(e) => e.stopPropagation()}>
                  <input
                    ref={inputRef}
                    type="text"
                    className="nickname-input"
                    value={nicknameInput}
                    onChange={(e) => setNicknameInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={partnerDisplayName || partnerName}
                    maxLength={30}
                  />
                  <button className="nickname-save-btn" onClick={handleSave}>✓</button>
                </div>
              ) : (
                <span className="contact-name">{partnerNickname || partnerDisplayName || partnerName}</span>
              )}
              <span className={`contact-status ${partnerOnline ? "status-online" : "status-offline"}`}>{partnerStatus}</span>
            </div>
          </div>
        ) : (
          <div className="sidebar-loading">Connecting...</div>
        )}
      </div>

      <div className="sidebar-nav">
        <button
          className={`sidebar-nav-button ${activeTab === "chat" ? "nav-active" : ""}`}
          onClick={() => onTabChange("chat")}
        >
          Chat
        </button>
        <button
          className={`sidebar-nav-button ${activeTab === "calls" ? "nav-active" : ""}`}
          onClick={() => { onTabChange("calls"); if (onClearMissedCalls) onClearMissedCalls(); }}
        >
          Calls
          {missedCallCount > 0 && <span className="missed-call-badge">{missedCallCount}</span>}
        </button>
        <button
          className={`sidebar-nav-button ${activeTab === "media" ? "nav-active" : ""}`}
          onClick={() => onTabChange("media")}
        >
          Media
        </button>
      </div>

      <div className="sidebar-footer">
        <div className="sidebar-footer-row">
          <ThemeToggle />
          <button className="sidebar-logout" onClick={onLogout}>
            Leave chat
          </button>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
