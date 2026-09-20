export function seoulToday(): Date {
  const ymd = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' });
  return new Date(`${ymd}T00:00:00.000Z`);
}
