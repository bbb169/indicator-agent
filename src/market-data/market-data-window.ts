export function marketDataStartDate(days: number): string {
  const startTime = new Date();
  let remainingTradingDays = days - 1;

  // Twelve Data will return everything from start_date forward when end_date
  // and outputsize are omitted. Treat --days as an inclusive trading-session
  // lookback: --days 1 starts today, --days 2 starts at the prior weekday, etc.
  // This approximates a 3-month history as 63 sessions without trying to model
  // exchange holidays locally.
  while (remainingTradingDays > 0) {
    startTime.setDate(startTime.getDate() - 1);

    if (isWeekday(startTime)) {
      remainingTradingDays -= 1;
    }
  }

  return formatTwelveDataDate(startTime);
}

function formatTwelveDataDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();

  return day !== 0 && day !== 6;
}
