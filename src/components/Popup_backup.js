import React, { useState, useEffect } from 'react';
import './Popup.css';
import { supabase } from '../lib/supabase';

// Format URL for iframe src based on domain - Now prioritizes Chromium webview
const getIframeSrc = (url) => {
  if (!url) return null;
  
  // Handle YouTube URLs - these work fine directly (keep direct iframe for optimal performance)
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    const videoId = extractYouTubeId(url);
    return `https://www.youtube.com/embed/${videoId}`;
  }
  
  // For all other websites, we'll prioritize Chromium webview in the component logic
  // This function now mainly handles YouTube and fallback scenarios
  
  // List of websites that typically block iframe embedding
  const blockedDomains = [
    'reddit.com',
    'xda-developers.com',
    'stackoverflow.com',
    'github.com',
    'medium.com',
    'twitter.com',
    'x.com',
    'linkedin.com',
    'facebook.com',
    'forbes.com',
    'pinterest.com'
  ];
  
  // Check if the URL contains any blocked domains
  const isBlocked = blockedDomains.some(domain => url.includes(domain));
  
  if (isBlocked) {
    // Use our webpage proxy for blocked domains (fallback)
    return `http://localhost:8000/api/proxy-webpage/?url=${encodeURIComponent(url)}`;
  }
  
  // Return other URLs as is (they might work directly as final fallback)
  return url;
};

export default function Popup({ cardData, onClose, isDarkTheme }) {
  // State variables
  const [notes, setNotes] = useState(cardData?.user_notes || ''); // Load existing notes
  const [noteSaving, setNoteSaving] = useState(false);
  const [tags, setTags] = useState(
    cardData?.Tags ? 
    cardData.Tags.split(',').map(tag => tag.trim()) : 
    []
  );
  const [iframeError, setIframeError] = useState(false);
  const [showFullTitle, setShowFullTitle] = useState(false);
  const [imageUrl] = useState(cardData?.["Thumbnail URL"]);
  const [showFullSummary, setShowFullSummary] = useState(false);
  const [showFullTags, setShowFullTags] = useState(false);
  const [instagramEmbedHTML, setInstagramEmbedHTML] = useState(null);
  const [usingProxy, setUsingProxy] = useState(false);
  const [retryWithProxy, setRetryWithProxy] = useState(false);
  const [useWebview, setUseWebview] = useState(false);
  const [isElectron, setIsElectron] = useState(false);
  const [loadingStrategy, setLoadingStrategy] = useState('webview'); // Start with webview
  
  // New state for UI improvements
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);
  const [popupSize, setPopupSize] = useState({ width: 1400, height: 800 });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [tagsExpanded, setTagsExpanded] = useState(false);

  // Check if running in Electron and set optimal default strategy
  useEffect(() => {
    const checkElectron = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      if (userAgent.indexOf('electron') > -1) {
        setIsElectron(true);
        setUseWebview(true); // Auto-enable webview for Electron
        setLoadingStrategy('webview'); // Chromium first in Electron
      } else {
        // If not in Electron, start with proxy strategy
        setLoadingStrategy('proxy');
      }
    };
    checkElectron();
  }, []);

  // Handle resize functionality
  const handleResizeStart = (e) => {
    setIsResizing(true);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: popupSize.width,
      height: popupSize.height
    });
  };

  const handleResizeMove = (e) => {
    if (!isResizing) return;
    
    const deltaX = e.clientX - resizeStart.x;
    const deltaY = e.clientY - resizeStart.y;
    
    const newWidth = Math.max(800, resizeStart.width + deltaX);
    const newHeight = Math.max(600, resizeStart.height + deltaY);
    
    setPopupSize({ width: newWidth, height: newHeight });
  };

  const handleResizeEnd = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResizeMove);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, resizeStart]);

  // Handle "Escape" key to close popup and disable background scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = 'auto';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Fetch Instagram embed iframe (alternative to oEmbed API)
  useEffect(() => {
    if (cardData?.url?.includes('instagram.com')) {
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
    if (e.key === 'Enter' && e.target.value.trim()) {
      const newTag = e.target.value.trim();
      if (!tags.includes(newTag)) { // Prevent duplicate tags
        setTags([...tags, newTag]);
      }
      e.target.value = '';
    }
  };

  // Truncate text to a specified limit
  const truncateText = (text, limit) => {
    if (text?.length <= limit) return text;
    return text?.substring(0, limit) + '...';
  };

  // Add helper function to check text selection
  const hasSelectedText = () => {
    return window.getSelection().toString().length > 0;
  };

  // Render Electron webview (Chromium instance) - Clean version without indicators
  const renderWebview = () => {
    return (
      <div className="webview-container">
        <webview
          src={cardData.url || cardData.original_url}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            borderRadius: '8px'
          }}
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
          allowpopups="true"
          webSecurity="false"
          nodeIntegration="false"
          contextIsolation="true"
          preload=""
          onLoadCommit={() => {
            console.log('Webview loading started');
          }}
          onDomReady={() => {
            console.log('Webview DOM ready');
          }}
          onLoadStop={() => {
            console.log('Webview loading completed');
          }}
        />
      </div>
    );
  };

  // Render content based on URL type with new priority: Webview → Proxy → Direct Iframe
  const renderContent = () => {
    if (cardData?.url?.includes('instagram.com')) {
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
                src={imageUrl || "/assets/image-placeholder.png"}
                alt={cardData.Title}
                className="instagram-image"
              />
            </div>
          )}
        </div>
      );
    }

    if (cardData?.url?.includes('youtube')) {
      return (
        <iframe
          src={`https://www.youtube.com/embed/${extractYouTubeId(cardData.url)}`}
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
    if (isElectron && useWebview && loadingStrategy === 'webview') {
      return renderWebview();
    }
    
    // 2. SECOND CHOICE: Django Proxy (if webview fails or not in Electron)
    if (loadingStrategy === 'proxy' || (isElectron && loadingStrategy === 'proxy')) {
      let iframeSrc = getIframeSrc(cardData.url);
      
      // Force proxy for better compatibility
      if (!cardData.url?.includes('youtube')) {
        iframeSrc = `http://localhost:8000/api/proxy-webpage/?url=${encodeURIComponent(cardData.url)}`;
        setUsingProxy(true);
      }
      
      return (
        <div className="iframe-container">
          <div className="proxy-indicator">
            <span>📡 Loading via Django proxy</span>
            {isElectron && (
              <button 
                className="switch-to-webview"
                onClick={() => {
                  setLoadingStrategy('webview');
                  setUseWebview(true);
                }}
              >
                � Switch to Chromium View
              </button>
            )}
          </div>
          <iframe
            src={iframeSrc}
            width="1280"
            height="720"
            title="Preview"
            sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-top-navigation"
            referrerPolicy="origin"
            onError={() => {
              // If proxy fails, try direct iframe as final fallback
              setLoadingStrategy('direct');
              setIframeError(false);
            }}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      );
    }

    // 3. FINAL FALLBACK: Direct Iframe
    if (!iframeError && loadingStrategy === 'direct') {
      const iframeSrc = getIframeSrc(cardData.url);
      
      return (
        <div className="iframe-container">
          <div className="direct-iframe-indicator">
            <span>🔗 Direct website loading</span>
            <div className="loading-options">
              {isElectron && (
                <button 
                  className="switch-to-webview"
                  onClick={() => {
                    setLoadingStrategy('webview');
                    setUseWebview(true);
                  }}
                >
                  🚀 Switch to Chromium View
                </button>
              )}
              <button 
                className="switch-to-proxy"
                onClick={() => {
                  setLoadingStrategy('proxy');
                  setIframeError(false);
                }}
              >
                📡 Try Proxy
              </button>
            </div>
          </div>
          <iframe
            src={iframeSrc}
            width="1280"
            height="720"
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
          src={imageUrl || "/assets/image-placeholder.png"}
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
        <div className="loading-options">
          {isElectron && (
            <button 
              className="webview-button"
              onClick={() => {
                setLoadingStrategy('webview');
                setUseWebview(true);
                setIframeError(false);
              }}
            >
              🚀 Open in Chromium View
            </button>
          )}
          <button 
            className="proxy-button"
            onClick={() => {
              setLoadingStrategy('proxy');
              setIframeError(false);
            }}
          >
            📡 Try Proxy Loading
          </button>
          <button 
            className="direct-button"
            onClick={() => {
              setLoadingStrategy('direct');
              setIframeError(false);
            }}
          >
            🔗 Try Direct Loading
          </button>
        </div>
      </div>
    );
  };

  // Conditional rendering for Note type
  if (cardData.video_type === 'note') {
    return (
      <div className={`popup-overlay ${isDarkTheme ? 'dark-theme' : 'light-theme'}`} onClick={onClose}>
        <div className={`popup-content note-popup ${isDarkTheme ? 'dark-theme' : 'light-theme'}`} onClick={(e) => e.stopPropagation()}>
          <div className="popup-right note-popup-right"> 
            {/* Use popup-right styling but allow it to take full width */}
            <h2 
              className={`truncated-title ${showFullTitle ? 'full-title' : ''}`} 
              onClick={(e) => { if (!hasSelectedText()) { setShowFullTitle(!showFullTitle); } }}
              title={cardData.Title}
            >
              {showFullTitle ? cardData.Title : truncateText(cardData.Title, 100)}
            </h2>
            
            <div className="section-label">Note Content:</div>
            <textarea
              className="note-content-area" // Use a specific class for notes
              placeholder="Add your notes here..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ color: isDarkTheme ? 'white' : 'black' }}
            />

            <div className="section-label">Tags:</div>
            <div
              className="tags"
              onClick={(e) => { if (!hasSelectedText()) { setShowFullTags(!showFullTags); } }}
            >
              {showFullTags ? tags.map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              )) : tags.slice(0, 15).map((tag, index) => (
                <span key={index} className="tag">{tag}</span>
              ))}
              <input
                type="text"
                placeholder="Add a tag..."
                onKeyPress={handleTagAdd}
              />
            </div>

            <div className="popup-buttons">
              <button title="Delete" style={{ backgroundImage: 'url("/assets/delete.png")', backgroundSize: '20px 20px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}/>
              <button title="Share" style={{ backgroundImage: 'url("/assets/share.png")', backgroundSize: '20px 20px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}/>
              <button
                title="Save"
                style={{ backgroundImage: 'url("/assets/save.png")', backgroundSize: '20px 20px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
                disabled={noteSaving}
                onClick={async () => {
                  if (!notes.trim()) return;
                  setNoteSaving(true);
                  try {
                    const { error } = await supabase
                      .from('content')
                      .update({ user_notes: notes })
                      .eq('id', cardData.id);
                    if (error) throw error;
                    onClose();
                    window.location.reload(); // Quick refresh for now
                  } catch (err) {
                    alert(err.message || 'Failed to save note');
                  } finally {
                    setNoteSaving(false);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Original return statement for non-note types
  return (
    <div className={`popup-overlay ${isDarkTheme ? 'dark-theme' : 'light-theme'}`} onClick={onClose}>
      <div className={`popup-content ${isDarkTheme ? 'dark-theme' : 'light-theme'}`} onClick={(e) => e.stopPropagation()}>
        <div className="popup-left">
          {renderContent()}
          {/* Ensure original URL is used for the visit button */}
          <a
            href={cardData.original_url || cardData.url} 
            target="_blank"
            rel="noopener noreferrer"
            className="visit-button"
          >
            Visit Original
          </a>
        </div>
        <div className="popup-right">
          <h2 
            className={`truncated-title ${showFullTitle ? 'full-title' : ''}`} 
            onClick={(e) => {
              if (!hasSelectedText()) {
                setShowFullTitle(!showFullTitle);
              }
            }}
            title={cardData.Title}
          >
            {showFullTitle ? cardData.Title : truncateText(cardData.Title, 100)}
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
            {showFullSummary ? cardData.Summary : truncateText(cardData.Summary, 700)}
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
            {showFullTags ? tags.map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            )) : tags.slice(0, 15).map((tag, index) => (
              <span key={index} className="tag">{tag}</span>
            ))}
            <input
              type="text"
              placeholder="Add a tag..."
              onKeyPress={handleTagAdd}
            />
          </div>
          <textarea
            placeholder="Add your notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            style={{ color: isDarkTheme ? 'white' : 'black' }}
          />
          <div className="popup-buttons">
            <button title="Delete" style={{ backgroundImage: 'url("/assets/delete.png")', backgroundSize: '20px 20px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}/>
            <button title="Share" style={{ backgroundImage: 'url("/assets/share.png")', backgroundSize: '20px 20px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}/>
            <button
              title="Save"
              style={{ backgroundImage: 'url("/assets/save.png")', backgroundSize: '20px 20px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}
              disabled={noteSaving}
              onClick={async () => {
                if (!notes.trim()) return;
                setNoteSaving(true);
                try {
                  const { error } = await supabase
                    .from('content')
                    .update({ user_notes: notes })
                    .eq('id', cardData.id);
                  if (error) throw error;
                  onClose();
                  window.location.reload(); // Quick refresh for now
                } catch (err) {
                  alert(err.message || 'Failed to save note');
                } finally {
                  setNoteSaving(false);
                }
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Extract Instagram post ID from URL
function extractInstagramPostId(url) {
  const match = url?.match(/instagram\.com\/p\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
  const regExp = /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([\w-]{11})/;
  const match = url?.match(regExp);
  return match ? match[1] : null;
}
