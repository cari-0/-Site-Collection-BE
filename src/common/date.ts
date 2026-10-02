export function seoulToday(): Date {
  return parseSeoulDate(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' }));
}

export function parseSeoulDate(ymd: string): Date {
  const value = ymd.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error('날짜는 YYYY-MM-DD 형식입니다.');
  }
  return new Date(`${value}T00:00:00.000Z`);
}

export function ymd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function slotPhase(startsOn: Date, endsOn: Date, today = seoulToday()) {
  const start = ymd(startsOn);
  const end = ymd(endsOn);
  const now = ymd(today);
  if (now < start) return 'scheduled' as const;
  if (now > end) return 'ended' as const;
  return 'active' as const;
}
