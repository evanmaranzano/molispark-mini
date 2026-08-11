const SHANGHAI_OFFSET_MS = 8 * 60 * 60 * 1000;
const SHANGHAI_TIME_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/;
const EXPLICIT_TIMEZONE_RE = /(?:Z|[+-]\d{2}:\d{2})$/i;

function parseActivityTime(value) {
  if (value instanceof Date) {
    const time = value.getTime();
    return Number.isFinite(time) ? time : null;
  }
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value !== 'string') return null;

  const text = value.trim();
  const match = SHANGHAI_TIME_RE.exec(text);
  if (match) {
    const [, yearText, monthText, dayText, hourText, minuteText] = match;
    const year = Number(yearText);
    const month = Number(monthText);
    const day = Number(dayText);
    const hour = Number(hourText);
    const minute = Number(minuteText);
    const utcTime = Date.UTC(year, month - 1, day, hour, minute) - SHANGHAI_OFFSET_MS;
    const localTime = new Date(utcTime + SHANGHAI_OFFSET_MS);

    if (
      localTime.getUTCFullYear() !== year ||
      localTime.getUTCMonth() !== month - 1 ||
      localTime.getUTCDate() !== day ||
      localTime.getUTCHours() !== hour ||
      localTime.getUTCMinutes() !== minute
    ) {
      return null;
    }
    return utcTime;
  }

  if (!EXPLICIT_TIMEZONE_RE.test(text)) return null;
  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function getActivityCutoff(activity) {
  if (!activity || typeof activity !== 'object') return null;
  const endTime = parseActivityTime(activity.endTime);
  return endTime === null ? parseActivityTime(activity.startTime) : endTime;
}

function isActivityEnded(activity, now = Date.now()) {
  const cutoff = getActivityCutoff(activity);
  const currentTime = now instanceof Date ? now.getTime() : Number(now);
  return cutoff !== null && Number.isFinite(currentTime) && currentTime >= cutoff;
}

function isActivityClosed(activity, now = Date.now()) {
  if (!activity || typeof activity !== 'object') return false;
  if (activity.status && activity.status !== 'published') return true;
  return isActivityEnded(activity, now);
}

module.exports = { parseActivityTime, getActivityCutoff, isActivityEnded, isActivityClosed };
