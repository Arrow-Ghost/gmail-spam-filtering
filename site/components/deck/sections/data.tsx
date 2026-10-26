"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import GlassFolder, { type FolderFile } from "@/components/ui/glass-folder-cards";
import { stats, fmt, int, pval } from "@/lib/stats";
import type { RSection } from "@/lib/r-source";
import { Slide, CountUp, Reveal, RCode, Panel, Chip, ROutput } from "../primitives";

/* ---------------------------------------------------------------- lightbox */

type Box =
  | { kind: "image"; title: string; src: string }
  | { kind: "code"; title: string; code: string }
  | { kind: "table"; title: string; head: string[]; rows: (string | number)[][]; note?: string };

const BoxCtx = React.createContext<(b: Box) => void>(() => {});

export function LightboxProvider({ children }: { children: React.ReactNode }) {
  const [box, setBox] = React.useState<Box | null>(null);
  React.useEffect(() => {
    if (!box) return;
    const k = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBox(null);
      e.stopPropagation();
    };
    window.addEventListener("keydown", k, true);
    return () => window.removeEventListener("keydown", k, true);
  }, [box]);
  return (
    <BoxCtx.Provider value={setBox}>
      {children}
      <AnimatePresence>
        {box && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-[#05050a]/92 p-4 backdrop-blur-xl md:p-10"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setBox(null)}
          >
            <motion.div
              className="relative max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-[#0b0b14] shadow-[0_0_80px_-30px_var(--acid)]"
              initial={{ y: 40, scale: 0.94, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 20, scale: 0.97, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <h3 className="font-display text-lg font-semibold uppercase tracking-tight">{box.title}</h3>
                <button onClick={() => setBox(null)} className="font-mono text-xs uppercase tracking-[0.2em] text-white/50 hover:text-[var(--acid)]">
                  close · esc
                </button>
              </div>
              <div data-lenis-prevent className="max-h-[calc(88vh-64px)] overflow-auto p-6">
                {box.kind === "image" && <img src={box.src} alt={box.title} className="mx-auto w-full rounded-xl" />}
                {box.kind === "code" && <RCode code={box.code} maxHeight={9999} />}
                {box.kind === "table" && (
                  <>
                    <table className="w-full font-mono text-sm">
                      <thead>
                        <tr>
                          {box.head.map((h) => (
                            <th key={h} className="border-b border-white/15 px-3 py-2 text-left text-[11px] uppercase tracking-[0.15em] text-[var(--acid)]">
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {box.rows.map((r, i) => (
                          <tr key={i} className="odd:bg-white/[.03]">
                            {r.map((c, j) => (
                              <td key={j} className="px-3 py-1.5 text-white/80">
                                {c}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {box.note && <p className="mt-4 text-sm text-white/45">{box.note}</p>}
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </BoxCtx.Provider>
  );
}
export const useLightbox = () => React.useContext(BoxCtx);

/* ---------------------------------------------------------------- 03 the data */

const PLOTS = [
  { name: "length.png", title: "Message length", meta: "hist" },
  { name: "words.png", title: "P(spam | word)", meta: "Bayes" },
  { name: "binom.png", title: "Spam per day", meta: "dbinom" },
  { name: "poisson.png", title: "Poisson fit", meta: "dpois" },
  { name: "chisq.png", title: "Chi-square null", meta: "permutation" },
  { name: "roc.png", title: "ROC curves", meta: "AUC" },
  { name: "levenshtein.png", title: "Disguised words", meta: "adist" },
];

const tables: Record<string, () => Box> = {
  "spam examples": () => ({
    kind: "table",
    title: "Real spam from the dataset",
    head: ["#", "message"],
    rows: stats.examples.spam.slice(0, 12).map((t, i) => [i + 1, t]),
  }),
  "ham examples": () => ({
    kind: "table",
    title: "Real ham (normal messages)",
    head: ["#", "message"],
    rows: stats.examples.ham.slice(0, 12).map((t, i) => [i + 1, t]),
  }),
  "clue table": () => ({
    kind: "table",
    title: "What's in the message × label",
    head: ["clue", "ham", "spam", "% spam"],
    rows: stats.chisq.table.map((r) => [r.group, r.ham, r.spam, `${((100 * r.spam) / (r.ham + r.spam)).toFixed(1)}%`]),
  }),
  "word table": () => ({
    kind: "table",
    title: "Words, conditional probabilities and Bayes",
    head: ["word", "P(word | spam)", "P(word | ham)", "P(spam | word)"],
    rows: stats.word_bayes.map((r) => [r.word, fmt(r.p_w_spam), fmt(r.p_w_ham), fmt(r.p_spam_w)]),
  }),
};

export function DataSlide({ sections }: { sections: RSection[] }) {
  const open = useLightbox();
  const plotQueue = React.useRef(3);
  const codeQueue = React.useRef(3);
  const codeSections = sections.filter((s) => Number(s.id) >= 1 && Number(s.id) <= 10);

  const dataFiles: FolderFile[] = [
    { name: "word table", meta: "15 words" },
    { name: "clue table", meta: "4 × 2" },
    { name: "ham examples", meta: `${int(stats.counts.ham)} msgs`, art: "glacier" },
    { name: "spam examples", meta: `${int(stats.counts.spam)} msgs`, art: "ember" },
  ];
  const codeFiles: FolderFile[] = codeSections.slice(0, 3).map((s) => ({ name: s.title.replace(/^\d+\.\s*/, ""), meta: `§${s.id}` }));
  const plotFiles: FolderFile[] = PLOTS.slice(0, 3).map((p) => ({ name: p.title, meta: p.meta, image: `/r/${p.name}` }));

  return (
    <Slide
      id="data"
      index={3}
      kicker="The data"
      accent="var(--cyan)"
      title={
        <>
          5,574 real
          <br />
          <span className="text-outline">text messages</span>
        </>
      }
      lede={
        <>
          The <b className="text-white">UCI SMS Spam Collection</b> is a public research dataset of real texts, each one labelled by a
          human as <span className="text-[var(--pink)]">spam</span> or <span className="text-[var(--cyan)]">ham</span> (normal). R
          reads it in one line with <code className="text-[var(--acid)]">read.delim()</code>. Every chart and number in this talk comes
          from <code className="text-[var(--acid)]">analysis.R</code>.
        </>
      }
    >
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { l: "messages", v: stats.counts.messages, c: "var(--acid)" },
          { l: "spam", v: stats.counts.spam, c: "var(--pink)" },
          { l: "ham", v: stats.counts.ham, c: "var(--cyan)" },
          { l: "different words", v: stats.counts.vocab, c: "var(--violet)" },
        ].map((s, i) => (
          <Reveal key={s.l} delay={i * 0.06}>
            <div className="glass rounded-2xl p-5">
              <div className="font-display text-4xl font-semibold md:text-5xl" style={{ color: s.c }}>
                <CountUp value={s.v} />
              </div>
              <div className="mt-1 font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">{s.l}</div>
            </div>
          </Reveal>
        ))}
      </div>

      <div className="mt-16 flex flex-wrap items-end justify-center gap-x-12 gap-y-14">
        <div className="flex flex-col items-center gap-3">
          <GlassFolder
            label="SMSSpamCollection"
            art="ember"
            seed={7}
            action="more"
            labelPlacement="top-left"
            files={dataFiles}
            menu={[
              { label: "Spam examples", onSelect: () => open(tables["spam examples"]()) },
              { label: "Word table", onSelect: () => open(tables["word table"]()) },
            ]}
            onFileSelect={(f) => open(tables[f.name]())}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">click · open a table</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <GlassFolder
            label="analysis.R"
            meta="base R + jsonlite"
            art="aurora"
            seed={3}
            files={codeFiles}
            onAdd={() => {
              const s = codeSections[codeQueue.current++ % codeSections.length];
              return { name: s.title.replace(/^\d+\.\s*/, ""), meta: `§${s.id}` };
            }}
            onFileSelect={(f) => {
              const s = codeSections.find((c) => c.title.replace(/^\d+\.\s*/, "") === f.name);
              if (s) open({ kind: "code", title: s.title, code: s.code });
            }}
            appearDelay={140}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">+ drops in the next section</span>
        </div>
        <div className="flex flex-col items-center gap-3">
          <GlassFolder
            label="R plots"
            tone="dark"
            art="dusk"
            seed={11}
            labelPlacement="top-right"
            files={plotFiles}
            onAdd={() => {
              const p = PLOTS[plotQueue.current++ % PLOTS.length];
              return { name: p.title, meta: p.meta, image: `/r/${p.name}` };
            }}
            onFileSelect={(f) => f.image && open({ kind: "image", title: f.name, src: f.image })}
            appearDelay={280}
          />
          <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">png() · type = &quot;cairo&quot;</span>
        </div>
      </div>
    </Slide>
  );
}

/* ---------------------------------------------------------- 04 descriptive */

export function DescriptiveSlide({ code }: { code: string }) {
  const [mode, setMode] = React.useState<"share" | "count">("share");
  const H = stats.hist;
  const ham = stats.by_class.ham;
  const spam = stats.by_class.spam;
  const t = stats.length_test;
  const sumH = H.ham.reduce((a, b) => a + b, 0);
  const sumS = H.spam.reduce((a, b) => a + b, 0);
  const hv = H.ham.map((v) => (mode === "share" ? v / sumH : v));
  const sv = H.spam.map((v) => (mode === "share" ? v / sumS : v));
  const max = Math.max(...hv, ...sv);
  const W = 900;
  const PH = 260;
  const bw = W / hv.length;
  const x = (c: number) => (c / 260) * W;

  return (
    <Slide
      id="describe"
      index={4}
      kicker="Descriptive statistics"
      accent="var(--orange)"
      title={
        <>
          Spam talks
          <br />
          <span className="text-outline">too much</span>
        </>
      }
      lede={
        <>
          Before any fancy model, just describe the data. Spam messages are much longer: they have an offer, a deadline and a phone number to
          fit in. A typical ham text is {ham.median} characters, a typical spam text is {spam.median}.
        </>
      }
    >
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Panel title="Distribution of message length" tag="hist()">
          <div className="mb-4 flex gap-2">
            <Chip active={mode === "share"} onClick={() => setMode("share")} color="var(--orange)">
              share of each class
            </Chip>
            <Chip active={mode === "count"} onClick={() => setMode("count")} color="var(--orange)">
              raw counts
            </Chip>
          </div>
          <svg viewBox={`-10 -10 ${W + 20} ${PH + 60}`} className="w-full">
            {[0, 50, 100, 150, 200, 250].map((c) => (
              <g key={c}>
                <line x1={x(c)} x2={x(c)} y1={0} y2={PH} stroke="rgba(255,255,255,.06)" />
                <text x={x(c)} y={PH + 22} fill="rgba(255,255,255,.4)" fontSize="13" textAnchor="middle" fontFamily="var(--font-code)">
                  {c === 250 ? "250+" : c}
                </text>
              </g>
            ))}
            {hv.map((v, i) => (
              <motion.rect key={`h${i}`} animate={{ height: (v / max) * PH, y: PH - (v / max) * PH }} transition={{ type: "spring", stiffness: 110, damping: 18 }} x={i * bw + 1} width={bw - 2} fill="rgba(45,226,255,.28)" stroke="var(--cyan)" />
            ))}
            {sv.map((v, i) => (
              <motion.rect key={`s${i}`} animate={{ height: (v / max) * PH, y: PH - (v / max) * PH }} transition={{ type: "spring", stiffness: 110, damping: 18, delay: 0.05 }} x={i * bw + 1} width={bw - 2} fill="rgba(255,43,214,.32)" stroke="var(--pink)" />
            ))}
            {[
              { m: ham.mean, c: "var(--cyan)", l: "ham x̄" },
              { m: spam.mean, c: "var(--pink)", l: "spam x̄" },
            ].map((r) => (
              <g key={r.l}>
                <line x1={x(r.m)} x2={x(r.m)} y1={0} y2={PH} stroke={r.c} strokeWidth={2.5} strokeDasharray="6 5" />
                <text x={x(r.m) + 6} y={14} fill={r.c} fontSize="13" fontFamily="var(--font-code)">
                  {r.l} = {fmt(r.m, 1)}
                </text>
              </g>
            ))}
            <text x={W} y={PH + 46} fill="rgba(255,255,255,.4)" fontSize="12" textAnchor="end" fontFamily="var(--font-code)">
              characters per message
            </text>
          </svg>
          <p className="mt-2 text-sm text-white/50">
            Ham is <b className="text-white/80">right-skewed</b>: lots of tiny “ok”, “on my way” texts and a long tail. Spam bunches up just
            under 160 characters, the length of one SMS. Spammers fill the whole message.
          </p>
        </Panel>

        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              ["ham mean", fmt(ham.mean, 1), "var(--cyan)"],
              ["spam mean", fmt(spam.mean, 1), "var(--pink)"],
              ["ham median", ham.median, "var(--cyan)"],
              ["spam median", spam.median, "var(--pink)"],
              ["ham sd", fmt(ham.sd, 1), "var(--cyan)"],
              ["spam sd", fmt(spam.sd, 1), "var(--pink)"],
            ].map(([l, v, c]) => (
              <div key={l as string} className="glass rounded-xl p-3">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">{l}</div>
                <div className="font-display text-2xl font-semibold" style={{ color: c as string }}>
                  {v}
                </div>
              </div>
            ))}
          </div>
          <Panel title="Is the difference real?" tag="t.test()">
            <p className="text-sm text-white/60">H₀: spam and ham have the same mean length.</p>
            <ROutput className="mt-3">{`Welch Two Sample t-test
t = ${fmt(t.t, 2)}, df = ${fmt(t.df, 1)}, p-value ${pval(t.p)}
95% CI of difference: ${fmt(t.ci[0], 1)} to ${fmt(t.ci[1], 1)} chars
Wilcoxon W = ${int(t.wilcox_W)}, p-value ${pval(t.wilcox_p)}`}</ROutput>
            <p className="mt-3 text-sm text-white/70">
              The p-value is effectively zero: we reject H₀. Length alone is already a clue, and we will use it as the baseline our
              filter has to beat.
            </p>
          </Panel>
        </div>
      </div>
      <div className="mt-6">
        <RCode code={code} maxHeight={240} />
      </div>
    </Slide>
  );
}
