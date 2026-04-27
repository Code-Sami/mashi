export type PlatformTimeSeriesPoint = {
  date: string;
  users: number;
  groups: number;
  markets: number;
  bets: number;
  memberships: number;
  memberJoins: number;
};

export const PLATFORM_ANALYTICS_RANGE_DAYS = [7, 30, 90, 180, 365] as const;
export type PlatformAnalyticsRangeDays = (typeof PLATFORM_ANALYTICS_RANGE_DAYS)[number];

export function parsePlatformAnalyticsRangeDays(raw: string | undefined): PlatformAnalyticsRangeDays {
  const n = Number(raw);
  if (n === 7 || n === 30 || n === 90 || n === 180 || n === 365) return n;
  return 90;
}
