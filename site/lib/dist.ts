// Small numerical helpers so the slides can recompute what R computed.

export function logGamma(z: number): number {
  // Lanczos approximation
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
    12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
}

/** Regularised lower incomplete gamma P(a, x). */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  const gln = logGamma(a);
  if (x < a + 1) {
    let sum = 1 / a;
    let del = sum;
    let ap = a;
    for (let n = 0; n < 500; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  // continued fraction for Q, then P = 1 - Q
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
}

/** Upper tail of the chi-square distribution: pchisq(x, df, lower.tail = FALSE). */
export const pchisqUpper = (x: number, df: number) => Math.max(0, 1 - gammaP(df / 2, x / 2));

export const dpois = (k: number, l: number) => Math.exp(k * Math.log(l) - l - logGamma(k + 1));
export const ppoisUpper = (k: number, l: number) => {
  // P(X >= k)
  let s = 0;
  for (let i = 0; i < k; i++) s += dpois(i, l);
  return Math.max(0, 1 - s);
};

/** Same bin-merging rule as analysis.R: merge until every expected count is at least 5. */
export function mergeBins(o: number[], e: number[]) {
  const bo: number[] = [];
  const be: number[] = [];
  let ao = 0;
  let ae = 0;
  for (let i = 0; i < e.length; i++) {
    ao += o[i];
    ae += e[i];
    if (ae >= 5) {
      bo.push(ao);
      be.push(ae);
      ao = 0;
      ae = 0;
    }
  }
  if (ae > 0 && bo.length) {
    bo[bo.length - 1] += ao;
    be[be.length - 1] += ae;
  }
  return { o: bo, e: be };
}

export function levenshteinMatrix(a: string, b: string): number[][] {
  const m = a.length;
  const n = b.length;
  const D = Array.from({ length: m + 1 }, (_, i) => Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      D[i][j] = Math.min(D[i - 1][j] + 1, D[i][j - 1] + 1, D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return D;
}

/** Jaro-Winkler, ported from PhishGuard's src/core/typosquat.js. */
export function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (!len1 || !len2) return 0;
  const win = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);
  const m1 = new Array(len1).fill(false);
  const m2 = new Array(len2).fill(false);
  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - win);
    const end = Math.min(i + win + 1, len2);
    for (let j = start; j < end; j++) {
      if (m2[j] || s1[i] !== s2[j]) continue;
      m1[i] = true;
      m2[j] = true;
      matches++;
      break;
    }
  }
  if (!matches) return 0;
  let t = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!m1[i]) continue;
    while (!m2[k]) k++;
    if (s1[i] !== s2[k]) t++;
    k++;
  }
  t /= 2;
  const jaro = (matches / len1 + matches / len2 + (matches - t) / matches) / 3;
  let prefix = 0;
  for (let i = 0; i < Math.min(4, len1, len2); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }
  return jaro + prefix * 0.1 * (1 - jaro);
}

/** PhishGuard's structural impersonation checks. */
export function structuralMatch(c: string, t: string): string | null {
  if (c === t) return null;
  if (c.replace(/[-._]/g, "") === t.replace(/[-._]/g, "")) return "punctuation/separator variation";
  for (let i = 0; i < t.length; i++) if (t.slice(0, i + 1) + t[i] + t.slice(i + 1) === c) return "doubled character";
  for (let i = 0; i < t.length; i++) if (t.slice(0, i) + t.slice(i + 1) === c) return "missing character";
  return null;
}
