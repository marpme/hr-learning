import { useMemo, useState, useEffect } from "react";
import "./App.css";
import { VOCAB, DIFFICULTIES } from "./data/vocab";
import type { VocabItem } from "./data/vocab";
import { loadStats, saveStats, clearStats, calculateAccuracy, updateWordStats, getFailedWordIds, getTotalUniqueWordsAttempted } from "./utils/storage";
import type { Stats } from "./utils/storage";

type Mode = "de-to-en" | "en-to-de";

function filterVocab(
  items: VocabItem[],
  difficulty?: string,
  failedWordIds?: string[]
) {
  return items.filter((it) => {
    // If filtering by failed words, only include those IDs
    if (difficulty === "failed" && failedWordIds) {
      return failedWordIds.includes(it.id);
    }
    // Otherwise apply difficulty filter
    if (!difficulty || difficulty === "all") return true;
    if (difficulty && it.difficulty !== difficulty) return false;
    return true;
  });
}

function useShuffled(items: VocabItem[]) {
  return useMemo(() => {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }, [items]);
}

function getChoices(
  vocab: VocabItem[],
  current: VocabItem,
  mode: Mode
): { text: string; isCorrect: boolean }[] {
  // Pick 3 random distractors (not the current)
  const others = vocab.filter((v) => v.id !== current.id);
  const shuffled = others.sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, 3);
  const correct = mode === "de-to-en" ? current.en : current.de;
  const options = [
    { text: correct, isCorrect: true },
    ...distractors.map((v) => ({
      text: mode === "de-to-en" ? v.en : v.de,
      isCorrect: false,
    })),
  ];
  // Shuffle options
  return options.sort(() => Math.random() - 0.5);
}

function App() {
  const [mode, setMode] = useState<Mode>("de-to-en");
  const [difficulty, setDifficulty] = useState<string>("all");
  const [index, setIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [correct, setCorrect] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [lastResult, setLastResult] = useState<null | boolean>(null);
  const [userInput, setUserInput] = useState<string>("");
  const [hasAnswered, setHasAnswered] = useState<boolean>(false);
  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [statsExpanded, setStatsExpanded] = useState<boolean>(false);
  const [stats, setStats] = useState<Stats>({ correct: 0, attempts: 0, lastSessionDate: new Date().toISOString(), wordStats: {} });

  // Load stats from localStorage on mount
  useEffect(() => {
    const loadedStats = loadStats();
    setStats(loadedStats);
    setCorrect(loadedStats.correct);
    setAttempts(loadedStats.attempts);
  }, []);

  // Save stats to localStorage whenever they change
  useEffect(() => {
    saveStats(stats);
  }, [stats]);

  // Reset showHelp when index changes to prevent hints showing on next question
  useEffect(() => {
    setShowHelp(false);
  }, [index]);

  const failedWordIds = useMemo(() => getFailedWordIds(stats), [stats]);
  const totalUniqueWords = useMemo(() => getTotalUniqueWordsAttempted(stats), [stats]);

  const filtered = useMemo(
    () => filterVocab(VOCAB, difficulty, failedWordIds),
    [difficulty, failedWordIds]
  );
  const shuffled = useShuffled(filtered);
  const current = shuffled[index % Math.max(1, shuffled.length)];
  const choices = useMemo(
    () => getChoices(shuffled, current, mode),
    [shuffled, current, mode]
  );

  function handleResetStats() {
    const resetStats = clearStats();
    setStats(resetStats);
    setCorrect(resetStats.correct);
    setAttempts(resetStats.attempts);
    setMenuOpen(false);
  }

  function handleRestartQuiz() {
    setIndex(0);
    setUserInput("");
    setShowHelp(false);
    setLastResult(null);
    setHasAnswered(false);
    setMenuOpen(false);
  }

  function handleChoice(isCorrect: boolean) {
    const newAttempts = attempts + 1;
    const newCorrect = correct + (isCorrect ? 1 : 0);

    setAttempts(newAttempts);
    if (isCorrect) setCorrect(newCorrect);

    // Update word-level stats
    const updatedStats = updateWordStats(stats, current.id, isCorrect);
    setStats({
      ...updatedStats,
      correct: newCorrect,
      attempts: newAttempts,
      lastSessionDate: new Date().toISOString(),
    });

    setLastResult(isCorrect);
    setHasAnswered(true);
    // Immediately hide choices to prevent them showing on next question
    setShowHelp(false);

    setTimeout(() => {
      setIndex((i) => i + 1);
      setLastResult(null);
      setUserInput("");
      setHasAnswered(false);
    }, 2500);
  }

  function handleTextSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!userInput.trim() || hasAnswered) return;

    const correctAnswer = mode === "de-to-en" ? current.en : current.de;
    const isCorrect = userInput.trim().toLowerCase() === correctAnswer.toLowerCase();

    handleChoice(isCorrect);
  }

  const accuracy = calculateAccuracy(correct, attempts);

  return (
    <div className="app apple-ui">
      {/* Frosted Glass Header */}
      <header className="frosted-header">
        <div className="header-content">
          <button
            className="hamburger-btn"
            onClick={() => setMenuOpen(true)}
            aria-label="Open menu"
            type="button"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>

          <h1 className="app-title">HR Vocab</h1>

          <button
            className="stats-pill"
            onClick={() => setStatsExpanded(!statsExpanded)}
            type="button"
          >
            {correct}/{attempts} • {accuracy}%
          </button>
        </div>
      </header>

      {/* Expandable Stats Overlay */}
      {statsExpanded && (
        <>
          <div className="overlay" onClick={() => setStatsExpanded(false)}></div>
          <div className="stats-expanded">
            <h3>Statistics</h3>
            <div className="stat-row">
              <span className="stat-label">Correct</span>
              <span className="stat-value">{correct}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Attempts</span>
              <span className="stat-value">{attempts}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Accuracy</span>
              <span className="stat-value">{accuracy}%</span>
            </div>
          </div>
        </>
      )}

      {/* Slide-in Menu Drawer */}
      {menuOpen && (
        <>
          <div className="menu-backdrop" onClick={() => setMenuOpen(false)}></div>
          <div className="menu-drawer">
            <div className="menu-header">
              <h2>Settings</h2>
              <button
                className="close-btn"
                onClick={() => setMenuOpen(false)}
                aria-label="Close menu"
                type="button"
              >
                ✕
              </button>
            </div>

            <div className="menu-section">
              <label className="menu-label">Language Direction</label>
              <div className="mode-selector">
                <button
                  className={mode === "de-to-en" ? "mode-btn active" : "mode-btn"}
                  onClick={() => setMode("de-to-en")}
                  type="button"
                >
                  DE → EN
                </button>
                <button
                  className={mode === "en-to-de" ? "mode-btn active" : "mode-btn"}
                  onClick={() => setMode("en-to-de")}
                  type="button"
                >
                  EN → DE
                </button>
              </div>
            </div>

            <div className="menu-section">
              <label className="menu-label">Difficulty</label>
              <div className="difficulty-pills">
                <button
                  key="all"
                  className={difficulty === "all" ? "difficulty-pill active" : "difficulty-pill"}
                  onClick={() => {
                    setDifficulty("all");
                    setIndex(0);
                  }}
                  type="button"
                >
                  All
                </button>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    className={difficulty === d ? "difficulty-pill active" : "difficulty-pill"}
                    onClick={() => {
                      setDifficulty(d);
                      setIndex(0);
                    }}
                    type="button"
                  >
                    {d}
                  </button>
                ))}
                {totalUniqueWords >= 50 && failedWordIds.length > 0 && (
                  <button
                    key="failed"
                    className={difficulty === "failed" ? "difficulty-pill active failed-words-pill" : "difficulty-pill failed-words-pill"}
                    onClick={() => {
                      setDifficulty("failed");
                      setIndex(0);
                    }}
                    type="button"
                  >
                    Failed Words ({failedWordIds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="menu-section">
              <button className="menu-action-btn" onClick={handleRestartQuiz} type="button">
                Restart Quiz
              </button>
              <button className="menu-action-btn danger" onClick={handleResetStats} type="button">
                Reset Stats
              </button>
            </div>

            <div className="menu-section about">
              <h3>About</h3>
              <p>Practice German ↔ English HR vocabulary with flashcard-style quizzes.</p>
              <p>Your progress is automatically saved locally.</p>
            </div>
          </div>
        </>
      )}

      <main>
        {filtered.length === 0 ? (
          <p>No vocabulary for the selected filters.</p>
        ) : (
          <div className="card card-game">
            <div className="prompt">
              <strong>
                #{index + 1} / {filtered.length}
              </strong>
              <h2>{mode === "de-to-en" ? current.de : current.en}</h2>
            </div>

            <form onSubmit={handleTextSubmit} className="text-answer">
              <input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Type your answer..."
                disabled={hasAnswered}
                className="answer-input"
                autoFocus
              />
              <button
                type="submit"
                disabled={!userInput.trim() || hasAnswered}
                className="submit-btn"
              >
                Submit
              </button>
            </form>

            {lastResult !== null && !showHelp && (
              <div className={`feedback ${lastResult ? "correct-feedback" : "wrong-feedback"}`}>
                {lastResult ? "Correct! ✓" : `Wrong. Correct answer: ${mode === "de-to-en" ? current.en : current.de}`}
              </div>
            )}

            <div className="help-section">
              <p className="help-text">or</p>
              <button
                className="help-btn"
                onClick={() => setShowHelp(true)}
                disabled={showHelp || hasAnswered}
                type="button"
              >
                Show Options
              </button>
            </div>

            {showHelp && (
              <div className="choices">
                {choices.map((choice, i) => (
                  <button
                    key={i}
                    className={
                      "choice-btn" +
                      (lastResult !== null
                        ? choice.isCorrect
                          ? lastResult
                            ? " correct flash"
                            : " correct"
                          : lastResult && !choice.isCorrect
                          ? ""
                          : lastResult === false && !choice.isCorrect
                          ? " wrong"
                          : ""
                        : "")
                    }
                    disabled={hasAnswered}
                    onClick={() => handleChoice(choice.isCorrect)}
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            )}

            <div className="card-meta">
              <span className="tags-list">{current.tags.join(", ")}</span>
              <span className="difficulty">{current.difficulty}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
