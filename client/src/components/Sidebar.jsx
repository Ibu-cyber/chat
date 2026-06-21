import { useState, useRef, useEffect } from "react";
import ThemeToggle from "./ThemeToggle";

function Sidebar({ username, displayName, partnerName, partnerDisplayName, partnerNickname, partnerStatus, partnerOnline, selectedContact, onSelectContact, onLogout, profilePhoto, partnerPhoto, onOpenProfile, onPartnerNicknameChange, onOpenChat, onMessagesRestored }) {
  const [restoring, setRestoring] = useState(false);
  const restoreInputRef = useRef(null);
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

  async function handleLoadBackup(e) {
    const file = e.target.files[0];
    if (!file) return;
    setRestoring(true);
    try {
      const formData = new FormData();
      formData.append("backup", file);
      const res = await fetch("/api/restore", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        alert(`Restored ${data.count} messages from backup. Reloading...`);
        if (onMessagesRestored) onMessagesRestored();
      } else {
        alert("Restore failed: " + (data.error || "Unknown error"));
      }
    } catch {
      alert("Restore failed. Is the server running?");
    } finally {
      setRestoring(false);
      e.target.value = "";
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
                if (onOpenChat) onOpenChat();
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

      <div className="sidebar-footer">
        <button className="sidebar-backup-btn" onClick={() => window.location.href = "/api/backup"}>
          Download Backup
        </button>
        <button
          className="sidebar-backup-btn"
          onClick={() => restoreInputRef.current?.click()}
          disabled={restoring}
        >
          {restoring ? "Restoring..." : "Load Backup"}
        </button>
        <input
          ref={restoreInputRef}
          type="file"
          accept=".zip"
          hidden
          onChange={handleLoadBackup}
        />
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
