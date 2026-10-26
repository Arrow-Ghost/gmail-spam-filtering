"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { stats, model, classify, fmt, pct, int } from "@/lib/stats";
import { levenshteinMatrix, jaroWinkler } from "@/lib/dist";
import { Slide, Tex, Slider, Panel, RCode, Chip } from "../primitives";

/* ---------------------------------------------------------- 09 disguised words */

function nearestSpamWord(raw: string) {
  const b = raw.trim().toLowerCase();
  if (!b) return null;
  let best = { target: stats.spam_dict[0], d: 99, sim: 0 };
  for (const t of stats.spam_dict) {
    const d = levenshteinMatrix(b, t)[b.length][t.length];
    const sim = jaroWinkler(b, t);
    if (d < best.d || (d === best.d && sim > best.sim)) best = { target: t, d, sim };
  }
  return best;
}

function backtrace(D: number[][], a: string, b: string) {
  const path = new Set<string>();
  let i = a.length;
  let j = b.length;
  path.add(`${i},${j}`);
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && D[i][j] === D[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      i--;
      j--;
    } else if (i > 0 && D[i][j] === D[i - 1][j] + 1) i--;
    else j--;
    path.add(`${i},${j}`);
  }
  return path;
}

export function DisguiseSlide({ code }: { code: string }) {
  const [word, setWord] = React.useState("fr33");
  const res = React.useMemo(() => nearestSpamWord(word), [word]);
  const a = word.trim().toLowerCase().slice(0, 12);
  const b = (res?.target ?? "").slice(0, 12);
  const D = React.useMemo(() => levenshteinMatrix(a, b), [a, b]);
  const path = React.useMemo(() => backtrace(D, a, b), [D, a, b]);
  const caught = res && res.d > 0 && res.d <= 2;
  const rawLLR = model.llr[a];
  const fixedLLR = res ? model.llr[res.target] ?? 0 : 0;

  return (
    <Slide
      id="disguise"
      index={9}
      kicker="Distance metrics"
      accent="var(--acid)"
      title={
        <>
          FR33 PR1ZE,
          <br />
          <span className="text-outline">w1nner!!</span>
        </>
      }
      lede={
        <>
          Spammers know filters look for “free” and “prize”, so they misspell them. A filter that only matches exact words is fooled. The
          fix is a distance: the <b className="text-white">Levenshtein edit distance</b> counts the fewest single-letter edits that turn one
          word into another, computed by dynamic programming.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Panel title="Type a disguised word" tag="live">
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            spellCheck={false}
            className="w-full rounded-2xl border border-white/15 bg-black/40 px-5 py-4 font-mono text-2xl text-white outline-none transition focus:border-[var(--acid)] focus:shadow-[0_0_30px_-8px_var(--acid)]"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {stats.fix.map((f) => (
              <Chip key={f.word} active={word === f.word} onClick={() => setWord(f.word)}>
                {f.word}
              </Chip>
            ))}
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="mx-auto border-separate border-spacing-[3px] font-mono text-sm">
              <thead>
                <tr>
                  <th />
                  <th className="w-9 text-white/30">ε</th>
                  {b.split("").map((ch, j) => (
                    <th key={j} className="w-9 text-[var(--pink)]">
                      {ch}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {D.map((row, i) => (
                  <tr key={i}>
                    <th className="pr-1 text-[var(--cyan)]">{i === 0 ? <span className="text-white/30">ε</span> : a[i - 1]}</th>
                    {row.map((v, j) => {
                      const on = path.has(`${i},${j}`);
                      const end = i === a.length && j === b.length;
                      return (
                        <motion.td
                          key={`${a}-${b}-${i}-${j}`}
                          initial={{ opacity: 0, scale: 0.6 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: (i + j) * 0.025 }}
                          className="h-9 w-9 rounded-md text-center tabular-nums"
                          style={{
                            background: end ? "var(--acid)" : on ? "rgba(198,255,61,.18)" : "rgba(255,255,255,.04)",
                            color: end ? "#000" : on ? "var(--acid)" : "rgba(255,255,255,.55)",
                            boxShadow: end ? "0 0 18px var(--acid)" : "none",
                          }}
                        >
                          {v}
                        </motion.td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Tex block className="mt-5 text-white/90">
            {String.raw`D_{i,j}=\min\bigl(D_{i-1,j}+1,\;D_{i,j-1}+1,\;D_{i-1,j-1}+[a_i\ne b_j]\bigr)`}
          </Tex>
        </Panel>

        <div className="flex flex-col gap-4">
          <Panel title="Un-disguised" tag="nearest spam word">
            {res && (
              <div className="space-y-3 font-mono text-sm">
                <Row k="nearest spammy word" v={res.target} c="var(--pink)" />
                <Row k="edit distance" v={String(res.d)} c="var(--acid)" />
                <Row k="Jaro-Winkler similarity" v={res.sim.toFixed(3)} c="var(--violet)" />
                <Row k={`log-LR of “${a}” as typed`} v={rawLLR === undefined ? "unknown word → 0" : rawLLR.toFixed(2)} c="white" />
                <Row k={`log-LR of “${res.target}”`} v={`+${fixedLLR.toFixed(2)}`} c="var(--pink)" />
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={String(caught)}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="mt-6 rounded-2xl px-5 py-4 text-center font-display text-xl font-semibold uppercase tracking-tight"
                style={{
                  background: caught ? "var(--pink)" : res?.d === 0 ? "var(--cyan)" : "rgba(255,255,255,.06)",
                  color: caught || res?.d === 0 ? "#000" : "white",
                  boxShadow: caught ? "0 0 50px -10px var(--pink)" : "none",
                }}
              >
                {caught ? `caught: “${a}” = “${res!.target}”` : res?.d === 0 ? "already a known spam word" : "too far from any spam word"}
              </motion.div>
            </AnimatePresence>
            <p className="mt-4 text-sm text-white/50">
              Rule: within 2 edits of a known spam word, treat it as that word. The disguise turns an unknown word (no evidence) back into
              strong evidence for spam.
            </p>
          </Panel>
          <RCode code={code} maxHeight={220} />
        </div>
      </div>
    </Slide>
  );
}

function Row({ k, v, c }: { k: string; v: string; c: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
      <span className="text-white/45">{k}</span>
      <span style={{ color: c }}>{v}</span>
    </div>
  );
}

/* ---------------------------------------------------------- 10 live filter */

const SAMPLES = [
  "Congratulations! You have WON a FREE holiday. Call 09061701461 now to claim your prize",
  "Hey, are we still meeting for lunch tomorrow? I'll be a bit late sorry",
  "URGENT! Your mobile number has been selected for a £2000 cash reward. Txt WIN to 85069",
  "Ok lol, I'm home now. Love you, see you soon",
  "Your account will be suspended. Reply with your PIN to verify",
];

// Optional R backend (r/api, deployed on Render). Without it the same model runs in the page.
const API = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "");
type ServerState = "off" | "waking" | "live" | "down";

function useRServer(text: string) {
  const [state, setState] = React.useState<ServerState>(API ? "waking" : "off");
  const [remote, setRemote] = React.useState<{ text: string; post: number; logodds: number; engine: string } | null>(null);

  // free Render instances sleep; the first request can take ~a minute to wake them
  React.useEffect(() => {
    if (!API) return;
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 90000);
    fetch(`${API}/health`, { signal: ctl.signal })
      .then((r) => setState(r.ok ? "live" : "down"))
      .catch(() => setState("down"))
      .finally(() => clearTimeout(t));
    return () => ctl.abort();
  }, []);

  React.useEffect(() => {
    if (state !== "live") return;
    const ctl = new AbortController();
    const t = setTimeout(() => {
      fetch(`${API}/classify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
        signal: ctl.signal,
      })
        .then((r) => r.json())
        .then((j) => setRemote({ text, post: j.post, logodds: j.logodds, engine: j.engine }))
        .catch(() => {});
    }, 300);
    return () => {
      clearTimeout(t);
      ctl.abort();
    };
  }, [text, state]);

  return { state, remote: remote && remote.text === text ? remote : null };
}

export function LiveFilterSlide() {
  const [text, setText] = React.useState(SAMPLES[0]);
  const local = React.useMemo(() => classify(text), [text]);
  const { state, remote } = useRServer(text);
  const r = remote ? { ...local, post: remote.post, logodds: remote.logodds } : local;
  const spam = r.post >= 0.5;
  const strongest = [...r.words].filter((w) => w.known).sort((a, b) => Math.abs(b.llr) - Math.abs(a.llr)).slice(0, 6);
  const angle = -90 + r.post * 180;

  return (
    <section
      id="live"
      data-slide="Live filter"
      data-stop="Live filter"
      className="relative min-h-screen w-full overflow-hidden px-5 pb-28 pt-28 md:px-12 lg:px-20"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        animate={{
          background: spam
            ? "radial-gradient(circle at 50% 30%, rgba(255,43,214,.28), transparent 60%)"
            : "radial-gradient(circle at 50% 30%, rgba(45,226,255,.18), transparent 60%)",
        }}
        transition={{ duration: 0.8 }}
      />
      <div className="relative mx-auto w-full max-w-[1320px]">
        <div className="mb-5 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--acid)]">
          <span>10</span>
          <span className="h-px w-12 bg-[var(--acid)]/60" />
          <span>Your turn</span>
        </div>
        <h2 className="font-display text-[clamp(2.4rem,6.4vw,6rem)] font-semibold uppercase leading-[0.88] tracking-[-0.03em] text-white">
          Try to fool <span className="text-rainbow">the filter</span>
        </h2>
        <p className="mt-6 max-w-[62ch] text-lg text-white/65">
          This is the real Naive Bayes model R trained on {int(stats.nb.n_train)} messages: {int(stats.nb.vocab)} words, each with its own
          likelihood ratio. Anyone in the room can type a message, and it is classified live.
        </p>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
          <div className="glass rounded-3xl p-6 md:p-8">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              spellCheck={false}
              className="w-full resize-none rounded-2xl border border-white/15 bg-black/50 px-5 py-4 text-xl leading-relaxed text-white outline-none transition focus:border-[var(--acid)] focus:shadow-[0_0_40px_-10px_var(--acid)]"
              placeholder="Type any text message…"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              {SAMPLES.map((s, i) => (
                <Chip key={i} active={text === s} onClick={() => setText(s)} color={classify(s).post > 0.5 ? "var(--pink)" : "var(--cyan)"}>
                  example {i + 1}
                </Chip>
              ))}
              <Chip onClick={() => setText("")}>clear</Chip>
            </div>
            <div className="mt-6 flex min-h-[120px] flex-wrap content-start gap-2">
              <AnimatePresence>
                {r.words.map((w, i) => {
                  const c = !w.known ? "rgba(255,255,255,.25)" : w.llr > 0 ? "var(--pink)" : "var(--cyan)";
                  const s = Math.min(1, Math.abs(w.llr) / 4);
                  return (
                    <motion.span
                      key={`${i}-${w.w}`}
                      layout
                      initial={{ opacity: 0, y: 12, scale: 0.8 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.6 }}
                      title={w.known ? `log-LR ${w.llr.toFixed(2)}` : "never seen in training: no evidence"}
                      className="rounded-lg border px-2.5 py-1 font-mono text-sm"
                      style={{
                        borderColor: c,
                        color: w.known ? "white" : "rgba(255,255,255,.4)",
                        background: w.known ? `color-mix(in srgb, ${c} ${Math.round(8 + s * 40)}%, transparent)` : "transparent",
                        boxShadow: s > 0.6 ? `0 0 16px -4px ${c}` : "none",
                      }}
                    >
                      {w.w}
                      {w.known && <sup className="ml-1 text-[10px] opacity-70">{w.llr > 0 ? "+" : ""}{w.llr.toFixed(1)}</sup>}
                    </motion.span>
                  );
                })}
              </AnimatePresence>
            </div>
            <p className="mt-4 text-sm text-white/45">
              Each chip shows the word&apos;s log likelihood ratio: pink pushes towards spam, cyan towards ham, grey words were never seen in
              training.
            </p>
          </div>

          <div className="glass flex flex-col items-center rounded-3xl p-6 md:p-8">
            <svg viewBox="0 0 300 175" className="w-full max-w-[380px]">
              <defs>
                <linearGradient id="gauge" x1="0" x2="1">
                  <stop offset="0" stopColor="#2de2ff" />
                  <stop offset="0.5" stopColor="#9b7bff" />
                  <stop offset="1" stopColor="#ff2bd6" />
                </linearGradient>
              </defs>
              <path d="M 30 160 A 120 120 0 0 1 270 160" fill="none" stroke="url(#gauge)" strokeWidth="18" strokeLinecap="round" opacity={0.85} />
              <line x1={150} y1={36} x2={150} y2={50} stroke="var(--acid)" strokeWidth={3} />
              <g
                style={{
                  transform: `rotate(${angle.toFixed(2)}deg)`,
                  transformOrigin: "150px 160px",
                  transformBox: "view-box",
                  transition: "transform .9s cubic-bezier(.34,1.56,.5,1)",
                }}
              >
                <line x1={150} y1={160} x2={150} y2={56} stroke="white" strokeWidth={4} strokeLinecap="round" style={{ filter: "drop-shadow(0 0 6px white)" }} />
              </g>
              <circle cx={150} cy={160} r={9} fill="white" />
              <text x={30} y={175} fill="var(--cyan)" fontSize="11" textAnchor="middle" fontFamily="var(--font-code)">ham</text>
              <text x={270} y={175} fill="var(--pink)" fontSize="11" textAnchor="middle" fontFamily="var(--font-code)">spam</text>
            </svg>
            <div className="mt-2 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">P(spam | your words)</div>
            <motion.div
              key={r.post > 0.9995 ? "max" : r.post.toFixed(3)}
              initial={{ scale: 0.92 }}
              animate={{ scale: 1 }}
              className="font-display text-6xl font-semibold tabular-nums text-glow"
              style={{ color: spam ? "var(--pink)" : "var(--cyan)" }}
            >
              {r.post > 0.9995 ? ">99.9%" : r.post < 0.0005 ? "<0.1%" : pct(r.post, 1)}
            </motion.div>
            <motion.div
              key={String(spam)}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="mt-4 rounded-full px-6 py-2 font-display text-lg font-semibold uppercase tracking-wide text-black"
              style={{ background: spam ? "var(--pink)" : "var(--cyan)", boxShadow: `0 0 40px -6px ${spam ? "var(--pink)" : "var(--cyan)"}` }}
            >
              {spam ? "→ spam folder" : "→ inbox"}
            </motion.div>
            <div className="mt-4 flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
              <span
                className="h-2 w-2 rounded-full"
                style={{
                  background: state === "live" ? "var(--acid)" : state === "waking" ? "var(--orange)" : "rgba(255,255,255,.3)",
                  boxShadow: state === "live" ? "0 0 10px var(--acid)" : "none",
                }}
              />
              {state === "live" && remote
                ? `computed live by ${remote.engine}`
                : state === "waking"
                  ? "waking the R server… (using the in-page model meanwhile)"
                  : "computed in the page (same R-trained model)"}
            </div>
            <div className="mt-6 w-full font-mono text-xs text-white/60">
              <div className="flex justify-between border-b border-white/10 pb-1.5">
                <span>prior log-odds</span>
                <span>{model.prior_logodds.toFixed(2)}</span>
              </div>
              {strongest.map((w, i) => (
                <div key={i} className="flex justify-between border-b border-white/5 py-1.5">
                  <span>+ “{w.w}”</span>
                  <span style={{ color: w.llr > 0 ? "var(--pink)" : "var(--cyan)" }}>{w.llr > 0 ? "+" : ""}{w.llr.toFixed(2)}</span>
                </div>
              ))}
              <div className="flex justify-between pt-1.5 text-white">
                <span>total log-odds</span>
                <span>{r.logodds.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------------------------------------------------------- 11 accuracy & cost */

export function AccuracySlide({ code }: { code: string }) {
  const nb = stats.nb;
  const groups = React.useMemo(() => [...nb.groups].sort((x, y) => x.s - y.s), [nb.groups]);
  const totPos = groups.reduce((s, g) => s + g.pos, 0);
  const totNeg = groups.reduce((s, g) => s + g.neg, 0);
  const [th, setTh] = React.useState(0.5);
  const [costFP, setCostFP] = React.useState(10); // a real message lost in the spam folder
  const [costFN, setCostFN] = React.useState(1); // a spam that reaches the inbox

  const at = (t: number) => {
    let tp = 0;
    let fp = 0;
    for (const g of groups) if (g.s >= t) {
      tp += g.pos;
      fp += g.neg;
    }
    return { tp, fp, fn: totPos - tp, tn: totNeg - fp };
  };
  const cm = at(th);
  const tpr = cm.tp / totPos;
  const fpr = cm.fp / totNeg;
  const prec = cm.tp / Math.max(1, cm.tp + cm.fp);
  const acc = (cm.tp + cm.tn) / (totPos + totNeg);

  const sweep = React.useMemo(() => {
    const ts = Array.from({ length: 101 }, (_, i) => i / 100);
    return ts.map((t) => {
      const c = at(t);
      return { t, cost: costFP * c.fp + costFN * c.fn };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [costFP, costFN, groups]);
  const best = sweep.reduce((a, b) => (b.cost < a.cost ? b : a));
  const maxCost = Math.max(...sweep.map((s) => s.cost));
  const S = 240;
  const rocPath = (r: { fpr: number; tpr: number }[]) =>
    r.map((p, i) => `${i ? "L" : "M"}${(p.fpr * S).toFixed(1)},${(S - p.tpr * S).toFixed(1)}`).join(" ");

  return (
    <Slide
      id="accuracy"
      index={11}
      kicker="Evaluation · expected cost"
      accent="var(--orange)"
      title={
        <>
          {pct(nb.accuracy, 1)} right.
          <br />
          <span className="text-outline">Is that good?</span>
        </>
      }
      lede={
        <>
          Tested on {int(nb.n_test)} messages it never saw, the filter is right {pct(nb.accuracy, 1)} of the time. But the two mistakes are not
          equal: losing a real message from your boss is far worse than seeing one spam. Choosing the threshold is a question about{" "}
          <b className="text-white">expected cost</b>.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Confusion matrix & ROC" tag="test set">
          <div className="grid grid-cols-[auto_1fr] gap-6">
            <svg viewBox={`-28 -8 ${S + 40} ${S + 40}`} className="w-[250px] max-w-full">
              <rect x={0} y={0} width={S} height={S} fill="none" stroke="rgba(255,255,255,.15)" />
              <line x1={0} y1={S} x2={S} y2={0} stroke="rgba(255,255,255,.2)" strokeDasharray="4 4" />
              <path d={rocPath(nb.roc_len)} fill="none" stroke="var(--orange)" strokeWidth={3} style={{ filter: "drop-shadow(0 0 6px var(--orange))" }} />
              <path d={rocPath(nb.roc)} fill="none" stroke="var(--acid)" strokeWidth={3} style={{ filter: "drop-shadow(0 0 6px var(--acid))" }} />
              <motion.circle animate={{ cx: fpr * S, cy: S - tpr * S }} r={8} fill="var(--acid)" stroke="#000" strokeWidth={2} />
              <text x={S / 2} y={S + 26} fill="rgba(255,255,255,.45)" fontSize="12" textAnchor="middle" fontFamily="var(--font-code)">
                false positive rate
              </text>
              <text x={-14} y={S / 2} fill="rgba(255,255,255,.45)" fontSize="12" textAnchor="middle" fontFamily="var(--font-code)" transform={`rotate(-90 -14 ${S / 2})`}>
                true positive rate
              </text>
            </svg>
            <div className="space-y-3 font-mono text-sm">
              <div>
                <span className="text-[var(--orange)]">■</span> length only · AUC {fmt(nb.auc_len, 3)}
              </div>
              <div>
                <span className="text-[var(--acid)]">■</span> Naive Bayes · AUC {fmt(nb.auc, 3)}
              </div>
              <div className="grid grid-cols-2 gap-1.5 pt-2 text-center">
                {[
                  ["spam caught", cm.tp, "var(--pink)"],
                  ["real lost", cm.fp, "var(--orange)"],
                  ["spam missed", cm.fn, "rgba(255,43,214,.6)"],
                  ["real kept", cm.tn, "var(--cyan)"],
                ].map(([l, v, c]) => (
                  <div key={l as string} className="rounded-lg bg-white/[.04] py-2">
                    <div className="text-[10px] text-white/40">{l}</div>
                    <div className="text-lg tabular-nums" style={{ color: c as string }}>
                      {v}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-5">
            <Slider label="threshold: spam folder if P(spam) ≥" value={th} min={0} max={1} step={0.01} onChange={setTh} display={th.toFixed(2)} color="var(--acid)" />
          </div>
          <div className="mt-4 grid grid-cols-4 gap-2 text-center font-mono text-xs">
            {[
              ["recall", tpr],
              ["FPR", fpr],
              ["precision", prec],
              ["accuracy", acc],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-lg bg-white/[.04] py-2">
                <div className="text-[10px] uppercase tracking-[0.15em] text-white/40">{l}</div>
                <div className="text-base text-white">{pct(v as number, 1)}</div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Which mistake hurts more?" tag="minimise E[cost]">
          <Tex block className="text-lg text-white">{String.raw`\text{Cost}(t)=c_{\text{lost}}\cdot FP(t)+c_{\text{missed}}\cdot FN(t)`}</Tex>
          <div className="mt-5 grid gap-5">
            <Slider label="cost of losing a real message" value={costFP} min={1} max={50} onChange={setCostFP} display={`${costFP}`} color="var(--orange)" />
            <Slider label="cost of one spam in the inbox" value={costFN} min={1} max={50} onChange={setCostFN} display={`${costFN}`} color="var(--pink)" />
          </div>
          <svg viewBox="0 0 400 150" className="mt-5 w-full">
            <polyline
              fill="none"
              stroke="var(--violet)"
              strokeWidth={3}
              style={{ filter: "drop-shadow(0 0 6px var(--violet))" }}
              points={sweep.map((s) => `${(s.t * 400).toFixed(1)},${(140 - (Math.log1p(s.cost) / Math.log1p(maxCost)) * 125).toFixed(1)}`).join(" ")}
            />
            <motion.line animate={{ x1: best.t * 400, x2: best.t * 400 }} y1={5} y2={145} stroke="var(--acid)" strokeDasharray="4 4" />
            <motion.line animate={{ x1: th * 400, x2: th * 400 }} y1={5} y2={145} stroke="white" strokeOpacity={0.4} />
            <text x={4} y={148} fill="rgba(255,255,255,.4)" fontSize="11" fontFamily="var(--font-code)">t = 0</text>
            <text x={396} y={148} fill="rgba(255,255,255,.4)" fontSize="11" textAnchor="end" fontFamily="var(--font-code)">t = 1</text>
            <text x={396} y={14} fill="rgba(255,255,255,.35)" fontSize="10" textAnchor="end" fontFamily="var(--font-code)">total cost (log scale)</text>
          </svg>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="font-mono text-sm text-white/70">
              best threshold <span className="text-[var(--acid)]">t = {best.t.toFixed(2)}</span> · cost {int(best.cost)} vs {int(costFP * cm.fp + costFN * cm.fn)} now
            </div>
            <Chip onClick={() => setTh(best.t)} color="var(--acid)">
              use best t
            </Chip>
          </div>
          <p className="mt-4 text-sm text-white/55">
            When losing a real message costs 10× more than a spam getting through, the best threshold moves up: the filter only acts when it
            is very sure. Every email provider makes exactly this trade-off.
          </p>
        </Panel>
      </div>
      <div className="mt-6">
        <RCode code={code} maxHeight={260} />
      </div>
    </Slide>
  );
}
