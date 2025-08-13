import React, { useState, useEffect } from "react";
import "./Popup.css";
import { supabase } from "../lib/supabase";
import NoteEditor from "./NoteEditor";

// Format URL for iframe src based on domain - Now prioritizes Chromium webview
const getIframeSrc = (url) => {
  if (!url) return null;

  // Handle YouTube URLs - these work fine directly (keep direct iframe for optimal performance)
  if (url.includes("youtube.com") || url.includes("youtu.be")) {
    const videoId = extractYouTubeId(url);
    return `https://www.youtube.com/embed/${videoId}`;
  }

  // For all other websites, we'll prioritize Chromium webview in the component logic
  // This function now mainly handles YouTube and fallback scenarios

  // List of websites that typically block iframe embedding
  const blockedDomains = [
    "reddit.com",
    "xda-developers.com",
    "stackoverflow.com",
    "github.com",
    "medium.com",
    "twitter.com",
    "x.com",
    "linkedin.com",
    "facebook.com",
    "forbes.com",
    "pinterest.com",
    "styles.redditmedia.com"
  ];

  // Check if the URL contains any blocked domains
  const isBlocked = blockedDomains.some((domain) => url.includes(domain));

  if (isBlocked) {
    // Use our webpage proxy for blocked domains (fallback)
    return `http://localhost:8000/api/proxy-webpage/?url=${encodeURIComponent(
      url
    )}`;
  }

  // Return other URLs as is (they might work directly as final fallback)
  return url;
};

export default function Popup({ cardData, onClose, isDarkTheme }) {
  // Delete confirmation modal state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // For note type popup
  const [showDeleteNoteConfirm, setShowDeleteNoteConfirm] = useState(false);
  const [deletingNote, setDeletingNote] = useState(false);
  // State variables
  // Markdown note state
  const [noteContent, setNoteContent] = useState(cardData?.user_notes || "");
  const [noteSaving, setNoteSaving] = useState(false);
  const [editorFullscreen, setEditorFullscreen] = useState(false);
  const [tags, setTags] = useState(
    cardData?.Tags ? cardData.Tags.split(",").map((tag) => tag.trim()) : []
  );
  const [iframeError, setIframeError] = useState(false);
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [imageUrl] = useState(cardData?.["Thumbnail URL"]);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showFullTags, setShowFullTags] = useState(false);
  const [instagramEmbedHTML, setInstagramEmbedHTML] = useState(null);
  const [isElectron, setIsElectron] = useState(false);
  const [useWebview, setUseWebview] = useState(false);
  const [loadingStrategy, setLoadingStrategy] = useState("webview"); // Start with webview
  // Popup size state (persisted)
  const [popupSize, setPopupSize] = useState(() => {
    const saved = localStorage.getItem("popupSize");
    if (saved) {
      try {
        const obj = JSON.parse(saved);
        if (
          obj &&
          typeof obj.width === "number" &&
          typeof obj.height === "number"
        )
          return obj;
      } catch {}
    }
    return {
      width: Math.round(window.innerWidth * 0.8),
      height: Math.round(window.innerHeight * 0.8),
    };
  });
  // Collapse state for right panel
  const [rightCollapsed, setRightCollapsed] = useState(false);
  // Refs for popup and resizing
  const popupRef = React.useRef();
  const resizingRef = React.useRef(false);

  // Check if running in Electron and set optimal default strategy
  useEffect(() => {
    const checkElectron = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.indexOf("electron") > -1) {
        setIsElectron(true);
        setUseWebview(true); // Auto-enable webview for Electron
        setLoadingStrategy("webview"); // Chromium first in Electron
      } else {
        // If not in Electron, start with proxy strategy
        setLoadingStrategy("proxy");
      }
    };
    checkElectron();
  }, []);

  // Handle "Escape" key to close popup and disable background scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "auto";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Save popup size to localStorage when changed
  useEffect(() => {
    localStorage.setItem("popupSize", JSON.stringify(popupSize));
  }, [popupSize]);

  // Fetch Instagram embed iframe (alternative to oEmbed API)
  useEffect(() => {
    if (cardData?.url?.includes("instagram.com")) {
      const instagramUrl = cardData.url;
      const postId = extractInstagramPostId(instagramUrl);
      if (postId) {
        // Construct the embed URL, tailored for Instagram Reels (video only)
        const embedUrl = `https://www.instagram.com/p/${postId}/embed`;

        setInstagramEmbedHTML(embedUrl); // Set the iframe URL
      }
    }
  }, [cardData]);

  // Handle adding new tags
  const handleTagAdd = (e) => {
    if (e.key === "Enter" && e.target.value.trim()) {
      const newTag = e.target.value.trim();
      if (!tags.includes(newTag)) {
        // Prevent duplicate tags
        setTags([...tags, newTag]);
      }
      e.target.value = "";
    }
  };

  // Truncate text to a specified limit
  const truncateText = (text, limit) => {
    if (text?.length <= limit) return text;
    return text?.substring(0, limit) + "...";
  };

  // Add helper function to check text selection
  const hasSelectedText = () => {
    return window.getSelection().toString().length > 0;
  };

  // Render Electron webview (Chromium instance) - Now the primary loading method
  const renderWebview = () => {
    return (
      <div className="webview-container">
        <webview
          src={cardData.url || cardData.original_url}
          style={{
            width: "100%",
            height: "100%",
            border: "none",
          }}
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          allowpopups="true"
          webSecurity="false"
          nodeIntegration="false"
          contextIsolation="true"
          preload=""
        />
      </div>
    );
  };

  // Render content based on URL type with new priority: Webview → Proxy → Direct Iframe
  const renderContent = () => {
    if (cardData?.url?.includes("instagram.com")) {
      return (
        <div className="fallback-content instagram-content">
          {instagramEmbedHTML ? (
            <iframe
              src={instagramEmbedHTML}
              width="720px"
              height="1280px"
              frameBorder="0"
              allowTransparency="true"
              scrolling="no"
              className="instagram-reel-video"
              title="Instagram Embed"
            />
          ) : (
            <div className="instagram-thumbnail-wrapper">
              <img
                src={imageUrl || "./assets/image-placeholder.png"}
                alt={cardData.Title}
                className="instagram-image"
              />
            </div>
          )}
        </div>
      );
    }

    if (cardData?.url?.includes("youtube")) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${extractYouTubeId(
            cardData.url
          )}`}
          width="1280"
          height="720"
          frameBorder="0"
          padding="10"
          allowFullScreen
          title="YouTube Video"
        />
      );
    }

    // NEW PRIORITY ORDER: Webview → Proxy → Direct Iframe

    // 1. FIRST CHOICE: Chromium Webview (if in Electron)
    if (isElectron && useWebview && loadingStrategy === "webview") {
      return renderWebview();
    }

    // 2. SECOND CHOICE: Django Proxy (if webview fails or not in Electron)
    if (
      loadingStrategy === "proxy" ||
      (isElectron && loadingStrategy === "proxy")
    ) {
      let iframeSrc = getIframeSrc(cardData.url);
      // Force proxy for better compatibility
      if (!cardData.url?.includes("youtube")) {
        iframeSrc = `http://localhost:8000/api/proxy-webpage/?url=${encodeURIComponent(
          cardData.url
        )}`;
      }
      return (
        <div className="iframe-container">
          <iframe
            src={iframeSrc}
            width="100%"
            height="100%"
            title="Preview"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
            referrerPolicy="origin"
            onError={() => {
              // If proxy fails, try direct iframe as final fallback
              setLoadingStrategy("direct");
              setIframeError(false);
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }

    // 3. FINAL FALLBACK: Direct Iframe
    if (!iframeError && loadingStrategy === "direct") {
      const iframeSrc = getIframeSrc(cardData.url);
      return (
        <div className="iframe-container">
          <iframe
            src={iframeSrc}
            width="100%"
            height="100%"
            title="Preview"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
            referrerPolicy="origin"
            onError={() => setIframeError(true)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }

    // Fallback content when everything fails
    return (
      <div className="fallback-content">
        <img
          src={imageUrl || "./assets/image-placeholder.png"}
          alt={cardData.Title}
          className="fallback-image"
        />
        <a
          href={cardData.original_url}
          target="_blank"
          rel="noopener noreferrer"
          className="visit-button"
        >
          Visit Original
        </a>
      </div>
    );
  };

  // --- All hooks must be at the top level, so move useEffect hooks above this conditional ---
  // Conditional rendering for Note type
  let notePopup = null;
  if (cardData.video_type === "note") {
    notePopup = (
      <div
        className={`popup-overlay ${isDarkTheme ? "dark-theme" : "light-theme"}`}
        onClick={onClose}
      >
        <div
          className={`popup-content note-popup ${isDarkTheme ? "dark-theme" : "light-theme"}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Title Bar */}
          <div
            className="note-popup-titlebar"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "24px 36px 0 36px",
              borderBottom: "1.5px solid rgba(174,0,255,0.10)"
            }}
          >
            <h2
              className={`truncated-title ${showFullTitle ? "full-title" : ""}`}
              onClick={(e) => {
                if (!hasSelectedText()) setShowFullTitle(!showFullTitle);
              }}
              title={cardData.Title}
            >
              {showFullTitle
                ? cardData.Title
                : truncateText(cardData.Title, 100)}
            </h2>
            <div className="popup-buttons">
              <button
                title="Delete"
                style={{
                  backgroundImage: 'url("./assets/trash-can-solid-full.svg")',
                  backgroundSize: "36px 36px",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  width: 64,
                  height: 64,
                  border: "none",
                  borderRadius: 8,
                  backgroundColor: "transparent",
                  cursor: "pointer",
                }}
                onClick={() => setShowDeleteNoteConfirm(true)}
                disabled={deletingNote}
              />
              <button
                title="Share"
                style={{
                  backgroundImage: 'url("./assets/share.png")',
                  backgroundSize: "36px 36px",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  width: 64,
                  height: 64,
                  border: "none",
                  borderRadius: 8,
                  backgroundColor: "transparent",
                  cursor: "pointer",
                }}
                onClick={() => alert("Share not implemented yet")}
              />
              <button
                title="Save"
                style={{
                  backgroundImage: 'url("./assets/save.png")',
                  backgroundSize: "36px 36px",
                  backgroundRepeat: "no-repeat",
                  backgroundPosition: "center",
                  width: 64,
                  height: 64,
                  border: "none",
                  borderRadius: 8,
                  backgroundColor: noteSaving ? "#ccc" : "#AE00FF",
                  cursor: noteSaving ? "not-allowed" : "pointer",
                }}
                disabled={noteSaving}
                onClick={async () => {
                  if (!noteContent.trim()) return;
                  setNoteSaving(true);
                  try {
                    const { error } = await supabase
                      .from("content")
                      .update({ user_notes: noteContent })
                      .eq("id", cardData.id);
                    if (error) throw error;
                    onClose();
                    window.location.reload();
                  } catch (err) {
                    alert(err.message || "Failed to save note");
                  } finally {
                    setNoteSaving(false);
                  }
                }}
              />
            </div>
            {/* Delete confirmation modal for note */}
            {showDeleteNoteConfirm && (
              <div className="popup-delete-modal-overlay" onClick={() => !deletingNote && setShowDeleteNoteConfirm(false)}>
                <div className="popup-delete-modal" onClick={e => e.stopPropagation()}>
                  <h2>Delete this note?</h2>
                  <p>Are you sure you want to delete this note? This action cannot be undone.</p>
                  <div className="popup-delete-modal-buttons">
                    <button
                      className="delete-btn"
                      disabled={deletingNote}
                      onClick={async () => {
                        setDeletingNote(true);
                        try {
                          const { error } = await supabase
                            .from("content")
                            .delete()
                            .eq("id", cardData.id);
                          if (error) throw error;
                          setShowDeleteNoteConfirm(false);
                          onClose();
                          window.location.reload();
                        } catch (err) {
                          alert(err.message || "Failed to delete note");
                        } finally {
                          setDeletingNote(false);
                        }
                      }}
                    >Delete</button>
                    <button
                      className="cancel-btn"
                      disabled={deletingNote}
                      onClick={() => setShowDeleteNoteConfirm(false)}
                    >Cancel</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {/* Tags */}
          <div style={{ padding: "18px 36px 0 36px" }}>
            <div className="section-label">
              Tags:
            </div>
          <div
            className="tags"
            onClick={(e) => {
              if (!hasSelectedText()) setShowFullTags(!showFullTags);
            }}
          >
              {showFullTags
                ? tags.map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))
                : tags.slice(0, 15).map((tag, index) => (
                    <span key={index} className="tag">
                      {tag}
                    </span>
                  ))}
              <input
                type="text"
                placeholder="Add a tag..."
                onKeyPress={handleTagAdd}
              />
            </div>
          </div>
          {/* Markdown Editor */}
          <div
            className="note-editor-root"
            style={{
              flex: 1,
              minHeight: 0,
              minWidth: 0,
              display: "flex",
              flexDirection: "column",
              margin: "18px 36px 36px 36px",
              overflow: "hidden",
              position: "relative"
            }}
          >
            <NoteEditor
              value={noteContent}
              onChange={setNoteContent}
              isDarkTheme={isDarkTheme}
              isFullscreen={editorFullscreen}
              onToggleFullscreen={setEditorFullscreen}
            />
          </div>
        </div>
      </div>
    );
  }

  // Original return statement for non-note types
  // Mouse events for resize tracking (always at top level)
  useEffect(() => {
    const handleMouseDown = (e) => {
      if (popupRef.current && e.target === popupRef.current) {
        // Check if mouse is near bottom-right corner (resize handle area)
        const rect = popupRef.current.getBoundingClientRect();
        if (
          e.clientX >= rect.right - 24 &&
          e.clientX <= rect.right &&
          e.clientY >= rect.bottom - 24 &&
          e.clientY <= rect.bottom
        ) {
          resizingRef.current = true;
        }
      }
    };
    const handleMouseUp = () => {
      resizingRef.current = false;
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // Handle resize and persist size
  const handleResize = (e) => {
    if (!popupRef.current) return;
    const rect = popupRef.current.getBoundingClientRect();
    // Clamp to 95vw/vh
    const maxWidth = Math.round(window.innerWidth * 0.95);
    const maxHeight = Math.round(window.innerHeight * 0.95);
    let width = Math.min(rect.width, maxWidth);
    let height = Math.min(rect.height, maxHeight);
    setPopupSize({ width, height });
  };

  // Overlay click handler: only close if not resizing
  const handleOverlayClick = (e) => {
    if (resizingRef.current) return;
    if (e.target === e.currentTarget) onClose();
  };

  // Add SVG filter for liquid glass effect
const LiquidGlassFilter = () => (
  <svg xmlns="http://www.w3.org/2000/svg" style={{ display: "none" }}>
    <defs>
      <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.008 0.008"
          numOctaves="2"
          seed="92"
          result="noise"
        />
        <feGaussianBlur in="noise" stdDeviation="2" result="blurred" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="blurred"
          scale="77"
          xChannelSelector="R"
          yChannelSelector="G"
        />
      </filter>
    </defs>
  </svg>
);

  // Render main popup (non-note type)
  const mainPopup = (
    <>
      <div
        className={`popup-overlay ${isDarkTheme ? "dark-theme" : "light-theme"}`}
        onClick={handleOverlayClick}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 9999,
          background: "rgba(0,0,0,0.6)",
        }}
      >
        <div
          ref={popupRef}
          className={`popup-content ${
            isDarkTheme ? "dark-theme" : "light-theme"
          }`}
          onClick={(e) => e.stopPropagation()}
          onMouseUp={handleResize}
          style={{
            resize: "both",
            overflow: "auto",
            maxWidth: "95vw",
            maxHeight: "95vh",
            minWidth: 400,
            minHeight: 300,
            width: popupSize.width,
            height: popupSize.height,
            display: "flex",
            flexDirection: "row",
            borderRadius: 16,
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            border: "none",
            position: "relative",
          }}
        >
          <div
            className="popup-left"
            style={{
              flex: rightCollapsed ? 1 : 1,
              minWidth: 0,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
            }}
          >
            {renderContent()}
            <a
              href={cardData.original_url || cardData.url}
              target="_blank"
              rel="noopener noreferrer"
              className="visit-button"
              style={{ marginTop: 12, alignSelf: "flex-end" }}
            >
              Visit Original
            </a>
          </div>
          {/* Collapse/Expand Button */}
          <button
            className="collapse-toggle-btn"
            style={{
              position: "absolute",
              top: 16,
              right: rightCollapsed ? 0 : "35%",
              zIndex: 10,
              background: "rgba(118, 0, 173, 1)",
              color: "white",
              border: "none",
              borderRadius: "8px 0 0 8px",
              padding: "6px 12px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 16,
              transition: "right 0.2s",
            }}
            onClick={() => setRightCollapsed((v) => !v)}
            title={rightCollapsed ? "Expand details" : "Collapse details"}
          >
            {rightCollapsed ? "⮜" : "⮞"}
          </button>
          {!rightCollapsed && (
            <div className="popup-right">
              {/* ...existing code... */}
                <h2
                  className={`truncated-title ${showFullTitle ? "full-title" : ""}`}
                  onClick={(e) => {
                    if (!hasSelectedText()) {
                      setShowFullTitle(!showFullTitle);
                    }
                  }}
                  title={cardData.Title}
                >
                  {showFullTitle
                    ? cardData.Title
                    : truncateText(cardData.Title, 100)}
                </h2>
                <div className="section-label">Summary:</div>
                <p
                  className="summary-text"
                  onClick={(e) => {
                    if (!hasSelectedText()) {
                      setShowFullSummary(!showFullSummary);
                    }
                  }}
                >
                  {showFullSummary
                    ? cardData.Summary
                    : truncateText(cardData.Summary, 700)}
                </p>
                <div className="section-label">Tags:</div>
                <div
                  className="tags"
                  onClick={(e) => {
                    if (!hasSelectedText()) {
                      setShowFullTags(!showFullTags);
                    }
                  }}
                >
                  {showFullTags
                    ? tags.map((tag, index) => (
                        <span key={index} className="tag">
                          {tag}
                        </span>
                      ))
                    : tags.slice(0, 15).map((tag, index) => (
                        <span key={index} className="tag">
                          {tag}
                        </span>
                      ))}
                  <input
                    type="text"
                    placeholder="Add a tag..."
                    onKeyPress={handleTagAdd}
                  />
                </div>
                {/* Removed old textarea for notes. Now using markdown editor. */}
                <div className="popup-buttons">
                  <button
                    title="Delete"
                    style={{
                      backgroundImage: 'url("./assets/trash-can-solid-full.svg")',
                      backgroundSize: "32px 32px",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={deleting}
                  />
                  <button
                    title="Share"
                    style={{
                      backgroundImage: 'url("/assets/share.png")',
                      backgroundSize: "32px 32px",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                  />
                  <button
                    title="Save"
                    style={{
                      backgroundImage: 'url("./assets/save.png")',
                      backgroundSize: "32px 32px",
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "center",
                    }}
                    disabled={noteSaving}
                    onClick={async () => {
                      if (!noteContent.trim()) return;
                      setNoteSaving(true);
                      try {
                        const { error } = await supabase
                          .from("content")
                          .update({ user_notes: noteContent })
                          .eq("id", cardData.id);
                        if (error) throw error;
                        onClose();
                        window.location.reload(); // Quick refresh for now
                      } catch (err) {
                        alert(err.message || "Failed to save note");
                      } finally {
                        setNoteSaving(false);
                      }
                    }}
                  />
                </div>
              </div>
          )}
        </div>
      </div>
      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div
          className="popup-overlay"
          style={{
            zIndex: 10001,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => !deleting && setShowDeleteConfirm(false)}
        >
          <div
            className="popup-content"
            style={{
              maxWidth: 400,
              height: "auto",
              width: "90vw",
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
              background: isDarkTheme ? "#1e1e1e" : "#fff",
              color: isDarkTheme ? "#fff" : "#222",
              padding: 32,
              position: "relative",
              textAlign: "center",
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{marginBottom: 24}}>Delete this card?</h2>
            <p style={{marginBottom: 32}}>Are you sure you want to delete this card? This action cannot be undone.</p>
            <div style={{display: "flex", gap: 16, justifyContent: "center"}}>
              <button
                style={{
                  background: "#ff4444",
                  color: "white",
                  fontWeight: "bold",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontSize: 18,
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
                disabled={deleting}
                onClick={async () => {
                  setDeleting(true);
                  try {
                    const { error } = await supabase
                      .from("content")
                      .delete()
                      .eq("id", cardData.id);
                    if (error) throw error;
                    setShowDeleteConfirm(false);
                    onClose();
                    window.location.reload();
                  } catch (err) {
                    alert(err.message || "Failed to delete card");
                  } finally {
                    setDeleting(false);
                  }
                }}
              >
                Delete
              </button>
              <button
                style={{
                  background: isDarkTheme ? "#333" : "#eee",
                  color: isDarkTheme ? "#fff" : "#222",
                  fontWeight: "bold",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 24px",
                  fontSize: 18,
                  cursor: deleting ? "not-allowed" : "pointer",
                  opacity: deleting ? 0.7 : 1,
                }}
                disabled={deleting}
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );

  if (cardData.video_type === "note") {
    return notePopup;
  }

  return mainPopup;
}

// Extract Instagram post ID from URL
function extractInstagramPostId(url) {
  const match = url?.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
  const regExp =
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/;
  const match = url?.match(regExp);
  return match ? match[1] : null;
}
