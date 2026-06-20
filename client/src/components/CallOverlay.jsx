import { useRef, useEffect } from "react";

function CallOverlay({
  status,
  callType,
  username,
  partnerName,
  localStream,
  remoteStream,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  isMuted,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  function setVideoElement(ref, stream) {
    const el = ref.current;
    if (!el || !stream) return;
    el.srcObject = stream;
    el.play().catch(() => {});
  }

  useEffect(() => {
    setVideoElement(localVideoRef, localStream);
  }, [localStream, status]);

  useEffect(() => {
    setVideoElement(remoteVideoRef, remoteStream);
  }, [remoteStream, status]);

  if (status === "ended") {
    return (
      <div className="call-overlay call-ended">
        <div className="call-ended-content">
          <div className="call-ended-icon">📞</div>
          <p className="call-ended-text">Call ended</p>
        </div>
      </div>
    );
  }

  if (status === "calling") {
    return (
      <div className="call-overlay">
        <div className="call-content">
          <div className="call-avatar-large">{partnerName?.charAt(0).toUpperCase() || "?"}</div>
          <p className="call-partner-name">{partnerName}</p>
          <p className="call-status-text">
            {callType === "video" ? "Video calling" : "Calling"}...
          </p>
          <div className="call-status-ringing">
            <span className="ringing-dot"></span>
            <span className="ringing-dot"></span>
            <span className="ringing-dot"></span>
          </div>
          <button className="call-end-button" onClick={onEnd}>
            End
          </button>
        </div>
      </div>
    );
  }

  if (status === "ringing") {
    return (
      <div className="call-overlay">
        <div className="call-content">
          <div className="call-avatar-large">{partnerName?.charAt(0).toUpperCase() || "?"}</div>
          <p className="call-partner-name">{partnerName}</p>
          <p className="call-status-text">
            {callType === "video" ? "Video call" : "Audio call"} incoming
          </p>
          <div className="call-incoming-actions">
            <button className="call-accept-button" onClick={onAccept}>
              {callType === "video" ? "📷" : "📞"} Accept
            </button>
            <button className="call-reject-button" onClick={onReject}>
              Decline
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div className="call-overlay call-active">
        {callType === "video" ? (
          <>
            <video ref={remoteVideoRef} className="call-remote-video" autoPlay playsInline />
            <video ref={localVideoRef} className="call-local-video" autoPlay playsInline muted />
          </>
        ) : (
          <div className="call-audio-bg">
            <div className="call-avatar-large">{partnerName?.charAt(0).toUpperCase() || "?"}</div>
            <p className="call-partner-name">{partnerName}</p>
            <p className="call-status-text">Audio call</p>
          </div>
        )}
        <div className="call-controls">
          <button
            className={`call-control-button ${isMuted ? "control-active" : ""}`}
            onClick={onToggleMute}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? "🔇" : "🎤"}
          </button>
          <button className="call-control-button call-end-button" onClick={onEnd} title="End call">
            End
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default CallOverlay;
