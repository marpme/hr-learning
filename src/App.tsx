import { useMemo, useState } from "react";
import "./App.css";
import { VOCAB, DIFFICULTIES, TAGS } from "./data/vocab";
import type { VocabItem, Tag } from "./data/vocab";

type Mode = "de-to-en" | "en-to-de";

function filterVocab(
  items: VocabItem[],
  difficulty?: string,
  tags: string[] = []
) {
  return items.filter((it) => {
    if (difficulty && it.difficulty !== difficulty) return false;
    if (tags.length > 0 && !tags.every((t) => it.tags.includes(t as Tag)))
      return false;
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
  const [difficulty, setDifficulty] = useState<string>("easy");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [index, setIndex] = useState(0);
  const [showHelp, setShowHelp] = useState(false);
  const [correct, setCorrect] = useState<number>(0);
  const [attempts, setAttempts] = useState<number>(0);
  const [lastResult, setLastResult] = useState<null | boolean>(null);

  const filtered = useMemo(
    () => filterVocab(VOCAB, difficulty, selectedTags),
    [difficulty, selectedTags]
  );
  const shuffled = useShuffled(filtered);
  const current = shuffled[index % Math.max(1, shuffled.length)];
  const choices = useMemo(
    () => getChoices(shuffled, current, mode),
    [shuffled, current, mode]
  );

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
    setIndex(0);
  }

  function handleChoice(isCorrect: boolean) {
    setAttempts((a) => a + 1);
    if (isCorrect) setCorrect((c) => c + 1);
    setLastResult(isCorrect);
    setTimeout(() => {
      setIndex((i) => i + 1);
      setShowHelp(false);
      setLastResult(null);
    }, 900);
  }

  return (
    <div className="app apple-ui">
      <header>
        <h1>HR Vocabulary Trainer</h1>
        <p>German &lt;-&gt; English HR vocabulary, card game mode.</p>
      </header>

      <section className="controls">
        <label>
          Mode:
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as Mode)}
          >
            <option value="de-to-en">German → English</option>
            <option value="en-to-de">English → German</option>
          </select>
        </label>

        <label>
          Difficulty:
          <select
            value={difficulty}
            onChange={(e) => {
              setDifficulty(e.target.value);
              setIndex(0);
            }}
          >
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <div className="tags">
          {TAGS.map((t) => (
            <button
              key={t}
              className={selectedTags.includes(t) ? "tag selected" : "tag"}
              onClick={() => toggleTag(t)}
              type="button"
            >
              {t}
            </button>
          ))}
        </div>
      </section>

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

            <div className="choices">
              {choices.map((choice, i) => (
                <button
                  key={i}
                  className={
                    "choice-btn" +
                    (showHelp && choice.isCorrect
                      ? " correct"
                      : lastResult !== null
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
                  disabled={lastResult !== null}
                  onClick={() => handleChoice(choice.isCorrect)}
                >
                  {choice.text}
                </button>
              ))}
            </div>
            <div className="actions">
              <button
                className="help-btn"
                onClick={() => setShowHelp(true)}
                disabled={showHelp || lastResult !== null}
              >
                Help
              </button>
            </div>
            <div className="card-meta">
              <span className="tags-list">{current.tags.join(", ")}</span>
              <span className="difficulty">{current.difficulty}</span>
            </div>
          </div>
        )}

        <aside className="stats">
          <h3>Stats</h3>
          <p>Correct: {correct}</p>
          <p>Attempts: {attempts}</p>
          <p>
            Accuracy:{" "}
            {attempts > 0 ? Math.round((correct / attempts) * 100) + "%" : "—"}
          </p>
        </aside>
      </main>

      <footer>
        <small>
          Now with 65+ HR terms. Card game mode. <code>src/data/vocab.ts</code>{" "}
          for more.
        </small>
      </footer>
    </div>
  );
}

export default App;
