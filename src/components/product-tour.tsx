"use client";

import { t } from "@/components/copy";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/lib/tour";
import { cn } from "@/lib/utils";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";

const PAD = 10;

type Rect = { top: number; left: number; width: number; height: number };

function storageKey(id: string) {
  return `sutra-tour-${id}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function ProductTour({
  id,
  steps,
  autoStart = true,
  onStep,
}: {
  id: string;
  steps: TourStep[];
  autoStart?: boolean;
  onStep?: (step: TourStep) => void;
}) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const [bubble, setBubble] = useState({ top: 80, left: 24 });

  const step = steps[index];

  const close = useCallback(() => {
    setOpen(false);
    try {
      localStorage.setItem(storageKey(id), "done");
    } catch {
      /* ignore */
    }
  }, [id]);

  const start = useCallback(() => {
    setIndex(0);
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!autoStart) return;
    try {
      if (localStorage.getItem(storageKey(id)) === "done") return;
    } catch {
      return;
    }
    const timer = window.setTimeout(() => setOpen(true), 420);
    return () => window.clearTimeout(timer);
  }, [autoStart, id]);

  const measure = useCallback(() => {
    if (!open || !step) return;
    if (!step.target) {
      setRect(null);
      setBubble({
        top: Math.max(24, window.innerHeight / 2 - 160),
        left: Math.max(16, window.innerWidth / 2 - 180),
      });
      return;
    }
    const el = document.querySelector(`[data-tour="${step.target}"]`);
    if (!el) {
      setRect(null);
      setBubble({
        top: Math.max(24, window.innerHeight / 2 - 160),
        left: Math.max(16, window.innerWidth / 2 - 180),
      });
      return;
    }
    el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    const r = el.getBoundingClientRect();
    const box = {
      top: r.top - PAD,
      left: r.left - PAD,
      width: r.width + PAD * 2,
      height: r.height + PAD * 2,
    };
    setRect(box);

    const bw = Math.min(360, window.innerWidth - 32);
    const bh = 280;
    const gap = 14;
    const place = step.placement ?? "bottom";
    let top = box.top + box.height + gap;
    let left = box.left + box.width / 2 - bw / 2;
    if (place === "top") top = box.top - bh - gap;
    if (place === "left") {
      top = box.top + box.height / 2 - bh / 2;
      left = box.left - bw - gap;
    }
    if (place === "right") {
      top = box.top + box.height / 2 - bh / 2;
      left = box.left + box.width + gap;
    }
    if (place === "center") {
      top = window.innerHeight / 2 - bh / 2;
      left = window.innerWidth / 2 - bw / 2;
    }
    setBubble({
      top: clamp(top, 12, window.innerHeight - Math.min(bh, 220) - 12),
      left: clamp(left, 12, window.innerWidth - bw - 12),
    });
  }, [open, step]);

  useLayoutEffect(() => {
    if (!open || !step) return;
    onStep?.(step);
    const t1 = window.setTimeout(measure, 40);
    const t2 = window.setTimeout(measure, 280);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure, onStep, open, step]);

  const last = index === steps.length - 1;

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={start} data-tour="replay">
        {t.tour}
      </Button>
      {open && step ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-labelledby="tour-title">
          {rect ? (
            <button
              type="button"
              aria-label={t.tourSkip}
              className="absolute inset-0 cursor-default"
              onClick={close}
            />
          ) : (
            <button
              type="button"
              aria-label={t.tourSkip}
              className="absolute inset-0 cursor-default bg-[#1a0820]/74"
              onClick={close}
            />
          )}
          {rect ? (
            <div
              className="pointer-events-none absolute rounded-2xl ring-2 ring-[var(--zap)] tour-pulse"
              style={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
              }}
            />
          ) : null}
          <div
            className={cn(
              "absolute z-[2] w-[min(360px,calc(100vw-2rem))] rounded-[1.4rem] border-2 border-[color-mix(in_oklab,var(--dawn)_70%,white)] bg-[var(--popover)] p-4 shadow-[8px_10px_0_0_color-mix(in_oklab,var(--zap)_55%,transparent)]",
            )}
            style={{ top: bubble.top, left: bubble.left }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-[var(--dawn)]">
                {t.tourStep} {index + 1} / {steps.length}
              </p>
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-foreground"
                onClick={close}
              >
                {t.tourSkip}
              </button>
            </div>
            <h2 id="tour-title" className="font-heading text-xl leading-tight">
              {step.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            <div className="mt-3 rounded-xl bg-[color-mix(in_oklab,var(--river)_18%,transparent)] px-3 py-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--river)]">{t.tourValue}</p>
              <p className="mt-1 text-sm leading-relaxed">{step.value}</p>
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={index === 0}
                onClick={() => setIndex((i) => Math.max(0, i - 1))}
              >
                {t.tourBack}
              </Button>
              <div className="flex gap-1">
                {steps.map((s, i) => (
                  <span
                    key={s.id}
                    className={cn(
                      "size-1.5 rounded-full",
                      i === index ? "bg-[var(--dawn)]" : "bg-muted-foreground/40",
                    )}
                  />
                ))}
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (last) close();
                  else setIndex((i) => i + 1);
                }}
              >
                {last ? t.tourDone : t.tourNext}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
