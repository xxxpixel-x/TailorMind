// 早期演示留痕仅有时分，日期沿用同一台账的创建日期。
export function auditTime(timestamp: string | undefined, ledgerDate: string) {
  if (!timestamp) return ledgerDate;
  return /^\d{2}:\d{2}/.test(timestamp) ? ledgerDate.slice(0, 10) + " " + timestamp : timestamp;
}

export function shortTime(value: string) {
  const date = new Date(value.replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return value;
  const two = (n: number) => String(n).padStart(2, "0");
  return two(date.getMonth() + 1) + "-" + two(date.getDate()) + " " + two(date.getHours()) + ":" + two(date.getMinutes());
}
