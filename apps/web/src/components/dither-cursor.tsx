"use client";

import { useRef, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

// Bayer 8x8 dither matrix
const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42,
  48, 16, 56, 24, 50, 18, 58, 26,
  12, 44, 4, 36, 14, 46, 6, 38,
  60, 28, 52, 20, 62, 30, 54, 22,
  3, 35, 11, 43, 1, 33, 9, 41,
  51, 19, 59, 27, 49, 17, 57, 25,
  15, 47, 7, 39, 13, 45, 5, 37,
  63, 31, 55, 23, 61, 29, 53, 21,
];

function parseHexColor(hex: string) {
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

export interface DitherCursorProps {
  ditherSize?: number;
  radius?: number;
  exponent?: number;
  decay?: number;
  intensity?: number;
  color?: string;
  className?: string;
  opacity?: number;
  position?: "fixed" | "absolute";
}

export default function DitherCursor({
  radius = 0.04,
  exponent = 4.0,
  decay = 0.03,
  intensity = 0.35,
  color = "#ffd900",
  className,
  opacity = 1,
  position = "fixed",
}: DitherCursorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const prevMouseRef = useRef({ x: 0, y: 0 });
  const speedRef = useRef(0);
  const bufferRef = useRef<Float32Array | null>(null);
  const rafRef = useRef<number>(0);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    if (w === 0 || h === 0) return;

    if (!bufferRef.current || bufferRef.current.length !== w * h) {
      bufferRef.current = new Float32Array(w * h);
    }
    const buf = bufferRef.current;

    // Mouse speed
    const dx = mouseRef.current.x - prevMouseRef.current.x;
    const dy = mouseRef.current.y - prevMouseRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    speedRef.current += (dist - speedRef.current) * 0.1;
    prevMouseRef.current.x = mouseRef.current.x;
    prevMouseRef.current.y = mouseRef.current.y;

    // Normalized mouse position (0-1)
    const mx = mouseRef.current.x / w;
    const my = mouseRef.current.y / h;
    const aspect = w / h;
    const normalizedRadius = radius * (1080 / h);
    const brushIntensity = intensity * Math.min(1, speedRef.current / 0.01) * 0.5;

    // Simulate: diffuse + brush + decay
    const next = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const prev = buf[i]!;
        const top = y > 0 ? buf[(y - 1) * w + x]! : 0;
        const bottom = y < h - 1 ? buf[(y + 1) * w + x]! : 0;
        const left = x > 0 ? buf[y * w + (x - 1)]! : 0;
        const right = x < w - 1 ? buf[y * w + (x + 1)]! : 0;
        const diffused = (prev + top + bottom + left + right) * 0.2;

        const ux = x / w;
        const uy = y / h;
        const ddx = (ux - mx) * aspect;
        const ddy = uy - my;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        const brush = Math.exp(-Math.pow(d / normalizedRadius, 2)) * brushIntensity;

        next[i] = Math.max(0, Math.min(0.95, diffused + brush) - decay);
      }
    }
    bufferRef.current = next;

    // Render with dithering
    const { r, g, b } = parseHexColor(color);
    const imageData = ctx.createImageData(w, h);
    const data = imageData.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        const signal = Math.pow(next[i]!, exponent);
        const bx = x % 8;
        const by = y % 8;
        const threshold = BAYER_8[by * 8 + bx]! / 64;
        const mask = signal < 0.01 ? 0 : signal > threshold ? 1 : 0;
        const pi = i * 4;
        data[pi] = r;
        data[pi + 1] = g;
        data[pi + 2] = b;
        data[pi + 3] = Math.round(mask * opacity * 255);
      }
    }
    ctx.putImageData(imageData, 0, 0);

    rafRef.current = requestAnimationFrame(animate);
  }, [color, decay, exponent, intensity, opacity, radius]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const scale = 0.4;
    const resize = () => {
      canvas.width = Math.floor(parent.clientWidth * scale);
      canvas.height = Math.floor(parent.clientHeight * scale);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = parent.getBoundingClientRect();
      mouseRef.current.x = (e.clientX - rect.left) * scale;
      mouseRef.current.y = (e.clientY - rect.top) * scale;
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div
      className={cn(
        position === "fixed" ? "fixed" : "absolute",
        "inset-0 w-full h-full pointer-events-none z-0",
        className
      )}
    >
      <canvas
        ref={canvasRef}
        className="h-full w-full"
        style={{ imageRendering: "pixelated" }}
      />
    </div>
  );
}
