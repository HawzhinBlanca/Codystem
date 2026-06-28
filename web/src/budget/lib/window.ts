export interface WindowRange {
  start: number;
  end: number;
}

/** The slice of rows to actually render for a virtualized list: the visible window plus
 * `overscan` rows on each side, clamped to [0, count]. */
export function windowRange(
  scrollTop: number,
  viewportH: number,
  rowH: number,
  count: number,
  overscan = 4
): WindowRange {
  if (count <= 0 || rowH <= 0) return { start: 0, end: 0 };
  const first = Math.floor(scrollTop / rowH);
  const visible = Math.ceil(viewportH / rowH) + overscan * 2;
  const start = Math.max(0, first - overscan);
  const end = Math.min(count, start + visible);
  return { start, end };
}
