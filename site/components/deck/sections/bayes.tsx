"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { FrameSequenceHero, type FrameSequenceStep } from "@/components/ui/mac-book-neo-hero";
import { stats, pct } from "@/lib/stats";
import { Slide, Tex, Slider, Panel, RCode, Chip } from "../primitives";

/* ------------------------------------------------------------- 05 Bayes */

const PRESETS = {
  "spam filter": { prior: Number((stats.p_spam * 100).toFixed(1)), sens: 95, fpr: 2 },
  "rare scam": { prior: 1, sens: 95, fpr: 5 },
  "medical test": { prior: 1, sens: 99, fpr: 5 },
};

export function BayesSlide({ code }: { code: string }) {
  const words = stats.word_bayes;
  const [word, setWord] = React.useState("free");
  const w = words.find((r) => r.word === word)!;
  const sorted = [...words].sort((a, b) => b.p_spam_w - a.p_spam_w);

  const [prior, setPrior] = React.useState(PRESETS["rare scam"].prior);
  const [sens, setSens] = React.useState(PRESETS["rare scam"].sens);
  const [fpr, setFpr] = React.useState(PRESETS["rare scam"].fpr);
  const P = prior / 100;
  const S = sens / 100;
  const F = fpr / 100;
  const post = (S * P) / (S * P + F * (1 - P));
  const N = 1000;
  const tp = Math.round(N * P * S);
  const fn = Math.round(N * P) - tp;
  const fp = Math.round(N * (1 - P) * F);
  const tn = N - tp - fn - fp;
  const dots = [...Array(tp).fill("tp"), ...Array(Math.max(0, fn)).fill("fn"), ...Array(fp).fill("fp"), ...Array(Math.max(0, tn)).fill("tn")] as string[];
  const dotColor: Record<string, string> = { tp: "var(--pink)", fn: "rgba(255,43,214,.3)", fp: "var(--orange)", tn: "rgba(255,255,255,.08)" };

  return (
    <Slide
      id="bayes"
      index={5}
      kicker="Bayes' theorem"
      accent="var(--pink)"
      title={
        <>
          The word
          <br />
          <span className="text-rainbow">&ldquo;free&rdquo;</span>
        </>
      }
      lede={
        <>
          Counting is easy: {pct(w.p_w_spam, 1)} of spam messages contain “{w.word}”. What we actually want is the reverse: given that a
          message contains “{w.word}”, how likely is it to be spam? <b className="text-white">Bayes&apos; theorem flips the condition.</b>
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="One word as evidence" tag="click a word">
          <div className="mb-5 flex flex-wrap gap-2">
            {words.map((r) => (
              <Chip key={r.word} active={r.word === word} onClick={() => setWord(r.word)} color={r.p_spam_w > 0.5 ? "var(--pink)" : "var(--cyan)"}>
                {r.word}
              </Chip>
            ))}
          </div>
          <Tex block className="text-lg text-white md:text-xl">
            {String.raw`P(\text{spam}\mid\text{${w.word}})=\frac{P(\text{${w.word}}\mid\text{spam})\,P(\text{spam})}{P(\text{${w.word}})}=\frac{${w.p_w_spam.toFixed(3)}\times${stats.p_spam.toFixed(3)}}{${w.p_w.toFixed(4)}}`}
          </Tex>
          <motion.div key={word} initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mt-3 text-center font-display text-6xl font-semibold text-glow" style={{ color: w.p_spam_w > 0.5 ? "var(--pink)" : "var(--cyan)" }}>
            {pct(w.p_spam_w, 1)}
          </motion.div>
          <div className="mt-6 space-y-1.5">
            {sorted.map((r, i) => (
              <button key={r.word} onClick={() => setWord(r.word)} className="grid w-full grid-cols-[5rem_1fr_3.5rem] items-center gap-3 text-left">
                <span className="font-mono text-sm" style={{ color: r.word === word ? "white" : "rgba(255,255,255,.55)" }}>
                  {r.word}
                </span>
                <span className="relative h-2.5 overflow-hidden rounded-full bg-white/[.06]">
                  <motion.span
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{ background: r.p_spam_w > 0.5 ? "var(--pink)" : "var(--cyan)", boxShadow: r.word === word ? "0 0 12px currentColor" : "none" }}
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.max(r.p_spam_w, 0.01) * 100}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, delay: i * 0.04 }}
                  />
                  <span className="absolute inset-y-[-3px] w-px bg-[var(--acid)]" style={{ left: `${stats.p_spam * 100}%` }} />
                </span>
                <span className="text-right font-mono text-xs text-white/60">{r.p_spam_w.toFixed(2)}</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-sm text-white/45">
            Green line = prior P(spam) = {stats.p_spam.toFixed(3)}. “prize” and “claim” never appear in ham, so they push the probability to 1.
          </p>
        </Panel>

        <Panel title="The base-rate trap" tag="1,000 messages">
          <div className="mb-5 flex flex-wrap gap-2">
            {(Object.keys(PRESETS) as (keyof typeof PRESETS)[]).map((k) => {
              const v = PRESETS[k];
              const on = v.prior === prior && v.sens === sens && v.fpr === fpr;
              return (
                <Chip key={k} active={on} color="var(--orange)" onClick={() => { setPrior(v.prior); setSens(v.sens); setFpr(v.fpr); }}>
                  {k}
                </Chip>
              );
            })}
          </div>
          <div className="grid gap-5">
            <Slider label="prior · how common the bad thing is" value={prior} min={0.1} max={30} step={0.1} onChange={setPrior} display={`${prior.toFixed(1)}%`} color="var(--pink)" />
            <Slider label="sensitivity · P(alarm | bad)" value={sens} min={50} max={100} onChange={setSens} display={`${sens}%`} color="var(--acid)" />
            <Slider label="false alarm · P(alarm | fine)" value={fpr} min={0} max={30} step={0.5} onChange={setFpr} display={`${fpr}%`} color="var(--orange)" />
          </div>
          <div className="mt-6 grid grid-cols-[1fr_auto] items-center gap-6">
            <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(40, minmax(0, 1fr))" }}>
              {dots.map((c, i) => (
                <span key={i} className="aspect-square rounded-full transition-colors duration-500" style={{ background: dotColor[c] }} />
              ))}
            </div>
            <div className="text-right">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/45">P(bad | alarm)</div>
              <motion.div key={Math.round(post * 1000)} initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="font-display text-6xl font-semibold text-[var(--pink)] text-glow">
                {pct(post, 1)}
              </motion.div>
              <div className="mt-2 font-mono text-xs text-white/60">
                <span className="text-[var(--pink)]">{tp} real</span> vs <span className="text-[var(--orange)]">{fp} false</span> alarms
              </div>
            </div>
          </div>
          <p className="mt-5 text-sm text-white/60">
            Try <b className="text-white">medical test</b>: a 99%-accurate test for a disease 1 in 100 people have. A positive result means
            you are sick only about <b className="text-[var(--pink)]">17%</b> of the time. When the bad thing is rare, most alarms are false.
            That is why a spam filter never trusts one clue and combines every word in the message.
          </p>
        </Panel>
      </div>
      <div className="mt-6">
        <RCode code={code} maxHeight={240} />
      </div>
    </Slide>
  );
}

/* ------------------------------------------------------------- 06 the film */

export function FilmSlide() {
  const sp = stats.film.spam.steps;
  const hm = stats.film.ham.steps;
  const finalSpam = sp[sp.length - 1].post;
  const finalHam = hm[hm.length - 1].post;
  const up = [...sp].sort((a, b) => b.llr - a.llr).slice(0, 3).map((s) => `“${s.word}”`).join(", ");
  const down = [...hm].sort((a, b) => a.llr - b.llr).slice(0, 3).map((s) => `“${s.word}”`).join(", ");
  const steps: FrameSequenceStep[] = [
    {
      from: 0.0, to: 0.26, color: "#2de2ff", num: "01", total: "04", icon: "∅",
      title: "Start with the base rate.",
      description: `Before reading a single word, the filter's belief is just the share of spam it has seen: P(spam) = ${pct(1 / (1 + Math.exp(-stats.nb.prior_logodds)), 1)}.`,
      label: "Prior",
    },
    {
      from: 0.26, to: 0.52, color: "#ff8a3d", num: "02", total: "04", icon: "×",
      title: "Every word is evidence.",
      description: `Each word multiplies the odds by its likelihood ratio P(word | spam) / P(word | ham). ${up} push towards spam. ${down} push towards ham.`,
      label: "Likelihood",
    },
    {
      from: 0.52, to: 0.78, color: "#ff2bd6", num: "03", total: "04", icon: "Σ",
      title: "Add it up in log-odds.",
      description: "Multiplying hundreds of tiny probabilities underflows a computer, so we add logarithms instead. That one sum is the whole Naive Bayes classifier.",
      label: "Posterior",
    },
    {
      from: 0.78, to: 1.01, color: "#c6ff3d", num: "04", total: "04", icon: "✓",
      title: "Verdict.",
      description: `The spam message ends at ${pct(finalSpam, finalSpam > 0.999 ? 2 : 1)}, the normal one at ${pct(finalHam, 2)}. Both are real messages the model never saw while learning.`,
      label: "Verdict",
    },
  ];
  return (
    <div id="film" data-slide="Reading like a filter" data-stop="Reading like a filter">
      <FrameSequenceHero
        frameCount={240}
        framePath={(i) => `/r/frames/frame_${String(i).padStart(4, "0")}.jpg`}
        eagerCount={120}
        scrollHeight="520vh"
        loaderLabel="Rscript analysis.R · loading 240 frames"
        brand={
          <>
            <span className="fsh-brand-dot" />
            SPAM <span className="text-[var(--acid)]">∫</span> MATHS
          </>
        }
        navLinks={[
          { label: "Data", href: "#data" },
          { label: "Bayes", href: "#bayes" },
          { label: "Film", href: "#film" },
          { label: "Poisson", href: "#poisson" },
          { label: "χ²", href: "#chisq" },
          { label: "Live filter", href: "#live" },
          { label: "Accuracy", href: "#accuracy" },
        ]}
        ctaLabel="Try it live"
        ctaHref="#live"
        title={
          <>
            <span className="fsh-title-dark">Reading,</span> <span className="fsh-title-rainbow">word by word.</span>
          </>
        }
        subtitle="Scroll to read. R drew every frame."
        steps={steps}
        overlay={
          <div className="fsh-overlay">
            <Tex className="text-white/90">{String.raw`\log\frac{P(\text{spam}\mid w)}{P(\text{ham}\mid w)}=\log\frac{P(\text{spam})}{P(\text{ham})}+\sum_i\log\frac{P(w_i\mid\text{spam})}{P(w_i\mid\text{ham})}`}</Tex>
          </div>
        }
      />
    </div>
  );
}

