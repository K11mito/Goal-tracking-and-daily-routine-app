interface UsageData {
  count: number;
  monthKey: string; // "2024-01" format
}

const MONTHLY_LIMIT = 2000; // 4% of free tier - safe buffer
const STORAGE_KEY = 'mapbox_usage';

function getCurrentMonthKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function getUsageData(): UsageData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data: UsageData = JSON.parse(stored);
      const currentMonth = getCurrentMonthKey();

      // Reset if month has changed
      if (data.monthKey !== currentMonth) {
        return { count: 0, monthKey: currentMonth };
      }
      return data;
    }
  } catch {
    // Invalid data, reset
  }
  return { count: 0, monthKey: getCurrentMonthKey() };
}

function saveUsageData(data: UsageData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage unavailable or full
  }
}

export function canLoadMap(): boolean {
  const data = getUsageData();
  return data.count < MONTHLY_LIMIT;
}

export function recordMapLoad(): void {
  const data = getUsageData();
  data.count += 1;
  saveUsageData(data);
}

export function getUsageStats(): { used: number; limit: number; remaining: number } {
  const data = getUsageData();
  return {
    used: data.count,
    limit: MONTHLY_LIMIT,
    remaining: Math.max(0, MONTHLY_LIMIT - data.count)
  };
}
