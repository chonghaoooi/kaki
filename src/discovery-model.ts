/** Pure presentation rules; authorization, capacity and joining remain server-owned. */
type Clock = Date | number;
type Activity = Record<string, unknown> | null | undefined;
const DAY = 86_400_000;
const SINGAPORE_OFFSET = 8 * 3_600_000;
const timestamp = (now: Clock): number => now instanceof Date ? now.getTime() : now;
const stringValue = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

/** Singapore has a fixed UTC+08:00 offset, with no daylight-saving transition. */
export function singaporeDateKey(now: Clock = new Date()): string {
  const value = timestamp(now);
  if (!Number.isFinite(value)) return '';
  const shifted = new Date(value + SINGAPORE_OFFSET);
  return Number.isNaN(shifted.getTime()) ? '' : shifted.toISOString().slice(0, 10);
}

function calendarDay(value: unknown): number {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return NaN;
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value ? parsed - SINGAPORE_OFFSET : NaN;
}

function zonedTimestamp(value: unknown): number {
  if (typeof value !== 'string' || !/T.*(?:Z|[+-]\d{2}:\d{2})$/i.test(value) || !Number.isFinite(calendarDay(value.slice(0, 10)))) return NaN;
  return Date.parse(value);
}

function valueDateKey(value: string): string {
  if (Number.isFinite(calendarDay(value))) return value;
  const parsed = zonedTimestamp(value);
  return Number.isFinite(parsed) ? singaporeDateKey(parsed) : '';
}

/** Calendar labels follow Singapore midnight, including month/year rollover. */
export function dateLabelFor(value: string, now: Clock = new Date()): string {
  const day = valueDateKey(value), today = singaporeDateKey(now);
  if (!day) return 'Date to be confirmed';
  if (day === today) return 'Today';
  if (today && calendarDay(day) === calendarDay(today) + DAY) return 'Tomorrow';
  return new Intl.DateTimeFormat('en-SG', {
    day: 'numeric', month: 'short', timeZone: 'Asia/Singapore',
    ...(today && day.slice(0, 4) !== today.slice(0, 4) ? {year: 'numeric' as const} : {}),
  }).format(new Date(calendarDay(day)));
}

function clockMinutes(value: unknown): number {
  const text = stringValue(value);
  const twelve = /^(\d{1,2})(?::([0-5]\d))?\s*([ap])\.?m\.?$/i.exec(text);
  if (twelve) {
    const hour = Number(twelve[1]);
    if (hour < 1 || hour > 12) return NaN;
    return (hour % 12 + (twelve[3].toLowerCase() === 'p' ? 12 : 0)) * 60 + Number(twelve[2] || 0);
  }
  const twentyFour = /^(\d{1,2}):([0-5]\d)$/.exec(text);
  return twentyFour && Number(twentyFour[1]) <= 23 ? Number(twentyFour[1]) * 60 + Number(twentyFour[2]) : NaN;
}

function activityStart(a: Activity): number {
  if (!a) return NaN;
  if (a.startsAt !== undefined && a.startsAt !== null) return zonedTimestamp(a.startsAt);
  const day = calendarDay(a.date);
  // Date-only non-study listings can be sorted without inventing a meeting time.
  if (!stringValue(a.time)) return stringValue(a.category).toLowerCase() === 'study' ? NaN : day;
  return day + clockMinutes(a.time) * 60_000;
}

/**
 * Study sessions close exactly two hours after their Singapore scheduled start,
 * matching server/api.mjs. Other student activities have no persisted end time;
 * keep them through their Singapore calendar day, then remove them from Discover.
 * Real partner startsAt/endsAt and explicit endDate/endTime are honored for
 * non-study records. An endDate without a time includes that entire day.
 * Overnight explicit end times require endDate; we do not guess a duration.
 * This does not remove joined/hosted history or claim that the server rejects
 * late joining of non-study activities. Malformed schedules are not promoted.
 */
export function isDiscoverableActivity(a: Activity, now: Clock = new Date()): boolean {
  if (!a || a.demoHistorical === true) return false;
  const current = timestamp(now), start = activityStart(a);
  if (!Number.isFinite(current) || !Number.isFinite(start)) return false;
  let end: number;
  if (stringValue(a.category).toLowerCase() === 'study') end = start + 2 * 3_600_000;
  else if (a.endsAt !== undefined && a.endsAt !== null) end = zonedTimestamp(a.endsAt);
  else if (a.endDate !== undefined || a.endTime !== undefined) {
    const endDay = calendarDay(a.endDate ?? singaporeDateKey(start));
    end = a.endTime === undefined ? endDay + DAY : endDay + clockMinutes(a.endTime) * 60_000;
  } else end = calendarDay(singaporeDateKey(start)) + DAY;
  return Number.isFinite(end) && end >= start && current < end;
}

/** Invalid schedules sort last; equal starts keep the caller's stable order. */
export function compareActivities(a: Activity, b: Activity): number {
  const first = activityStart(a), second = activityStart(b);
  if (!Number.isFinite(first)) return Number.isFinite(second) ? 1 : 0;
  if (!Number.isFinite(second)) return -1;
  return first - second;
}

const normalizedSearch = (value: string): string => value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** All query words may match across activity, venue and institution text. */
export function matchesActivitySearch(a: Activity, query: string): boolean {
  const words = normalizedSearch(stringValue(query)).split(' ').filter(Boolean);
  if (!words.length) return true;
  if (!a) return false;
  const host = a.host && typeof a.host === 'object' ? a.host as Record<string, unknown> : null;
  const values = [a.title, a.description, a.subject, a.location, a.institutionLabel, a.hostInstitution, host?.institution, ...(Array.isArray(a.tags) ? a.tags : [])];
  const searchable = normalizedSearch(values.map(stringValue).join(' '));
  return words.every(word => searchable.includes(word));
}

function recognizedExperience(value: string): string | null {
  const key = value.toLowerCase().replace(/[-–]/g, ' ').replace(/\s+/g, ' ').trim();
  if (/^(?:beginner|beginners|beginner friendly|beginners welcome|no experience needed)$/.test(key)) return 'Beginner friendly';
  if (key === 'intermediate') return 'Intermediate';
  if (key === 'competitive') return 'Competitive';
  if (key === 'casual') return 'Casual';
  if (key === 'everyone welcome') return 'Everyone welcome';
  if (key === 'all levels' || key === 'all levels welcome') return 'All levels welcome';
  return null;
}

/** Explicit experience wins over tags; absent evidence produces no badge. */
export function activityExperienceLabel(a: Activity): string | null {
  if (!a) return null;
  const experience = stringValue(a.experience);
  if (experience) return recognizedExperience(experience) || experience;
  const labels = (Array.isArray(a.tags) ? a.tags : []).map(stringValue).map(recognizedExperience).filter((label): label is string => label !== null);
  // Prefer a stated skill requirement over a conflicting generic welcome tag.
  for (const label of ['Competitive', 'Intermediate', 'Casual']) if (labels.includes(label)) return label;
  return labels[0] || null;
}
