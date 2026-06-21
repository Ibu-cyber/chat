import { useState, useRef, useEffect } from "react";

function CallOverlay({
  status,
  callType,
  username,
  partnerName,
  partnerDisplayName,
  partnerNickname,
  localStream,
  remoteStream,
  displayName,
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  isMuted,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const ringtoneRef = useRef(null);
  const timerRef = useRef(null);
  const callStartRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [isAccepting, setIsAccepting] = useState(false);

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function setMediaElement(ref, stream, reportBlocked = false) {
    const el = ref.current;
    if (!el) return;
    if (!stream) {
      el.srcObject = null;
      return;
    }
    el.srcObject = stream;
    if (reportBlocked) {
      el.play()
        .then(() => {})
        .catch(() => {});
    } else {
      el.play().catch(() => {});
    }
  }

  useEffect(() => {
    setMediaElement(localVideoRef, localStream);
  }, [localStream, status]);

  useEffect(() => {
    const videoTracks = remoteStream ? remoteStream.getVideoTracks() : [];
    const videoStream = videoTracks.length > 0 ? new MediaStream(videoTracks) : null;
    setMediaElement(remoteVideoRef, videoStream);
  }, [remoteStream, status]);

  useEffect(() => {
    const audioTracks = remoteStream ? remoteStream.getAudioTracks() : [];
    const audioStream = audioTracks.length > 0 ? new MediaStream(audioTracks) : null;
    setMediaElement(remoteAudioRef, audioStream, true);
  }, [remoteStream, status]);

  useEffect(() => {
    if (status === "calling" || status === "ringing") {
      startRingtone();
    } else {
      stopRingtone();
    }
    return () => stopRingtone();
  }, [status]);

  useEffect(() => {
    if (status === "connected") {
      callStartRef.current = Date.now();
      setElapsed(0);
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - callStartRef.current) / 1000));
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      callStartRef.current = null;
      if (status !== "ended") setElapsed(0);
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [status]);

  const partnerLabel = partnerNickname || partnerDisplayName || partnerName;

  function startRingtone() {
    if (ringtoneRef.current) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();

      const gain = ctx.createGain();
      gain.connect(ctx.destination);
      gain.gain.value = 0;

      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = 440;
      osc.connect(gain);
      osc.start();

      let interval = setInterval(() => {
        if (!ringtoneRef.current) { clearInterval(interval); return; }
        const t = ctx.currentTime;
        for (let i = 0; i < 4; i++) {
          const start = t + i * 0.8;
          gain.gain.setValueAtTime(0, start);
          gain.gain.linearRampToValueAtTime(0.3, start + 0.02);
          gain.gain.linearRampToValueAtTime(0, start + 0.4);
        }
      }, 2000);

      ringtoneRef.current = { ctx, osc, gain, interval };
    } catch {}
  }

  function stopRingtone() {
    const r = ringtoneRef.current;
    if (!r) return;
    try {
      clearInterval(r.interval);
      r.osc.stop();
      r.ctx.close();
    } catch {}
    ringtoneRef.current = null;
  }

  async function handleAcceptClick(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (isAccepting) return;
    setIsAccepting(true);
    try {
      await onAccept();
    } finally {
      setTimeout(() => setIsAccepting(false), 1500);
    }
  }

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
      <div className="call-overlay call-active">
        <div className="call-content">
          <div className="call-avatar-large">{partnerLabel?.charAt(0).toUpperCase() || "?"}</div>
          <p className="call-partner-name">{partnerLabel}</p>
          <p className="call-status-text">Calling...</p>
          <div className="call-status-ringing">
            <div className="ringing-dot" />
            <div className="ringing-dot" />
            <div className="ringing-dot" />
          </div>
          <button className="call-end-button" onClick={onEnd}>End call</button>
        </div>
      </div>
    );
  }

  if (status === "ringing") {
    return (
      <div className="call-overlay">
        <div className="call-content">
          <div className="call-avatar-large">{partnerLabel?.charAt(0).toUpperCase() || "?"}</div>
          <p className="call-partner-name">{partnerLabel}</p>
          <p className="call-status-text">
            {callType === "video" ? "Video call" : "Audio call"} incoming
          </p>
          <div className="call-incoming-actions">
            <button
              type="button"
              className="call-accept-button"
              onClick={handleAcceptClick}
              onTouchEnd={handleAcceptClick}
              onPointerUp={handleAcceptClick}
              disabled={isAccepting}
            >
              {isAccepting ? "Opening..." : `${callType === "video" ? "📷" : "📞"} Accept`}
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
    if (callType === "video") {
      return (
        <div className="call-overlay call-active">
          <div className="call-video-stage">
            <div className="call-remote-container">
              <video ref={remoteVideoRef} className="call-remote-video" autoPlay playsInline />
            </div>
            {localStream && (
              <div className="call-local-container">
                <video ref={localVideoRef} className="call-local-video" autoPlay playsInline muted />
                <span className="call-video-label">You</span>
              </div>
            )}
            <div className="call-timer">{formatTime(elapsed)}</div>
          </div>
          <div className="call-controls">
            <button
              className={`call-control-button ${isMuted ? "control-active" : ""}`}
              onClick={onToggleMute}
              title={isMuted ? "Unmute microphone" : "Mute microphone"}
            >
              {isMuted ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
                </svg>
              )}
            </button>
            <button
              className="call-control-button"
              onClick={onEnd}
              title="End call"
              style={{ background: "#e53935" }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </button>
          </div>
          <audio ref={remoteAudioRef} className="call-remote-audio" autoPlay />
        </div>
      );
    }

    return (
      <div className="call-overlay call-active">
        <div className="call-content" style={{ flex: 1, justifyContent: "center" }}>
          <div className="call-timer" style={{ position: "static", transform: "none", background: "none", backdropFilter: "none", padding: "4px 0 8px" }}>{formatTime(elapsed)}</div>
          <div className="call-avatar-large">{partnerLabel?.charAt(0).toUpperCase() || "?"}</div>
          <p className="call-partner-name">{partnerLabel}</p>
        </div>
        <div className="call-controls">
          <button
            className={`call-control-button ${isMuted ? "control-active" : ""}`}
            onClick={onToggleMute}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="1" y1="1" x2="23" y2="23" /><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" /><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" y1="19" x2="12" y2="23" /><line x1="8" y1="23" x2="16" y2="23" />
              </svg>
            )}
          </button>
          <button
            className="call-control-button"
            onClick={onEnd}
            title="End call"
            style={{ background: "#e53935" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
          </button>
        </div>
        <audio ref={remoteAudioRef} className="call-remote-audio" autoPlay />
      </div>
    );
  }

  return null;
}

export default CallOverlay;
