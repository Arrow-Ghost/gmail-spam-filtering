// Everything here was computed by r/analysis.R from the UCI SMS Spam Collection.
// Re-run `Rscript r/analysis.R` and the whole deck updates.
import raw from "@/data/stats.json";
import modelRaw from "@/data/model.json";

export const stats = raw;
export const model = modelRaw as { prior_logodds: number; llr: Record<string, number> };

export type Stats = typeof raw;

export const fmt = (x: number, d = 3) => (Number.isFinite(x) ? x.toFixed(d) : "∞");
export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`;
export const int = (x: number) => Math.round(x).toLocaleString("en-US");

/** p-values the way R prints them. */
export const pval = (p: number) => (p < 2.2e-16 ? "< 2.2e-16" : p < 1e-4 ? p.toExponential(1) : p.toFixed(4));

/** Same tokenizer as analysis.R: lower-case runs of letters, digits, £ and $. */
export const tokenize = (s: string) => s.toLowerCase().match(/[a-z0-9£$]+/g) ?? [];

/** Score a message exactly the way the R model does. */
export function classify(text: string) {
  const words = tokenize(text).map((w) => ({ w, llr: model.llr[w] ?? 0, known: w in model.llr }));
  const logodds = model.prior_logodds + words.reduce((s, x) => s + x.llr, 0);
  return { words, logodds, post: 1 / (1 + Math.exp(-logodds)) };
}

export const THUMB_LABELS = [
  "Message length",
  "P(spam | word)",
  "Poisson fit",
  "Chi-square null",
  "ROC curve",
  "Levenshtein adist()",
  "Binomial: spam per day",
  "Normal density",
  "ECDF of length",
  "Words per SMS",
  "Beta family",
  "Log-odds → probability",
  "Naive Bayes log-odds",
  "Poisson family",
  "Clue vs label",
  "Zipf's law",
  "Word log-LR",
  "CLT: sample means",
  "'!' per SMS",
  "Length vs digits",
];
