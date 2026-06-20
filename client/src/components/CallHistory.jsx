import { useState, useEffect } from "react";

function CallHistory({ username, partnerName }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("heartchat_call_logs") || "[]");
      setLogs(data);
    } catch {}
  }, []);

  function formatDuration(seconds) {
    if (!seconds || seconds === 0) return "";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function formatDate(iso) {
    const d = new Date(iso);
    const now = new Date();
    const sameDay =
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();

    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday =
      d.getFullYear() === yesterday.getFullYear() &&
      d.getMonth() === yesterday.getMonth() &&
      d.getDate() === yesterday.getDate();

    const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    if (sameDay) return `Today at ${time}`;
    if (isYesterday) return `Yesterday at ${time}`;
    return `${d.toLocaleDateString()} at ${time}`;
  }

  function getCallIcon(type, direction) {
    if (type === "video") return direction === "outgoing" ? "📷" : "📷";
    return direction === "outgoing" ? "📞" : "📞";
  }

  function getStatusClass(status) {
    if (status === "ended") return "call-log-answered";
    if (status === "missed") return "call-log-missed";
    return "call-log-declined";
  }

  return (
    <div className="call-history-panel">
      <div className="call-history-header">
        <h2>Call History</h2>
      </div>

      <div className="call-history-list">
        {logs.length === 0 ? (
          <div className="call-history-empty">
            <div className="call-history-empty-icon">📞</div>
            <p>No call history yet</p>
          </div>
        ) : (
          logs.map((log) => (
            <div key={log.id} className={`call-log-item ${getStatusClass(log.status)}`}>
              <div className="call-log-avatar">
                {log.partner ? log.partner.charAt(0).toUpperCase() : "?"}
              </div>
              <div className="call-log-info">
                <span className="call-log-name">{log.partner || "Unknown"}</span>
                <span className="call-log-meta">
                  {getCallIcon(log.type, log.direction)}{" "}
                  {log.direction === "outgoing" ? "Outgoing" : "Incoming"}{" "}
                  {log.type === "video" ? "Video" : "Audio"} call
                  {log.status === "missed" && " — Missed"}
                  {log.status === "declined" && " — Declined"}
                  {log.status === "ended" && log.duration > 0 && ` — ${formatDuration(log.duration)}`}
                </span>
              </div>
              <span className="call-log-time">{formatDate(log.timestamp)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CallHistory;
