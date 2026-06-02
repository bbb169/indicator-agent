export function normalizeCsvArgs(values: string[]): string[] {
  return values.flatMap((value) =>
    value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}
