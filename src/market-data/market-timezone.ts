import dayjs from "dayjs";
import timezone from "dayjs/plugin/timezone.js";
import utc from "dayjs/plugin/utc.js";

export const NASDAQ_MARKET_TIME_ZONE = "America/New_York";

dayjs.extend(utc);
dayjs.extend(timezone);

export function formatNasdaqMarketDateTime(value: Date | number = new Date()): string {
  return dayjs(value).tz(NASDAQ_MARKET_TIME_ZONE).format("YYYY-MM-DDTHH:mm:ss.SSSZ");
}
