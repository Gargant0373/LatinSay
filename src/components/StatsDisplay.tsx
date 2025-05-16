import React from 'react';
import type { StatisticsData } from '../types';

interface StatsDisplayProps {
  stats: StatisticsData | null;
  isOpen: boolean;
  onClose: () => void;
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats, isOpen, onClose }) => {
  if (!isOpen || !stats) return null;

  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  return (
    <div className="stats-modal">
      <div className="stats-content">
        <button className="close-button" onClick={onClose}>×</button>
        <h2>Your Learning Stats</h2>
        
        <div className="stats-summary">
          <div className="stat-item">
            <div className="stat-value">{stats.viewedCards}/{stats.totalCards}</div>
            <div className="stat-label">Cards Studied</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-value">{Math.round(stats.averageTimeSeconds * 10) / 10}s</div>
            <div className="stat-label">Avg. Time per Card</div>
          </div>
          
          <div className="stat-item">
            <div className="stat-value">{stats.studyStreak}</div>
            <div className="stat-label">Day Streak</div>
          </div>
        </div>
        
        <div className="stats-difficult">
          <h3>Most Challenging Cards</h3>
          {stats.mostDifficultCards.length > 0 ? (
            <ul className="difficult-cards-list">
              {stats.mostDifficultCards.map((card, index) => (
                <li key={index}>
                  <span className="difficult-card-text">{card.romanian} → {card.latin}</span>
                  <span className="difficult-card-time">
                    {Math.round(card.avgTimeSeconds * 10) / 10}s
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="no-data">Start studying to see your challenging cards!</p>
          )}
        </div>
        
        <div className="stats-footer">
          <p>Last studied: {formatDate(stats.lastStudied)}</p>
        </div>
      </div>
    </div>
  );
};

export default StatsDisplay;
