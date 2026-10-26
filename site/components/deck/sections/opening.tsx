"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import IntroAnimation from "@/components/ui/scroll-morph-hero";
import { stats, THUMB_LABELS, pct, fmt } from "@/lib/stats";
import { Slide, Tex, Slider, NeonButton, Panel, RCode } from "../primitives";

const cards = THUMB_LABELS.map((label, i) => ({ src: `/r/thumbs/t${String(i + 1).padStart(2, "0")}.png`, label }));

/* ------------------------------------------------------------------ 01 intro */

export function IntroSlide() {
  return (
    <section id="intro" data-slide="Title" data-stop="Title" className="relative h-screen w-full">
      <div aria-hidden className="absolute inset-0 grid-bg opacity-60" />
      <div aria-hidden className="absolute left-1/2 top-1/2 h-[70vmin] w-[70vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,43,214,.2),transparent_65%)] blur-2xl" />
      <IntroAnimation
        cards={cards}
        introTitle={
          <>
            Somebody is trying to <span className="text-rainbow">trick you</span> right now.
          </>
        }
        introKicker="SCROLL · PRESS ↓ · OR CLICK"
        arcTitle={
          <h1 className="font-display text-[clamp(2.2rem,6vw,5.4rem)] font-semibold uppercase leading-[0.9] tracking-[-0.03em] text-white">
            How does your phone
            <br />
            know it&apos;s <span className="text-rainbow">spam?</span>
          </h1>
        }
        arcBody={
          <div className="mt-5 flex flex-col items-center gap-3">
            <p className="max-w-xl text-sm text-white/65 md:text-base">
              The probability and statistics behind every spam filter, worked out in <b className="text-[var(--acid)]">R</b> on{" "}
              <b className="text-white">{stats.counts.messages.toLocaleString()} real text messages</b>.
            </p>
            <div className="flex flex-wrap justify-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/50">
              {["Binomial", "Bayes", "Poisson", "χ² test", "t-test", "Naive Bayes", "ROC", "Edit distance"].map((t) => (
                <span key={t} className="rounded-full border border-white/15 px-2.5 py-1">
                  {t}
                </span>
              ))}
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.3em] text-white/35">these 20 cards are R plots · hover to flip</p>
          </div>
        }
      />
    </section>
  );
}

/* --------------------------------------------------------- 02 the problem */

type Bubble = { id: number; spam: boolean; text: string };

function binomPmf(n: number, p: number, k: number) {
  let c = 1;
  for (let i = 0; i < k; i++) c = (c * (n - i)) / (i + 1);
  return c * Math.pow(p, k) * Math.pow(1 - p, n - k);
}

export function ProblemSlide({ code }: { code: string }) {
  const [n, setN] = React.useState(30);
  const [p, setP] = React.useState(Number((stats.p_spam * 100).toFixed(1)));
  const P = p / 100;
  const K = Math.min(n, 14);
  const pmf = Array.from({ length: K + 1 }, (_, k) => binomPmf(n, P, k));
  const atLeast1 = 1 - Math.pow(1 - P, n);
  const maxP = Math.max(...pmf);

  const [day, setDay] = React.useState<Bubble[]>([]);
  const [tally, setTally] = React.useState({ days: 0, spam: 0 });
  const uid = React.useRef(0);
  const simulate = () => {
    const msgs: Bubble[] = [];
    for (let i = 0; i < n; i++) {
      const spam = Math.random() < P;
      const pool = spam ? stats.examples.spam : stats.examples.ham;
      msgs.push({ id: uid.current++, spam, text: pool[Math.floor(Math.random() * pool.length)] });
    }
    setDay(msgs);
    setTally((t) => ({ days: t.days + 1, spam: t.spam + msgs.filter((m) => m.spam).length }));
  };
  React.useEffect(() => {
    setDay([]);
    setTally({ days: 0, spam: 0 });
  }, [n, p]);
  const spamToday = day.filter((m) => m.spam).length;

  return (
    <Slide
      id="problem"
      index={2}
      kicker="The problem"
      accent="var(--pink)"
      title={
        <>
          Your inbox is
          <br />
          <span className="text-outline">under siege</span>
        </>
      }
      lede={
        <>
          In our dataset <b className="text-white">{pct(stats.p_spam, 1)}</b> of text messages are spam. If you get {n} texts a day and
          each one is spam with that probability, independently, the number of spam texts you get is a{" "}
          <b className="text-white">binomial random variable</b>.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <Panel title="X ~ Binomial(n, p)" tag="dbinom()">
          <Tex block className="text-xl text-white md:text-2xl">{String.raw`P(X=k)=\binom{n}{k}p^{k}(1-p)^{n-k}`}</Tex>
          <svg viewBox="0 0 560 210" className="mt-4 w-full">
            {pmf.map((v, k) => {
              const h = (v / maxP) * 160;
              const w = 560 / pmf.length;
              return (
                <g key={k}>
                  <motion.rect
                    animate={{ height: h, y: 180 - h }}
                    transition={{ type: "spring", stiffness: 120, damping: 18 }}
                    x={k * w + w * 0.14}
                    width={w * 0.72}
                    rx={5}
                    fill={k === 0 ? "rgba(45,226,255,.3)" : "rgba(255,43,214,.35)"}
                    stroke={k === 0 ? "var(--cyan)" : "var(--pink)"}
                  />
                  <text x={k * w + w / 2} y={200} fill="rgba(255,255,255,.5)" fontSize="12" textAnchor="middle" fontFamily="var(--font-code)">
                    {k === K && K < n ? `${k}+` : k}
                  </text>
                </g>
              );
            })}
          </svg>
          <div className="mt-4 grid gap-5">
            <Slider label="n · texts you get per day" value={n} min={5} max={100} onChange={setN} color="var(--cyan)" />
            <Slider label="p · chance a text is spam" value={p} min={1} max={40} step={0.1} onChange={setP} display={`${p.toFixed(1)}%`} color="var(--pink)" />
          </div>
          <div className="mt-6 flex items-end justify-between gap-6">
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">P(at least one spam today) = 1 − (1 − p)ⁿ</div>
              <motion.div key={Math.round(atLeast1 * 1000)} initial={{ scale: 0.96, opacity: 0.6 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-[clamp(3rem,8vw,6rem)] font-semibold leading-none tabular-nums text-[var(--pink)] text-glow">
                {pct(atLeast1, atLeast1 > 0.999 ? 2 : 1)}
              </motion.div>
            </div>
            <div className="text-right font-mono text-sm text-white/60">
              E[X] = np = <span className="text-white">{fmt(n * P, 2)}</span>
              <br />
              SD = √(np(1−p)) = <span className="text-white">{fmt(Math.sqrt(n * P * (1 - P)), 2)}</span>
            </div>
          </div>
        </Panel>

        <Panel title="Simulate a day on your phone" tag="real messages">
          <div className="relative mx-auto h-[430px] w-full max-w-[340px] overflow-hidden rounded-[2.4rem] border border-white/15 bg-black/60 p-3 shadow-[0_0_80px_-30px_var(--pink)]">
            <div className="mx-auto mb-2 h-1.5 w-20 rounded-full bg-white/15" />
            <div data-lenis-prevent className="flex h-[390px] flex-col gap-2 overflow-y-auto pr-1">
              <AnimatePresence>
                {day.length === 0 && (
                  <motion.p key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="m-auto text-center font-mono text-xs text-white/35">
                    press simulate to receive {n} texts
                  </motion.p>
                )}
                {day.map((m, i) => (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, x: -30, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    transition={{ delay: i * 0.05, type: "spring", stiffness: 260, damping: 22 }}
                    className="max-w-[92%] rounded-2xl rounded-bl-sm px-3 py-2 text-[12px] leading-snug"
                    style={{
                      background: m.spam ? "rgba(255,43,214,.16)" : "rgba(255,255,255,.07)",
                      border: m.spam ? "1px solid var(--pink)" : "1px solid rgba(255,255,255,.08)",
                      boxShadow: m.spam ? "0 0 18px -6px var(--pink)" : "none",
                    }}
                  >
                    {m.spam && <div className="mb-0.5 font-mono text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--pink)]">spam</div>}
                    <span className="line-clamp-3 text-white/85">{m.text}</span>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <NeonButton onClick={simulate} color="var(--pink)">
              ▶ Simulate a day
            </NeonButton>
            <div className="font-mono text-sm text-white/70">
              {tally.days === 0 ? (
                "every bubble is a real SMS from the dataset"
              ) : (
                <>
                  today <span className="text-[var(--pink)]">{spamToday}</span> spam · average over {tally.days} days{" "}
                  <span className="text-[var(--acid)]">{fmt(tally.spam / tally.days, 2)}</span> vs np = {fmt(n * P, 2)}
                </>
              )}
            </div>
          </div>
        </Panel>
      </div>
      <div className="mt-6">
        <RCode code={code} maxHeight={240} />
      </div>
    </Slide>
  );
}
