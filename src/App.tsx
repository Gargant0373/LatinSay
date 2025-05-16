import { useState, useEffect, useRef } from 'react'
import type { TouchEvent } from 'react'
import './App.css'
import { getLearningSystem } from './utils/learningSystem'
import StatsDisplay from './components/StatsDisplay'
import type { Saying, StatisticsData } from './types'

function App() {
  // Core state
  const [sayings, setSayings] = useState<Saying[]>([]);
  const [currentSaying, setCurrentSaying] = useState<Saying | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [animationClass, setAnimationClass] = useState('');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<Saying[]>([]);
  const [showingFavorites, setShowingFavorites] = useState(false);
  
  // Learning system state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [showStats, setShowStats] = useState(false);
  const [stats, setStats] = useState<StatisticsData | null>(null);
  
  // Time tracking
  const cardStartTime = useRef<number>(Date.now());
  const timeSpent = useRef<number>(0);
  
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
        getLearningSystem(parsedSayings);
        setCurrentIndex(0);
        setCurrentSaying(parsedSayings[0]);
        
        updateStatistics(parsedSayings);
        
        // Start timing for the first card
        cardStartTime.current = Date.now();
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
    
    // Load favorites from localStorage
    const savedFavorites = localStorage.getItem('latinSayFavorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
    }
    
    // Handle viewport height for mobile
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
  
  // Handle keyboard navigation
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
        case 's':
        case 'S':
          setShowStats(!showStats);
          break;
        default:
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [currentSaying, showStats]);

  // Record time when card is flipped
  const handleFlip = () => {
    // Record time spent before flipping
    if (!isFlipped && currentSaying) {
      timeSpent.current = Date.now() - cardStartTime.current;
      
      // Record in learning system
      const learningSystem = getLearningSystem(sayings);
      learningSystem.recordCardView(currentSaying, timeSpent.current);
      
      // Update statistics
      updateStatistics(sayings);
    }
    
    setAnimationClass('flipping');
    setTimeout(() => {
      setIsFlipped(!isFlipped);
      setAnimationClass('');
    }, 250);
  };
  
  // Toggle favorite status for current card
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

  // Get next card using the learning system algorithm
  const getNextCard = () => {
    if (sayings.length <= 1 || !currentSaying) return;
    
    // Record time spent on current card if not flipped
    if (!isFlipped) {
      timeSpent.current = Date.now() - cardStartTime.current;
      
      // Record in learning system
      const learningSystem = getLearningSystem(sayings);
      learningSystem.recordCardView(currentSaying, timeSpent.current);
    }
    
    // Get next card index from learning system
    const learningSystem = getLearningSystem(sayings);
    const nextIndex = learningSystem.getNextCardIndex(sayings, currentIndex);
    
    setAnimationClass('sliding-out');
    
    setTimeout(() => {
      setCurrentIndex(nextIndex);
      setCurrentSaying(sayings[nextIndex]);
      setIsFlipped(false);
      setAnimationClass('sliding-in');
      
      // Reset timer for new card
      cardStartTime.current = Date.now();
      
      setTimeout(() => {
        setAnimationClass('');
      }, 500);
      
      // Update statistics
      updateStatistics(sayings);
    }, 500);
  };
  
  // Update statistics for display
  const updateStatistics = (sayingsData: Saying[]) => {
    const learningSystem = getLearningSystem(sayingsData);
    const learningStats = learningSystem.getStatistics();
    
    // Convert to our display format
    const statsData: StatisticsData = {
      totalCards: learningStats.totalCards,
      viewedCards: learningStats.viewedCards,
      averageTimeSeconds: learningStats.averageTimePerCard / 1000,
      mostDifficultCards: [],
      studyStreak: calculateStudyStreak(),
      lastStudied: new Date(learningStats.lastStudySession)
    };
    
    // Map difficult cards to our format
    statsData.mostDifficultCards = learningStats.mostDifficultCards
      .map(card => {
        // Extract latin and romanian from the ID (format: "latin_romanian")
        const [latin, romanian] = card.id.split('_');
        return {
          latin,
          romanian,
          avgTimeSeconds: card.avgTime / 1000
        };
      });
    
    setStats(statsData);
  };
  
  const calculateStudyStreak = (): number => {
    // TODO
    return 1;
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
      
      {/* Stats button */}
      <button 
        className="stats-button"
        onClick={() => setShowStats(true)}
        aria-label="Show statistics"
      >
        📊
      </button>
      
      {/* Stats modal */}
      <StatsDisplay 
        stats={stats} 
        isOpen={showStats} 
        onClose={() => setShowStats(false)}
      />
      
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
          
          <div className="keyboard-instructions">
            <span><span className="key">Space</span> or <span className="key">Enter</span>: Flip card</span>
            <span><span className="key">→</span>: Next card</span>
            <span><span className="key">F</span>: Toggle favorite</span>
            <span><span className="key">S</span>: Show stats</span>
          </div>
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
