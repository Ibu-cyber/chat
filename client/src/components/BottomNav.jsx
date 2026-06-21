function BottomNav({ activeTab, onTabChange, missedCallCount, onClearMissedCalls }) {
  return (
    <nav className="bottom-nav">
      <button
        className={`bottom-nav-btn ${activeTab === "chat" ? "bottom-nav-active" : ""}`}
        onClick={() => onTabChange("chat")}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
        <span>Chat</span>
      </button>
      <button
        className={`bottom-nav-btn ${activeTab === "calls" ? "bottom-nav-active" : ""}`}
        onClick={() => { onTabChange("calls"); if (onClearMissedCalls) onClearMissedCalls(); }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
        </svg>
        <span>Calls</span>
        {missedCallCount > 0 && <span className="missed-call-badge">{missedCallCount}</span>}
      </button>
      <button
        className={`bottom-nav-btn ${activeTab === "media" ? "bottom-nav-active" : ""}`}
        onClick={() => onTabChange("media")}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
        </svg>
        <span>Media</span>
      </button>
    </nav>
  );
}

export default BottomNav;
