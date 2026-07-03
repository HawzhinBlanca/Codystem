// codystem-to-10of10 F4: versioned self-upgrade guard. A self-upgrade must be SAFE — never a
// downgrade, never a cross-major jump without an explicit migration, and never a step that drops
// provenance. Pure functions (no I/O) so the policy is exhaustively testable.

export interface SemVer {
  major: number;
  minor: number;
  patch: number;
  suffix: string; // prerelease/build tag after `-`/`+`, or "" — kept so a re-tag isn't seen as equal
}

// ANCHORED at end + captures the optional prerelease/build tag. Trailing garbage or a 4th numeric
// component (e.g. "1.2.3.9-x") is rejected — so a differently-shaped string can't be laundered into
// a matching major.minor.patch triple (the PR #23 blocker).
const VERSION_RE = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+]([0-9A-Za-z][0-9A-Za-z.-]*))?$/;

export function parseVersion(v: string): SemVer {
  const m = VERSION_RE.exec(String(v).trim());
  if (!m) throw new Error(`unparseable version: ${JSON.stringify(v)}`);
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3]), suffix: m[4] ?? "" };
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
  let pv: SemVer;
  let tv: SemVer;
  try {
    pv = parseVersion(from);
    tv = parseVersion(to);
  } catch (e) {
    return { allowed: false, reason: (e as Error).message };
  }
  const c = cmpVersion(to, from); // compares major.minor.patch only
  // A true no-op requires the FULL version (including tag) to match; a same-core different-tag
  // string is NOT a no-op — we cannot order two tags, so refuse it as an ambiguous mismatch.
  if (c === 0 && pv.suffix === tv.suffix)
    return { allowed: true, reason: `no-op: already at ${to}` };
  if (c < 0) return { allowed: false, reason: `refused: downgrade ${from} → ${to}` };
  if (c === 0) {
    return {
      allowed: false,
      reason: `refused: ${from} → ${to} share a version core but differ by tag/prerelease — ambiguous, not a safe no-op`,
    };
  }
  if (tv.major > pv.major && !opts.migrated) {
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
