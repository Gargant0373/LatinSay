import { useState, useEffect } from 'react'
import type { TouchEvent } from 'react'
import './App.css'

interface Saying {
  latin: string;
  romanian: string;
}

function App() {
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [currentSaying, setCurrentSaying] = useState<Saying | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Saying[]>([]);
  const [showingFavorites, setShowingFavorites] = useState(false);
  
  const minSwipeDistance = 50;

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSayings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/db.csv');
      
      if (!response.ok) {
        throw new Error(`Failed to fetch sayings: ${response.status}`);
      }
      
      const data = await response.text();
      
      const rows = data.split('\n').slice(1);
      const parsedSayings = rows
        .filter(row => row.trim() !== '')
        .map(row => {
          const regex = /(".*?"|[^",]+)(?=\s*,|\s*$)/g;
          const matches = [...row.matchAll(regex)].map(match => 
            match[0].replace(/^"|"$/g, '')
          );
          
          if (matches.length >= 2) {
            return {
              latin: matches[0],
              romanian: matches[1]
            };
          }
          return null;
        })
        .filter(Boolean) as Saying[];
      
      setSayings(parsedSayings);
      
      if (parsedSayings.length > 0) {
        setCurrentIndex(0);
        setCurrentSaying(parsedSayings[0]);
      } else {
        setError("No sayings found in the data.");
      }
    } catch (error) {
      console.error('Error fetching sayings:', error);
      setError(error instanceof Error ? error.message : "Failed to load sayings.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSayings();
    
    const savedFavorites = localStorage.getItem('latinSayFavorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
    }
    
    const handleResize = () => {
      document.documentElement.style.setProperty(
        '--vh', 
        `${window.innerHeight * 0.01}px`
      );
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!currentSaying) return;
      
      switch (e.key) {
        case ' ':
        case 'Enter':
          handleFlip();
          break;
        case 'ArrowRight':
          getNextCard();
          break;
        case 'f':
        case 'F':
          toggleFavorite();
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSaying]);

  const handleFlip = () => {
    setAnimationClass('flipping');
    setTimeout(() => {
      setIsFlipped(!isFlipped);
      setAnimationClass('');
    }, 250);
  };
  
  const toggleFavorite = () => {
    if (!currentSaying) return;
    
    const isFavorite = favorites.some(
      fav => fav.latin === currentSaying.latin && fav.romanian === currentSaying.romanian
    );
    
    let newFavorites;
    if (isFavorite) {
      newFavorites = favorites.filter(
        fav => !(fav.latin === currentSaying.latin && fav.romanian === currentSaying.romanian)
      );
    } else {
      newFavorites = [...favorites, currentSaying];
    }
    
    setFavorites(newFavorites);
    localStorage.setItem('latinSayFavorites', JSON.stringify(newFavorites));
  };
  
  const isCurrentSayingFavorite = () => {
    return currentSaying 
      ? favorites.some(fav => fav.latin === currentSaying.latin && fav.romanian === currentSaying.romanian)
      : false;
  };

  // Keep track of current index to avoid constantly random changes
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  
  const getNextCard = () => {
    if (sayings.length > 0) {
      // Calculate the next index using modulo to cycle through the array
      const nextIndex = (currentIndex + 1) % sayings.length;
      setCurrentIndex(nextIndex);
      
      setAnimationClass('sliding-out');
      
      setTimeout(() => {
        setCurrentSaying(sayings[nextIndex]);
        setIsFlipped(false);
        setAnimationClass('sliding-in');
        
        setTimeout(() => {
          setAnimationClass('');
        }, 500);
      }, 500);
    }
  };
  
  // Handle touch events for swipe
  const handleTouchStart = (e: TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  
  const handleTouchMove = (e: TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      getNextCard();
    } 
    else if (isRightSwipe) {
      handleFlip();
    }
  };

  return (
    <div className="app-container">
      <h1>Latin Sayings</h1>
      
      {currentSaying ? (
        <div className="flashcard-container">
          <div 
            className={`flashcard ${animationClass} ${isFlipped ? 'flipped' : ''}`} 
            onClick={handleFlip}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <button 
              className={`favorite-button ${isCurrentSayingFavorite() ? 'active' : ''}`}
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite();
              }}
              aria-label={isCurrentSayingFavorite() ? "Remove from favorites" : "Add to favorites"}
            >
              {isCurrentSayingFavorite() ? '★' : '☆'}
            </button>
            
            <div className="flashcard-inner">
              <div className={`flashcard-front ${isFlipped ? 'flipped' : ''}`}>
                <h2>Romanian</h2>
                <p>{currentSaying.romanian}</p>
                <div className="flip-instruction">Click to see Latin original</div>
              </div>
              <div className="flashcard-back">
                <h2>Latin</h2>
                <p>{currentSaying.latin}</p>
                <div className="flip-instruction">Click to see Romanian translation</div>
              </div>
            </div>
          </div>
          
          <div className="swipe-indicators">
            <div className="swipe-indicator">
              <span className="swipe-arrow">←</span> Flip card
            </div>
            <div className="swipe-indicator">
              Next card <span className="swipe-arrow">→</span>
            </div>
          </div>
          
          <div className="controls">
            <button onClick={getNextCard} className="next-button">Next Card</button>
          </div>
          
          <button 
            className={`favorites-toggle ${showingFavorites ? 'active' : ''}`}
            onClick={() => setShowingFavorites(!showingFavorites)}
          >
            {showingFavorites ? 'Hide Favorites' : 'Show Favorites'} ({favorites.length})
          </button>
          
          {showingFavorites && (
            <div className="favorites-list">
              {favorites.length > 0 ? (
                favorites.map((saying, index) => (
                  <div 
                    key={index} 
                    className="favorites-list-item"
                    onClick={() => {
                      setCurrentSaying(saying);
                      setIsFlipped(false);
                      setAnimationClass('sliding-in');
                      setTimeout(() => {
                        setAnimationClass('');
                      }, 500);
                    }}
                  >
                    <strong>{saying.romanian}</strong>
                  </div>
                ))
              ) : (
                <div className="favorites-empty">
                  No favorites saved yet. Click the star icon on any card to save it.
                </div>
              )}
            </div>
          )}
          
        </div>
      ) : (
        <div className="loading-container">
          {isLoading ? (
            <>
              <span className="loader"></span>
              <p className="loading-text">Loading Latin sayings...</p>
            </>
          ) : error ? (
            <>
              <p className="error-text">Error: {error}</p>
              <button onClick={fetchSayings} className="next-button">Try Again</button>
            </>
          ) : (
            <p className="loading-text">No sayings available</p>
          )}
        </div>
      )}
    </div>
  )
}

export default App
