/** Converts values like 9, "9+", or "9++" to exactly "9+". */
export function formatCountWithPlus(value: unknown): string {
  const normalized = String(value ?? 0)
    .trim()
    .replace(/\++\s*$/, "")
    .trim();

  return `${normalized || "0"}+`;
}
