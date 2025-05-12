import { useState, useEffect } from 'react'
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

  const fetchSayings = async () => {
    try {
      const response = await fetch('/db.csv');
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
        const randomIndex = Math.floor(Math.random() * parsedSayings.length);
        setCurrentSaying(parsedSayings[randomIndex]);
      }
    } catch (error) {
      console.error('Error fetching sayings:', error);
    }
  };

  useEffect(() => {
    fetchSayings();
  }, []);

  const handleFlip = () => {
    setAnimationClass('flipping');
    setTimeout(() => {
      setIsFlipped(!isFlipped);
      setAnimationClass('');
    }, 250);
  };

  const getNextCard = () => {
    if (sayings.length > 0) {
      const randomIndex = Math.floor(Math.random() * sayings.length);
      setAnimationClass('sliding-out');
      
      setTimeout(() => {
        setCurrentSaying(sayings[randomIndex]);
        setIsFlipped(false);
        setAnimationClass('sliding-in');
        
        setTimeout(() => {
          setAnimationClass('');
        }, 500);
      }, 500);
    }
  };

  return (
    <div className="app-container">
      <h1>Latin Sayings Flashcards</h1>
      
      {currentSaying ? (
        <div className="flashcard-container">
          <div className={`flashcard ${animationClass} ${isFlipped ? 'flipped' : ''}`} onClick={handleFlip}>
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
          
          <div className="controls">
            <button onClick={getNextCard} className="next-button">Next Card</button>
          </div>
        </div>
      ) : (
        <p>Loading sayings...</p>
      )}
    </div>
  )
}

export default App
