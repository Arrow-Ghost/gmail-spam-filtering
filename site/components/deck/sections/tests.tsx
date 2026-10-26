"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { stats, fmt, pval, int } from "@/lib/stats";
import { dpois, ppoisUpper, mergeBins, pchisqUpper } from "@/lib/dist";
import { Slide, Tex, Slider, Panel, RCode, ROutput, NeonButton, Chip, StatTile } from "../primitives";

/* ------------------------------------------------------------- 07 Poisson */

export function PoissonSlide({ code }: { code: string }) {
  const [cls, setCls] = React.useState<"spam" | "ham">("spam");
  const P = stats.poisson[cls];
  const [lambda, setLambda] = React.useState(Number(P.lambda.toFixed(2)));
  React.useEffect(() => setLambda(Number(stats.poisson[cls].lambda.toFixed(2))), [cls]);
  const K = P.observed.length;
  const n = P.n;
  const expected = Array.from({ length: K }, (_, k) => (k < K - 1 ? dpois(k, lambda) * n : ppoisUpper(K - 1, lambda) * n));
  const mb = mergeBins(P.observed, expected);
  const chi = mb.o.reduce((s, o, i) => s + (o - mb.e[i]) ** 2 / mb.e[i], 0);
  const df = Math.max(1, mb.o.length - 2);
  const p = pchisqUpper(chi, df);
  const color = cls === "spam" ? "var(--pink)" : "var(--cyan)";

  const H = 250;
  const W = 640;
  const share = (v: number) => v / n;
  const maxY = Math.max(...P.observed.map(share), ...expected.map(share)) * 1.12;
  const bw = W / K;
  const y = (v: number) => Math.round((H - (share(v) / maxY) * H) * 100) / 100;

  return (
    <Slide
      id="poisson"
      index={7}
      kicker="Poisson distribution"
      accent="var(--cyan)"
      title={
        <>
          Spammers are
          <br />
          <span className="text-outline">predictable!</span>
        </>
      }
      lede={
        <>
          How many exclamation marks are in a message? Rare events that happen at a steady rate follow a Poisson distribution,
          X ~ Poisson(λ). We estimate λ from the data, then a <b className="text-white">χ² goodness-of-fit test</b> checks whether that
          model really fits.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
        <Panel title={`'!' per ${cls} message · n = ${int(n)}`} tag="dpois() · drag λ">
          <div className="mb-4 flex gap-2">
            <Chip active={cls === "spam"} onClick={() => setCls("spam")} color="var(--pink)">
              spam
            </Chip>
            <Chip active={cls === "ham"} onClick={() => setCls("ham")} color="var(--cyan)">
              ham
            </Chip>
          </div>
          <Tex block className="text-lg text-white">
            {String.raw`P(X=k)=\frac{\lambda^{k}e^{-\lambda}}{k!}\qquad \hat\lambda_{\text{MLE}}=\bar x=${P.lambda.toFixed(3)}`}
          </Tex>
          <svg viewBox={`-10 -16 ${W + 20} ${H + 54}`} className="mt-4 w-full">
            {P.observed.map((o, k) => (
              <g key={`${cls}-${k}`}>
                <motion.rect
                  initial={{ height: 0, y: H }}
                  animate={{ height: H - y(o), y: y(o) }}
                  transition={{ duration: 0.8, delay: k * 0.06 }}
                  x={k * bw + bw * 0.15}
                  width={bw * 0.7}
                  rx={6}
                  fill={cls === "spam" ? "rgba(255,43,214,.22)" : "rgba(45,226,255,.22)"}
                  stroke={color}
                />
                <text x={k * bw + bw / 2} y={H + 22} fill="rgba(255,255,255,.6)" fontSize="14" textAnchor="middle" fontFamily="var(--font-code)">
                  {k === K - 1 ? `${k}+` : k}
                </text>
                <text x={k * bw + bw / 2} y={y(o) - 8} fill={color} fontSize="13" textAnchor="middle" fontFamily="var(--font-code)">
                  {o}
                </text>
              </g>
            ))}
            <polyline fill="none" stroke="var(--acid)" strokeWidth={3} style={{ filter: "drop-shadow(0 0 8px var(--acid))" }} points={expected.map((e, k) => `${k * bw + bw / 2},${y(e)}`).join(" ")} />
            {expected.map((e, k) => (
              <motion.circle key={k} animate={{ cy: y(e) }} cx={k * bw + bw / 2} r={6} fill="var(--acid)" />
            ))}
          </svg>
          <div className="mt-4">
            <Slider label="λ (average '!' per message)" value={lambda} min={0.05} max={2} step={0.01} onChange={setLambda} display={lambda.toFixed(2)} color="var(--acid)" />
          </div>
          <div className="mt-3 font-mono text-sm text-white/70">
            bars = data · green = Poisson(λ) · χ² = <span className="text-[var(--acid)]">{chi.toFixed(2)}</span> · df = {df} · p ={" "}
            <span className="text-[var(--acid)]">{pval(p)}</span>
          </div>
        </Panel>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <StatTile label="spam λ̂" value={fmt(stats.poisson.spam.lambda, 2)} sub={`dispersion ${fmt(stats.poisson.spam.dispersion, 2)}`} color="var(--pink)" />
            <StatTile label="ham λ̂" value={fmt(stats.poisson.ham.lambda, 2)} sub={`dispersion ${fmt(stats.poisson.ham.dispersion, 2)}`} color="var(--cyan)" />
          </div>
          <Panel title="Two very different verdicts" tag="analysis.R">
            <ROutput>{`spam: chi2 = ${fmt(stats.poisson.spam.gof_stat, 2)}, df ${stats.poisson.spam.gof_df}, p = ${pval(stats.poisson.spam.gof_p)}
ham : chi2 = ${fmt(stats.poisson.ham.gof_stat, 1)}, df ${stats.poisson.ham.gof_df}, p = ${pval(stats.poisson.ham.gof_p)}`}</ROutput>
            <p className="mt-3 text-sm leading-relaxed text-white/65">
              <b className="text-[var(--pink)]">Spam fits Poisson</b> (p &gt; 0.05, we can&apos;t reject it). Spammers use
              exclamation marks at a steady, mechanical rate, like a template. <b className="text-[var(--cyan)]">Ham does not</b>: its
              variance is about twice its mean. Most people never type “!”, and a few go “!!!!!”. Humans are bursty, scripts are
              regular. Variance divided by mean is a quick fingerprint of who wrote a message.
            </p>
          </Panel>
          <Panel title="Rate of '!'" tag="λ spam / λ ham">
            <div className="font-display text-5xl font-semibold text-[var(--acid)]">
              {(stats.poisson.spam.lambda / stats.poisson.ham.lambda).toFixed(1)}×
            </div>
            <p className="mt-1 text-sm text-white/55">Spam uses about four times as many exclamation marks per message.</p>
          </Panel>
        </div>
      </div>
      <div className="mt-6">
        <RCode code={code} maxHeight={240} />
      </div>
    </Slide>
  );
}

/* --------------------------------------------------------- 08 chi-square */

const BINS = 28;
const BIN_W = 1;

export function ChiSquareSlide({ code }: { code: string }) {
  const C = stats.chisq;
  const table = C.table;
  const sizes = table.map((r) => r.ham + r.spam);
  const N = sizes.reduce((a, b) => a + b, 0);
  const Ks = table.reduce((s, r) => s + r.spam, 0);
  const [showE, setShowE] = React.useState(false);
  const [hist, setHist] = React.useState<number[]>(() => Array(BINS).fill(0));
  const [count, setCount] = React.useState(0);
  const [lastStat, setLastStat] = React.useState<number | null>(null);
  const [maxStat, setMaxStat] = React.useState(0);

  const chiOf = (spamPer: number[]) => {
    let s = 0;
    for (let i = 0; i < sizes.length; i++) {
      const eS = (sizes[i] * Ks) / N;
      const eH = sizes[i] - eS;
      s += (spamPer[i] - eS) ** 2 / eS + (sizes[i] - spamPer[i] - eH) ** 2 / eH;
    }
    return s;
  };

  const shuffle = (times: number) => {
    const labels = new Uint8Array(N);
    labels.fill(1, 0, Ks);
    const h = [...hist];
    let last = 0;
    let mx = maxStat;
    for (let t = 0; t < times; t++) {
      for (let i = N - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        const tmp = labels[i];
        labels[i] = labels[j];
        labels[j] = tmp;
      }
      const per: number[] = [];
      let off = 0;
      for (const s of sizes) {
        let k = 0;
        for (let i = off; i < off + s; i++) k += labels[i];
        per.push(k);
        off += s;
      }
      last = chiOf(per);
      mx = Math.max(mx, last);
      h[Math.min(BINS - 1, Math.floor(last / BIN_W))]++;
    }
    setHist(h);
    setCount((c) => c + times);
    setLastStat(last);
    setMaxStat(mx);
  };

  const hMax = Math.max(1, ...hist);
  const crit = C.critical_95;
  const sx = (v: number) => (v / BIN_W) * (540 / BINS);

  return (
    <Slide
      id="chisq"
      index={8}
      kicker="Hypothesis testing · χ²"
      accent="var(--violet)"
      title={
        <>
          Could it be
          <br />
          <span className="text-rainbow">pure chance?</span>
        </>
      }
      lede={
        <>
          We sorted every message by its strongest clue: a long phone number, a £/$ sign, a web link, or none. H₀: the clue is{" "}
          <b className="text-white">independent</b> of whether the message is spam. If H₀ were true, shuffling the spam labels wouldn&apos;t
          change anything. So let&apos;s shuffle them.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
        <Panel title="Contingency table" tag="table(clue, label)">
          <div className="mb-3 flex gap-2">
            <Chip active={!showE} onClick={() => setShowE(false)} color="var(--violet)">
              observed O
            </Chip>
            <Chip active={showE} onClick={() => setShowE(true)} color="var(--violet)">
              expected E under H₀
            </Chip>
          </div>
          <table className="w-full font-mono text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-white/40">
                <th className="py-2 text-left">clue</th>
                <th className="py-2 text-right">ham</th>
                <th className="py-2 text-right">spam</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r, i) => {
                const eS = (sizes[i] * Ks) / N;
                return (
                  <tr key={r.group} className="border-t border-white/5">
                    <td className="py-2 text-white/80">{r.group}</td>
                    <td className="py-2 text-right tabular-nums text-[var(--cyan)]">{showE ? (sizes[i] - eS).toFixed(1) : r.ham}</td>
                    <td className="py-2 text-right tabular-nums" style={{ color: showE ? "var(--violet)" : "var(--pink)" }}>
                      {showE ? eS.toFixed(1) : r.spam}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-3 text-sm text-white/50">
            {table[0].spam} of {sizes[0]} messages with a 5+ digit number are spam. A phone number in a text is a giant red flag.
          </p>
          <Tex block className="mt-4 text-white">{String.raw`\chi^2=\sum_{i,j}\frac{(O_{ij}-E_{ij})^2}{E_{ij}},\quad E_{ij}=\frac{R_i\,C_j}{N}`}</Tex>
          <ROutput className="mt-4">{`X-squared = ${fmt(C.statistic, 1)}, df = ${C.df}, p-value ${pval(C.p)}
critical value (alpha = 0.05) = ${fmt(crit, 2)}
Cramer's V = ${fmt(C.cramers_v, 3)}   permutation p = ${fmt(C.perm_p, 4)}`}</ROutput>
        </Panel>

        <Panel title="The null world, built live" tag="permutation test">
          <svg viewBox="0 0 640 260" className="w-full">
            <line x1={0} x2={640} y1={230} y2={230} stroke="rgba(255,255,255,.25)" />
            {hist.map((c, i) => (
              <motion.rect
                key={i}
                animate={{ height: (c / hMax) * 200, y: 230 - (c / hMax) * 200 }}
                transition={{ type: "spring", stiffness: 140, damping: 18 }}
                x={i * (540 / BINS)}
                width={540 / BINS - 2}
                rx={3}
                fill="rgba(155,123,255,.45)"
                stroke="var(--violet)"
              />
            ))}
            <line x1={sx(crit)} x2={sx(crit)} y1={20} y2={230} stroke="var(--acid)" strokeDasharray="4 4" />
            <text x={sx(crit) + 6} y={32} fill="var(--acid)" fontSize="12" fontFamily="var(--font-code)">
              χ²₀.₉₅ = {crit.toFixed(2)}
            </text>
            {[0, 5, 10, 15, 20, 25].map((v) => (
              <text key={v} x={sx(v)} y={250} fill="rgba(255,255,255,.4)" fontSize="12" textAnchor="middle" fontFamily="var(--font-code)">
                {v}
              </text>
            ))}
            <text x={556} y={236} fill="rgba(255,255,255,.5)" fontSize="18" fontFamily="var(--font-code)">
              ⫽
            </text>
            <motion.g animate={{ y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.6 }}>
              <line x1={612} x2={612} y1={60} y2={230} stroke="var(--pink)" strokeWidth={4} style={{ filter: "drop-shadow(0 0 8px var(--pink))" }} />
              <text x={612} y={48} fill="var(--pink)" fontSize="15" textAnchor="middle" fontFamily="var(--font-code)">
                {C.statistic.toFixed(0)}
              </text>
            </motion.g>
            <text x={612} y={250} fill="var(--pink)" fontSize="11" textAnchor="middle" fontFamily="var(--font-code)">
              observed
            </text>
          </svg>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <NeonButton onClick={() => shuffle(1)} color="var(--violet)">
              ⤨ shuffle once
            </NeonButton>
            <NeonButton onClick={() => shuffle(250)} color="var(--pink)">
              ⤨ ×250
            </NeonButton>
            <button
              type="button"
              onClick={() => {
                setHist(Array(BINS).fill(0));
                setCount(0);
                setLastStat(null);
                setMaxStat(0);
              }}
              className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-white"
            >
              reset
            </button>
          </div>
          <p className="mt-4 font-mono text-sm text-white/70">
            {count === 0 ? (
              `Each shuffle hands the ${Ks} spam labels to ${int(N)} messages at random.`
            ) : (
              <>
                {int(count)} shuffles · last χ² = <span className="text-[var(--violet)]">{lastStat?.toFixed(2)}</span> · largest ={" "}
                <span className="text-[var(--violet)]">{maxStat.toFixed(2)}</span> · observed = <span className="text-[var(--pink)]">{C.statistic.toFixed(0)}</span>
              </>
            )}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-white/55">
            In 2,000 shuffles in R the largest χ² was {C.perm_max.toFixed(1)}. The real value is {int(C.statistic)}. Chance cannot produce
            this: we reject H₀. Cramér&apos;s V = {C.cramers_v.toFixed(2)} (on a 0 to 1 scale) says the association is very strong.
          </p>
        </Panel>
      </div>
      <div className="mt-6">
        <RCode code={code} maxHeight={240} />
      </div>
    </Slide>
  );
}
