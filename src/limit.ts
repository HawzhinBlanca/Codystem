/**
 * A FIFO concurrency limiter: at most `max` of the wrapped async functions run at once; the
 * rest queue and start as slots free. Used to bound the MCP server's in-flight tool work so
 * the latency tail stays flat under extreme client concurrency.
 */
export function createLimiter(max: number) {
  const cap = Math.max(1, Math.floor(max));
  let active = 0;
  const queue: Array<() => void> = [];

  async function acquire(): Promise<void> {
    if (active < cap) {
      active++;
      return;
    }
    await new Promise<void>((resolve) => queue.push(resolve));
    active++;
  }

  function release(): void {
    active--;
    const next = queue.shift();
    if (next) next();
  }

  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    await acquire();
    try {
      return await fn();
    } finally {
      release();
    }
  };
}
