const pluralRules = new Intl.PluralRules("en");

export function formatCount(count: number, singular: string, plural?: string) {
  const defaultPlural: Record<string, string> = {
    class: "classes",
    person: "people",
    child: "children",
  };
  const pluralForm = plural ?? defaultPlural[singular] ?? `${singular}s`;
  return `${count} ${pluralRules.select(count) === "one" ? singular : pluralForm}`;
}

export function balanceDashboardColumns<
  T extends { column: number; columnPinned?: boolean },
>(items: T[], estimateHeight: (item: T) => number = () => 148): [T[], T[]] {
  const columns: [T[], T[]] = [[], []];
  const heights = [0, 0];

  items.forEach((item) => {
    const preferredColumn = Math.max(0, Math.min(1, item.column));
    const column = item.columnPinned
      ? preferredColumn
      : heights[0] <= heights[1]
        ? 0
        : 1;
    columns[column].push(item);
    heights[column] += Math.max(1, estimateHeight(item));
  });

  return columns;
}
