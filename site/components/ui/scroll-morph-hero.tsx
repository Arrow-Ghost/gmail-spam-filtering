"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, useTransform, useSpring, useMotionValue } from "framer-motion";

// --- Types ---
export type AnimationPhase = "scatter" | "line" | "circle" | "bottom-strip";

export type MorphCard = { src: string; label: string };

interface FlipCardProps {
    src: string;
    label: string;
    index: number;
    target: { x: number; y: number; rotation: number; scale: number; opacity: number };
}

// --- FlipCard Component ---
const IMG_WIDTH = 60;
const IMG_HEIGHT = 85;

function FlipCard({ src, label, index, target }: FlipCardProps) {
    return (
        <motion.div
            // Smoothly animate to the coordinates defined by the parent
            animate={{
                x: target.x,
                y: target.y,
                rotate: target.rotation,
                scale: target.scale,
                opacity: target.opacity,
            }}
            transition={{
                type: "spring",
                stiffness: 40,
                damping: 15,
            }}
            style={{
                position: "absolute",
                width: IMG_WIDTH,
                height: IMG_HEIGHT,
                transformStyle: "preserve-3d", // Essential for the 3D hover effect
                perspective: "1000px",
            }}
            className="cursor-pointer group"
        >
            <motion.div
                className="relative h-full w-full"
                style={{ transformStyle: "preserve-3d" }}
                transition={{ duration: 0.6, type: "spring", stiffness: 260, damping: 20 }}
                whileHover={{ rotateY: 180 }}
            >
                {/* Front Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-md shadow-[0_0_24px_-6px_rgba(198,255,61,.35)] ring-1 ring-white/10 bg-[#07070c]"
                    style={{ backfaceVisibility: "hidden" }}
                >
                    <img src={src} alt={`R plot ${index + 1}: ${label}`} className="h-full w-full object-cover" draggable={false} />
                    <div className="absolute inset-0 bg-black/10 transition-colors group-hover:bg-transparent" />
                </div>

                {/* Back Face */}
                <div
                    className="absolute inset-0 h-full w-full overflow-hidden rounded-md bg-[#0d0d16] flex flex-col items-center justify-center p-1 border border-[#c6ff3d]/40"
                    style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }}
                >
                    <p className="text-[5px] font-bold text-[#c6ff3d] uppercase tracking-widest mb-0.5">R · plot {index + 1}</p>
                    <p className="text-[6.5px] leading-tight font-medium text-white text-center">{label}</p>
                </div>
            </motion.div>
        </motion.div>
    );
}

// --- Main Hero Component ---
const MAX_SCROLL = 3000; // Virtual scroll range
const MORPH_END = 600;

// Helper for linear interpolation
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

export type IntroAnimationProps = {
    cards: MorphCard[];
    introTitle?: React.ReactNode;
    introKicker?: string;
    arcTitle?: React.ReactNode;
    arcBody?: React.ReactNode;
    className?: string;
};

/**
 * Cards scatter, line up, close into a circle, then (as you scroll) open into
 * an arc and slide along it. The wheel drives a virtual scroll while the hero
 * is pinned to the top of the viewport; at either end of its range the wheel
 * is handed back to the page, so it works as the first slide of a long deck.
 */
export default function IntroAnimation({
    cards,
    introTitle = "The future is built on AI.",
    introKicker = "SCROLL TO EXPLORE",
    arcTitle = "Explore Our Vision",
    arcBody,
    className,
}: IntroAnimationProps) {
    const TOTAL_IMAGES = cards.length;
    const [introPhase, setIntroPhase] = useState<AnimationPhase>("scatter");
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    // --- Container Size ---
    useEffect(() => {
        if (!containerRef.current) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setContainerSize({ width: entry.contentRect.width, height: entry.contentRect.height });
            }
        });
        observer.observe(containerRef.current);
        setContainerSize({
            width: containerRef.current.offsetWidth,
            height: containerRef.current.offsetHeight,
        });
        return () => observer.disconnect();
    }, []);

    // --- Virtual Scroll Logic ---
    const virtualScroll = useMotionValue(0);
    const scrollRef = useRef(0); // Keep track of scroll value without re-renders

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // Only take the wheel while the hero fills the viewport and still has range left.
        const owns = (delta: number) => {
            const top = container.getBoundingClientRect().top;
            if (Math.abs(top) > 2) return false;
            if (delta > 0) return scrollRef.current < MAX_SCROLL;
            if (delta < 0) return scrollRef.current > 0;
            return false;
        };
        const push = (delta: number) => {
            const next = Math.min(Math.max(scrollRef.current + delta, 0), MAX_SCROLL);
            scrollRef.current = next;
            virtualScroll.set(next);
        };

        const handleWheel = (e: WheelEvent) => {
            if (!owns(e.deltaY)) return;
            e.preventDefault();
            e.stopPropagation(); // keep the page's smooth scroller out of it
            push(e.deltaY);
        };

        let touchStartY = 0;
        const handleTouchStart = (e: TouchEvent) => {
            touchStartY = e.touches[0].clientY;
        };
        const handleTouchMove = (e: TouchEvent) => {
            const touchY = e.touches[0].clientY;
            const deltaY = touchStartY - touchY;
            if (!owns(deltaY)) return;
            e.preventDefault();
            e.stopPropagation();
            touchStartY = touchY;
            push(deltaY);
        };

        // Keyboard / presenter clicker: step through circle -> arc -> end of arc.
        const handleKey = (e: KeyboardEvent) => {
            const fwd = ["ArrowDown", "PageDown", " ", "ArrowRight"].includes(e.key);
            const back = ["ArrowUp", "PageUp", "ArrowLeft"].includes(e.key);
            if (!fwd && !back) return;
            if (!owns(fwd ? 1 : -1)) return;
            e.preventDefault();
            e.stopImmediatePropagation();
            const stops = [0, MORPH_END, 1800, MAX_SCROLL];
            const cur = scrollRef.current;
            const next = fwd
                ? stops.find((s) => s > cur + 1) ?? MAX_SCROLL
                : [...stops].reverse().find((s) => s < cur - 1) ?? 0;
            push(next - cur);
        };

        container.addEventListener("wheel", handleWheel, { passive: false });
        container.addEventListener("touchstart", handleTouchStart, { passive: false });
        container.addEventListener("touchmove", handleTouchMove, { passive: false });
        window.addEventListener("keydown", handleKey, { capture: true });

        return () => {
            container.removeEventListener("wheel", handleWheel);
            container.removeEventListener("touchstart", handleTouchStart);
            container.removeEventListener("touchmove", handleTouchMove);
            window.removeEventListener("keydown", handleKey, { capture: true });
        };
    }, [virtualScroll]);

    // 1. Morph Progress: 0 (Circle) -> 1 (Bottom Arc)
    const morphProgress = useTransform(virtualScroll, [0, MORPH_END], [0, 1]);
    const smoothMorph = useSpring(morphProgress, { stiffness: 40, damping: 20 });

    // 2. Scroll Rotation (Shuffling): Starts after morph
    const scrollRotate = useTransform(virtualScroll, [MORPH_END, MAX_SCROLL], [0, 360]);
    const smoothScrollRotate = useSpring(scrollRotate, { stiffness: 40, damping: 20 });

    // --- Mouse Parallax ---
    const mouseX = useMotionValue(0);
    const smoothMouseX = useSpring(mouseX, { stiffness: 30, damping: 20 });

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const handleMouseMove = (e: MouseEvent) => {
            const rect = container.getBoundingClientRect();
            const normalizedX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            mouseX.set(normalizedX * 100);
        };
        container.addEventListener("mousemove", handleMouseMove);
        return () => container.removeEventListener("mousemove", handleMouseMove);
    }, [mouseX]);

    // --- Intro Sequence ---
    useEffect(() => {
        const timer1 = setTimeout(() => setIntroPhase("line"), 700);
        const timer2 = setTimeout(() => setIntroPhase("circle"), 2700);
        return () => { clearTimeout(timer1); clearTimeout(timer2); };
    }, []);

    // --- Scatter Positions ---
    // Seeded (mulberry32) rather than Math.random(), so the server render and
    // the client agree and the page can be prerendered.
    const scatterPositions = useMemo(() => {
        let a = 0x9e3779b9;
        const rand = () => {
            a = (a + 0x6d2b79f5) >>> 0;
            let t = a;
            t = Math.imul(t ^ (t >>> 15), t | 1);
            t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
        return cards.map(() => ({
            x: (rand() - 0.5) * 1500,
            y: (rand() - 0.5) * 1000,
            rotation: (rand() - 0.5) * 180,
            scale: 0.6,
            opacity: 0,
        }));
    }, [cards]);

    // --- Render Loop (Manual Calculation for Morph) ---
    const [morphValue, setMorphValue] = useState(0);
    const [rotateValue, setRotateValue] = useState(0);
    const [parallaxValue, setParallaxValue] = useState(0);

    useEffect(() => {
        const unsubscribeMorph = smoothMorph.on("change", setMorphValue);
        const unsubscribeRotate = smoothScrollRotate.on("change", setRotateValue);
        const unsubscribeParallax = smoothMouseX.on("change", setParallaxValue);
        return () => {
            unsubscribeMorph();
            unsubscribeRotate();
            unsubscribeParallax();
        };
    }, [smoothMorph, smoothScrollRotate, smoothMouseX]);

    // --- Content Opacity ---
    const contentOpacity = useTransform(smoothMorph, [0.8, 1], [0, 1]);
    const contentY = useTransform(smoothMorph, [0.8, 1], [20, 0]);

    return (
        <div ref={containerRef} className={"relative w-full h-full overflow-hidden " + (className ?? "")}>
            <div className="flex h-full w-full flex-col items-center justify-center perspective-1000">

                {/* Intro Text (Fades out) */}
                <div className="absolute z-0 flex flex-col items-center justify-center text-center pointer-events-none top-1/2 -translate-y-1/2 px-6">
                    <motion.h1
                        initial={{ opacity: 0, y: 20, filter: "blur(10px)" }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 1 - morphValue * 2, y: 0, filter: "blur(0px)" } : { opacity: 0, filter: "blur(10px)" }}
                        transition={{ duration: 1 }}
                        className="font-display text-2xl font-medium tracking-tight text-white md:text-4xl max-w-[16ch]"
                    >
                        {introTitle}
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={introPhase === "circle" && morphValue < 0.5 ? { opacity: 0.6 - morphValue } : { opacity: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="mt-4 font-mono text-xs font-bold tracking-[0.3em] text-[#c6ff3d]"
                    >
                        {introKicker}
                    </motion.p>
                </div>

                {/* Arc Active Content (Fades in) */}
                <motion.div
                    style={{ opacity: contentOpacity, y: contentY }}
                    className="absolute top-[9%] z-10 flex flex-col items-center justify-center text-center pointer-events-none px-4"
                >
                    {arcTitle}
                    {arcBody}
                </motion.div>

                {/* Main Container */}
                <div className="relative flex items-center justify-center w-full h-full">
                    {cards.map((card, i) => {
                        let target = { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1 };

                        if (introPhase === "scatter") {
                            target = scatterPositions[i];
                        } else if (introPhase === "line") {
                            const lineSpacing = 70;
                            const lineTotalWidth = TOTAL_IMAGES * lineSpacing;
                            const lineX = i * lineSpacing - lineTotalWidth / 2;
                            target = { x: lineX, y: 0, rotation: 0, scale: 1, opacity: 1 };
                        } else {
                            const isMobile = containerSize.width < 768;
                            const minDimension = Math.min(containerSize.width, containerSize.height);

                            // A. Circle
                            const circleRadius = Math.min(minDimension * 0.35, 350);
                            const circleAngle = (i / TOTAL_IMAGES) * 360;
                            const circleRad = (circleAngle * Math.PI) / 180;
                            const circlePos = {
                                x: Math.cos(circleRad) * circleRadius,
                                y: Math.sin(circleRad) * circleRadius,
                                rotation: circleAngle + 90,
                            };

                            // B. Bottom "rainbow" arc
                            const baseRadius = Math.min(containerSize.width, containerSize.height * 1.5);
                            const arcRadius = baseRadius * (isMobile ? 1.4 : 1.1);
                            const arcApexY = containerSize.height * (isMobile ? 0.35 : 0.25);
                            const arcCenterY = arcApexY + arcRadius;
                            const spreadAngle = isMobile ? 100 : 130;
                            const startAngle = -90 - spreadAngle / 2;
                            const step = spreadAngle / (TOTAL_IMAGES - 1);

                            // scroll after the morph slides the cards along the arc, bounded
                            const scrollProgress = Math.min(Math.max(rotateValue / 360, 0), 1);
                            const maxRotation = spreadAngle * 0.8;
                            const boundedRotation = -scrollProgress * maxRotation;

                            const currentArcAngle = startAngle + i * step + boundedRotation;
                            const arcRad = (currentArcAngle * Math.PI) / 180;
                            const arcPos = {
                                x: Math.cos(arcRad) * arcRadius + parallaxValue,
                                y: Math.sin(arcRad) * arcRadius + arcCenterY,
                                rotation: currentArcAngle + 90,
                                scale: isMobile ? 1.4 : 1.8,
                            };

                            // C. Interpolate (Morph)
                            target = {
                                x: lerp(circlePos.x, arcPos.x, morphValue),
                                y: lerp(circlePos.y, arcPos.y, morphValue),
                                rotation: lerp(circlePos.rotation, arcPos.rotation, morphValue),
                                scale: lerp(1, arcPos.scale, morphValue),
                                opacity: 1,
                            };
                        }

                        return <FlipCard key={i} src={card.src} label={card.label} index={i} target={target} />;
                    })}
                </div>
            </div>
        </div>
    );
}
