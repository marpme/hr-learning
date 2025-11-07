import { useEffect } from "react";
import "./App.css";
import { VOCAB, DIFFICULTIES } from "./data/vocab";
import { calculateAccuracy } from "./utils/storage";
import { useQuizStore } from "./store/quizStore";

function App() {
  // Initialize store on mount
  useEffect(() => {
    useQuizStore.getState().initializeQuiz(VOCAB);
  }, []);

  // Select state from store
  const mode = useQuizStore((state) => state.mode);
  const difficulty = useQuizStore((state) => state.difficulty);
  const index = useQuizStore((state) => state.index);
  const displayWord = useQuizStore((state) => state.displayWord);
  const displayChoices = useQuizStore((state) => state.displayChoices);
  const showHelp = useQuizStore((state) => state.showHelp);
  const correct = useQuizStore((state) => state.correct);
  const attempts = useQuizStore((state) => state.attempts);
  const lastResult = useQuizStore((state) => state.lastResult);
  const userInput = useQuizStore((state) => state.userInput);
  const hasAnswered = useQuizStore((state) => state.hasAnswered);
  const menuOpen = useQuizStore((state) => state.menuOpen);
  const statsExpanded = useQuizStore((state) => state.statsExpanded);
  const shuffled = useQuizStore((state) => state.shuffled);

  // Select actions from store
  const setMode = useQuizStore((state) => state.setMode);
  const setDifficulty = useQuizStore((state) => state.setDifficulty);
  const handleAnswer = useQuizStore((state) => state.handleAnswer);
  const setUserInput = useQuizStore((state) => state.setUserInput);
  const submitTextAnswer = useQuizStore((state) => state.submitTextAnswer);
  const toggleShowHelp = useQuizStore((state) => state.toggleShowHelp);
  const setMenuOpen = useQuizStore((state) => state.setMenuOpen);
  const setStatsExpanded = useQuizStore((state) => state.setStatsExpanded);
  const resetStats = useQuizStore((state) => state.resetStats);
  const restartQuiz = useQuizStore((state) => state.restartQuiz);
  const getFailedWordIds = useQuizStore((state) => state.getFailedWordIds);
  const getTotalUniqueWords = useQuizStore((state) => state.getTotalUniqueWords);

  const failedWordIds = getFailedWordIds();
  const totalUniqueWords = getTotalUniqueWords();

  function handleTextSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!displayWord) return;
    const correctAnswer = mode === "de-to-en" ? displayWord.en : displayWord.de;
    submitTextAnswer(correctAnswer, displayWord);
  }

  const accuracy = calculateAccuracy(correct, attempts);

  if (!displayWord) {
    return <div className="app apple-ui"><main><p>Loading...</p></main></div>;
  }

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
                  onClick={() => setDifficulty("all", VOCAB)}
                  type="button"
                >
                  All
                </button>
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d}
                    className={difficulty === d ? "difficulty-pill active" : "difficulty-pill"}
                    onClick={() => setDifficulty(d, VOCAB)}
                    type="button"
                  >
                    {d}
                  </button>
                ))}
                {totalUniqueWords >= 50 && failedWordIds.length > 0 && (
                  <button
                    key="failed"
                    className={difficulty === "failed" ? "difficulty-pill active failed-words-pill" : "difficulty-pill failed-words-pill"}
                    onClick={() => setDifficulty("failed", VOCAB)}
                    type="button"
                  >
                    Failed Words ({failedWordIds.length})
                  </button>
                )}
              </div>
            </div>

            <div className="menu-section">
              <button className="menu-action-btn" onClick={restartQuiz} type="button">
                Restart Quiz
              </button>
              <button className="menu-action-btn danger" onClick={resetStats} type="button">
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
        {shuffled.length === 0 ? (
          <p>No vocabulary for the selected filters.</p>
        ) : (
          <div className="card card-game">
            <div className="prompt">
              <strong>
                #{index + 1} / {shuffled.length}
              </strong>
              <h2>{mode === "de-to-en" ? displayWord.de : displayWord.en}</h2>
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
                {lastResult ? "Correct! ✓" : `Wrong. Correct answer: ${mode === "de-to-en" ? displayWord.en : displayWord.de}`}
              </div>
            )}

            <div className="help-section">
              <p className="help-text">or</p>
              <button
                className="help-btn"
                onClick={toggleShowHelp}
                disabled={showHelp || hasAnswered}
                type="button"
              >
                Show Options
              </button>
            </div>

            {showHelp && (
              <div className="choices">
                {displayChoices.map((choice, i) => (
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
                    onClick={() => handleAnswer(choice.isCorrect, displayWord)}
                  >
                    {choice.text}
                  </button>
                ))}
              </div>
            )}

            <div className="card-meta">
              <span className="tags-list">{displayWord.tags.join(", ")}</span>
              <span className="difficulty">{displayWord.difficulty}</span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
