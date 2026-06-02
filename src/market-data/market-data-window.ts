export function marketDataStartDate(days: number): string {
  const startTime = new Date();

  // Twelve Data will return everything from start_date forward when end_date
  // and outputsize are omitted. Treat the CLI's --days value as an inclusive
  // calendar lookback: --days 1 starts today, --days 2 starts yesterday, etc.
  startTime.setDate(startTime.getDate() - (days - 1));

  return formatTwelveDataDate(startTime);
}

function formatTwelveDataDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
