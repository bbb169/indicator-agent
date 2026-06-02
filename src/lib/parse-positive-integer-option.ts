export function parsePositiveIntegerOption(value: string): number {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed < 1) {
    throw new Error(`Expected positive integer option value, received ${value}`);
  }

  return parsed;
}
