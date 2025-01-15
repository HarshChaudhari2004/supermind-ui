import React, { useState, useEffect } from 'react';
import './Popup.css';

export default function Popup({ cardData, onClose, isDarkTheme }) {
  // State variables
  const [notes, setNotes] = useState('');
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
      setTags([...tags, e.target.value.trim()]);
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

  // Render content based on URL type
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
    if (!iframeError) {
      return (
        <iframe
          src={cardData.url}
          width="1280"
          height="720"
          title="Preview"
          sandbox="allow-same-origin allow-scripts"
          onError={() => setIframeError(true)}
        />
      );
    }
    return (
      <div className="fallback-content">
        <img 
          src={imageUrl || "/assets/image-placeholder.png"}
          alt={cardData.Title}
          className="fallback-image"
        />
        <a 
          href={cardData.url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="visit-button"
        >
          Visit Original
        </a>
      </div>
    );
  };

  return (
    <div className={`popup-overlay ${isDarkTheme ? 'dark-theme' : 'light-theme'}`} onClick={onClose}>
      <div className={`popup-content ${isDarkTheme ? 'dark-theme' : 'light-theme'}`} onClick={(e) => e.stopPropagation()}>
        <div className="popup-left">
          {renderContent()}
          <a
            href={cardData.url}
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
            <button style={{ backgroundImage: 'url("/assets/delete.png")', backgroundSize: '20px 20px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}/>
            <button style={{ backgroundImage: 'url("/assets/share.png")', backgroundSize: '20px 20px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}/>
            <button style={{ backgroundImage: 'url("/assets/save.png")', backgroundSize: '20px 20px', backgroundRepeat: 'no-repeat', backgroundPosition: 'center' }}/>
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
