import { useState } from "react";
import ImageViewer from "./ImageViewer";

function MediaGallery({ messages, partnerNickname, partnerDisplayName, partnerName }) {
  const [filter, setFilter] = useState("all");
  const [viewingImage, setViewingImage] = useState(null);

  const mediaMessages = messages.filter(
    (m) => m.imageUrl || m.audioUrl || m.fileUrl
  );

  const images = mediaMessages.filter((m) => m.imageUrl);
  const audioFiles = mediaMessages.filter((m) => m.audioUrl);
  const documents = mediaMessages.filter((m) => m.fileUrl);

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

    if (sameDay) return "Today";
    if (isYesterday) return "Yesterday";
    return d.toLocaleDateString();
  }

  async function handleDownload(url, filename) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
    } catch {}
  }

  function groupByDate(items) {
    const groups = {};
    for (const item of items) {
      const key = formatDate(item.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
    }
    return groups;
  }

  const displayName = partnerNickname || partnerDisplayName || partnerName || "Partner";

  return (
    <div className="media-gallery-panel">
      <div className="media-gallery-header">
        <h2>Media</h2>
        <div className="media-filter-row">
          <button className={`media-filter-btn ${filter === "all" ? "media-filter-active" : ""}`} onClick={() => setFilter("all")}>
            All ({mediaMessages.length})
          </button>
          <button className={`media-filter-btn ${filter === "images" ? "media-filter-active" : ""}`} onClick={() => setFilter("images")}>
            Photos ({images.length})
          </button>
          <button className={`media-filter-btn ${filter === "audio" ? "media-filter-active" : ""}`} onClick={() => setFilter("audio")}>
            Audio ({audioFiles.length})
          </button>
          <button className={`media-filter-btn ${filter === "documents" ? "media-filter-active" : ""}`} onClick={() => setFilter("documents")}>
            Documents ({documents.length})
          </button>
        </div>
      </div>

      <div className="media-gallery-content">
        {mediaMessages.length === 0 ? (
          <div className="media-gallery-empty">
            <div className="media-gallery-empty-icon">🖼️</div>
            <p>No media shared yet</p>
            <p className="media-gallery-empty-hint">Photos and voice messages will appear here</p>
          </div>
        ) : (
          <>
            {(filter === "all" || filter === "images") && images.length > 0 && (
              <div className="media-section">
                <h3 className="media-section-title">Photos</h3>
                <div className="media-image-grid">
                  {images.map((msg) => (
                    <div key={msg._id} className="media-image-item">
                      <img
                        src={msg.imageUrl}
                        alt="Shared photo"
                        className="media-image-thumb"
                        onClick={() => setViewingImage(msg.imageUrl)}
                        loading="lazy"
                      />
                      <button
                        className="media-image-dl"
                        onClick={() => handleDownload(msg.imageUrl, `photo_${msg._id}.jpg`)}
                        title="Download"
                      >
                        ⬇
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(filter === "all" || filter === "audio") && audioFiles.length > 0 && (
              <div className="media-section">
                <h3 className="media-section-title">Voice Messages</h3>
                {Object.entries(groupByDate(audioFiles)).map(([date, items]) => (
                  <div key={date} className="media-date-group">
                    <span className="media-date-label">{date}</span>
                    {items.map((msg) => (
                      <div key={msg._id} className="media-audio-row">
                        <div className="media-audio-info">
                          <span className="media-audio-sender">{msg.sender === partnerName ? displayName : "You"}</span>
                          <audio controls preload="none" className="media-audio-player">
                            <source src={msg.audioUrl} />
                          </audio>
                        </div>
                        <button
                          className="media-audio-dl"
                          onClick={() => handleDownload(msg.audioUrl, `audio_${msg._id}.webm`)}
                          title="Download"
                        >
                          ⬇
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {(filter === "all" || filter === "documents") && documents.length > 0 && (
              <div className="media-section">
                <h3 className="media-section-title">Documents</h3>
                {Object.entries(groupByDate(documents)).map(([date, items]) => (
                  <div key={date} className="media-date-group">
                    <span className="media-date-label">{date}</span>
                    {items.map((msg) => (
                      <div key={msg._id} className="media-doc-row">
                        <span className="media-doc-icon">📄</span>
                        <div className="media-doc-info">
                          <span className="media-doc-sender">{msg.sender === partnerName ? displayName : "You"}</span>
                          <span className="media-doc-name">{msg.fileName || "Document"}</span>
                        </div>
                        <button
                          className="media-doc-dl"
                          onClick={() => handleDownload(msg.fileUrl, msg.fileName || `doc_${msg._id}`)}
                          title="Download"
                        >
                          ⬇
                        </button>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {viewingImage && (
        <ImageViewer imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
      )}
    </div>
  );
}

export default MediaGallery;
