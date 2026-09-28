/** Deterministic PRNG for reproducible session construction and tests. */
export class SeededRandom {
  private value: number;
  constructor(seed: string) { this.value = [...seed].reduce((hash, char) => Math.imul(hash ^ char.charCodeAt(0), 0x5bd1e995), 0x9e3779b9) >>> 0; }
  next(): number { this.value += 0x6d2b79f5; let t = this.value; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
  pick<T>(items: readonly T[]): T { if (!items.length) throw new Error("Cannot pick from an empty array"); return items[Math.floor(this.next() * items.length)]!; }
  shuffle<T>(items: readonly T[]): T[] { const copy = [...items]; for (let i = copy.length - 1; i > 0; i--) { const j = Math.floor(this.next() * (i + 1)); [copy[i], copy[j]] = [copy[j]!, copy[i]!]; } return copy; }
}
