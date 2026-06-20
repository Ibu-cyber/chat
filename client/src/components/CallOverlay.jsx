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
  onAccept,
  onReject,
  onEnd,
  onToggleMute,
  isMuted,
}) {
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const ringtoneRef = useRef(null);
  const timerRef = useRef(null);
  const callStartRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function setVideoElement(ref, stream) {
    const el = ref.current;
    if (!el) {
      console.error('Video element not found');
      return;
    }
    if (!stream) {
      console.error('Stream not available');
      return;
    }
    console.log('Setting stream for', el === localVideoRef.current ? 'local' : 'remote', 'video');
    el.srcObject = stream;
    el.play().catch((error) => { console.error('Video play error:', error); });
  }

  useEffect(() => {
    setVideoElement(localVideoRef, localStream);
  }, [localStream, status]);

  useEffect(() => {
    setVideoElement(remoteVideoRef, remoteStream);
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
          <div className="call-avatar-large">{(partnerNickname || partnerDisplayName || partnerName)?.charAt(0).toUpperCase() || "?"}</div>
          <p className="call-partner-name">{partnerNickname || partnerDisplayName || partnerName}</p>
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
          <div className="call-avatar-large">{(partnerNickname || partnerDisplayName || partnerName)?.charAt(0).toUpperCase() || "?"}</div>
          <p className="call-partner-name">{partnerNickname || partnerDisplayName || partnerName}</p>
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
            <div className="call-avatar-large">{(partnerNickname || partnerDisplayName || partnerName)?.charAt(0).toUpperCase() || "?"}</div>
            <p className="call-partner-name">{partnerNickname || partnerDisplayName || partnerName}</p>
            <p className="call-status-text">Audio call</p>
            <audio ref={remoteVideoRef} autoPlay playsInline />
          </div>
        )}
        <div className="call-timer">{formatTime(elapsed)}</div>
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
