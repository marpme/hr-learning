// LocalStorage utilities for persistent stats

export interface WordStats {
  attempts: number;
  correct: number;
  lastAttempted: string;
}

export interface Stats {
  correct: number;
  attempts: number;
  lastSessionDate: string;
  wordStats?: { [wordId: string]: WordStats };
}

const STATS_KEY = 'hr-vocab-stats';

export function loadStats(): Stats {
  try {
    const stored = localStorage.getItem(STATS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Ensure wordStats exists for backward compatibility
      return {
        ...parsed,
        wordStats: parsed.wordStats || {},
      };
    }
  } catch (error) {
    console.error('Failed to load stats from localStorage:', error);
  }

  return {
    correct: 0,
    attempts: 0,
    lastSessionDate: new Date().toISOString(),
    wordStats: {},
  };
}

export function saveStats(stats: Stats): void {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats));
  } catch (error) {
    console.error('Failed to save stats to localStorage:', error);
  }
}

export function clearStats(): Stats {
  try {
    localStorage.removeItem(STATS_KEY);
  } catch (error) {
    console.error('Failed to clear stats from localStorage:', error);
  }

  return {
    correct: 0,
    attempts: 0,
    lastSessionDate: new Date().toISOString(),
    wordStats: {},
  };
}

export function calculateAccuracy(correct: number, attempts: number): number {
  return attempts > 0 ? Math.round((correct / attempts) * 100) : 0;
}

export function updateWordStats(
  stats: Stats,
  wordId: string,
  isCorrect: boolean
): Stats {
  const wordStats = stats.wordStats || {};
  const currentWordStats = wordStats[wordId] || {
    attempts: 0,
    correct: 0,
    lastAttempted: new Date().toISOString(),
  };

  return {
    ...stats,
    wordStats: {
      ...wordStats,
      [wordId]: {
        attempts: currentWordStats.attempts + 1,
        correct: currentWordStats.correct + (isCorrect ? 1 : 0),
        lastAttempted: new Date().toISOString(),
      },
    },
  };
}

export function getFailedWordIds(stats: Stats): string[] {
  const wordStats = stats.wordStats || {};
  return Object.keys(wordStats).filter(
    (wordId) => {
      const ws = wordStats[wordId];
      return ws.attempts > ws.correct; // Has at least one failure
    }
  );
}

export function getTotalUniqueWordsAttempted(stats: Stats): number {
  const wordStats = stats.wordStats || {};
  return Object.keys(wordStats).length;
}
