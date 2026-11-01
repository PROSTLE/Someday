"use client";

import { useEffect, useRef } from "react";

const SPAWN_MS = 120;
const MAX_BUBBLES = 12;
const COLORS = ["--mint", "--sky", "--lavender", "--yellow"];
export const BUBBLES_KEY = "someday-bubbles";
export const BUBBLES_EVENT = "someday-bubbles-change";

type Bubble = { x: number; y: number; r: number; rise: number; life: number; born: number; alpha: number; color: string };

const between = (min: number, max: number) => min + Math.random() * (max - min);

function bubblesAllowed() {
  try {
    if (localStorage.getItem(BUBBLES_KEY) === "off") return false;
  } catch {
    // Storage can be blocked. The effect stays on.
  }
  return (
    matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Bubbles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const bubbles: Bubble[] = [];
    let allowed = bubblesAllowed();
    let frame = 0;
    let lastSpawn = 0;

    const resize = () => {
      const ratio = devicePixelRatio || 1;
      canvas.width = innerWidth * ratio;
      canvas.height = innerHeight * ratio;
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (now: number) => {
      frame = 0;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      for (let i = bubbles.length - 1; i >= 0; i--) {
        const b = bubbles[i];
        const t = (now - b.born) / b.life;
        if (t >= 1) {
          bubbles.splice(i, 1);
          continue;
        }
        ctx.globalAlpha = b.alpha * (1 - t);
        ctx.fillStyle = b.color;
        ctx.beginPath();
        ctx.arc(b.x, b.y - b.rise * t, b.r, 0, Math.PI * 2);
        ctx.fill();
      }
      if (bubbles.length && !document.hidden) frame = requestAnimationFrame(draw);
    };

    const onMove = (event: PointerEvent) => {
      if (!allowed || document.hidden) return;
      const target = event.target as Element | null;
      if (target?.closest("a, button, input, select, textarea, label, [data-surface]")) return;
      const now = performance.now();
      if (now - lastSpawn < SPAWN_MS || bubbles.length >= MAX_BUBBLES) return;
      lastSpawn = now;
      const name = COLORS[Math.floor(Math.random() * COLORS.length)];
      bubbles.push({
        x: event.clientX + between(-14, 14),
        y: event.clientY + between(-14, 14),
        r: between(4, 24),
        rise: between(40, 120),
        life: between(1200, 2000),
        born: now,
        alpha: between(0.12, 0.3),
        color: getComputedStyle(document.documentElement).getPropertyValue(name),
      });
      if (!frame) frame = requestAnimationFrame(draw);
    };

    const onSetting = () => {
      allowed = bubblesAllowed();
    };

    const onVisibility = () => {
      if (document.hidden) {
        bubbles.length = 0;
        ctx.clearRect(0, 0, innerWidth, innerHeight);
      }
    };

    resize();
    addEventListener("resize", resize);
    addEventListener("pointermove", onMove, { passive: true });
    addEventListener(BUBBLES_EVENT, onSetting);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("resize", resize);
      removeEventListener("pointermove", onMove);
      removeEventListener(BUBBLES_EVENT, onSetting);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden className="pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
