export function formatStudentNumber(
  pattern: string,
  prefix: string,
  year: number,
  sequence: number,
) {
  const seqMatch = pattern.match(/\{SEQ:(\d+)\}/);
  const padLength = seqMatch ? Number.parseInt(seqMatch[1], 10) : 5;
  return pattern
    .replace("{PREFIX}", prefix)
    .replace("{YYYY}", String(year))
    .replace(/\{SEQ:\d+\}/, String(sequence).padStart(padLength, "0"));
}
