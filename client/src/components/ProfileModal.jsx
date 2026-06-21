import { useState } from "react";

function ProfileModal({ username, profilePhoto, onProfilePhotoChange, chatBackground, onChatBackgroundChange, onClose }) {
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Upload failed");
        return;
      }
      const data = await res.json();
      onProfilePhotoChange(data.url);
    } catch {
      alert("Failed to upload. Is the server running?");
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleBgUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Upload failed");
        return;
      }
      const data = await res.json();
      onChatBackgroundChange(data.url);
    } catch {
      alert("Failed to upload. Is the server running?");
    } finally {
      setUploadingBg(false);
    }
  }

  function handleRemoveBg() {
    onChatBackgroundChange(null);
  }

  function handleRemovePhoto() {
    onProfilePhotoChange(null);
  }

  function getInitial(name) {
    return name ? name.charAt(0).toUpperCase() : "?";
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>&times;</button>
        <h2 className="modal-title">Profile Settings</h2>

        <div className="modal-section">
          <h3 className="modal-section-title">Profile Photo</h3>
          <div className="modal-avatar-section">
            <div className="modal-avatar-preview">
              {profilePhoto ? (
                <img src={profilePhoto} alt="Profile" className="modal-avatar-img" />
              ) : (
                <div className="modal-avatar-placeholder">{getInitial(username)}</div>
              )}
            </div>
            <div className="modal-avatar-actions">
              <label className="modal-upload-btn">
                {uploadingPhoto ? "Uploading..." : "Upload Photo"}
                <input type="file" accept="image/*" hidden onChange={handlePhotoUpload} disabled={uploadingPhoto} />
              </label>
              {profilePhoto && (
                <button className="modal-remove-btn" onClick={handleRemovePhoto}>Remove</button>
              )}
            </div>
          </div>
        </div>

        <div className="modal-section">
          <h3 className="modal-section-title">Chat Background</h3>
          <p className="modal-section-desc">Set a custom background image for the chat area.</p>
          <div className="modal-bg-preview">
            {chatBackground ? (
              <div className="modal-bg-img" style={{ backgroundImage: `url(${chatBackground})` }} />
            ) : (
              <div className="modal-bg-none">No background set</div>
            )}
          </div>
          <div className="modal-bg-actions">
            <label className="modal-upload-btn">
              {uploadingBg ? "Uploading..." : "Upload Background"}
              <input type="file" accept="image/*" hidden onChange={handleBgUpload} disabled={uploadingBg} />
            </label>
            {chatBackground && (
              <button className="modal-remove-btn" onClick={handleRemoveBg}>Remove</button>
            )}
          </div>
        </div>

        <button className="modal-done-btn" onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

export default ProfileModal;
