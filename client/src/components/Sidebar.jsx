function Sidebar({ username, partnerName, partnerStatus, partnerOnline, selectedContact, onSelectContact, onLogout, activeTab, onTabChange }) {
  function getInitial(name) {
    return name ? name.charAt(0).toUpperCase() : "?";
  }

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-user-avatar">{getInitial(username)}</div>
        <h1 className="sidebar-brand">HeartChat 💌</h1>
      </div>

      <div className="sidebar-contacts">
        <div className="sidebar-section-label">Chats</div>

        {partnerName ? (
          <div
            className={`sidebar-contact ${selectedContact === partnerName ? "contact-active" : ""}`}
            onClick={() => {
              onSelectContact(partnerName);
              onTabChange("chat");
            }}
          >
            <div className="contact-avatar">{getInitial(partnerName)}</div>
            <div className="contact-info">
              <span className="contact-name">{partnerName}</span>
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
          onClick={() => onTabChange("calls")}
        >
          Calls
        </button>
      </div>

      <div className="sidebar-footer">
        <button className="sidebar-logout" onClick={onLogout}>
          Leave chat
        </button>
      </div>
    </div>
  );
}

export default Sidebar;
