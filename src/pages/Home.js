// supermind-ui/src/pages/Home.js
import React, { useState, useEffect, useCallback, useRef } from "react";
import Masonry from 'react-masonry-css';
import "./Home.css";
import Card from "../components/Card";
import Popup from "../components/Popup";
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
          setCardsData(fallbackData || []);
        } else {
          setCardsData(prev => [...prev, ...(fallbackData || [])]);
        }

        setHasMore(fallbackData.length === PAGE_SIZE);
      } else {
        if (pageNumber === 0) {
          setCardsData(data || []);
        } else {
          setCardsData(prev => [...prev, ...(data || [])]);
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
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Error signing out:', error.message);
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
            <button onClick={handleSignOut} className="sign-out-button">
              <img src="/assets/logout.png" alt="Sign Out" />
            </button>
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
        {cardsData.length > 0 ? (
          <Masonry
            breakpointCols={breakpointColumnsObj}
            className="my-masonry-grid"
            columnClassName="my-masonry-grid_column"
          >
            {cardsData.map((card, index) => (
              <div
                key={card.id || index}
                ref={index === cardsData.length - 1 ? lastCardElementRef : null}
              >
                <Card
                  thumbnailUrl={card.thumbnail_url}
                  title={card.title}
                  type={card.video_type}
                  url={card.original_url}
                  dateAdded={card.date_added}
                  onClick={() => {
                    setSelectedCard({
                      ...card,
                      url: card.original_url,
                      Title: card.title,
                      Summary: card.summary,
                      Tags: card.tags,
                      video_type: card.video_type
                    });
                  }}
                />
              </div>
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
          isDarkTheme={isDarkTheme}
        />
      )}
    </div>
  );
}

<Analytics/>
export default Home;