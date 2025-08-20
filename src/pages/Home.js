// supermind-ui/src/pages/Home.js
import React, { useState, useEffect, useCallback, useRef, memo } from "react";
import Masonry from 'react-masonry-css';
import "./Home.css";
import Card from "../components/Card";
import Popup from "../components/Popup";
import Settings from "../components/Settings";
import Auth from "../components/Auth";
import NeuroCosmicLoader from "../components/NeuroCosmicLoader";
import { supabase } from '../lib/supabase';
import { Analytics } from "@vercel/analytics/react";
import debounce from 'lodash/debounce';
import { performSearch } from '../lib/search';
import { searchContentInDB, hasFilters } from "../lib/indexedDB";
import db from '../lib/indexedDB';
import { useSyncService } from '../hooks/useSyncService';

const MemoizedCard = memo(Card, (prevProps, nextProps) => {
  // Only re-render if these specific props change
  return (
    prevProps.thumbnailUrl === nextProps.thumbnailUrl &&
    prevProps.url === nextProps.url &&
    prevProps.title === nextProps.title &&
    prevProps.type === nextProps.type &&
    prevProps.dateAdded === nextProps.dateAdded &&
    prevProps.content === nextProps.content
  );
});

function Home() {
  const [session, setSession] = useState(null);
  const [cardsData, setCardsData] = useState([]);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [layoutMode, setLayoutMode] = useState(() => {
    const savedLayout = localStorage.getItem('layoutMode');
    return savedLayout || 'medium';
  });
  const [showLayoutOptions, setShowLayoutOptions] = useState(false);
  const [selectedCard, setSelectedCard] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [minLoadingTimeCompleted, setMinLoadingTimeCompleted] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(10);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 200;
  const observer = useRef();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Initialize sync service
  const { syncStatus, forceSync, clearCache } = useSyncService();

  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchTerm(query);
      setPage(0);
      performSearch(query, 0, session.user.id)
        .then(({ data, hasMore }) => {
          setCardsData(data);
          setHasMore(hasMore);
        })
        .catch((error) => console.error('Error during search:', error));
    }, 500),
    [session]
  );

  useEffect(() => {
    return () => {
      debouncedSearch.cancel();
    };
  }, [debouncedSearch]);

  useEffect(() => {
    if (searchTerm !== searchQuery && !searchLoading) {
      setCardsData([]);
    }
  }, [searchTerm, searchQuery, searchLoading]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);

    // Check if query contains filters
    const queryHasFilters = hasFilters(query);
    
    if (queryHasFilters) {
      // For filtered queries, only search IndexedDB
      searchContentInDB(query).then((localResults) => {
        setCardsData(localResults);
        setHasMore(false); // No pagination for filtered results
      }).catch((error) => {
        console.error('Error during filtered search:', error);
        setCardsData([]);
      });
    } else {
      // For non-filtered queries, search IndexedDB first, then fallback to Supabase
      searchContentInDB(query).then((localResults) => {
        if (localResults.length > 0) {
          setCardsData(localResults);
          setHasMore(false);
        } else {
          // Use debounced search for Supabase fallback
          debouncedSearch(query);
        }
      }).catch((error) => {
        console.error('Error during local search:', error);
        debouncedSearch(query);
      });
    }
  };

  useEffect(() => {
    // Start minimum loading timer (5 seconds)
    const minLoadingTimer = setTimeout(() => {
      setMinLoadingTimeCompleted(true);
    }, 5000); // 5 seconds

    // Gradual progress simulation
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev < 30) return prev + Math.random() * 3 + 1; // Faster initial progress
        if (prev < 60) return prev + Math.random() * 2 + 0.5; // Medium progress
        if (prev < 85) return prev + Math.random() * 1 + 0.2; // Slower progress
        return prev; // Stop at 85% until data loads
      });
    }, 200);

    // Check for existing session and load data in parallel
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        performSearch('', 0, session.user.id)
          .then(({ data, hasMore }) => {
            setCardsData(data);
            setHasMore(hasMore);
            setDataLoaded(true); // Mark data as loaded
            setLoadingProgress(95); // Jump to 95% when data loads
          })
          .catch((error) => {
            console.error('Error during initial fetch:', error);
            setDataLoaded(true); // Still mark as "loaded" even if failed
            setLoadingProgress(95);
          });
      } else {
        setDataLoaded(true); // No session, consider "loaded"
        setLoadingProgress(95);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setCardsData([]); // Clear data on logout
        setShowSettings(false); // Close settings modal on logout
        setSelectedCard(null); // Close any open popup
        setShowNoteModal(false); // Close note modal
      }
    });

    // Cleanup timer on unmount
    return () => {
      clearTimeout(minLoadingTimer);
      clearInterval(progressInterval);
      subscription?.unsubscribe();
    };
  }, []);

  // Effect to handle when both conditions are met
  useEffect(() => {
    if (dataLoaded && minLoadingTimeCompleted) {
      // Complete the progress to 100%
      setLoadingProgress(100);
      
      // Small delay for smooth transition
      setTimeout(() => {
        setIsLoading(false);
      }, 800);
    }
  }, [dataLoaded, minLoadingTimeCompleted]);

  const lastCardElementRef = useCallback((node) => {
    if (searchLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        performSearch(searchQuery, page + 1, session.user.id)
          .then(({ data, hasMore }) => {
            setCardsData((prev) => {
              const existingIds = new Set(prev.map((card) => card.id));
              const newCards = data.filter((card) => !existingIds.has(card.id));
              return [...prev, ...newCards];
            });
            setHasMore(hasMore);
          })
          .catch((error) => console.error('Error during pagination:', error));
      }
    });
    if (node) observer.current.observe(node);
  }, [searchLoading, hasMore, searchQuery, page, session]);

  const handleSignOut = async () => {
    try {
      setShowSettings(false); // Close settings modal before signing out

      // Clear IndexedDB
      await db.delete();

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error.message);
    }
  };

  const handleClearCache = async () => {
    try {
      // Clear React state
      setCardsData([]);
      setSelectedCard(null);
      setShowNoteModal(false);
      setSearchQuery('');
      setSearchTerm('');
      setPage(0);
      setHasMore(true);

      // Clear IndexedDB using sync service
      await clearCache();
      
      // Force refresh of all data
      await performSearch('', 0, session.user.id)
        .then(({ data, hasMore }) => {
          setCardsData(data);
          setHasMore(hasMore);
        });
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error clearing app cache:', error);
      throw error;
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Allow Escape key to work even when focus is on an input or textarea
      if (e.key === 'Escape') {
        const searchInput = document.querySelector('.search-bar input');
        if (document.activeElement === searchInput) {
          searchInput.blur(); // Remove focus from the search bar
        }
        return; // Exit early for Escape key
      }

      // Ignore other shortcuts if the focus is on an input or textarea
      const activeElement = document.activeElement;
      if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        document.querySelector('.search-bar input').focus();
      } else if (e.key === 'n') {
        e.preventDefault();
        setShowNoteModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Loading state with enhanced UX
  if (isLoading) {
    const getLoadingMessage = () => {
      if (loadingProgress < 30) return "Connecting neural pathways...";
      if (loadingProgress < 60) return "Finalizing your neural network...";
      if (loadingProgress < 85) return "Expanding digital consciousness...";
      if (loadingProgress < 95) return "Syncing with the cosmos...";
      return "SuperMind is awakening...";
    };

    return (
      <NeuroCosmicLoader 
        progress={loadingProgress}
        message={getLoadingMessage()}
        onLoadingComplete={() => {
          // This callback won't override our logic, but provides feedback
          console.log('NeuroCosmicLoader animation completed');
        }} 
      />
    );
  }

  // Show auth screen if not authenticated
  if (!session) {
    return <Auth />;
  }

  // Define breakpoint columns for masonry layout
  const breakpointColumnsObj = {
    default: layoutMode === 'large' ? 3 : layoutMode === 'medium' ? 4 : 5,
    1100: layoutMode === 'large' ? 2 : layoutMode === 'medium' ? 3 : 4,
    700: layoutMode === 'large' ? 1 : layoutMode === 'medium' ? 2 : 3,
    500: 1
  };

  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    document.documentElement.classList.toggle('light-theme');
  };

  const toggleLayoutOptions = () => {
    setShowLayoutOptions(!showLayoutOptions);
  };

  const handleLayoutChange = (mode) => {
    setLayoutMode(mode);
    localStorage.setItem('layoutMode', mode);
    setShowLayoutOptions(false);
  };

  // Create the display data with the "Add New Note" card at the beginning
  const displayData = searchQuery.trim() === '' && !cardsData.some(card => card.isAddNoteCard)
    ? [{
        id: 'add-note-card',
        title: 'Add New Note',
        video_type: 'note',
        thumbnail_url: './assets/notes.png',
        original_url: null,
        date_added: null,
        content: 'Click to create a new note',
        isAddNoteCard: true
      }, ...cardsData]
    : cardsData;

  return (
    <div className={`home-container ${isDarkTheme ? 'dark-theme' : 'light-theme'}`}>
      {/* Header */}
      <header className="header">
        <div className="search-bar">
          <div className="search-input-wrapper">
            <input
              type="text"
              placeholder="Search what's in your mind..."
              value={searchQuery}
              onChange={handleSearchChange}
            />
          </div>
          <div className="nav-buttons">
            {/* Logout button moved to settings page */}
          </div>
        </div>
      </header>

      {/* Left Sidebar */}
      <div className="left-sidebar">
        <div className="sidebar-top">
          <div className="logo">
            <img src="./assets/logo.png" alt="Logo" />
          </div>
          <div className="logo-text">SuperMind</div>
        </div>

        <div className="sidebar-bottom">
          <button onClick={toggleTheme} className="theme-toggle">
            <img
              src={isDarkTheme ? "./assets/sun.svg" : "./assets/moon.svg"}
              alt="Theme Icon"
              className="theme-icon"
            />
          </button>
          <button id="ai-button">
            <img src="./assets/AI-logo.png" alt="AI" />
          </button>
          <button id="layout-button" onClick={toggleLayoutOptions}>
            <img src="./assets/layout.png" alt="Layout" />
          </button>
          {showLayoutOptions && (
            <div className="layout-options">
              <button onClick={() => handleLayoutChange('large')}>
                <img src="./assets/large-layout.svg" alt="Large Layout" />
              </button>
              <button onClick={() => handleLayoutChange('medium')}>
                <img src="./assets/medium-layout.svg" alt="Medium Layout" />
              </button>
              <button onClick={() => handleLayoutChange('small')}>
                <img src="./assets/small-layout.svg" alt="Small Layout" />
              </button>
            </div>
          )}
          <button id="settings-button" onClick={() => setShowSettings(true)}>
            <img src="./assets/settings.png" alt="Settings" />
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="content">
        {displayData.length > 0 ? (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {displayData.map((card, index) => {
              // Create a stable unique key based on card content
              const stableKey = card.id || card.original_url || card.title || `card-${index}`;
              
              return (
                <div
                  key={stableKey}
                  ref={index === displayData.length - 1 ? lastCardElementRef : null}
                >
                  <MemoizedCard
                    thumbnailUrl={card.thumbnail_url}
                    title={card.title}
                    type={card.video_type}
                    url={card.original_url}
                    dateAdded={card.date_added}
                    content={card.user_notes || card.content}
                    onClick={() => {
                      if (card.isAddNoteCard) {
                        setShowNoteModal(true);
                      } else {
                        setSelectedCard({
                          ...card,
                          url: card.original_url,
                          Title: card.title,
                          Summary: card.summary,
                          Tags: card.tags,
                          video_type: card.video_type
                        });
                      }
                    }}
                  />
                </div>
              );
            })}
          </Masonry>
        ) : (
          <p className="no-content">No matching content found</p>
        )}
      </main>

      {/* Note Creation Modal */}
      {showNoteModal && (
        <div className="popup-overlay" onClick={() => setShowNoteModal(false)}>
          <div className="popup-content" onClick={e => e.stopPropagation()}>
            <div className="popup-right">
              <h2>Add New Note</h2>
              <textarea
                placeholder="Type your note here..."
                value={newNoteContent}
                onChange={e => setNewNoteContent(e.target.value)}
                style={{ minHeight: 120, fontSize: 18, color: isDarkTheme ? 'white' : 'black' }}
              />
              <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
                <button
                  onClick={async () => {
                    if (!newNoteContent.trim()) return;
                    setNoteSaving(true);
                    try {
                      const { data: { user } } = await supabase.auth.getUser();
                      if (!user?.id) throw new Error('Not authenticated');
                      
                      // Generate a random ID like the existing records
                      const noteId = Math.random().toString(36).substr(2, 9);
                      
                      const { error } = await supabase
                        .from('content')
                        .insert({
                          id: noteId,
                          user_id: user.id,
                          title: newNoteContent.split(/[.!?\n]/)[0].slice(0, 100) || 'Quick Note',
                          video_type: 'note',
                          tags: 'quick_note',
                          user_notes: newNoteContent,
                          date_added: new Date().toISOString(),
                          thumbnail_url: null,
                          original_url: null,
                          channel_name: 'Quick Notes'
                        });
                      if (error) throw error;
                      
                      setNewNoteContent("");
                      setShowNoteModal(false);
                      // Add the new note to the beginning of cards data instead of full refresh
                      const newNote = {
                        id: noteId,
                        user_id: user.id,
                        title: newNoteContent.split(/[.!?\n]/)[0].slice(0, 100) || 'Quick Note',
                        video_type: 'note',
                        tags: 'quick_note',
                        user_notes: newNoteContent,
                        date_added: new Date().toISOString(),
                        thumbnail_url: null,
                        original_url: null,
                        channel_name: 'Quick Notes'
                      };
                      setCardsData(prev => [newNote, ...prev]);
                      alert('Note saved successfully!');
                    } catch (err) {
                      alert(err.message || 'Failed to save note');
                    } finally {
                      setNoteSaving(false);
                    }
                  }}
                  disabled={noteSaving || !newNoteContent.trim()}
                  style={{ padding: '12px 24px', borderRadius: 8, background: '#AE00FF', color: 'white', fontWeight: 'bold', fontSize: 18, border: 'none', cursor: 'pointer' }}
                >
                  {noteSaving ? 'Saving...' : 'Save Note'}
                </button>
                <button
                  onClick={() => setShowNoteModal(false)}
                  style={{ padding: '12px 24px', borderRadius: 8, background: '#333', color: 'white', fontWeight: 'bold', fontSize: 18, border: 'none', cursor: 'pointer' }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedCard && (
        <Popup
          cardData={selectedCard}
          onClose={() => setSelectedCard(null)}
          isDarkTheme={isDarkTheme}
        />
      )}

      {/* Settings Modal */}
      <Settings
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onSignOut={handleSignOut}
        onClearCache={handleClearCache}
        isDarkTheme={isDarkTheme}
      />

      <Analytics/>
    </div>
  );
}

export default Home;
