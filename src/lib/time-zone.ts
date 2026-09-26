/**
 * The viewer's IANA time zone travels to the server in this cookie, so server
 * renders can tell which calendar day it is for them: the server itself runs
 * in UTC, which is already tomorrow during an American evening.
 */
export const TIME_ZONE_COOKIE = "tz";

/** Runs before first paint on every full page load to keep the cookie current. */
export const TIME_ZONE_INIT_SCRIPT = `(function(){try{var z=Intl.DateTimeFormat().resolvedOptions().timeZone;if(z)document.cookie="${TIME_ZONE_COOKIE}="+encodeURIComponent(z)+";path=/;max-age=31536000;samesite=lax"}catch(e){}})()`;

/**
 * The calendar day of `now` in `timeZone`, as UTC midnight (how due dates are
 * stored). Without a usable zone it falls back to the process's own zone.
 */
export function dayKeyInTimeZone(now: Date, timeZone?: string | null): number {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
      }).formatToParts(now);
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)?.value);
      return Date.UTC(part("year"), part("month") - 1, part("day"));
    } catch {
      // Unknown zone name: fall through to the process's zone.
    }
  }
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * The instant the calendar day of `now` began in `timeZone`, so "today's"
 * activity can be queried by timestamp. Without a usable zone it falls back
 * to the process's own zone. On a DST change day the offset at `now` is used
 * for the whole day, which can be an hour off before the switch.
 */
export function startOfDayInTimeZone(
  now: Date,
  timeZone?: string | null,
): Date {
  if (timeZone) {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone,
        year: "numeric",
        month: "numeric",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hourCycle: "h23",
      }).formatToParts(now);
      const part = (type: Intl.DateTimeFormatPartTypes) =>
        Number(parts.find((p) => p.type === type)?.value);
      const wallClock = Date.UTC(
        part("year"),
        part("month") - 1,
        part("day"),
        part("hour"),
        part("minute"),
        part("second"),
      );
      const offset = wallClock - Math.floor(now.getTime() / 1000) * 1000;
      return new Date(
        Date.UTC(part("year"), part("month") - 1, part("day")) - offset,
      );
    } catch {
      // Unknown zone name: fall through to the process's zone.
    }
  }
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}
