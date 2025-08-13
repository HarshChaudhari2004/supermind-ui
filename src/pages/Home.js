// supermind-ui/src/pages/Home.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import Masonry from 'react-masonry-css';
import "./Home.css";
import Card from "../components/Card";
import Popup from "../components/Popup";
import Settings from "../components/Settings";
import Auth from "../components/Auth";
import { supabase } from '../lib/supabase';
import { Analytics } from "@vercel/analytics/react";
import debounce from 'lodash/debounce';

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
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;
  const observer = useRef();
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [newNoteContent, setNewNoteContent] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const performSearch = useCallback(async (query, pageNumber = 0) => {
    const searchId = Date.now();
    performSearch.lastSearchId = searchId;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      setSearchLoading(true);

      if (performSearch.lastSearchId !== searchId) return;

      const fromRow = pageNumber * PAGE_SIZE;

      if (!query.trim()) {
        const { data, error } = await supabase
          .from('content')
          .select('*')
          .eq('user_id', user.id)
          .order('date_added', { ascending: false })
          .range(fromRow, fromRow + PAGE_SIZE - 1);

        if (error) throw error;

        if (performSearch.lastSearchId !== searchId) return;

        if (pageNumber === 0) {
          setCardsData(data || []);
        } else {
          setCardsData(prev => [...prev, ...(data || [])]);
        }

        setHasMore(data.length === PAGE_SIZE);
        setPage(pageNumber);
        return;
      }

      // Hybrid search with pagination
      const { data, error } = await supabase
        .rpc('search_content', {
          search_query: query,
          user_id_input: user.id,
          similarity_threshold: 0.1,
          max_results: PAGE_SIZE,
          offset_rows: fromRow
        });

      if (performSearch.lastSearchId !== searchId) return;

      if (error) {
        console.error('Search error:', error);
        // Fallback to basic search
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('content')
          .select('*')
          .eq('user_id', user.id)
          .or(`title.ilike.%${query}%,summary.ilike.%${query}%,tags.ilike.%${query}%,channel_name.ilike.%${query}%,user_notes.ilike.%${query}%`)
          .order('date_added', { ascending: false })
          .range(fromRow, fromRow + PAGE_SIZE - 1);

        if (fallbackError) throw fallbackError;

        if (performSearch.lastSearchId !== searchId) return;

        if (pageNumber === 0) {
          // Sort fallback data by date_added descending to ensure newest items first
          const sortedData = (fallbackData || []).sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
          setCardsData(sortedData);
        } else {
          const sortedData = (fallbackData || []).sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
          setCardsData(prev => [...prev, ...sortedData]);
        }

        setHasMore(fallbackData.length === PAGE_SIZE);
      } else {
        if (pageNumber === 0) {
          // Sort data by date_added descending to ensure newest items first
          const sortedData = (data || []).sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
          setCardsData(sortedData);
        } else {
          const sortedData = (data || []).sort((a, b) => new Date(b.date_added) - new Date(a.date_added));
          setCardsData(prev => [...prev, ...sortedData]);
        }
        setHasMore(data.length === PAGE_SIZE);
      }
      setPage(pageNumber);
    } catch (error) {
      console.error('Search error:', error);
      if (error.message.includes('Not authenticated')) {
        setSession(null);
      }
    } finally {
      if (performSearch.lastSearchId === searchId) {
        setSearchLoading(false);
      }
    }
  }, []);

  const debouncedSearch = useCallback(
    debounce((query) => {
      setSearchTerm(query);
      setPage(0);
      performSearch(query, 0);
    }, 500),
    [performSearch]
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
    debouncedSearch(query);
  };

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        performSearch('', 0);
      }
      setIsLoading(false);
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

    return () => subscription?.unsubscribe();
  }, [performSearch]);

  const lastCardElementRef = useCallback(node => {
    if (searchLoading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        performSearch(searchQuery, page + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [searchLoading, hasMore, searchQuery, page, performSearch]);

  const handleSignOut = async () => {
    try {
      setShowSettings(false); // Close settings modal before signing out
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

      // Force refresh of all data
      await performSearch('', 0);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error clearing app cache:', error);
      throw error;
    }
  };

  // Loading state
  if (isLoading) {
    return <div className="loading">Loading...</div>;
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
  const displayData = searchQuery.trim() === '' ? 
    [{
      id: 'add-note-card',
      title: 'Add New Note',
      video_type: 'note',
      thumbnail_url: './assets/notes.png',
      original_url: null,
      date_added: null,
      content: 'Click to create a new note',
      isAddNoteCard: true
    }, ...cardsData] : cardsData;

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
            {displayData.map((card, index) => (
              <div
                key={card.id || index}
                ref={index === displayData.length - 1 ? lastCardElementRef : null}
              >
                <Card
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
            ))}
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
