import { describe, it, expect, beforeEach } from "vitest";
import { useQuizStore } from "./quizStore";
import type { VocabItem } from "../data/vocab";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock vocab data
const mockVocab: VocabItem[] = [
  { id: "1", de: "Hallo", en: "Hello", difficulty: "easy", tags: [] },
  { id: "2", de: "Tschüss", en: "Goodbye", difficulty: "easy", tags: [] },
  { id: "3", de: "Danke", en: "Thank you", difficulty: "medium", tags: [] },
  { id: "4", de: "Bitte", en: "Please", difficulty: "medium", tags: [] },
  { id: "5", de: "Entschuldigung", en: "Excuse me", difficulty: "hard", tags: [] },
];

describe("QuizStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    // Reset zustand state completely
    useQuizStore.setState({
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
      stats: { correct: 0, attempts: 0, lastSessionDate: new Date().toISOString(), wordStats: {} },
      correct: 0,
      attempts: 0,
    });
    useQuizStore.getState().initializeQuiz(mockVocab);
  });

  describe("Initialization", () => {
    it("should initialize with correct default state", () => {
      const state = useQuizStore.getState();
      expect(state.index).toBe(0);
      expect(state.mode).toBe("de-to-en");
      expect(state.difficulty).toBe("all");
      expect(state.hasAnswered).toBe(false);
      expect(state.isTransitioning).toBe(false);
      expect(state.displayWord).not.toBeNull();
      expect(state.displayChoices).toHaveLength(4);
    });

    it("should filter vocab by difficulty", () => {
      useQuizStore.getState().setDifficulty("easy", mockVocab);
      const state = useQuizStore.getState();
      expect(state.shuffled.length).toBe(2); // Only 2 easy words
    });
  });

  describe("Mode switching", () => {
    it("should update mode and regenerate choices", () => {
      const initialChoices = useQuizStore.getState().displayChoices;
      useQuizStore.getState().setMode("en-to-de");

      const state = useQuizStore.getState();
      expect(state.mode).toBe("en-to-de");
      expect(state.displayChoices).not.toEqual(initialChoices);
      expect(state.displayChoices).toHaveLength(4);
    });
  });

  describe("Answer handling and timing fix", () => {
    it("should freeze displayWord during transition", () => {
      const state = useQuizStore.getState();
      const initialWord = state.displayWord;
      const initialChoices = state.displayChoices;

      // Answer the question
      state.handleAnswer(true, initialWord!);

      // Check that word and choices are FROZEN during transition
      const transitionState = useQuizStore.getState();
      expect(transitionState.isTransitioning).toBe(true);
      expect(transitionState.hasAnswered).toBe(true);
      expect(transitionState.lastResult).toBe(true);
      expect(transitionState.displayWord).toEqual(initialWord);
      expect(transitionState.displayChoices).toEqual(initialChoices);
    });

    it("should update stats when answering", () => {
      const state = useQuizStore.getState();
      const initialWord = state.displayWord!;

      state.handleAnswer(true, initialWord);

      const newState = useQuizStore.getState();
      expect(newState.correct).toBe(1);
      expect(newState.attempts).toBe(1);
    });

    it("should advance to next question after advanceToNextQuestion is called", () => {
      const state = useQuizStore.getState();
      const initialWord = state.displayWord;
      const initialIndex = state.index;

      state.advanceToNextQuestion();

      const newState = useQuizStore.getState();
      expect(newState.index).toBe(initialIndex + 1);
      expect(newState.displayWord).not.toEqual(initialWord);
      expect(newState.hasAnswered).toBe(false);
      expect(newState.lastResult).toBeNull();
      expect(newState.userInput).toBe("");
      expect(newState.isTransitioning).toBe(false);
    });

    it("should keep displayWord stable during transition and only change on advance", async () => {
      const state = useQuizStore.getState();
      const initialWord = state.displayWord;

      // Answer the question
      state.handleAnswer(true, initialWord!);

      // During transition, word should remain the same
      let transitionState = useQuizStore.getState();
      expect(transitionState.displayWord).toEqual(initialWord);
      expect(transitionState.isTransitioning).toBe(true);

      // Manually advance (simulating what setTimeout would do)
      transitionState.advanceToNextQuestion();

      // After advancing, word should change
      const finalState = useQuizStore.getState();
      expect(finalState.displayWord).not.toEqual(initialWord);
      expect(finalState.isTransitioning).toBe(false);
    });
  });

  describe("Text input", () => {
    it("should update user input", () => {
      useQuizStore.getState().setUserInput("Hello");
      expect(useQuizStore.getState().userInput).toBe("Hello");
    });

    it("should submit correct text answer", () => {
      const state = useQuizStore.getState();
      const currentWord = state.displayWord!;
      const correctAnswer = state.mode === "de-to-en" ? currentWord.en : currentWord.de;

      state.setUserInput(correctAnswer);
      state.submitTextAnswer(correctAnswer, currentWord);

      const newState = useQuizStore.getState();
      expect(newState.lastResult).toBe(true);
      expect(newState.hasAnswered).toBe(true);
    });

    it("should submit incorrect text answer", () => {
      const state = useQuizStore.getState();
      const currentWord = state.displayWord!;
      const correctAnswer = state.mode === "de-to-en" ? currentWord.en : currentWord.de;

      state.setUserInput("wrong answer");
      state.submitTextAnswer(correctAnswer, currentWord);

      const newState = useQuizStore.getState();
      expect(newState.lastResult).toBe(false);
      expect(newState.hasAnswered).toBe(true);
    });

    it("should not submit if already answered", () => {
      const state = useQuizStore.getState();
      const currentWord = state.displayWord!;
      const correctAnswer = state.mode === "de-to-en" ? currentWord.en : currentWord.de;

      // First answer
      state.setUserInput(correctAnswer);
      state.submitTextAnswer(correctAnswer, currentWord);

      const attempts1 = useQuizStore.getState().attempts;

      // Try to answer again
      state.setUserInput("another answer");
      state.submitTextAnswer(correctAnswer, currentWord);

      const attempts2 = useQuizStore.getState().attempts;
      expect(attempts2).toBe(attempts1); // Should not increment
    });
  });

  describe("UI state", () => {
    it("should toggle showHelp", () => {
      expect(useQuizStore.getState().showHelp).toBe(false);
      useQuizStore.getState().toggleShowHelp();
      expect(useQuizStore.getState().showHelp).toBe(true);
      useQuizStore.getState().toggleShowHelp();
      expect(useQuizStore.getState().showHelp).toBe(false);
    });

    it("should set menu open state", () => {
      useQuizStore.getState().setMenuOpen(true);
      expect(useQuizStore.getState().menuOpen).toBe(true);
      useQuizStore.getState().setMenuOpen(false);
      expect(useQuizStore.getState().menuOpen).toBe(false);
    });
  });

  describe("Stats management", () => {
    it("should reset stats", () => {
      const state = useQuizStore.getState();
      state.handleAnswer(true, state.displayWord!);

      expect(useQuizStore.getState().correct).toBe(1);

      useQuizStore.getState().resetStats();

      const newState = useQuizStore.getState();
      expect(newState.correct).toBe(0);
      expect(newState.attempts).toBe(0);
    });

    it("should restart quiz", () => {
      const state = useQuizStore.getState();
      state.setUserInput("test");
      state.handleAnswer(true, state.displayWord!);

      useQuizStore.getState().restartQuiz();

      const newState = useQuizStore.getState();
      expect(newState.index).toBe(0);
      expect(newState.userInput).toBe("");
      expect(newState.hasAnswered).toBe(false);
      expect(newState.lastResult).toBeNull();
    });
  });

  describe("Atomic state updates", () => {
    it("should update all transition-related state atomically", () => {
      const state = useQuizStore.getState();
      const initialWord = state.displayWord;

      state.advanceToNextQuestion();

      const newState = useQuizStore.getState();

      // All these should be updated together atomically
      expect(newState.displayWord).not.toEqual(initialWord);
      expect(newState.hasAnswered).toBe(false);
      expect(newState.userInput).toBe("");
      expect(newState.lastResult).toBeNull();
      expect(newState.isTransitioning).toBe(false);
    });
  });
});
