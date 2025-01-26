// supermind-ui/src/pages/Home.js
import React, { useState, useEffect } from "react";
import Masonry from 'react-masonry-css'; // Added import
import "./Home.css";
import Card from "../components/Card";
import Popup from "../components/Popup"; // Updated import
import { Analytics } from "@vercel/analytics/react"

function Home() {
  const [cardsData, setCardsData] = useState([]);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [layoutMode, setLayoutMode] = useState('medium'); // New state variable
  const [showLayoutOptions, setShowLayoutOptions] = useState(false); // For toggling layout options
  const [selectedCard, setSelectedCard] = useState(null); // New state variable

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    document.documentElement.classList.toggle('light-theme');
  };

  const toggleLayoutOptions = () => {
    setShowLayoutOptions(!showLayoutOptions);
  };

  const handleLayoutChange = (mode) => {
    setLayoutMode(mode);
    setShowLayoutOptions(false);
  };

  useEffect(() => {
    fetch("https://supermind-9fii.onrender.com/api/video-data/")
      .then((response) => {
        if (!response.ok) throw new Error("Error fetching data");
        return response.json();
      })
      .then((data) => {
        // Parse dates and sort oldest to newest
        const sortedData = data.sort((a, b) => {
          const dateA = new Date(a["Date Added"].replace(/-/g, '/'));
          const dateB = new Date(b["Date Added"].replace(/-/g, '/'));
          return dateA - dateB;  // Oldest first
        });
        setCardsData(sortedData);
      })
      .catch((error) => console.error("Error:", error));
  }, []);

  const filteredCardsData = cardsData.filter(card => {
    const search = searchQuery.toLowerCase();
    return (
      card.Title.toLowerCase().includes(search) ||
      card.Tags.toLowerCase().includes(search) ||
      card.Summary.toLowerCase().includes(search) ||
      card['Channel Name'].toLowerCase().includes(search)
    );
  });

  // Define breakpoint columns for masonry layout
  const breakpointColumnsObj = {
    default: layoutMode === 'large' ? 3 : layoutMode === 'medium' ? 4 : 5,
    1100: layoutMode === 'large' ? 2 : layoutMode === 'medium' ? 3 : 4,
    700: layoutMode === 'large' ? 1 : layoutMode === 'medium' ? 2 : 3,
    500: 1
  };

  return (
    <div className={`home-container ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      {/* Header */}
      <header className="header">
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search what's in your mind..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="nav-buttons">
            {/* ...existing code... */}
          </div>
        </div>
      </header>

      {/* Left Sidebar */}
      <div className="left-sidebar">
        <div className="sidebar-top">
          <div className="logo">
            <img src="/assets/logo.png" alt="Logo" />
          </div>
          <div className="logo-text">SuperMind</div>
        </div>

        <div className="sidebar-bottom">
          <button onClick={toggleTheme} className="theme-toggle">
            <img
              src={isDarkTheme ? "/assets/sun.svg" : "/assets/moon.svg"}
              alt="Theme Icon"
              className="theme-icon"
            />
          </button>
          <button id="ai-button">
            <img src="/assets/AI-logo.png" alt="AI" />
          </button>
          <button id="layout-button" onClick={toggleLayoutOptions}>
            <img src="/assets/layout.png" alt="Layout" />
          </button>
          {showLayoutOptions && (
            <div className="layout-options">
              <button onClick={() => handleLayoutChange('large')}>
                <img src="/assets/large-layout.svg" alt="Large Layout" />
              </button>
              <button onClick={() => handleLayoutChange('medium')}>
                <img src="/assets/medium-layout.svg" alt="Medium Layout" />
              </button>
              <button onClick={() => handleLayoutChange('small')}>
                <img src="/assets/small-layout.svg" alt="Small Layout" />
              </button>
            </div>
          )}
          <button id="settings-button">
            <img src="/assets/settings.png" alt="Settings" />
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="content">
        {filteredCardsData.length > 0 ? (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {filteredCardsData.map((card, index) => (
              <Card
                key={card.ID || index}
                thumbnailUrl={card["Thumbnail URL"]}
                title={card.Title}
                type={card["Video Type"]}
                url={card["Original URL"]}
                dateAdded={card["Date Added"]}
                onClick={() => setSelectedCard({
                  ...card,
                  url: card["Original URL"],
                  Title: card.Title,
                  Summary: card.Summary,
                  Tags: card.Tags
                })}
              />
            ))}
          </Masonry>
        ) : (
          <p className="no-content">No matching content found</p>
        )}
      </main>
      {selectedCard && (
        <Popup
          cardData={selectedCard}
          onClose={() => setSelectedCard(null)}
          isDarkTheme={isDarkTheme} // Pass theme prop
        />
      )}
    </div>
  );
}
<Analytics/>
export default Home;