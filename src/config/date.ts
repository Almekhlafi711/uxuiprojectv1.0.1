/**
 * Date Configuration
 * Central date source for the entire application.
 * All hardcoded dates should reference this file.
 */

const now = new Date();

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

export const YEAR = now.getFullYear();
export const MONTH = pad(now.getMonth() + 1);
export const DAY = pad(now.getDate());
export const TODAY = `${YEAR}-${MONTH}-${DAY}`;
export const CURRENT_MONTH = `${YEAR}-${MONTH}`;
export const CURRENT_YEAR = `${YEAR}`;

export const SYSTEM_TODAY = TODAY;
export const SYSTEM_TIME = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
export const SYSTEM_DATETIME = `${TODAY}T${SYSTEM_TIME}`;
