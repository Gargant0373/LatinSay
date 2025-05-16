import type { Saying } from '../types/index';

export interface CardProgress {
  id: string;           
  timeToFlip: number[]; 
  avgTimeToFlip: number;
  viewCount: number;    
  lastSeen: number;     
}

export interface LearningStats {
  totalCards: number;
  viewedCards: number;
  averageTimePerCard: number;
  mostDifficultCards: Array<{id: string, avgTime: number}>;
  lastStudySession: number; 
}

export class LearningSystem {
  private progressData: Map<string, CardProgress> = new Map();
  private stats: LearningStats = {
    totalCards: 0,
    viewedCards: 0,
    averageTimePerCard: 0,
    mostDifficultCards: [],
    lastStudySession: Date.now()
  };
  
  constructor(sayings: Saying[]) {
    this.loadFromLocalStorage();
    this.updateCardList(sayings);
  }
  
  public updateCardList(sayings: Saying[]): void {
    this.stats.totalCards = sayings.length;
    
    sayings.forEach(saying => {
      const id = this.createCardId(saying);
      if (!this.progressData.has(id)) {
        this.progressData.set(id, {
          id,
          timeToFlip: [],
          avgTimeToFlip: 0,
          viewCount: 0,
          lastSeen: 0
        });
      }
    });
    
    this.updateStatistics();
    this.saveToLocalStorage();
  }
  
  private createCardId(saying: Saying): string {
    return `${saying.latin}_${saying.romanian}`;
  }
  
  public recordCardView(saying: Saying, timeSpentMs: number): void {
    const id = this.createCardId(saying);
    const cardData = this.progressData.get(id) || {
      id,
      timeToFlip: [],
      avgTimeToFlip: 0,
      viewCount: 0,
      lastSeen: 0
    };
    
    const cappedTime = Math.min(timeSpentMs, 30000);
    
    cardData.timeToFlip.push(cappedTime);
    if (cardData.timeToFlip.length > 5) {
      cardData.timeToFlip.shift();
    }

    cardData.avgTimeToFlip = cardData.timeToFlip.reduce((a, b) => a + b, 0) / cardData.timeToFlip.length;
    cardData.viewCount++;
    cardData.lastSeen = Date.now();
    
    this.progressData.set(id, cardData);
    this.updateStatistics();
    this.saveToLocalStorage();
  }
  
  public getNextCardIndex(sayings: Saying[], currentIndex: number): number {
    if (sayings.length <= 1) return 0;
    
    const cardScores: Array<{index: number, score: number}> = [];
    
    sayings.forEach((saying, index) => {
      if (index === currentIndex) return;
      
      const id = this.createCardId(saying);
      const progress = this.progressData.get(id);
      
      // Score calculation factors:
      // 1. Time to flip (higher = more difficult)
      // 2. View count (lower = less familiar)
      // 3. Time since last seen (higher = needs review)
      let score = 0;
      
      if (!progress || progress.viewCount === 0) {
        // New card - medium-high priority
        score = 0.7;
      } else {
        // Difficulty component (normalized to 0-1 range, higher is more difficult)
        const timeScore = Math.min(progress.avgTimeToFlip / 10000, 1) * 0.7;
        
        // Recency component (cards not seen recently get higher scores)
        const daysSinceLastSeen = (Date.now() - progress.lastSeen) / (1000 * 60 * 60 * 24);
        const recencyScore = Math.min(daysSinceLastSeen / 7, 1) * 0.3;
        
        score = timeScore + recencyScore;
      }
      
      cardScores.push({ index, score });
    });
    
    cardScores.sort((a, b) => b.score - a.score);
    
    return cardScores[0]?.index ?? ((currentIndex + 1) % sayings.length);
  }
  
  // Update statistics based on current progress data
  private updateStatistics(): void {
    const progressValues = Array.from(this.progressData.values());
    
    // Count cards that have been viewed at least once
    this.stats.viewedCards = progressValues.filter(p => p.viewCount > 0).length;
    
    // Calculate average time across all cards
    const totalTime = progressValues.reduce((sum, card) => sum + card.avgTimeToFlip * card.viewCount, 0);
    const totalViews = progressValues.reduce((sum, card) => sum + card.viewCount, 0);
    this.stats.averageTimePerCard = totalViews > 0 ? totalTime / totalViews : 0;
    
    // Find most difficult cards (by average time)
    const sortedByDifficulty = [...progressValues]
      .filter(card => card.viewCount > 0)
      .sort((a, b) => b.avgTimeToFlip - a.avgTimeToFlip);
    
    this.stats.mostDifficultCards = sortedByDifficulty
      .slice(0, 5)
      .map(card => ({ id: card.id, avgTime: card.avgTimeToFlip }));
    
    // Update session timestamp
    this.stats.lastStudySession = Date.now();
  }
  
  public getStatistics(): LearningStats {
    return { ...this.stats };
  }
  
  // Get difficulty level for a specific card
  public getCardDifficulty(saying: Saying): 'easy' | 'medium' | 'hard' | 'new' {
    const id = this.createCardId(saying);
    const progress = this.progressData.get(id);
    
    if (!progress || progress.viewCount === 0) return 'new';
    
    // Categorize based on average time to flip
    if (progress.avgTimeToFlip < 2000) return 'easy';
    if (progress.avgTimeToFlip < 5000) return 'medium';
    return 'hard';
  }
  
  // Save progress data to localStorage
  private saveToLocalStorage(): void {
    try {
      const data = {
        progressData: Array.from(this.progressData.entries()),
        stats: this.stats,
        version: 1
      };
      localStorage.setItem('latinsay_learning_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save learning data:', error);
    }
  }
  
  // Load progress data from localStorage
  private loadFromLocalStorage(): void {
    try {
      const savedData = localStorage.getItem('latinsay_learning_data');
      if (!savedData) return;
      
      const data = JSON.parse(savedData);
      
      // Version check
      if (data.version === 1) {
        this.progressData = new Map(data.progressData);
        this.stats = data.stats;
      }
    } catch (error) {
      console.error('Failed to load learning data:', error);
      this.progressData = new Map();
    }
  }
  
  // Clear all learning data
  public resetProgress(): void {
    this.progressData = new Map();
    this.stats = {
      totalCards: this.stats.totalCards,
      viewedCards: 0,
      averageTimePerCard: 0,
      mostDifficultCards: [],
      lastStudySession: Date.now()
    };
    this.saveToLocalStorage();
  }
}

// Singleton
let learningSystemInstance: LearningSystem | null = null;

export function getLearningSystem(sayings: Saying[]): LearningSystem {
  if (!learningSystemInstance) {
    learningSystemInstance = new LearningSystem(sayings);
  } else {
    learningSystemInstance.updateCardList(sayings);
  }
  return learningSystemInstance;
}
