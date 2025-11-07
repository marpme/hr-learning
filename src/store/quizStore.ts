import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { VocabItem } from "../data/vocab";
import type { Stats } from "../utils/storage";
import {
  clearStats,
  updateWordStats,
  getFailedWordIds,
  getTotalUniqueWordsAttempted,
  loadStats,
} from "../utils/storage";
import { filterVocab, shuffleArray, getChoices, type Mode, type Choice } from "./helpers";

interface QuizState {
  // Quiz state
  index: number;
  mode: Mode;
  difficulty: string;
  shuffled: VocabItem[];

  // Display state (frozen during transitions to prevent premature word changes)
  displayWord: VocabItem | null;
  displayChoices: Choice[];

  // User interaction state
  hasAnswered: boolean;
  userInput: string;
  lastResult: boolean | null;

  // UI state
  showHelp: boolean;
  menuOpen: boolean;
  statsExpanded: boolean;

  // Transition state
  isTransitioning: boolean;

  // Stats state
  stats: Stats;
  correct: number;
  attempts: number;
}

interface QuizActions {
  // Initialization
  initializeQuiz: (vocab: VocabItem[], difficulty?: string) => void;

  // Quiz control
  setMode: (mode: Mode) => void;
  setDifficulty: (difficulty: string, vocab: VocabItem[]) => void;

  // Answer flow - THE KEY ACTIONS THAT FIX TIMING
  handleAnswer: (isCorrect: boolean, currentWord: VocabItem) => void;
  advanceToNextQuestion: () => void;

  // Text input
  setUserInput: (input: string) => void;
  submitTextAnswer: (correctAnswer: string, currentWord: VocabItem) => void;

  // UI toggles
  toggleShowHelp: () => void;
  setShowHelp: (show: boolean) => void;
  setMenuOpen: (open: boolean) => void;
  setStatsExpanded: (expanded: boolean) => void;

  // Stats management
  resetStats: () => void;
  restartQuiz: () => void;

  // Computed values
  getFailedWordIds: () => string[];
  getTotalUniqueWords: () => number;
}

type QuizStore = QuizState & QuizActions;

// Migration function to load old stats format
function migrateOldStats(): Partial<QuizState> {
  try {
    const oldStats = loadStats();
    if (oldStats.attempts > 0 || oldStats.correct > 0) {
      // We have old stats, migrate them
      console.log("Migrating old stats format to zustand store");
      return {
        stats: oldStats,
        correct: oldStats.correct,
        attempts: oldStats.attempts,
      };
    }
  } catch (error) {
    console.error("Failed to migrate old stats:", error);
  }
  return {};
}

export const useQuizStore = create<QuizStore>()(
  persist(
    (set, get) => {
      // Check for old stats format on initialization
      const migratedStats = migrateOldStats();

      return {
        // Initial state
        index: 0,
        mode: "de-to-en",
        difficulty: "all",
        shuffled: [],
        displayWord: null,
        displayChoices: [],
        hasAnswered: false,
        userInput: "",
        lastResult: null,
        showHelp: false,
        menuOpen: false,
        statsExpanded: false,
        isTransitioning: false,
        stats: migratedStats.stats || { correct: 0, attempts: 0, lastSessionDate: new Date().toISOString(), wordStats: {} },
        correct: migratedStats.correct || 0,
        attempts: migratedStats.attempts || 0,

      // Actions
      initializeQuiz: (vocab, difficulty = "all") => {
        // Don't reload stats - zustand persist middleware handles this
        // Just use the current stats from the store
        const currentStats = get().stats;
        const failedWordIds = getFailedWordIds(currentStats);
        const filtered = filterVocab(vocab, difficulty, failedWordIds);
        const shuffled = shuffleArray(filtered);
        const firstWord = shuffled[0] || null;
        const choices = firstWord ? getChoices(shuffled, firstWord, get().mode) : [];

        set({
          difficulty,
          shuffled,
          displayWord: firstWord,
          displayChoices: choices,
          index: 0,
        });
      },

      setMode: (mode) => {
        const state = get();
        const currentWord = state.displayWord;
        if (currentWord) {
          const newChoices = getChoices(state.shuffled, currentWord, mode);
          set({ mode, displayChoices: newChoices });
        } else {
          set({ mode });
        }
      },

      setDifficulty: (difficulty, vocab) => {
        const state = get();
        const failedWordIds = getFailedWordIds(state.stats);
        const filtered = filterVocab(vocab, difficulty, failedWordIds);
        const shuffled = shuffleArray(filtered);
        const firstWord = shuffled[0] || null;
        const choices = firstWord ? getChoices(shuffled, firstWord, state.mode) : [];

        set({
          difficulty,
          shuffled,
          displayWord: firstWord,
          displayChoices: choices,
          index: 0,
          showHelp: false,
        });
      },

      // THE CRITICAL TIMING FIX: Freeze display state during transition
      handleAnswer: (isCorrect, currentWord) => {
        const state = get();
        const newAttempts = state.attempts + 1;
        const newCorrect = state.correct + (isCorrect ? 1 : 0);

        // Update stats
        const updatedStats = updateWordStats(state.stats, currentWord.id, isCorrect);

        // CRITICAL: Freeze the display by keeping displayWord and displayChoices unchanged
        // This prevents the word from changing while the result is shown
        set({
          hasAnswered: true,
          lastResult: isCorrect,
          showHelp: false,
          isTransitioning: true,
          stats: {
            ...updatedStats,
            correct: newCorrect,
            attempts: newAttempts,
            lastSessionDate: new Date().toISOString(),
          },
          correct: newCorrect,
          attempts: newAttempts,
        });
        // Note: No need to manually saveStats - zustand persist middleware handles this

        // After delay, advance to next question
        setTimeout(() => {
          get().advanceToNextQuestion();
        }, 2500);
      },

      // Atomically update all state when advancing to next question
      advanceToNextQuestion: () => {
        const state = get();
        const nextIndex = state.index + 1;
        const nextWord = state.shuffled[nextIndex % Math.max(1, state.shuffled.length)];
        const nextChoices = nextWord ? getChoices(state.shuffled, nextWord, state.mode) : [];

        // ATOMIC UPDATE: Everything changes together, no intermediate states
        set({
          index: nextIndex,
          displayWord: nextWord,
          displayChoices: nextChoices,
          hasAnswered: false,
          userInput: "",
          lastResult: null,
          isTransitioning: false,
        });
      },

      setUserInput: (input) => set({ userInput: input }),

      submitTextAnswer: (correctAnswer, currentWord) => {
        const state = get();
        if (!state.userInput.trim() || state.hasAnswered) return;

        const isCorrect = state.userInput.trim().toLowerCase() === correctAnswer.toLowerCase();
        get().handleAnswer(isCorrect, currentWord);
      },

      toggleShowHelp: () => set((state) => ({ showHelp: !state.showHelp })),

      setShowHelp: (show) => set({ showHelp: show }),

      setMenuOpen: (open) => set({ menuOpen: open }),

      setStatsExpanded: (expanded) => set({ statsExpanded: expanded }),

      resetStats: () => {
        const resetStats = clearStats();
        set({
          stats: resetStats,
          correct: resetStats.correct,
          attempts: resetStats.attempts,
          menuOpen: false,
        });
      },

      restartQuiz: () => {
        set({
          index: 0,
          hasAnswered: false,
          userInput: "",
          lastResult: null,
          showHelp: false,
          menuOpen: false,
        });
      },

      getFailedWordIds: () => {
        return getFailedWordIds(get().stats);
      },

      getTotalUniqueWords: () => {
        return getTotalUniqueWordsAttempted(get().stats);
      },
    };
    },
    {
      name: "hr-vocab-stats",
      partialize: (state) => ({
        stats: state.stats,
        correct: state.correct,
        attempts: state.attempts,
      }),
    }
  )
);
