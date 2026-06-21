import { useState, useEffect, useCallback, useRef } from "react";
import { getSocket } from "./socket";
import { ThemeProvider } from "./context/ThemeContext";
import LoginScreen from "./components/LoginScreen";
import Sidebar from "./components/Sidebar";
import ChatPage from "./pages/ChatPage";
import CallHistory from "./components/CallHistory";
import CallOverlay from "./components/CallOverlay";
import ProfileModal from "./components/ProfileModal";
import MediaGallery from "./components/MediaGallery";
import BottomNav from "./components/BottomNav";
import "./styles/App.css";

const DEFAULT_ICE_SERVERS = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
  { urls: "stun:stun2.l.google.com:19302" },
  { urls: "stun:stun3.l.google.com:19302" },
  { urls: "stun:stun4.l.google.com:19302" },
  { urls: "stun:openrelay.metered.ca:80" },
  {
    urls: [
      "turn:openrelay.metered.ca:80",
      "turn:openrelay.metered.ca:443",
      "turn:openrelay.metered.ca:443?transport=tcp",
      "turns:openrelay.metered.ca:443?transport=tcp",
    ],
    username: "openrelayproject",
    credential: "openrelayproject",
  },
  { urls: "stun:stun.cloudflare.com:3478" },
];

function getIceServers() {
  const turnUrl = import.meta.env.VITE_TURN_URL;
  const turnUsername = import.meta.env.VITE_TURN_USERNAME;
  const turnCredential = import.meta.env.VITE_TURN_CREDENTIAL;

  if (turnUrl && turnUsername && turnCredential) {
    return [
      { urls: "stun:stun.l.google.com:19302" },
      {
        urls: turnUrl.split(",").map((url) => url.trim()).filter(Boolean),
        username: turnUsername,
        credential: turnCredential,
      },
    ];
  }

  return DEFAULT_ICE_SERVERS;
}

const PC_CONFIG = {
  iceServers: getIceServers(),
  iceTransportPolicy: "all",
  iceCandidatePoolSize: 10,
};

function formatLastSeen(isoString) {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const time = `${hours}:${minutes}`;

  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return `last seen today at ${time}`;
  if (isYesterday) return `last seen yesterday at ${time}`;
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const day = date.getDate().toString().padStart(2, "0");
  return `last seen on ${month}/${day} at ${time}`;
}

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [partnerName, setPartnerName] = useState(null);
  const [selectedContact, setSelectedContact] = useState(null);
  const [activeTab, setActiveTab] = useState("chat");
  const [partnerOnline, setPartnerOnline] = useState(false);
  const [partnerLastSeen, setPartnerLastSeen] = useState(null);
  const [allPresence, setAllPresence] = useState({});
  const [messages, setMessages] = useState([]);
  const [showMobileChat, setShowMobileChat] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [chatBackground, setChatBackground] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [partnerPhoto, setPartnerPhoto] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [partnerDisplayName, setPartnerDisplayName] = useState(null);
  const [partnerNickname, setPartnerNickname] = useState(null);

  // ---- Call state ----
  const [callStatus, setCallStatus] = useState("idle");
  const [callType, setCallType] = useState(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [missedCallCount, setMissedCallCount] = useState(0);

  const callStatusRef = useRef("idle");
  const callTypeRef = useRef(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const pendingCandidatesRef = useRef([]);
  const callIdRef = useRef(null);
  const callRoleRef = useRef(null);
  const makingOfferRef = useRef(false);
  const ignoreOfferRef = useRef(false);
  const settingRemoteAnswerRef = useRef(false);
  const seenCandidatesRef = useRef(new Set());
  const iceRestartTimerRef = useRef(null);
  const callStartTimeRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordingChunksRef = useRef([]);
  const callAudioContextRef = useRef(null);

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    try {
      const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
      setProfilePhoto(saved.photo || null);
      setChatBackground(saved.bg || null);
      setDisplayName(saved.displayName || null);
      setPartnerNickname(saved.partnerNickname || null);
    } catch {
      setProfilePhoto(null);
      setChatBackground(null);
      setDisplayName(null);
      setPartnerNickname(null);
    }
  }, [currentUser]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    function handlePresence(data) {
      setAllPresence((prev) => ({ ...prev, [data.username]: data }));
    }

    function handlePartnerInfoData(data) {
      handlePartnerInfo(data.partnerName, data.partnerOnline, data.partnerLastSeen);
      if (data.partnerPhoto) setPartnerPhoto(data.partnerPhoto);
      if (data.sharedBg) setChatBackground(data.sharedBg);
      if (data.partnerDisplayName) setPartnerDisplayName(data.partnerDisplayName);
    }

    function handlePartnerProfileUpdate(data) {
      setPartnerPhoto(data.photoUrl);
    }

    function handlePartnerDisplayNameUpdate(data) {
      setPartnerDisplayName(data.displayName);
    }

    function handlePartnerBgUpdate(data) {
      setChatBackground(data.bgUrl);
      try {
        const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
        saved.bg = data.bgUrl;
        localStorage.setItem("profile_" + currentUser, JSON.stringify(saved));
      } catch {}
    }

    function handleSocketReconnect() {
      if (callIdRef.current && callStatusRef.current !== "idle") {
        console.debug("[call] socket reconnected during active call", { callId: callIdRef.current });
        socket.emit("call_reconnect", { callId: callIdRef.current });
        restartIce();
      }
    }

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    socket.emit("request_missed_calls");

    socket.on("presence_update", handlePresence);
    socket.on("partner_info", handlePartnerInfoData);
    socket.on("partner_profile_update", handlePartnerProfileUpdate);
    socket.on("partner_display_name_update", handlePartnerDisplayNameUpdate);
    socket.on("partner_bg_update", handlePartnerBgUpdate);
    socket.on("connect", handleSocketReconnect);

    // ---- Call signaling ----
    socket.on("call_created", (data) => {
      callIdRef.current = data.callId;
      console.debug("[call] created", data);
    });

    socket.on("incoming_call", (data) => {
      console.debug("[call] incoming", data);
      if (callStatusRef.current !== "idle") {
        socket.emit("call_rejected", { callId: data.callId, reason: "busy" });
        return;
      }
      callIdRef.current = data.callId;
      callRoleRef.current = "callee";
      setCallType(data.type);
      callTypeRef.current = data.type;
      setPartnerName(data.caller);
      setCallStatus("ringing");
      callStatusRef.current = "ringing";
    });

    socket.on("call_accepted", async (data) => {
      console.debug("[call] accepted", data);
      if (callStatusRef.current !== "calling") return;
      callIdRef.current = data.callId || callIdRef.current;
      callStartTimeRef.current = Date.now();
      setCallStatus("connected");
      callStatusRef.current = "connected";
      await sendOffer(false);
    });

    socket.on("call_rejected", (data) => {
      console.debug("[call] rejected", data);
      if (callStatusRef.current === "calling" || callStatusRef.current === "ringing") {
        addCallLog({ type: callTypeRef.current, direction: callStatusRef.current === "calling" ? "outgoing" : "incoming", status: "declined", partner: partnerName, timestamp: new Date().toISOString() });
      }
      cleanupCall();
      setCallStatus("idle");
      callStatusRef.current = "idle";
    });

    socket.on("webrtc_offer", handleRemoteOffer);
    socket.on("webrtc_answer", handleRemoteAnswer);
    socket.on("webrtc_ice_candidate", handleRemoteCandidate);

    socket.on("call_peer_disconnected", (data) => {
      console.debug("[call] peer socket disconnected", data);
    });

    socket.on("call_peer_reconnected", async (data) => {
      console.debug("[call] peer socket reconnected", data);
      if (data.callId === callIdRef.current) await restartIce();
    });

    socket.on("call_error", (data) => {
      console.warn("[call] signaling error", data);
    });

    socket.on("call_ended", async (data = {}) => {
      if (data.callId && callIdRef.current && data.callId !== callIdRef.current) return;
      if (callStatusRef.current === "idle") return;
      const duration = callStartTimeRef.current
        ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
        : 0;
      const blob = await stopCallRecording();
      const recordingUrl = await uploadRecording(blob);
      addCallLog({
        type: callTypeRef.current,
        direction: callStatusRef.current === "calling" ? "outgoing" : "incoming",
        status: duration > 0 ? "ended" : "missed",
        duration,
        recordingUrl,
        partner: partnerName,
        timestamp: new Date().toISOString(),
      });
      if (duration === 0) setMissedCallCount((c) => c + 1);
      cleanupCall();
      setCallStatus("ended");
      callStatusRef.current = "ended";
      setTimeout(() => { setCallStatus("idle"); callStatusRef.current = "idle"; callStartTimeRef.current = null; }, 2000);
    });

    socket.on("clear_call_logs", () => {
      localStorage.removeItem("heartchat_call_logs");
      setMissedCallCount(0);
    });

    socket.on("missed_calls_list", (calls) => {
      for (const call of calls) {
        addCallLog({
          type: call.type || "audio",
          direction: "incoming",
          status: "missed",
          partner: call.caller || partnerName,
          timestamp: call.timestamp,
          duration: 0,
        });
      }
      if (calls.length > 0) {
        setMissedCallCount((c) => c + calls.length);
        const callerName = calls[0].caller || partnerNickname || partnerDisplayName || partnerName;
        if ("Notification" in window && Notification.permission === "granted") {
          new Notification(`Missed call from ${callerName}`, { body: `You missed ${calls.length} call(s) while away.` });
        }
      }
    });

    socket.emit("get_partner_info");
    return () => {
      socket.off("presence_update", handlePresence);
      socket.off("partner_info", handlePartnerInfoData);
      socket.off("partner_profile_update", handlePartnerProfileUpdate);
      socket.off("partner_display_name_update", handlePartnerDisplayNameUpdate);
      socket.off("partner_bg_update", handlePartnerBgUpdate);
      socket.off("connect", handleSocketReconnect);
      socket.off("call_created");
      socket.off("incoming_call");
      socket.off("call_accepted");
      socket.off("call_rejected");
      socket.off("webrtc_offer");
      socket.off("webrtc_answer");
      socket.off("webrtc_ice_candidate");
      socket.off("call_peer_disconnected");
      socket.off("call_peer_reconnected");
      socket.off("call_error");
      socket.off("call_ended");
      socket.off("missed_calls_list");
    };
  }, [currentUser]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on("load_messages", (loadedMessages) => {
      console.log("[DEBUG] load_messages received", { count: loadedMessages.length, currentUser });
      setMessages(loadedMessages);
    });

    socket.on("new_message", (message) => {
      setMessages((prev) => [...prev, message]);
    });

    socket.on("message_status_update", (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m._id === data.messageId ? { ...m, status: data.status } : m
        )
      );
    });

    socket.on("message_deleted", (data) => {
      setMessages((prev) => prev.filter((m) => m._id !== data.messageId));
    });

    function requestMessages() {
      socket.emit("request_messages");
    }

    // Re-request messages whenever socket (re)connects
    socket.on("connect", requestMessages);

    // If already connected, request immediately
    if (socket.connected) {
      requestMessages();
    }

    return () => {
      socket.off("load_messages");
      socket.off("new_message");
      socket.off("message_status_update");
      socket.off("message_deleted");
      socket.off("connect", requestMessages);
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;
    const socket = getSocket();
    if (!socket) return;
    const unread = messages.filter(
      (m) => m.sender !== currentUser && m.status === "delivered"
    );
    for (const m of unread) {
      socket.emit("message_read", { messageId: m._id });
    }
  }, [messages, currentUser]);

  useEffect(() => {
    if (!partnerName) return;
    const p = allPresence[partnerName];
    if (p) {
      setPartnerOnline(p.online);
      if (p.online) {
        setPartnerLastSeen(null);
      } else {
        setPartnerLastSeen(p.lastSeen || null);
      }
    }
  }, [partnerName, allPresence]);

  function addCallLog(entry) {
    try {
      const logs = JSON.parse(localStorage.getItem("heartchat_call_logs") || "[]");
      logs.unshift({ ...entry, id: Date.now() });
      if (logs.length > 100) logs.length = 100;
      localStorage.setItem("heartchat_call_logs", JSON.stringify(logs));
    } catch {}
  }

  function loadMissedCallCount() {
    try {
      const logs = JSON.parse(localStorage.getItem("heartchat_call_logs") || "[]");
      return logs.filter((l) => l.status === "missed").length;
    } catch { return 0; }
  }

  function startCallRecording() {
    if (mediaRecorderRef.current) return;
    const tracks = [];
    if (localStreamRef.current) {
      for (const t of localStreamRef.current.getAudioTracks()) tracks.push(t);
    }
    if (remoteStreamRef.current) {
      for (const t of remoteStreamRef.current.getAudioTracks()) tracks.push(t);
    }
    if (tracks.length === 0) return;
    const combined = new MediaStream(tracks);
    const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
      ? "audio/webm;codecs=opus" : "audio/webm";
    const recorder = new MediaRecorder(combined, { mimeType });
    recordingChunksRef.current = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordingChunksRef.current.push(e.data);
    };
    recorder.start();
    mediaRecorderRef.current = recorder;
  }

  function stopCallRecording() {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") { resolve(null); return; }
      recorder.onstop = () => {
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType });
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        resolve(blob);
      };
      recorder.stop();
    });
  }

  async function uploadRecording(blob) {
    if (!blob) return null;
    const formData = new FormData();
    formData.append("file", blob, `call_${Date.now()}.webm`);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) { const data = await res.json(); return data.url; }
    } catch {}
    return null;
  }

  function sendCallSignal(event, payload = {}) {
    const socket = getSocket();
    if (!socket || !callIdRef.current) return;
    socket.emit(event, { ...payload, callId: callIdRef.current });
  }

  function ensurePeerConnection() {
    if (pcRef.current) return pcRef.current;
    if (!localStreamRef.current) return null;
    pcRef.current = createPeerConnection(localStreamRef.current);
    return pcRef.current;
  }

  function createPeerConnection(stream) {
    const pc = new RTCPeerConnection(PC_CONFIG);
    console.debug("[webrtc] create peer connection", { callId: callIdRef.current, role: callRoleRef.current, config: PC_CONFIG });

    stream.getTracks().forEach((track) => {
      track.enabled = true;
      pc.addTrack(track, stream);
    });

    const receivedStream = new MediaStream();
    pc.ontrack = (event) => {
      console.debug("[webrtc] remote track", { kind: event.track?.kind, id: event.track?.id, streams: event.streams?.length });
      if (event.track && !receivedStream.getTracks().some((track) => track.id === event.track.id)) {
        receivedStream.addTrack(event.track);
      }
      const remote = new MediaStream(receivedStream.getTracks());
      remoteStreamRef.current = remote;
      setRemoteStream(remote);
      startCallRecording();
    };

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendCallSignal("webrtc_ice_candidate", {
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate,
        });
      }
    };

    pc.onconnectionstatechange = () => {
      console.debug("[webrtc] connection state", pc.connectionState);
      if (pc.connectionState === "failed") restartIce();
      if (pc.connectionState === "connected") {
        if (!callStartTimeRef.current) callStartTimeRef.current = Date.now();
        if (callStatusRef.current !== "connected") {
          setCallStatus("connected");
          callStatusRef.current = "connected";
        }
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.debug("[webrtc] ICE state", pc.iceConnectionState);
      if (pc.iceConnectionState === "failed") restartIce();
      if (pc.iceConnectionState === "disconnected") {
        if (iceRestartTimerRef.current) clearTimeout(iceRestartTimerRef.current);
        iceRestartTimerRef.current = setTimeout(() => restartIce(), 2500);
      }
    };

    pc.onicegatheringstatechange = () => console.debug("[webrtc] ICE gathering", pc.iceGatheringState);
    pc.onsignalingstatechange = () => console.debug("[webrtc] signaling state", pc.signalingState);
    return pc;
  }

  async function sendOffer(iceRestart = false) {
    const pc = ensurePeerConnection();
    if (!pc || makingOfferRef.current || pc.signalingState !== "stable") return;
    try {
      makingOfferRef.current = true;
      const offer = await pc.createOffer({ iceRestart, offerToReceiveAudio: true, offerToReceiveVideo: callTypeRef.current === "video" });
      await pc.setLocalDescription(offer);
      console.debug("[webrtc] send offer", { callId: callIdRef.current, iceRestart });
      sendCallSignal("webrtc_offer", { description: pc.localDescription, offer: pc.localDescription, iceRestart });
    } catch (err) {
      console.error("[webrtc] offer failed", err);
    } finally {
      makingOfferRef.current = false;
    }
  }

  async function handleRemoteOffer(data) {
    if (data.callId && callIdRef.current && data.callId !== callIdRef.current) return;
    if (!localStreamRef.current) return;
    callIdRef.current = data.callId || callIdRef.current;
    const pc = ensurePeerConnection();
    if (!pc) return;
    const description = data.description || data.offer;
    const readyForOffer = !makingOfferRef.current && (pc.signalingState === "stable" || settingRemoteAnswerRef.current);
    const offerCollision = description?.type === "offer" && !readyForOffer;
    ignoreOfferRef.current = callRoleRef.current === "caller" && offerCollision;
    if (ignoreOfferRef.current) {
      console.warn("[webrtc] ignored colliding offer", { callId: data.callId });
      return;
    }
    try {
      console.debug("[webrtc] receive offer", { callId: data.callId });
      await pc.setRemoteDescription(description);
      await flushPendingCandidates();
      await pc.setLocalDescription(await pc.createAnswer());
      sendCallSignal("webrtc_answer", { description: pc.localDescription, answer: pc.localDescription });
      if (callStatusRef.current !== "connected") {
        setCallStatus("connected");
        callStatusRef.current = "connected";
      }
    } catch (err) {
      console.error("[webrtc] handling offer failed", err);
    }
  }

  async function handleRemoteAnswer(data) {
    if (data.callId && data.callId !== callIdRef.current) return;
    const pc = pcRef.current;
    if (!pc || pc.signalingState === "stable") return;
    const description = data.description || data.answer;
    try {
      console.debug("[webrtc] receive answer", { callId: data.callId });
      settingRemoteAnswerRef.current = true;
      await pc.setRemoteDescription(description);
      await flushPendingCandidates();
    } catch (err) {
      console.error("[webrtc] handling answer failed", err);
    } finally {
      settingRemoteAnswerRef.current = false;
    }
  }

  async function handleRemoteCandidate(data) {
    if (data.callId && callIdRef.current && data.callId !== callIdRef.current) return;
    const candidate = data.candidate;
    if (!candidate) return;
    const key = candidate.candidate || JSON.stringify(candidate);
    if (seenCandidatesRef.current.has(key)) return;
    seenCandidatesRef.current.add(key);
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription) {
      pendingCandidatesRef.current.push(candidate);
      return;
    }
    try {
      await pc.addIceCandidate(candidate);
    } catch (err) {
      if (!ignoreOfferRef.current) console.error("[webrtc] add ICE candidate failed", err);
    }
  }

  async function flushPendingCandidates() {
    const pc = pcRef.current;
    if (!pc || !pc.remoteDescription || pendingCandidatesRef.current.length === 0) return;
    const candidates = pendingCandidatesRef.current.splice(0);
    for (const candidate of candidates) {
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        console.error("[webrtc] flush ICE candidate failed", err);
      }
    }
  }

  async function restartIce() {
    const pc = pcRef.current;
    if (!pc || !callIdRef.current || callStatusRef.current === "idle") return;
    if (pc.signalingState !== "stable") return;
    console.debug("[webrtc] restarting ICE", { callId: callIdRef.current });
    if (typeof pc.restartIce === "function") pc.restartIce();
    await sendOffer(true);
  }

  async function getMedia(video) {
    const audio = {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
    };
    const constraints = video
      ? [
          { audio, video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } },
          { audio, video: { facingMode: "user" } },
          { audio, video: true },
        ]
      : [
          { audio, video: false },
          { audio: true, video: false },
        ];

    let lastError;
    for (const constraint of constraints) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraint);
        stream.getTracks().forEach((track) => { track.enabled = true; });
        return stream;
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  function unlockAudioPlayback() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      if (callAudioContextRef.current) {
        try { callAudioContextRef.current.close(); } catch {}
      }
      callAudioContextRef.current = ctx;
    } catch {}
  }

  function cleanupCall() {
    if (iceRestartTimerRef.current) {
      clearTimeout(iceRestartTimerRef.current);
      iceRestartTimerRef.current = null;
    }
    if (callAudioContextRef.current) {
      try { callAudioContextRef.current.close(); } catch {}
      callAudioContextRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((t) => t.stop());
      remoteStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setIsMuted(false);
    pendingCandidatesRef.current = [];
    seenCandidatesRef.current = new Set();
    callIdRef.current = null;
    callRoleRef.current = null;
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;
    settingRemoteAnswerRef.current = false;
  }

  async function startCall(type) {
    if (callStatusRef.current !== "idle" || !partnerName) return;
    try {
      const callId = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      callIdRef.current = callId;
      callRoleRef.current = "caller";
      callTypeRef.current = type;
      setCallType(type);

      unlockAudioPlayback();

      const stream = await getMedia(type === "video");
      localStreamRef.current = stream;
      setLocalStream(stream);

      pcRef.current = createPeerConnection(stream);

      setCallStatus("calling");
      callStatusRef.current = "calling";
      getSocket().emit("call_user", { callId, caller: currentUser, type });
    } catch (err) {
      console.error("Media error:", err);
      cleanupCall();
      alert("Could not access camera/microphone. Please check permissions.");
    }
  }

  async function acceptCall() {
    if (callStatusRef.current !== "ringing") return;
    try {
      callRoleRef.current = "callee";

      unlockAudioPlayback();

      const stream = await getMedia(callTypeRef.current === "video");
      localStreamRef.current = stream;
      setLocalStream(stream);

      pcRef.current = createPeerConnection(stream);

      getSocket().emit("call_accepted", { callId: callIdRef.current, callee: currentUser });
      callStartTimeRef.current = Date.now();
      setCallStatus("connected");
      callStatusRef.current = "connected";
    } catch (err) {
      console.error("Media error:", err);
      alert("Could not access camera/microphone. Please check permissions.");
      getSocket().emit("call_rejected", { callId: callIdRef.current, callee: currentUser });
      cleanupCall();
      setCallStatus("idle");
      callStatusRef.current = "idle";
    }
  }

  function rejectCall() {
    if (callStatusRef.current !== "ringing") return;
    addCallLog({ type: callTypeRef.current, direction: "incoming", status: "declined", partner: partnerName, timestamp: new Date().toISOString() });
    getSocket().emit("call_rejected", { callId: callIdRef.current, callee: currentUser });
    cleanupCall();
    setCallStatus("idle");
    callStatusRef.current = "idle";
  }

  async function endCall() {
    const duration = callStartTimeRef.current
      ? Math.round((Date.now() - callStartTimeRef.current) / 1000)
      : 0;
    getSocket().emit("call_ended", { callId: callIdRef.current });
    const blob = await stopCallRecording();
    const recordingUrl = await uploadRecording(blob);
    addCallLog({ type: callTypeRef.current, direction: callStatusRef.current === "calling" ? "outgoing" : "incoming", status: "ended", duration, recordingUrl, partner: partnerName, timestamp: new Date().toISOString() });
    cleanupCall();
    setCallStatus("ended");
    callStatusRef.current = "ended";
    setTimeout(() => { setCallStatus("idle"); callStatusRef.current = "idle"; callStartTimeRef.current = null; }, 2000);
  }

  function toggleMute() {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }

  async function toggleCamera() {
    if (!localStreamRef.current || callTypeRef.current !== "video") return;
    const oldTrack = localStreamRef.current.getVideoTracks()[0];
    if (!oldTrack) return;
    const currentFacing = oldTrack.getSettings?.()?.facingMode;
    const newFacing = currentFacing === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: newFacing, width: { ideal: 640 }, height: { ideal: 480 } },
      });
      const newTrack = newStream.getVideoTracks()[0];
      localStreamRef.current.removeTrack(oldTrack);
      oldTrack.stop();
      localStreamRef.current.addTrack(newTrack);
      const sender = pcRef.current?.getSenders().find((s) => s.track?.kind === "video");
      if (sender) await sender.replaceTrack(newTrack);
      setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
    } catch (err) {
      console.error("Camera switch error:", err);
    }
  }

  function handleProfilePhotoChange(url) {
    setProfilePhoto(url);
    try {
      const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
      saved.photo = url;
      localStorage.setItem("profile_" + currentUser, JSON.stringify(saved));
    } catch {}
    const socket = getSocket();
    if (socket) socket.emit("profile_update", { photoUrl: url });
  }

  function handleChatBackgroundChange(url) {
    setChatBackground(url);
    try {
      const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
      saved.bg = url;
      localStorage.setItem("profile_" + currentUser, JSON.stringify(saved));
    } catch {}
    const socket = getSocket();
    if (socket) socket.emit("bg_update", { bgUrl: url });
  }

  function handleDisplayNameChange(name) {
    const newName = name.trim() || null;
    setDisplayName(newName);
    try {
      const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
      saved.displayName = newName;
      localStorage.setItem("profile_" + currentUser, JSON.stringify(saved));
    } catch {}
    const socket = getSocket();
    if (socket) socket.emit("display_name_update", { displayName: newName });
  }

  function handlePartnerNicknameChange(name) {
    const newName = name.trim() || null;
    setPartnerNickname(newName);
    try {
      const saved = JSON.parse(localStorage.getItem("profile_" + currentUser) || "{}");
      saved.partnerNickname = newName;
      localStorage.setItem("profile_" + currentUser, JSON.stringify(saved));
    } catch {}
  }

  function handleLoginSuccess(username) {
    setCurrentUser(username);
    function doRequest() {
      const socket = getSocket();
      if (socket && socket.connected) {
        socket.emit("request_messages");
      } else {
        setTimeout(doRequest, 300);
      }
    }
    doRequest();
  }

  function handleNavTabChange(tab) {
    setActiveTab(tab);
    if (isMobile) {
      setShowMobileChat(tab !== "chat");
    }
  }

  function handleOpenChat() {
    setActiveTab("chat");
    setShowMobileChat(true);
  }

  function handleLogout() {
    setCurrentUser(null);
    setPartnerName(null);
    setSelectedContact(null);
    setActiveTab("chat");
    setShowMobileChat(false);
  }

  function handleMobileSelectContact(contact) {
    setSelectedContact(contact);
    setShowMobileChat(true);
  }

  function handleMobileBack() {
    setShowMobileChat(false);
    setActiveTab("chat");
  }

  const handlePartnerInfo = useCallback((name, online, lastSeen) => {
    setPartnerName(name);
    setPartnerOnline(!!online);
    if (!online && lastSeen) {
      setPartnerLastSeen(lastSeen);
    } else {
      setPartnerLastSeen(null);
    }
    setSelectedContact((prev) => prev || name);
  }, []);

  function getStatusText() {
    if (partnerOnline) return "online";
    if (partnerLastSeen) return formatLastSeen(partnerLastSeen);
    return "offline";
  }

  function renderDesktop() {
    return (
      <>
          <Sidebar
            username={currentUser}
            displayName={displayName}
            partnerName={partnerName}
            partnerDisplayName={partnerDisplayName}
            partnerNickname={partnerNickname}
            partnerStatus={getStatusText()}
            partnerOnline={partnerOnline}
            selectedContact={selectedContact}
            onSelectContact={setSelectedContact}
            onLogout={handleLogout}
            profilePhoto={profilePhoto}
            partnerPhoto={partnerPhoto}
            onOpenProfile={() => setShowProfile(true)}
            onPartnerNicknameChange={handlePartnerNicknameChange}
            onOpenChat={handleOpenChat}
          />
        {activeTab === "chat" ? (
          <ChatPage
            username={currentUser}
            displayName={displayName}
            partnerName={partnerName}
            partnerDisplayName={partnerDisplayName}
            partnerNickname={partnerNickname}
            partnerStatus={getStatusText()}
            partnerOnline={partnerOnline}
            selectedContact={selectedContact}
            onPartnerInfo={handlePartnerInfo}
            messages={messages}
            profilePhoto={profilePhoto}
            partnerPhoto={partnerPhoto}
            chatBackground={chatBackground}
            callStatus={callStatus}
            onStartCall={startCall}
          />
        ) : activeTab === "media" ? (
          <MediaGallery messages={messages} partnerName={partnerName} partnerDisplayName={partnerDisplayName} partnerNickname={partnerNickname} />
        ) : (
          <CallHistory username={currentUser} partnerName={partnerName} partnerNickname={partnerNickname} profilePhoto={profilePhoto} />
        )}
      </>
    );
  }

  function renderMobile() {
    if (activeTab === "chat") {
      if (showMobileChat) {
        return (
          <ChatPage
            username={currentUser}
            displayName={displayName}
            partnerName={partnerName}
            partnerDisplayName={partnerDisplayName}
            partnerNickname={partnerNickname}
            partnerStatus={getStatusText()}
            partnerOnline={partnerOnline}
            selectedContact={selectedContact}
            onPartnerInfo={handlePartnerInfo}
            messages={messages}
            onMobileBack={handleMobileBack}
            profilePhoto={profilePhoto}
            partnerPhoto={partnerPhoto}
            chatBackground={chatBackground}
            callStatus={callStatus}
            onStartCall={startCall}
          />
        );
      }
      return (
        <Sidebar
          username={currentUser}
          displayName={displayName}
          partnerName={partnerName}
          partnerDisplayName={partnerDisplayName}
          partnerNickname={partnerNickname}
          partnerStatus={getStatusText()}
          partnerOnline={partnerOnline}
          selectedContact={selectedContact}
          onSelectContact={handleMobileSelectContact}
          onLogout={handleLogout}
          profilePhoto={profilePhoto}
          partnerPhoto={partnerPhoto}
          onOpenProfile={() => setShowProfile(true)}
          onPartnerNicknameChange={handlePartnerNicknameChange}
          onOpenChat={handleOpenChat}
        />
      );
    }
    if (activeTab === "calls") {
      return <CallHistory username={currentUser} partnerName={partnerName} partnerNickname={partnerNickname} onMobileBack={handleMobileBack} profilePhoto={profilePhoto} />;
    }
    if (activeTab === "media") {
      return <MediaGallery messages={messages} partnerName={partnerName} partnerDisplayName={partnerDisplayName} partnerNickname={partnerNickname} />;
    }
    return null;
  }

  return (
    <ThemeProvider>
      <div className="app-container">
        {currentUser === null ? (
          <LoginScreen onLoginSuccess={handleLoginSuccess} />
        ) : (
          <>
            <div className={`chat-layout ${isMobile ? "chat-layout-mobile" : ""}`}>
              {isMobile ? renderMobile() : renderDesktop()}
            </div>
            <BottomNav
              activeTab={activeTab}
              onTabChange={handleNavTabChange}
              missedCallCount={missedCallCount}
              onClearMissedCalls={() => setMissedCallCount(0)}
            />
            {callStatus !== "idle" && (
              <CallOverlay
                status={callStatus}
                callType={callType}
                username={currentUser}
                partnerName={partnerName}
                partnerDisplayName={partnerDisplayName}
                partnerNickname={partnerNickname}
                localStream={localStream}
                remoteStream={remoteStream}
                displayName={displayName}
                onAccept={acceptCall}
                onReject={rejectCall}
                onEnd={endCall}
                onToggleMute={toggleMute}
                onToggleCamera={toggleCamera}
                isMuted={isMuted}
              />
            )}
            {showProfile && (
              <ProfileModal
                username={currentUser}
                profilePhoto={profilePhoto}
                onProfilePhotoChange={handleProfilePhotoChange}
                chatBackground={chatBackground}
                onChatBackgroundChange={handleChatBackgroundChange}
                onClose={() => setShowProfile(false)}
              />
            )}
          </>
        )}
      </div>
    </ThemeProvider>
  );
}

export default App;
