import React, { useEffect, useRef } from "react";
import "./cursor.css";

export default function Cursor() {
  const cursorRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const cursor = cursorRef.current;
    const ring = ringRef.current;
    if (!cursor || !ring) return;

    let mouseX = 0;
    let mouseY = 0;

    let ringX = 0;
    let ringY = 0;

    function onMove(e: MouseEvent) {
      mouseX = e.clientX;
      mouseY = e.clientY;
      (cursor as HTMLDivElement)!.style.left = `${mouseX}px`;
      (cursor as HTMLDivElement)!.style.top = `${mouseY}px`;
    }

    window.addEventListener("mousemove", onMove);

    let rafId = 0;
    function animateRing() {
      ringX += (mouseX - ringX) * 0.16;
      ringY += (mouseY - ringY) * 0.16;

      (ring as HTMLDivElement)!.style.left = `${ringX}px`;
      (ring as HTMLDivElement)!.style.top = `${ringY}px`;

      rafId = requestAnimationFrame(animateRing);
    }

    rafId = requestAnimationFrame(animateRing);
    // Hover targets
    const hoverSelector = "a, button, .hover-target";
    const hoverTargets = Array.from(document.querySelectorAll(hoverSelector));
    const onEnter = () => document.body.classList.add("cursor-hover");
    const onLeave = () => document.body.classList.remove("cursor-hover");
    hoverTargets.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    // Text targets
    const textTargets = Array.from(document.querySelectorAll("input, textarea"));
    const onTextEnter = () => document.body.classList.add("cursor-text");
    const onTextLeave = () => document.body.classList.remove("cursor-text");
    textTargets.forEach((el) => {
      el.addEventListener("mouseenter", onTextEnter);
      el.addEventListener("mouseleave", onTextLeave);
    });

    // Click states
    const onDown = () => document.body.classList.add("cursor-click");
    const onUp = () => document.body.classList.remove("cursor-click");
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);

    return () => {
      window.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafId);
      hoverTargets.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
      textTargets.forEach((el) => {
        el.removeEventListener("mouseenter", onTextEnter);
        el.removeEventListener("mouseleave", onTextLeave);
      });
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, []);

  return (
    <>
      <div className="pro-cursor" ref={cursorRef} />
      <div className="pro-cursor-ring" ref={ringRef} />
    </>
  );
}
