"use client";

import React, { createContext, useContext, useId, useRef } from "react";
import { motion } from "motion/react";

import { ColorSwatch } from "@/components/ui/color-picker";
import { cn } from "@/lib/utils";

/*
 * Shared playground controls (first built for Toss): soft grey pills on a white panel.
 * Wrap a panel in <ControlsDensity value="compact"> for a tighter, Figma-sized variant.
 */

type Density = "default" | "compact";
const DensityContext = createContext<Density>("default");
export const ControlsDensity = DensityContext.Provider;
const useCompact = () => useContext(DensityContext) === "compact";

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const pill = useId();
  const compact = useCompact();
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex bg-[#F2F2F2]", compact ? "rounded-[6px] p-0.5" : "rounded-full p-1")}
    >
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn(
            "relative min-w-0 flex-1 cursor-pointer whitespace-nowrap transition-colors",
            compact ? "h-6 rounded-[4px] px-1.5 text-[11px]" : "rounded-full px-2 py-1.5 text-[13px]",
            o.id === value ? "text-neutral-900" : "text-neutral-400 hover:text-neutral-700",
          )}
        >
          {o.id === value && (
            <motion.span
              layoutId={pill}
              className={cn(
                "absolute inset-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08)]",
                compact ? "rounded-[4px]" : "rounded-full",
              )}
              transition={{ type: "spring", stiffness: 500, damping: 38 }}
            />
          )}
          <span className="relative">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const compact = useCompact();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label
      className={cn(
        "relative flex cursor-ew-resize items-center justify-between overflow-hidden bg-[#F2F2F2]",
        compact ? "h-7 gap-2 rounded-[5px] px-2 text-[11px]" : "h-11 rounded-2xl px-4 text-sm",
      )}
    >
      <span className="absolute inset-y-0 left-0 bg-[#E6E6E6]" style={{ width: `${pct}%` }} />
      <span className="relative truncate text-neutral-500">{label}</span>
      <span className="relative shrink-0 font-medium tabular-nums text-neutral-800">{format(value)}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="absolute inset-0 cursor-ew-resize opacity-0"
      />
    </label>
  );
}

export const Row = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const compact = useCompact();
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <p className={compact ? "text-[11px] text-neutral-500" : "text-sm text-neutral-500"}>{label}</p>
      {children}
    </div>
  );
};

/** A Slider-shaped row with a label on the left and any control on the right. */
const Field = ({ label, children }: { label: string; children: React.ReactNode }) => {
  const compact = useCompact();
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 bg-[#F2F2F2]",
        compact ? "h-7 rounded-[5px] px-2 text-[11px]" : "h-11 rounded-2xl px-4 text-sm",
      )}
    >
      <span className="truncate text-neutral-500">{label}</span>
      {children}
    </div>
  );
};

export function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const compact = useCompact();
  return (
    <Field label={label}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors",
          compact ? "h-4 w-7" : "h-6 w-10",
          checked ? "justify-end bg-neutral-900" : "justify-start bg-[#D9D9D9]",
        )}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 36 }}
          className={cn("rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)]", compact ? "size-3" : "size-5")}
        />
      </button>
    </Field>
  );
}

export function ColorField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  const compact = useCompact();
  return (
    <Field label={label}>
      <span className={cn("flex shrink-0 items-center", compact ? "gap-1.5" : "gap-2.5")}>
        <span className="font-medium uppercase tabular-nums text-neutral-800">{value}</span>
        <ColorSwatch
          value={value}
          onChange={onChange}
          className={cn("border-black/10", compact ? "size-3.5 rounded-[3px]" : "h-6 w-6 rounded-md")}
        />
      </span>
    </Field>
  );
}

/** A knob you turn like a fan regulator: drag around it (or use arrow keys) to set an angle. */
export function Dial({
  label,
  value,
  onChange,
  step = 5,
  format = (v) => `${Math.round(v)}°`,
}: {
  label: string;
  value: number;
  onChange: (deg: number) => void;
  step?: number;
  format?: (v: number) => string;
}) {
  const compact = useCompact();
  const knob = useRef<HTMLDivElement>(null);
  const tick = compact ? 17 : 24;

  const angleAt = (x: number, y: number) => {
    const r = knob.current!.getBoundingClientRect();
    const deg = (Math.atan2(x - (r.left + r.width / 2), -(y - (r.top + r.height / 2))) * 180) / Math.PI;
    return (((Math.round(deg / step) * step) % 360) + 360) % 360;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    onChange(angleAt(e.clientX, e.clientY));
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) onChange(angleAt(e.clientX, e.clientY));
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between bg-[#F2F2F2]",
        compact ? "h-12 rounded-[5px] pl-2 pr-1.5 text-[11px]" : "h-[76px] rounded-2xl pl-4 pr-3 text-sm",
      )}
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-neutral-500">{label}</span>
        <span className="font-medium tabular-nums text-neutral-800">{format(value)}</span>
      </span>
      <div
        ref={knob}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={359}
        aria-valuenow={Math.round(value)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onKeyDown={(e) => {
          const d =
            e.key === "ArrowRight" || e.key === "ArrowUp" ? step : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -step : 0;
          if (!d) return;
          e.preventDefault();
          onChange((value + d + 360) % 360);
        }}
        className={cn(
          "relative cursor-grab touch-none rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),inset_0_0_0_1px_rgba(0,0,0,0.04)] outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 active:cursor-grabbing",
          compact ? "size-10" : "size-14",
        )}
      >
        {/* Tick marks every 45° */}
        {Array.from({ length: 8 }, (_, i) => (
          <span
            key={i}
            className="absolute left-1/2 top-1/2 h-[3px] w-px bg-neutral-300"
            style={{ transform: `rotate(${i * 45}deg) translateY(-${tick}px)`, transformOrigin: "0 0" }}
          />
        ))}
        <span
          className={cn("absolute rounded-full bg-[#F7F7F7] transition-transform duration-75", compact ? "inset-[5px]" : "inset-[7px]")}
          style={{ transform: `rotate(${value}deg)` }}
        >
          <span
            className={cn(
              "absolute left-1/2 -translate-x-1/2 rounded-full bg-neutral-900",
              compact ? "top-[3px] h-2 w-[2.5px]" : "top-[5px] h-2.5 w-[3px]",
            )}
          />
        </span>
      </div>
    </div>
  );
}
