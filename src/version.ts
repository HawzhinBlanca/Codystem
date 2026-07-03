// codystem-to-10of10 F4: versioned self-upgrade guard. A self-upgrade must be SAFE — never a
// downgrade, never a cross-major jump without an explicit migration, and never a step that drops
// provenance. Pure functions (no I/O) so the policy is exhaustively testable.

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
}

export function parseVersion(v: string): SemVer {
  const m = /^v?(\d+)\.(\d+)\.(\d+)/.exec(String(v).trim());
  if (!m) throw new Error(`unparseable version: ${JSON.stringify(v)}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]) };
}

/** -1 if a<b, 0 if equal, 1 if a>b. */
export function cmpVersion(a: string, b: string): number {
  const x = parseVersion(a);
  const y = parseVersion(b);
  for (const k of ["major", "minor", "patch"] as const) {
    if (x[k] !== y[k]) return x[k] < y[k] ? -1 : 1;
  }
  return 0;
}

export interface UpgradeDecision {
  allowed: boolean;
  reason: string;
}

/**
 * Decide whether upgrading `from` → `to` is allowed. Refuses a downgrade and a cross-major jump
 * (which needs an explicit migration, signalled by opts.migrated). A same-version re-run is a no-op
 * (allowed). Same-major forward, or an explicitly-migrated major bump, is allowed.
 */
export function upgradeDecision(
  from: string,
  to: string,
  opts: { migrated?: boolean } = {}
): UpgradeDecision {
  let c: number;
  try {
    c = cmpVersion(to, from);
  } catch (e) {
    return { allowed: false, reason: (e as Error).message };
  }
  if (c < 0) return { allowed: false, reason: `refused: downgrade ${from} → ${to}` };
  if (c === 0) return { allowed: true, reason: `no-op: already at ${to}` };
  const fromMajor = parseVersion(from).major;
  const toMajor = parseVersion(to).major;
  if (toMajor > fromMajor && !opts.migrated) {
    return {
      allowed: false,
      reason: `refused: major upgrade ${from} → ${to} requires an explicit migration`,
    };
  }
  return { allowed: true, reason: `ok: ${from} → ${to}` };
}

/** Provenance is preserved iff every record present before the upgrade is still present after. */
export function provenancePreserved(before: string[], after: string[]): boolean {
  const have = new Set(after);
  return before.every((id) => have.has(id));
}

export interface UpgradeCheck {
  ok: boolean;
  reasons: string[];
}

/**
 * The full self-upgrade gate: the version step must be allowed AND no provenance may be lost. Both
 * must hold; every failing reason is reported.
 */
export function checkUpgrade(
  from: string,
  to: string,
  provBefore: string[],
  provAfter: string[],
  opts: { migrated?: boolean } = {}
): UpgradeCheck {
  const reasons: string[] = [];
  const decision = upgradeDecision(from, to, opts);
  if (!decision.allowed) reasons.push(decision.reason);
  if (!provenancePreserved(provBefore, provAfter)) {
    const lost = provBefore.filter((id) => !provAfter.includes(id));
    reasons.push(`refused: upgrade would lose provenance: ${lost.join(", ")}`);
  }
  const ok = reasons.length === 0;
  if (ok) reasons.push(decision.reason);
  return { ok, reasons };
}
