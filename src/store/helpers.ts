import type { VocabItem } from "../data/vocab";

export type Mode = "de-to-en" | "en-to-de";

export interface Choice {
  text: string;
  isCorrect: boolean;
}

export function filterVocab(
  items: VocabItem[],
  difficulty?: string,
  failedWordIds?: string[]
): VocabItem[] {
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

export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function getChoices(
  vocab: VocabItem[],
  current: VocabItem,
  mode: Mode
): Choice[] {
  // Pick 3 random distractors (not the current)
  const others = vocab.filter((v) => v.id !== current.id);
  const shuffled = others.sort(() => Math.random() - 0.5);
  const distractors = shuffled.slice(0, 3);
  const correct = mode === "de-to-en" ? current.en : current.de;
  const options: Choice[] = [
    { text: correct, isCorrect: true },
    ...distractors.map((v) => ({
      text: mode === "de-to-en" ? v.en : v.de,
      isCorrect: false,
    })),
  ];
  // Shuffle options
  return options.sort(() => Math.random() - 0.5);
}
