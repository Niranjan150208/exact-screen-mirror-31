export interface MatchableItem {
  id: string;
  type: "lost" | "found";
  title: string;
  description: string | null;
  color: string | null;
  brand: string | null;
  category_id: string | null;
  area: string | null;
  location: string | null;
  event_date: string;
}

export interface MatchResult<T extends MatchableItem = MatchableItem> {
  item: T;
  score: number;
  reasons: string[];
}

const STOP_WORDS = new Set([
  "the","a","an","and","with","near","found","lost","my","in","on","at","of","to","for","from","it","is","was","some","this","that","around",
]);

function tokens(value: string | null | undefined): string[] {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
}

function overlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const hits = a.filter((word) => setB.has(word)).length;
  return hits / Math.max(a.length, b.length);
}

/** Compare a reference item against a candidate of the opposite type. */
export function scoreMatch<T extends MatchableItem>(source: MatchableItem, candidate: T): MatchResult<T> {
  let score = 0;
  const reasons: string[] = [];

  if (source.category_id && candidate.category_id && source.category_id === candidate.category_id) {
    score += 28;
    reasons.push("Same category");
  }

  const titleScore = overlap(tokens(source.title), tokens(candidate.title));
  const descScore = overlap(
    tokens(`${source.title} ${source.description ?? ""}`),
    tokens(`${candidate.title} ${candidate.description ?? ""}`),
  );
  const keyword = Math.max(titleScore, descScore);
  if (keyword > 0.05) {
    score += Math.round(keyword * 34);
    if (keyword > 0.2) reasons.push("Similar description");
  }

  if (source.color && candidate.color && source.color.toLowerCase() === candidate.color.toLowerCase()) {
    score += 12;
    reasons.push("Similar colour");
  }

  if (source.brand && candidate.brand && source.brand.toLowerCase() === candidate.brand.toLowerCase()) {
    score += 10;
    reasons.push("Same brand");
  }

  if (source.area && candidate.area && source.area.toLowerCase() === candidate.area.toLowerCase()) {
    score += 10;
    reasons.push("Nearby location");
  } else if (
    source.location &&
    candidate.location &&
    overlap(tokens(source.location), tokens(candidate.location)) > 0.3
  ) {
    score += 8;
    reasons.push("Nearby location");
  }

  const days = Math.abs(
    (new Date(source.event_date).getTime() - new Date(candidate.event_date).getTime()) / 86_400_000,
  );
  if (days <= 1) {
    score += 12;
    reasons.push("Date matches");
  } else if (days <= 4) {
    score += 8;
    reasons.push("Dates are close");
  } else if (days <= 10) {
    score += 3;
  }

  return { item: candidate, score: Math.max(0, Math.min(99, Math.round(score))), reasons };
}

export function findMatches<T extends MatchableItem>(
  source: MatchableItem,
  candidates: T[],
  minScore = 35,
): MatchResult<T>[] {
  return candidates
    .filter((candidate) => candidate.type !== source.type && candidate.id !== source.id)
    .map((candidate) => scoreMatch(source, candidate))
    .filter((match) => match.score >= minScore)
    .sort((a, b) => b.score - a.score);
}
