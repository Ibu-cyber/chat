// =============================================
// FILE: AudioRecorder.jsx — Record voice messages
// =============================================
// This component lets you record your voice and
// send it as a voice message. It uses the browser's
// built-in microphone access (MediaRecorder API).
// No extra libraries needed!

// ---------- 1. IMPORTS ----------
import { useState, useRef } from "react";

// ---------- 2. THE AUDIO RECORDER COMPONENT ----------
function AudioRecorder({ onSend, onCancel }) {
  // Track recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  // Refs to hold non-UI values (so they persist across renders)
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  // ---------- 3. START RECORDING ----------
  async function startRecording() {
    try {
      setError("");

      // Ask the browser for access to the microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Create a MediaRecorder to capture the audio
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // When audio data is available, save the chunk
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // When recording stops, create a blob from all the chunks
      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setRecordedBlob(audioBlob);

        // Stop all microphone tracks (free up the mic)
        stream.getTracks().forEach((track) => track.stop());
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);

      // Start a timer to show recording duration
      let seconds = 0;
      timerRef.current = setInterval(() => {
        seconds++;
        setRecordingDuration(seconds);

        // Auto-stop after 60 seconds (prevent huge files)
        if (seconds >= 60) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError("Microphone access was denied. Please allow microphone access in your browser settings.");
      } else {
        setError("Could not start recording. Make sure your microphone is connected.");
      }
    }
  }

  // ---------- 4. STOP RECORDING ----------
  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);

    // Clear the timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  // ---------- 5. SEND THE RECORDING ----------
  async function sendRecording() {
    if (!recordedBlob) return;

    try {
      setIsUploading(true);
      setError("");

      // Upload the audio file to the server
      const formData = new FormData();
      formData.append("file", recordedBlob, `voice_${Date.now()}.webm`);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload failed");
      }

      const result = await response.json();

      // Send the audio URL as a chat message
      onSend(result.url);
    } catch (err) {
      setError("Failed to send voice message. Try again.");
    } finally {
      setIsUploading(false);
    }
  }

  // ---------- 6. FORMAT DURATION ----------
  function formatDuration(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  }

  // ---------- 7. DISCARD AND RESET ----------
  function discard() {
    setRecordedBlob(null);
    setRecordingDuration(0);
    setError("");
    audioChunksRef.current = [];
  }

  // ---------- 8. RENDER ----------
  return (
    <div className="audio-recorder">
      {error && <p className="recorder-error">{error}</p>}

      <div className="recorder-controls">
        {/* Not recording and no recording yet */}
        {!isRecording && !recordedBlob && (
          <>
            <span className="recorder-label">Voice Message</span>
            <button className="record-button" onClick={startRecording}>
              🎤 Start Recording
            </button>
            <button className="cancel-button" onClick={onCancel}>
              Cancel
            </button>
          </>
        )}

        {/* Currently recording */}
        {isRecording && (
          <>
            <span className="recorder-timer recording">
              🔴 {formatDuration(recordingDuration)}
            </span>
            <button className="stop-button" onClick={stopRecording}>
              ⏹ Stop
            </button>
          </>
        )}

        {/* Finished recording, ready to send */}
        {!isRecording && recordedBlob && (
          <>
            <span className="recorder-timer">
              ✅ {formatDuration(recordingDuration)}
            </span>
            <button
              className="send-button"
              onClick={sendRecording}
              disabled={isUploading}
            >
              {isUploading ? "Uploading..." : "Send Voice 📨"}
            </button>
            <button className="cancel-button" onClick={discard}>
              Discard
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- 9. EXPORT ----------
export default AudioRecorder;
