"use client";

import * as React from "react";
import katex from "katex";
import { motion, useInView, animate } from "framer-motion";
import { cn } from "@/lib/utils";

/* ---------------------------------------------------------------- slide shell */

export function Slide({
  id,
  index,
  kicker,
  title,
  lede,
  children,
  className,
  accent = "var(--acid)",
}: {
  id: string;
  index: number;
  kicker: string;
  title: React.ReactNode;
  lede?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  accent?: string;
}) {
  return (
    <section
      id={id}
      data-slide={kicker}
      data-stop={kicker}
      className={cn("relative min-h-screen w-full px-5 pb-28 pt-28 md:px-12 lg:px-20", className)}
      style={{ "--accent": accent } as React.CSSProperties}
    >
      <div className="mx-auto w-full max-w-[1320px]">
        <Reveal>
          <div className="mb-5 flex items-center gap-4 font-mono text-[11px] uppercase tracking-[0.32em] text-[var(--accent)]">
            <span className="tabular-nums">{String(index).padStart(2, "0")}</span>
            <span className="h-px w-12 bg-[var(--accent)]/60" />
            <span>{kicker}</span>
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <h2 className="font-display text-[clamp(2.4rem,6.4vw,6rem)] font-semibold uppercase leading-[0.88] tracking-[-0.03em] text-white">
            {title}
          </h2>
        </Reveal>
        {lede && (
          <Reveal delay={0.12}>
            <p className="mt-6 max-w-[62ch] text-lg leading-relaxed text-white/65 md:text-xl">{lede}</p>
          </Reveal>
        )}
        <div className="mt-12">{children}</div>
      </div>
    </section>
  );
}

export function Reveal({
  children,
  delay = 0,
  y = 28,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y, filter: "blur(8px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-10% 0px" }}
      transition={{ duration: 0.9, delay, ease: [0.2, 0.8, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

/* ---------------------------------------------------------------- maths */

export function Tex({ children, block, className }: { children: string; block?: boolean; className?: string }) {
  const html = React.useMemo(
    () => katex.renderToString(children, { displayMode: !!block, throwOnError: false, strict: false }),
    [children, block],
  );
  return <span className={cn(block && "block", className)} dangerouslySetInnerHTML={{ __html: html }} />;
}

/* ---------------------------------------------------------------- numbers */

export function CountUp({
  value,
  decimals = 0,
  suffix = "",
  prefix = "",
  className,
}: {
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  className?: string;
}) {
  const ref = React.useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true });
  const shown = React.useRef(0);
  React.useEffect(() => {
    if (!inView || !ref.current) return;
    const el = ref.current;
    const ctl = animate(shown.current, value, {
      duration: 1.4,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => {
        shown.current = v;
        el.textContent = prefix + v.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      },
    });
    return () => ctl.stop();
  }, [inView, value, decimals, suffix, prefix]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {prefix}
      {(0).toFixed(decimals)}
      {suffix}
    </span>
  );
}

export function StatTile({
  label,
  value,
  sub,
  color = "var(--acid)",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <div className={cn("glass relative overflow-hidden rounded-2xl p-5", className)}>
      <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/45">{label}</div>
      <div className="mt-2 font-display text-3xl font-semibold tabular-nums md:text-4xl" style={{ color }}>
        {value}
      </div>
      {sub && <div className="mt-1 text-sm text-white/50">{sub}</div>}
    </div>
  );
}

/* ---------------------------------------------------------------- controls */

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  display,
  color = "var(--acid)",
}: {
  label: React.ReactNode;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  display?: React.ReactNode;
  color?: string;
}) {
  const pctv = ((value - min) / (max - min)) * 100;
  return (
    <label className="block">
      <div className="mb-2 flex items-baseline justify-between gap-3 text-sm">
        <span className="text-white/70">{label}</span>
        <span className="font-mono tabular-nums" style={{ color }}>
          {display ?? value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="neon-range w-full"
        style={{ "--c": color, "--p": `${pctv}%` } as React.CSSProperties}
      />
    </label>
  );
}

export function Chip({
  active,
  onClick,
  children,
  color = "var(--acid)",
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  color?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full border px-3.5 py-1.5 font-mono text-xs transition-all duration-300",
        active ? "text-black" : "border-white/15 text-white/70 hover:border-white/40 hover:text-white",
      )}
      style={active ? { background: color, borderColor: color, boxShadow: `0 0 24px -4px ${color}` } : undefined}
    >
      {children}
    </button>
  );
}

export function NeonButton({
  children,
  onClick,
  color = "var(--acid)",
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  color?: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative inline-flex items-center gap-2 overflow-hidden rounded-full px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.2em] text-black transition-transform active:scale-95",
        className,
      )}
      style={{ background: color, boxShadow: `0 0 40px -8px ${color}` }}
    >
      <span className="relative z-10 flex items-center gap-2">{children}</span>
      <span className="absolute inset-0 -translate-x-full bg-white/40 transition-transform duration-500 group-hover:translate-x-full" />
    </button>
  );
}

export function Panel({ children, className, title, tag }: { children: React.ReactNode; className?: string; title?: React.ReactNode; tag?: string }) {
  return (
    <div className={cn("glass relative rounded-3xl p-6 md:p-8", className)}>
      {(title || tag) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h3 className="font-display text-lg font-semibold uppercase tracking-tight text-white">{title}</h3>}
          {tag && <span className="font-mono text-[10px] uppercase tracking-[0.25em] text-white/40">{tag}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/* ---------------------------------------------------------------- R code */

const R_KEYWORDS = new Set([
  "function", "if", "else", "for", "in", "while", "return", "repeat", "break", "next",
  "TRUE", "FALSE", "NULL", "NA", "Inf", "NaN", "library", "suppressMessages", "suppressWarnings",
]);

function highlightR(line: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  const re = /(#.*$)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')|(\b\d+(?:\.\d+)?(?:e[-+]?\d+)?L?\b)|(<-|\|>|%in%|%%|==|!=|>=|<=|&&|\|\||[-+*/^~$@])|([A-Za-z_.][A-Za-z0-9_.]*)(?=\s*\()|([A-Za-z_.][A-Za-z0-9_.]*)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(line))) {
    if (m.index > last) out.push(line.slice(last, m.index));
    const [tok] = m;
    let cls = "";
    if (m[1]) cls = "text-white/35 italic";
    else if (m[2]) cls = "text-[#ff8a3d]";
    else if (m[3]) cls = "text-[#9b7bff]";
    else if (m[4]) cls = "text-[#ff2bd6]";
    else if (m[5]) cls = R_KEYWORDS.has(tok) ? "text-[#ff2bd6]" : "text-[#2de2ff]";
    else if (m[6]) cls = R_KEYWORDS.has(tok) ? "text-[#ff2bd6] font-semibold" : "text-white/85";
    out.push(
      <span key={k++} className={cls}>
        {tok}
      </span>,
    );
    last = m.index + tok.length;
    if (tok.length === 0) re.lastIndex++;
  }
  if (last < line.length) out.push(line.slice(last));
  return out;
}

export function RCode({
  code,
  file = "analysis.R",
  maxHeight = 420,
  className,
}: {
  code: string;
  file?: string;
  maxHeight?: number;
  className?: string;
}) {
  const lines = code.split("\n");
  const [copied, setCopied] = React.useState(false);
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a12]/90 shadow-[0_0_60px_-30px_var(--acid)]", className)}>
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff2bd6]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff8a3d]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#c6ff3d]" />
          <span className="ml-3 font-mono text-xs text-white/50">{file}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard?.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          }}
          className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 hover:text-[#c6ff3d]"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <pre data-lenis-prevent className="overflow-auto p-4 font-mono text-[12.5px] leading-[1.7]" style={{ maxHeight }}>
        {lines.map((l, i) => (
          <div key={i} className="flex">
            <span className="mr-4 inline-block w-7 shrink-0 select-none text-right text-white/20">{i + 1}</span>
            <span className="whitespace-pre">{highlightR(l)}</span>
          </div>
        ))}
      </pre>
    </div>
  );
}

/** A console-style block of R output. */
export function ROutput({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <pre className={cn("overflow-x-auto rounded-2xl border border-white/10 bg-black/70 p-4 font-mono text-[12.5px] leading-relaxed text-[#c6ff3d]/90", className)}>
      {children}
    </pre>
  );
}
