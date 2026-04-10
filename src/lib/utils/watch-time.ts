export function formatWatchTime(totalMins: number): string {
  if (!totalMins || totalMins <= 0) return '0 min';
  if (totalMins < 60) return `${totalMins} min`;
  const days = Math.floor(totalMins / 1440);
  const hours = Math.floor((totalMins % 1440) / 60);
  const mins = totalMins % 60;
  if (days > 0) return hours > 0 ? `${days}d ${hours}h` : `${days}d`;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
