import { useState, useRef, useEffect } from "react";
import { ZegoUIKitPrebuilt } from "@zegocloud/zego-uikit-prebuilt";

function CallOverlay({
  status,
  callType,
  username,
  partnerName,
  partnerDisplayName,
  partnerNickname,
  localStream,
  remoteStream,
  zegoRoomId,
  zegoRoomActive,
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
  const zegoContainerRef = useRef(null);
  const zegoInstanceRef = useRef(null);
  const zegoJoinedRef = useRef(false);
  const ringtoneRef = useRef(null);
  const timerRef = useRef(null);
  const callStartRef = useRef(null);
  const [elapsed, setElapsed] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);
  const [zegoConfig, setZegoConfig] = useState(null);
  const [zegoError, setZegoError] = useState(null);
  const [zegoStarting, setZegoStarting] = useState(false);

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
    el.play()
      .then(() => {
        if (reportBlocked) setAudioBlocked(false);
      })
      .catch(() => {
        if (reportBlocked) setAudioBlocked(true);
      });
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

  const partnerLabel = partnerNickname || partnerDisplayName || partnerName;
  const hasRemoteVideo = remoteStream?.getVideoTracks().length > 0;
  const hasRemoteAudio = remoteStream?.getAudioTracks().length > 0;
  const shouldJoinZego = !!zegoRoomId && zegoRoomActive;
  const shouldPrepareZego = !!zegoRoomId && (status === "calling" || status === "ringing" || status === "connected");

  useEffect(() => {
    if (!shouldPrepareZego || zegoConfig) return;
    let cancelled = false;

    async function loadZegoConfig() {
      try {
        setZegoError(null);
        const session = JSON.parse(localStorage.getItem("heartchat_session") || "{}");
        const response = await fetch("/api/zego-config", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: session.username || username, password: session.password }),
        });
        if (!response.ok) throw new Error("Could not load ZEGOCLOUD config. Please log in again.");
        const config = await response.json();
        if (!cancelled) setZegoConfig(config);
      } catch (error) {
        if (!cancelled) setZegoError(error.message || "Could not load ZEGOCLOUD config.");
      }
    }

    loadZegoConfig();
    return () => { cancelled = true; };
  }, [shouldPrepareZego, zegoConfig, username]);

  function openMobileZegoPage() {
    if (!zegoRoomId) return false;
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (!isMobileDevice) return false;
    const userID = String(username || "user").replace(/[^a-zA-Z0-9_]/g, "_");
    const userName = displayName || username || "User";
    const params = new URLSearchParams({
      roomID: zegoRoomId,
      userID,
      userName,
      type: callType === "audio" ? "audio" : "video",
    });
    window.location.href = `/zego-call?${params.toString()}`;
    return true;
  }

  async function handleAcceptClick(event) {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (isAccepting) return;
    setIsAccepting(true);
    try {
      await onAccept();
      openMobileZegoPage();
    } finally {
      setTimeout(() => setIsAccepting(false), 1500);
    }
  }

  function renderLocalPreview() {
    if (callType !== "video" || !localStream) return null;
    return (
      <div className="call-local-preview" aria-label="Your camera preview">
        <video ref={localVideoRef} className="call-local-video" autoPlay playsInline muted />
        <span className="call-video-label">You</span>
      </div>
    );
  }

  function enableSound() {
    const audioTracks = remoteStream ? remoteStream.getAudioTracks() : [];
    const audioStream = audioTracks.length > 0 ? new MediaStream(audioTracks) : null;
    setMediaElement(remoteAudioRef, audioStream, true);
  }

  function startZegoRoom() {
    if (!zegoRoomId || !zegoContainerRef.current || !zegoConfig || zegoInstanceRef.current || zegoStarting) return;
    setZegoStarting(true);
    setZegoError(null);
    try {
      const userID = String(username || "user").replace(/[^a-zA-Z0-9_]/g, "_");
      const userName = displayName || username || "User";
      if (openMobileZegoPage()) {
        setZegoStarting(false);
        return;
      }

      const kitToken = ZegoUIKitPrebuilt.generateKitTokenForTest(
        Number(zegoConfig.appID),
        zegoConfig.serverSecret,
        zegoRoomId,
        userID,
        userName,
        60 * 60 * 12
      );
      const zp = ZegoUIKitPrebuilt.create(kitToken);
      zegoInstanceRef.current = zp;
      zegoJoinedRef.current = false;
      zp.joinRoom({
        container: zegoContainerRef.current,
        scenario: { mode: ZegoUIKitPrebuilt.OneONoneCall },
        maxUsers: 2,
        showPreJoinView: false,
        turnOnMicrophoneWhenJoining: true,
        turnOnCameraWhenJoining: callType === "video",
        useFrontFacingCamera: true,
        videoResolutionDefault: ZegoUIKitPrebuilt.VideoResolution_360P,
        showRoomTimer: true,
        showTextChat: false,
        showUserList: false,
        showRoomDetailsButton: false,
        showScreenSharingButton: false,
        showLeavingView: true,
        showNonVideoUser: true,
        showOnlyAudioUser: true,
        onJoinRoom: () => {
          zegoJoinedRef.current = true;
          setZegoStarting(false);
        },
        onLeaveRoom: () => {
          if (zegoJoinedRef.current) onEnd();
        },
      });
    } catch (error) {
      console.error("ZEGOCLOUD start failed:", error);
      setZegoError(error.message || "Could not start ZEGOCLOUD call.");
      setZegoStarting(false);
    }
  }

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

  useEffect(() => {
    return () => {
      if (zegoInstanceRef.current) {
        try { zegoInstanceRef.current.destroy(); } catch {}
        zegoInstanceRef.current = null;
      }
      zegoJoinedRef.current = false;
      setZegoStarting(false);
    };
  }, [zegoRoomId]);

  function renderZegoStarter(message) {
    return (
      <div className="call-video-waiting">
        <div className="call-avatar-large">{partnerLabel?.charAt(0).toUpperCase() || "?"}</div>
        <p>{message}</p>
        {zegoError && <p className="call-zego-error">{zegoError}</p>}
        <button
          type="button"
          className="call-accept-button"
          onClick={startZegoRoom}
          onTouchEnd={(event) => { event.preventDefault(); startZegoRoom(); }}
          disabled={!zegoConfig || zegoStarting}
        >
          {zegoStarting ? "Starting..." : zegoConfig ? "Start secure call" : "Preparing call..."}
        </button>
      </div>
    );
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
        <div className="zego-call-container" ref={zegoContainerRef}>
          {renderZegoStarter(`Calling ${partnerLabel || "partner"}...`)}
        </div>
      </div>
    );
  }

  if (status === "ringing") {
    if (zegoRoomActive) {
      return (
        <div className="call-overlay call-active">
          <div className="zego-call-container" ref={zegoContainerRef}>
            {renderZegoStarter("Call accepted. Start your secure call.")}
          </div>
        </div>
      );
    }

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
    return (
      <div className="call-overlay call-active">
        <div className="zego-call-container" ref={zegoContainerRef}>
          {renderZegoStarter("Start your secure call.")}
        </div>
      </div>
    );
  }

  return null;
}

export default CallOverlay;
