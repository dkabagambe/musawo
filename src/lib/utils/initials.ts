/**
 * Extract initials from a person's name, ignoring titles.
 * 
 * Titles to strip: Dr., Prof., Eng., Mr., Mrs., Ms., Miss, Rev., Hon., etc.
 * 
 * Examples:
 *   "Dr. Esther Achen" → "EA"
 *   "Prof. John Smith" → "JS"
 *   "Joel Mirembe" → "JM"
 *   "Alice" → "AL"
 * 
 * @param name - Full name including potential titles
 * @returns Two uppercase initials (first + last, or first two letters if single word)
 */
export function getInitials(name: string): string {
  if (!name) return "?";

  // Strip common titles (case-insensitive)
  const withoutTitle = name.replace(
    /^(Dr\.?|Prof\.?|Professor|Eng\.?|Engineer|Mr\.?|Mrs\.?|Ms\.?|Miss|Rev\.?|Reverend|Hon\.?|Honorable|Sir|Dame|Lord|Lady)\s+/i,
    ""
  ).trim();

  const parts = withoutTitle.split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return name.trim().slice(0, 2).toUpperCase() || "?";
  }

  if (parts.length === 1) {
    // Single name: take first two letters
    return parts[0].slice(0, 2).toUpperCase();
  }

  // Multiple names: first + last
  const first = parts[0][0] || "";
  const last = parts[parts.length - 1][0] || "";
  return (first + last).toUpperCase();
}
