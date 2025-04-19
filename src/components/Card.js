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
    if (!thumbnailUrl || thumbnailUrl.startsWith("/assets/")) {
      setIsLoading(false);
      return;
    }
    
    if (cardType !== 'youtube' && cardType !== 'note') {
      // Use proxy for non-YouTube thumbnails
      const proxyUrl = `https://proxy.corsfix.com/?${thumbnailUrl}`;
      fetch(proxyUrl)
        .then(response => response.blob())
        .then(imageBlob => {
          setImageUrl(URL.createObjectURL(imageBlob));
          setIsLoading(false);
        })
        .catch(() => {
          setImageUrl("/assets/image-placeholder.png");
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
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
        src={cardType === 'youtube' ? thumbnailUrl : (imageUrl || "/assets/image-placeholder.png")}
        alt={title || ""}
        className={`card-thumbnail ${cardType}-thumbnail`}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          e.target.src = "/assets/image-placeholder.png";
          setIsLoading(false);
        }}
      />
    </div>
  );
}

export default Card;
