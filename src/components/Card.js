import React, { useState, useEffect } from "react";
import "./Card.css";

function Card({ thumbnailUrl, url, title, type, dateAdded, content, onClick }) {
  const [imageUrl, setImageUrl] = useState(thumbnailUrl);
  const [isLoading, setIsLoading] = useState(true);
  
  const getCardType = (url, type) => {
    if (type === 'note') return 'note';
    if (url?.includes('youtube.com') || url?.includes('youtu.be')) return 'youtube';
    if (url?.includes('instagram.com')) {
      // Check if it's a video/reel or regular post
      return url.includes('/reel/') || url.includes('/tv/') ? 'instagram' : 'instagram-image';
    }
    return 'website';
  };

  const cardType = getCardType(url, type);

  useEffect(() => {
    if (!thumbnailUrl || thumbnailUrl.startsWith("./assets/")) {
      setIsLoading(false);
      return;
    }

    const fetchAndCacheImage = async () => {
      try {
        const cache = await caches.open('image-cache');
        const cachedResponse = await cache.match(thumbnailUrl);

        if (cachedResponse) {
          setImageUrl(URL.createObjectURL(await cachedResponse.blob()));
          setIsLoading(false);
          return;
        }

        // Use proxy for non-YouTube thumbnails to bypass CORS
        if (cardType !== 'youtube' && cardType !== 'note') {
          const proxyUrl = `http://localhost:8000/api/proxy-image/?url=${encodeURIComponent(thumbnailUrl)}`;
          const response = await fetch(proxyUrl);

          if (response.ok) {
            cache.put(thumbnailUrl, response.clone());
            setImageUrl(URL.createObjectURL(await response.blob()));
          } else {
            console.error(`Failed to fetch image: ${response.statusText}`);
          }
        } else {
          // YouTube thumbnails work directly, no proxy needed
          setImageUrl(thumbnailUrl);
        }
      } catch (error) {
        console.error(`Error caching image: ${error}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndCacheImage();
  }, [thumbnailUrl, cardType]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (cardType === 'note') {
    return (
      <div className="card note-card" onClick={onClick}>
        <div className="note-content">{content || title}</div>
        <div className="note-date">{formatDate(dateAdded)}</div>
      </div>
    );
  }

  return (
    <div className={`card ${cardType}-card ${isLoading ? 'loading-placeholder' : ''}`} onClick={onClick}>
      <img
        src={cardType === 'youtube' ? thumbnailUrl : (imageUrl || "./assets/image-placeholder.png")}
        alt={title || ""}
        className={`card-thumbnail ${cardType}-thumbnail`}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          e.target.src = "./assets/image-placeholder.png";
          setIsLoading(false);
        }}
      />
      {/* Show user notes if they exist */}
      {content && (
        <div className="card-notes-overlay">
          <div className="notes-text">{content}</div>
        </div>
      )}
    </div>
  );
}

export default Card;
