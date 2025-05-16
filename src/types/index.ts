export interface Saying {
  latin: string;
  romanian: string;
}

export interface StatisticsData {
  totalCards: number;
  viewedCards: number;
  averageTimeSeconds: number;
  mostDifficultCards: Array<{
    latin: string;
    romanian: string;
    avgTimeSeconds: number;
  }>;
  studyStreak: number;
  lastStudied: Date;
}
