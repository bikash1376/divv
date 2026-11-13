"use client";

import { RefreshIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion } from "motion/react";
import React, { useCallback, useEffect, useRef, useState } from "react";

import TutorialCard, {
  DEFAULT_CARD_STYLE,
  FIGMA_CARD_STYLE,
  type CardContent,
  type CardStyle,
  type EditableField,
} from "@/components/TutorialCard";
import {
  ColorField,
  ControlsDensity,
  Dial,
  Segmented,
  Slider,
  Switch,
} from "@/components/ui/playground-controls";
import DashboardMock from "./DashboardMock";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

/** Settings as a developer would paste them: style plus per-step copy (local blob media left out). */
function exportSettings(style: CardStyle, steps: CardContent[]) {
  const content = steps.map((s) => (s.media.startsWith("blob:") ? { ...s, media: "<your file>" } : s));
  return JSON.stringify({ style, steps: content }, null, 2);
}

/** The card's natural width; the stage is sized for it at 100% so resizing never shifts the panels. */
const CARD_W = 500;
const STAGE_MAX_W = CARD_W + 140;

const SEED = [
  {
    title: "Workspace switcher",
    description: "Manage workspace settings and change to another workspace easily from the workspace switcher.",
    media: "/petal-pattern.svg",
  },
  {
    title: "Invite your team",
    description: "Bring collaborators into the workspace so everyone can upload, comment and ship together.",
    media: "/image1.png",
  },
  {
    title: "Keep an eye on usage",
    description: "The sidebar meters show how close you are to your plan limits before anything gets blocked.",
    media: "/image2.webp",
  },
  {
    title: "Organise with sections",
    description: "Group related files into sections to keep large workspaces tidy and easy to browse.",
    media: "/image3.jpg",
  },
];

const INITIAL_STEPS: CardContent[] = SEED.map((s, i) => ({
  ...s,
  counter: `${i + 1} of ${SEED.length}`,
  laterLabel: "Later",
  primaryLabel: i === SEED.length - 1 ? "New section" : "Next",
}));

const STEP_OPTIONS = INITIAL_STEPS.map((_, i) => ({ id: String(i), label: String(i + 1) }));

const PRESETS = { default: DEFAULT_CARD_STYLE, figma: FIGMA_CARD_STYLE } as const;
type PresetId = keyof typeof PRESETS;
const PRESET_OPTIONS: { id: PresetId; label: string }[] = [
  { id: "default", label: "Default" },
  { id: "figma", label: "Figma" },
];
const sameStyle = (a: CardStyle, b: CardStyle) =>
  (Object.keys(b) as (keyof CardStyle)[]).every((k) => a[k] === b[k]);

const DIRECTIONS = ["Top", "Top right", "Right", "Bottom right", "Bottom", "Bottom left", "Left", "Top left"];
const direction = (deg: number) => DIRECTIONS[Math.round(deg / 45) % 8];

function hexToRgba(hex: string, alpha: number) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

const px = (v: number) => `${v}`;
const pct = (v: number) => `${Math.round(v * 100)}%`;
const num = (v: number) => `${v}`;

export default function TutsPlayground() {
  const [open, setOpen] = useState(true);
  const [step, setStep] = useState(0);
  const [steps, setSteps] = useState(INITIAL_STEPS);

  const [cardState, setCard] = useState<CardStyle>(DEFAULT_CARD_STYLE);
  // Backfill from defaults so settings added later never arrive undefined (e.g. across hot reloads).
  const card: CardStyle = { ...DEFAULT_CARD_STYLE, ...cardState };
  const setC = <K extends keyof CardStyle>(k: K, v: CardStyle[K]) => setCard((c) => ({ ...c, [k]: v }));
  const [scale, setScale] = useState(0.8);
  const preset = (Object.keys(PRESETS) as PresetId[]).find((id) => sameStyle(card, PRESETS[id])) ?? ("custom" as PresetId);

  const [opacity, setOpacity] = useState(0.55);
  const [tint, setTint] = useState("#2B3136");
  const [grayscale, setGrayscale] = useState(0.7);
  const [blur, setBlur] = useState(0);
  const [copied, setCopied] = useState(false);
  const copySettings = async () => {
    try {
      await navigator.clipboard.writeText(exportSettings(card, steps));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be blocked (insecure origin, permissions); nothing useful to do here.
    }
  };

  // Shrink the card further if the stage is narrower than it (phones, tablets).
  const stageRef = useRef<HTMLDivElement>(null);
  const [stageW, setStageW] = useState<number>(STAGE_MAX_W);
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setStageW(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const gutter = Math.min(70, Math.max(24, stageW * 0.08));
  const zoom = Math.min(scale, (stageW - gutter * 2) / CARD_W);

  const fileInput = useRef<HTMLInputElement>(null);
  const objectUrls = useRef<string[]>([]);
  useEffect(() => {
    const urls = objectUrls.current;
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const close = useCallback(() => setOpen(false), []);
  const replay = () => {
    setStep(0);
    setOpen(true);
  };
  const isLast = step === steps.length - 1;
  const next = () => (isLast ? close() : setStep((s) => s + 1));

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.isContentEditable || t?.closest("input, textarea, [role=slider], [role=dialog]")) return;
      if (e.key === "Escape") close();
      if (e.key === "ArrowRight") setStep((s) => Math.min(s + 1, steps.length - 1));
      if (e.key === "ArrowLeft") setStep((s) => Math.max(s - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close, steps.length]);

  const updateStep = (field: EditableField | "media", value: string) =>
    setSteps((all) => all.map((s, i) => (i === step ? { ...s, [field]: value } : s)));

  const onPickMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    // Object URLs carry no extension; tag videos so the card renders a <video>.
    updateStep("media", file.type.startsWith("video/") ? `${url}#.mp4` : url);
  };

  return (
    <ControlsDensity value="compact">
      <div className="flex min-h-screen w-full flex-col gap-3 bg-white p-3 md:flex-row md:flex-wrap md:content-start lg:h-screen lg:flex-nowrap lg:items-stretch lg:justify-center lg:gap-4 lg:p-6">
        <input ref={fileInput} type="file" accept="image/*,video/*" className="hidden" onChange={onPickMedia} />

        {/* Left: content & layout */}
        <Panel side="left" title="Tour card" hint="Double-click text on the card to edit it, or the image to swap it.">
          <Section title="Step">
            <Segmented
              label="Step"
              options={STEP_OPTIONS}
              value={String(step)}
              onChange={(v) => {
                setStep(Number(v));
                setOpen(true);
              }}
            />
          </Section>

          <Section title="Show">
            <div className="grid grid-cols-2 gap-1.5">
              <Switch label="Media" checked={card.showMedia} onChange={(v) => setC("showMedia", v)} />
              <Switch label="Heading" checked={card.showHeading} onChange={(v) => setC("showHeading", v)} />
              <Switch label="Counter" checked={card.showCounter} onChange={(v) => setC("showCounter", v)} />
              <Switch label="Pointer" checked={card.showArrow} onChange={(v) => setC("showArrow", v)} />
              <Switch label="Close (×)" checked={card.showClose} onChange={(v) => setC("showClose", v)} />
            </div>
            <Collapse show={card.showHeading && card.showMedia}>
              <Segmented
                label="Heading position"
                options={[
                  { id: "top", label: "Heading on top" },
                  { id: "above-text", label: "Above text" },
                ]}
                value={card.headingPosition}
                onChange={(v) => setC("headingPosition", v)}
              />
            </Collapse>
          </Section>

          <Collapse show={card.showArrow}>
            <Section title="Pointer">
              <Dial
                label="Placement"
                value={card.arrowAngle}
                onChange={(v) => setC("arrowAngle", v)}
                format={(v) => `${direction(v)} · ${Math.round(v)}°`}
              />
              <Slider label="Size" value={card.arrowSize} min={6} max={32} step={1} format={px} onChange={(v) => setC("arrowSize", v)} />
            </Section>
          </Collapse>

          <Section title="Layout">
            <div className="grid grid-cols-2 gap-1.5">
              <Slider label="Scale" value={scale} min={0.5} max={1} step={0.05} format={pct} onChange={setScale} />
              <Slider label="Padding" value={card.padding} min={0} max={40} step={1} format={px} onChange={(v) => setC("padding", v)} />
            </div>
            <Slider label="Text to buttons gap" value={card.footerGap} min={0} max={80} step={1} format={px} onChange={(v) => setC("footerGap", v)} />
          </Section>

          <Section title="Corner radius">
            <div className="grid grid-cols-3 gap-1.5">
              <Slider label="Card" value={card.cardRadius} min={0} max={40} step={1} format={px} onChange={(v) => setC("cardRadius", v)} />
              <Slider label="Media" value={card.mediaRadius} min={0} max={40} step={1} format={px} onChange={(v) => setC("mediaRadius", v)} />
              <Slider label="Btn" value={card.buttonRadius} min={0} max={24} step={1} format={px} onChange={(v) => setC("buttonRadius", v)} />
            </div>
          </Section>

          <Section title="Typography">
            <div className="grid grid-cols-2 gap-1.5">
              <Slider label="Title size" value={card.headingSize} min={12} max={28} step={1} format={px} onChange={(v) => setC("headingSize", v)} />
              <Slider label="Text size" value={card.textSize} min={11} max={20} step={1} format={px} onChange={(v) => setC("textSize", v)} />
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <Slider label="Title" value={card.headingWeight} min={100} max={900} step={100} format={num} onChange={(v) => setC("headingWeight", v)} />
              <Slider label="Text" value={card.textWeight} min={100} max={900} step={100} format={num} onChange={(v) => setC("textWeight", v)} />
              <Slider label="Btn" value={card.buttonWeight} min={100} max={900} step={100} format={num} onChange={(v) => setC("buttonWeight", v)} />
            </div>
          </Section>
        </Panel>

        {/* Stage: fixed at the card's 100% width; scale only resizes the card inside it */}
        <div
          ref={stageRef}
          className="relative order-first flex h-[75svh] min-h-[460px] w-full items-center justify-center overflow-hidden rounded-[20px] md:mx-auto lg:order-none lg:mx-0 lg:h-auto lg:min-h-0 lg:min-w-0 lg:flex-1"
          style={{ maxWidth: STAGE_MAX_W }}
        >
          {/* The app behind sits slightly faded: 90% under the tour, 80% once it's dismissed */}
          <div
            className="absolute inset-y-0 left-1/2 w-[1200px] -translate-x-1/2 transition-opacity duration-300"
            style={{ opacity: open ? 0.9 : 0.8 }}
          >
            <DashboardMock />
          </div>

          <AnimatePresence>
            {open && (
              <motion.div
                key="backdrop"
                className="absolute inset-0"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  background: hexToRgba(tint, opacity),
                  backdropFilter: `grayscale(${grayscale}) blur(${blur}px)`,
                  WebkitBackdropFilter: `grayscale(${grayscale}) blur(${blur}px)`,
                }}
              />
            )}
          </AnimatePresence>

          <AnimatePresence>
            {open ? (
              <motion.div
                key="card"
                className="relative z-10"
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ type: "spring", stiffness: 380, damping: 32 }}
              >
                <div style={{ zoom, width: CARD_W }}>
                  <TutorialCard
                    content={steps[step]}
                    style={card}
                    stepKey={step}
                    editable
                    onEdit={updateStep}
                    onMediaPick={() => fileInput.current?.click()}
                    onPrimary={next}
                    onLater={close}
                    onClose={close}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.button
                key="replay"
                type="button"
                onClick={replay}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="relative z-10 flex cursor-pointer items-center gap-2 rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white shadow-lg hover:bg-neutral-800"
                style={{ fontFamily: "var(--font-inter)" }}
              >
                <HugeiconsIcon icon={RefreshIcon} size={16} />
                Replay tour
              </motion.button>
            )}
          </AnimatePresence>
        </div>

        {/* Right: look & backdrop */}
        <Panel side="right" title="Style" hint="Colours for the card and the dimmed backdrop behind it.">
          <Section title="Preset">
            <Segmented label="Preset" options={PRESET_OPTIONS} value={preset} onChange={(id) => setCard(PRESETS[id])} />
          </Section>

          <Section title="Colours">
            <ColorField
              label={card.cardGradient ? "Card (from)" : "Card"}
              value={card.cardColor}
              onChange={(v) => setC("cardColor", v)}
            />
            <Switch label="Gradient" checked={card.cardGradient} onChange={(v) => setC("cardGradient", v)} />
            <Collapse show={card.cardGradient}>
              <div className="space-y-1.5">
                <ColorField label="Card (to)" value={card.cardGradientTo} onChange={(v) => setC("cardGradientTo", v)} />
                <Slider
                  label="Angle"
                  value={card.cardGradientAngle}
                  min={0}
                  max={360}
                  step={5}
                  format={(v) => `${v}°`}
                  onChange={(v) => setC("cardGradientAngle", v)}
                />
              </div>
            </Collapse>
            <ColorField label="Heading" value={card.headingColor} onChange={(v) => setC("headingColor", v)} />
            <ColorField label="Text" value={card.textColor} onChange={(v) => setC("textColor", v)} />
          </Section>

          <Section title="Buttons">
            <ColorField label="Primary" value={card.buttonColor} onChange={(v) => setC("buttonColor", v)} />
            <ColorField label="Primary text" value={card.buttonTextColor} onChange={(v) => setC("buttonTextColor", v)} />
            <ColorField label="Later text" value={card.laterTextColor} onChange={(v) => setC("laterTextColor", v)} />
            <Switch label="Later fill" checked={card.laterFill} onChange={(v) => setC("laterFill", v)} />
            <Collapse show={card.laterFill}>
              <ColorField label="Later fill colour" value={card.laterBgColor} onChange={(v) => setC("laterBgColor", v)} />
            </Collapse>
          </Section>

          <Section title="Backdrop">
            <ColorField label="Tint" value={tint} onChange={setTint} />
            <div className="grid grid-cols-2 gap-1.5">
              <Slider label="Opacity" value={opacity} min={0} max={0.9} step={0.05} format={pct} onChange={setOpacity} />
              <Slider label="Grayscale" value={grayscale} min={0} max={1} step={0.05} format={pct} onChange={setGrayscale} />
            </div>
            <Slider label="Blur" value={blur} min={0} max={12} step={1} format={px} onChange={setBlur} />
          </Section>

          <button
            type="button"
            onClick={replay}
            className="mt-3 flex h-7 w-full shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-[5px] bg-neutral-900 text-[11px] font-medium text-white transition hover:bg-neutral-800 active:scale-[0.99]"
          >
            <HugeiconsIcon icon={RefreshIcon} size={12} />
            {open ? "Restart tour" : "Replay tour"}
          </button>
          <button
            type="button"
            onClick={copySettings}
            className="mb-3 mt-1.5 flex h-7 w-full shrink-0 cursor-pointer items-center justify-center rounded-[5px] bg-[#F2F2F2] text-[11px] font-medium text-neutral-800 transition hover:bg-[#E8E8E8]"
          >
            {copied ? "Copied!" : "Copy settings (JSON)"}
          </button>
        </Panel>
      </div>
    </ControlsDensity>
  );
}

function Collapse({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.25, ease: EASE_OUT }}
          className="overflow-hidden"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A Figma-style panel section: small bold title, controls, hairline divider above. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-1.5 border-t border-neutral-100 py-2.5">
      <h3 className="text-[11px] font-semibold text-neutral-900">{title}</h3>
      {children}
    </section>
  );
}

function Panel({
  side,
  title,
  hint,
  children,
}: {
  side: "left" | "right";
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <motion.aside
      // Children never shrink, so a short window scrolls the panel instead of squashing sections.
      className="flex w-full shrink-0 flex-col overflow-y-auto [&>*]:shrink-0 overflow-x-hidden rounded-2xl bg-white px-3 pt-3 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_16px_40px_-20px_rgba(0,0,0,0.16)] [scrollbar-width:none] md:w-[calc(50%-6px)] lg:w-[256px] [&::-webkit-scrollbar]:hidden"
      style={{ fontFamily: "var(--font-inter)" }}
      initial={{ opacity: 0, x: side === "left" ? -24 : 24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.08, duration: 0.5, ease: EASE_OUT }}
    >
      <div className="pb-3">
        <h2 className="text-[13px] font-semibold text-neutral-900">{title}</h2>
        <p className="mt-0.5 text-[11px] leading-snug text-neutral-500">{hint}</p>
      </div>
      {children}
    </motion.aside>
  );
}
