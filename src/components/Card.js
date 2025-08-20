import React, { useState, useEffect, useRef } from "react";
import "./Card.css";
import { failedImageCache, getCachedImageState, setCachedImageState } from "../lib/cacheUtils";

function Card({ thumbnailUrl, url, title, type, dateAdded, content, onClick }) {
  const [imageUrl, setImageUrl] = useState(thumbnailUrl);
  const [isLoading, setIsLoading] = useState(true);
  const [imageError, setImageError] = useState(false);
  const retryCountRef = useRef(0);
  const cardRef = useRef(null); // For component mounting check
  const maxRetries = 2;
  
  // Generate a unique cardId for logging purposes
  const cardId = url || title || 'unknown-card';
  
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

    // Check if this image has already failed multiple times
    if (failedImageCache.has(thumbnailUrl)) {
      setImageError(true);
      setIsLoading(false);
      return;
    }

    // Check if we have a cached state for this image
    const cachedState = getCachedImageState(thumbnailUrl);
    if (cachedState) {
      // console.log(`Using cached image state for ${cardId}:`, cachedState.status);
      if (cachedState.status === 'success' && cachedState.imageUrl) {
        setImageUrl(cachedState.imageUrl);
        setImageError(false);
        setIsLoading(false);
        return;
      } else if (cachedState.status === 'failed') {
        setImageError(true);
        setIsLoading(false);
        return;
      }
    }

    const fetchAndCacheImage = async () => {
      try {
        // Always use the server-side proxy for caching - it has file-based cache
        // This eliminates browser cache issues and ensures consistent behavior
        if (cardType !== 'youtube' && cardType !== 'note') {
          const proxyUrl = `http://localhost:8000/instagram/api/proxy-image/?url=${encodeURIComponent(thumbnailUrl)}`;
          
          const response = await fetch(proxyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'image/*',
            },
            // Add timeout to prevent hanging requests
            signal: AbortSignal.timeout(10000) // 10 second timeout
          });

          if (response.ok) {
            const blob = await response.blob();
            // Validate that we got an actual image
            if (blob.type.startsWith('image/') && blob.size > 0) {
              const imageUrl = URL.createObjectURL(blob);
              setImageUrl(imageUrl);
              setImageError(false);
              retryCountRef.current = 0; // Reset retry count on success
              
              // Cache the successful state
              setCachedImageState(thumbnailUrl, {
                status: 'success',
                imageUrl: imageUrl,
                cardType: cardType
              });
              
              // console.log(`Successfully loaded and cached image for ${cardId}`);
            } else {
              throw new Error('Response is not a valid image or is empty');
            }
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        } else if (cardType === 'youtube') {
          // YouTube thumbnails work directly, no proxy needed
          const response = await fetch(thumbnailUrl, {
            signal: AbortSignal.timeout(5000) // 5 second timeout for YouTube
          });
          if (response.ok) {
            setImageUrl(thumbnailUrl);
            setImageError(false);
            retryCountRef.current = 0;
            
            // Cache the successful state for YouTube
            setCachedImageState(thumbnailUrl, {
              status: 'success',
              imageUrl: thumbnailUrl,
              cardType: cardType
            });
          } else {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
        }
      } catch (error) {
        // Use warn instead of error to prevent console noise and potential cascading issues
        console.warn(`Image load failed for card ${cardId} (attempt ${retryCountRef.current + 1}):`, error.message);
        
        retryCountRef.current += 1;
        
        if (retryCountRef.current >= maxRetries) {
          // Mark this URL as permanently failed but don't throw errors
          failedImageCache.add(thumbnailUrl);
          setImageError(true);
          
          // Cache the failed state
          setCachedImageState(thumbnailUrl, {
            status: 'failed',
            cardType: cardType,
            reason: error.message
          });
          
          console.info(`Image ${thumbnailUrl} failed after ${maxRetries} attempts, using placeholder`);
        } else {
          // Retry with exponential backoff but with shorter delays to prevent hanging
          const retryDelay = Math.min(Math.pow(2, retryCountRef.current) * 500, 3000); // Max 3 seconds
          setTimeout(() => {
            // Check if component is still mounted and we haven't exceeded retries
            if (retryCountRef.current < maxRetries && document.contains(cardRef.current)) {
              fetchAndCacheImage();
            }
          }, retryDelay);
          return; // Don't set loading to false yet
        }
      } finally {
        // Only set loading to false when we're done trying or succeeded
        if (retryCountRef.current >= maxRetries || retryCountRef.current === 0) {
          setIsLoading(false);
        }
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
      <div ref={cardRef} className="card note-card" onClick={onClick}>
        <div className="note-content">{content || title}</div>
        <div className="note-date">{formatDate(dateAdded)}</div>
      </div>
    );
  }

  return (
    <div ref={cardRef} className={`card ${cardType}-card ${isLoading ? 'loading-placeholder' : ''}`} onClick={onClick}>
      <img
        src={imageError || !imageUrl ? "./assets/image-placeholder.png" : 
             (cardType === 'youtube' ? thumbnailUrl : imageUrl)}
        alt={title || ""}
        className={`card-thumbnail ${cardType}-thumbnail ${imageError ? 'error-placeholder' : ''}`}
        onLoad={() => setIsLoading(false)}
        onError={(e) => {
          // Only set placeholder if we haven't already detected an error
          if (!imageError) {
            e.target.src = "./assets/image-placeholder.png";
          }
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
