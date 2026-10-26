"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { stats, fmt, pct, int } from "@/lib/stats";
import { Slide, RCode, Reveal, ROutput } from "../primitives";

const free = stats.word_bayes.find((w) => w.word === "free")!;

const LESSONS = [
  { topic: "Binomial", found: `30 texts a day → ${pct(stats.binom.p_atleast1, 1)} chance of at least one spam`, r: "dbinom()", c: "var(--pink)" },
  { topic: "Descriptive stats", found: `spam median ${stats.by_class.spam.median} chars vs ham ${stats.by_class.ham.median}`, r: "summary() · hist()", c: "var(--orange)" },
  { topic: "Welch t-test", found: "length difference is real, p ≈ 0", r: "t.test()", c: "var(--orange)" },
  { topic: "Bayes' theorem", found: `P(spam | “free”) = ${pct(free.p_spam_w, 0)}`, r: "mean() · Bayes by hand", c: "var(--pink)" },
  { topic: "Base-rate trap", found: "99% test, 1% disease → ~17% sick", r: "1000-dot grid", c: "var(--pink)" },
  { topic: "Poisson + GOF", found: `spam '!' fits Poisson, ham doesn't (dispersion ${fmt(stats.poisson.ham.dispersion, 1)})`, r: "dpois() · pchisq()", c: "var(--cyan)" },
  { topic: "χ² independence", found: `phone numbers ↔ spam, V = ${fmt(stats.chisq.cramers_v, 2)}`, r: "chisq.test() · sample()", c: "var(--violet)" },
  { topic: "Edit distance", found: "fr33 → free in 2 edits", r: "adist()", c: "var(--acid)" },
  { topic: "Naive Bayes", found: `${pct(stats.nb.accuracy, 1)} accuracy, AUC ${fmt(stats.nb.auc, 3)}`, r: "log-odds sum", c: "var(--acid)" },
  { topic: "Expected cost", found: "the threshold is a business decision", r: "argmin cost(t)", c: "var(--orange)" },
];

export function OutroSlide({ full }: { full: string }) {
  return (
    <Slide
      id="outro"
      index={12}
      kicker="What R told us"
      accent="var(--acid)"
      title={
        <>
          Your spam filter
          <br />
          <span className="text-rainbow">is a statistician</span>
        </>
      }
      lede="Every message you receive is a small hypothesis test. These are the ideas doing the work, each one computed in R on real data."
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {LESSONS.map((l, i) => (
          <Reveal key={l.topic} delay={i * 0.04}>
            <motion.div
              whileHover={{ y: -6, rotate: i % 2 ? 1 : -1 }}
              className="glass group h-full rounded-2xl p-5 transition-shadow hover:shadow-[0_0_40px_-12px_var(--c)]"
              style={{ "--c": l.c } as React.CSSProperties}
            >
              <div className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: l.c }}>
                {String(i + 1).padStart(2, "0")} · {l.topic}
              </div>
              <p className="mt-3 text-sm leading-snug text-white/85">{l.found}</p>
              <code className="mt-4 block font-mono text-xs text-white/40 group-hover:text-white/70">{l.r}</code>
            </motion.div>
          </Reveal>
        ))}
      </div>

      <Reveal className="mt-10">
        <div className="glass relative overflow-hidden rounded-3xl p-6 md:p-8">
          <div aria-hidden className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(198,255,61,.25),transparent_65%)]" />
          <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[var(--acid)]">bonus · the same maths, somewhere else</div>
          <h3 className="mt-3 font-display text-2xl font-semibold uppercase md:text-3xl">Spam filters for code</h3>
          <p className="mt-3 max-w-[75ch] text-white/65">
            My own project, <b className="text-white">PhishGuard.js</b>, uses these same tools to protect software instead of inboxes. Bayes
            ranks which dependency raised an alarm, edit distance catches fake packages like <code className="text-[var(--pink)]">loadsh</code>{" "}
            pretending to be <code className="text-[var(--cyan)]">lodash</code>, and a Poisson test spots malware that phones home on a timer.
            Once you know the maths, you see it everywhere.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <RCode code={full} maxHeight={520} />
        <div className="flex flex-col gap-4">
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-lg font-semibold uppercase">Reproduce it</h3>
            <ROutput className="mt-4">{`> Rscript r/analysis.R
messages: ${stats.counts.messages}   spam: ${stats.counts.spam}   ham: ${stats.counts.ham}
Chi-square = ${fmt(stats.chisq.statistic, 1)}  df = ${stats.chisq.df}  V = ${fmt(stats.chisq.cramers_v, 3)}
Naive Bayes: vocab ${stats.counts.vocab}  accuracy ${fmt(stats.nb.accuracy, 4)}
wrote stats.json · 7 plots · 20 thumbnails · 240 frames`}</ROutput>
            <p className="mt-4 text-sm text-white/55">
              Data: UCI SMS Spam Collection (Almeida &amp; Hidalgo, 2011), {int(stats.counts.messages)} messages. Generated {stats.generated} with{" "}
              {stats.r_version}.
            </p>
          </div>
          <div className="glass relative flex flex-1 flex-col items-center justify-center overflow-hidden rounded-3xl p-10 text-center">
            <div aria-hidden className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(255,43,214,.35),transparent_60%)]" />
            <div className="relative font-display text-[clamp(3rem,7vw,6rem)] font-semibold uppercase leading-[0.85] tracking-[-0.04em]">
              <span className="text-rainbow">Thank you</span>
            </div>
            <div className="relative mt-4 font-mono text-sm uppercase tracking-[0.4em] text-white/60">questions?</div>
          </div>
        </div>
      </div>
    </Slide>
  );
}
