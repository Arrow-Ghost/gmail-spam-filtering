"use client";

import * as React from "react";
import Lenis from "lenis";
import { Tex } from "./primitives";

/* Smooth scrolling, presenter-clicker navigation, the slide rail, the page
   progress bar, the cursor light and the film grain. Mounted once. */

let lenisRef: Lenis | null = null;

export function scrollToY(y: number) {
  if (lenisRef) lenisRef.scrollTo(y, { duration: 1.25, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else window.scrollTo({ top: y, behavior: "smooth" });
}

const stopTops = () =>
  Array.from(document.querySelectorAll<HTMLElement>("[data-stop]"))
    .map((el) => Math.round(el.getBoundingClientRect().top + window.scrollY))
    .sort((a, b) => a - b);

export function DeckChrome() {
  const [slides, setSlides] = React.useState<{ id: string; label: string }[]>([]);
  const [active, setActive] = React.useState(0);
  const [progress, setProgress] = React.useState(0);
  const glowRef = React.useRef<HTMLDivElement>(null);

  // smooth scroll
  React.useEffect(() => {
    const lenis = new Lenis({ autoRaf: true, lerp: 0.09, wheelMultiplier: 0.9 });
    lenisRef = lenis;
    return () => {
      lenis.destroy();
      lenisRef = null;
    };
  }, []);

  // slide rail + progress
  React.useEffect(() => {
    const els = () => Array.from(document.querySelectorAll<HTMLElement>("[data-slide]"));
    setSlides(els().map((el) => ({ id: el.id, label: el.dataset.slide ?? el.id })));
    let raf = 0;
    const update = () => {
      raf = 0;
      const mid = window.scrollY + window.innerHeight * 0.45;
      const list = els();
      let a = 0;
      list.forEach((el, i) => {
        if (el.getBoundingClientRect().top + window.scrollY <= mid) a = i;
      });
      setActive(a);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? window.scrollY / max : 0);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // presenter keys: next / previous stop
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      const tag = t?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || t?.isContentEditable) return;
      if (e.key === " " && tag === "BUTTON") return;
      const fwd = ["ArrowDown", "PageDown", " ", "ArrowRight"].includes(e.key);
      const back = ["ArrowUp", "PageUp", "ArrowLeft"].includes(e.key);
      if (!fwd && !back && e.key !== "Home" && e.key !== "End") return;
      e.preventDefault();
      const y = window.scrollY;
      const tops = stopTops();
      if (e.key === "Home") return scrollToY(0);
      if (e.key === "End") return scrollToY(document.documentElement.scrollHeight);
      const vh = window.innerHeight;
      let target = fwd ? tops.find((p) => p > y + 8) : [...tops].reverse().find((p) => p < y - 8);
      // a slide taller than the screen is walked through one screen at a time
      if (fwd) {
        const end = target ?? document.documentElement.scrollHeight - vh;
        if (end - y > vh * 1.05) target = y + vh * 0.8;
      } else if (target === undefined || y - target > vh * 1.05) {
        target = Math.max(target ?? 0, y - vh * 0.8);
      }
      if (target !== undefined) scrollToY(target);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // cursor light
  React.useEffect(() => {
    const el = glowRef.current;
    if (!el) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.transform = `translate3d(${x - 300}px, ${y - 300}px, 0)`;
          el.style.opacity = "1";
        });
    };
    window.addEventListener("pointermove", move);
    return () => window.removeEventListener("pointermove", move);
  }, []);

  const cur = slides[active];
  return (
    <>
      <div ref={glowRef} aria-hidden className="cursor-glow" />
      <div aria-hidden className="grain" />

      {/* slide rail */}
      <nav aria-label="Slides" className="fixed right-4 top-1/2 z-[60] hidden -translate-y-1/2 flex-col gap-2.5 lg:flex">
        {slides.map((s, i) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            onClick={(e) => {
              e.preventDefault();
              const el = document.getElementById(s.id);
              if (el) scrollToY(el.getBoundingClientRect().top + window.scrollY);
            }}
            className="group flex items-center justify-end gap-3"
          >
            <span className="pointer-events-none translate-x-2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.2em] text-white/0 transition-all duration-300 group-hover:translate-x-0 group-hover:text-white/70">
              {s.label}
            </span>
            <span
              className="block h-2 rounded-full transition-all duration-500"
              style={{
                width: i === active ? 26 : 8,
                background: i === active ? "var(--acid)" : "rgba(255,255,255,.22)",
                boxShadow: i === active ? "0 0 14px var(--acid)" : "none",
              }}
            />
          </a>
        ))}
      </nav>

      {/* slide counter */}
      <div className="pointer-events-none fixed bottom-5 left-5 z-[60] hidden items-center gap-3 font-mono text-[11px] uppercase tracking-[0.25em] text-white/50 md:flex">
        <span className="text-[var(--acid)] tabular-nums">{String(active + 1).padStart(2, "0")}</span>
        <span>/</span>
        <span className="tabular-nums">{String(slides.length).padStart(2, "0")}</span>
        <span className="ml-2 text-white/70">{cur?.label}</span>
      </div>
      <div className="pointer-events-none fixed bottom-5 right-5 z-[60] hidden font-mono text-[10px] uppercase tracking-[0.25em] text-white/30 md:block">
        ↓ / space / clicker → next
      </div>

      {/* page progress */}
      <div aria-hidden className="fixed inset-x-0 bottom-0 z-[60] h-[3px] bg-white/5">
        <div
          className="h-full origin-left"
          style={{ transform: `scaleX(${progress})`, background: "linear-gradient(90deg,var(--cyan),var(--pink),var(--acid))" }}
        />
      </div>
    </>
  );
}

/* A slanted, endlessly scrolling band of formulas between slides. */
export function Marquee({ items, reverse, tone = "acid" }: { items: string[]; reverse?: boolean; tone?: "acid" | "pink" }) {
  const row = (
    <div className="flex shrink-0 items-center gap-10 pr-10">
      {items.map((t, i) => (
        <React.Fragment key={i}>
          <Tex className="text-2xl md:text-3xl">{t}</Tex>
          <span className="text-2xl">✦</span>
        </React.Fragment>
      ))}
    </div>
  );
  return (
    <div
      aria-hidden
      className={`relative z-10 -my-6 overflow-hidden py-4 ${tone === "acid" ? "-rotate-2 bg-[var(--acid)] text-black" : "rotate-1 bg-[var(--pink)] text-black"}`}
    >
      <div className={`marquee flex w-max ${reverse ? "marquee-rev" : ""}`}>
        {row}
        {row}
      </div>
    </div>
  );
}
