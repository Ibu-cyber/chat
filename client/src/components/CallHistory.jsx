import { useState, useEffect } from "react";

function CallHistory({ username, partnerName, partnerNickname, onMobileBack, profilePhoto }) {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem("heartchat_call_logs") || "[]");
      setLogs(data);
    } catch {}
  }, []);

  function formatDuration(seconds) {
    if (seconds === null || seconds === undefined || seconds === 0) return "";
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

  function downloadCSV() {
    const headers = ["Date", "Time", "Type", "Direction", "Status", "Duration (s)", "Partner"];
    const rows = logs.map((log) => {
      const d = new Date(log.timestamp);
      const date = d.toLocaleDateString();
      const time = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return [
        date,
        time,
        log.type || "audio",
        log.direction || "unknown",
        log.status || "unknown",
        log.duration || 0,
        log.partner || "Unknown",
      ];
    });

    let csv = headers.join(",") + "\n";
    for (const row of rows) {
      csv += row.map((v) => `"${v}"`).join(",") + "\n";
    }

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;encoding:utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heartchat_call_history_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function downloadJSON() {
    const blob = new Blob([JSON.stringify(logs, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `heartchat_call_history_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="call-history-panel">
      <div className="call-history-header">
        {onMobileBack && (
          <button className="mobile-back-button" onClick={onMobileBack} title="Back">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
        )}
        <h2>Call History</h2>
        {logs.length > 0 && (
          <div className="call-history-actions">
            <button className="call-download-btn" onClick={downloadCSV} title="Download as CSV">CSV</button>
            <button className="call-download-btn" onClick={downloadJSON} title="Download as JSON">JSON</button>
          </div>
        )}
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
              <div className="call-log-right">
                <span className="call-log-time">{formatDate(log.timestamp)}</span>
                {log.recordingUrl && (
                  <a href={log.recordingUrl} className="call-log-download" download title="Download recording">⬇</a>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default CallHistory;
