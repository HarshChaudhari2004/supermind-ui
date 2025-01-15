import React, { useState, useEffect } from "react";
import "./Card.css";

function Card({ thumbnailUrl, url, onClick }) {
  const [imageUrl, setImageUrl] = useState(thumbnailUrl);
  
  const getCardType = (url) => {
    if (url?.includes('youtube.com') || url?.includes('youtu.be')) {
      return 'youtube';
    } else if (url?.includes('instagram.com')) {
      return 'instagram';
    }
    return 'website';
  };

  const cardType = getCardType(url);

  useEffect(() => {
    if (!thumbnailUrl || thumbnailUrl.startsWith("/assets/")) return;
    if (cardType !== 'youtube') {
      const proxyUrl = `https://proxy.corsfix.com/?${thumbnailUrl}`;
      fetch(proxyUrl)
        .then(response => response.blob())
        .then(imageBlob => setImageUrl(URL.createObjectURL(imageBlob)))
        .catch(() => setImageUrl("/assets/image-placeholder.png"));
    }
  }, [thumbnailUrl, cardType]);

  return (
    <div className={`card ${cardType}-card`} onClick={onClick}>
      <img
        src={cardType === 'youtube' ? thumbnailUrl : (imageUrl || "/assets/infinity.png")}
        alt=""
        className={`card-thumbnail ${cardType}-thumbnail`}
      />
    </div>
  );
}

export default Card;
