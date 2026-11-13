"use client";

import { Cancel01Icon, Image01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export const TUTORIAL_CARD_BG = "#20272C";

const VIDEO_EXT = /\.(mp4|webm|ogg|mov|m4v)(\?.*)?$/i;

export type CardContent = {
  title: string;
  description: string;
  /** Image, GIF, SVG or video URL. Videos autoplay muted on loop with no controls. */
  media: string;
  primaryLabel: string;
  laterLabel: string;
  counter: string;
};
export type EditableField = Exclude<keyof CardContent, "media">;

export type CardStyle = {
  cardColor: string;
  /** Linear gradient from cardColor to cardGradientTo at cardGradientAngle (CSS degrees). */
  cardGradient: boolean;
  cardGradientTo: string;
  cardGradientAngle: number;
  headingColor: string;
  textColor: string;
  buttonColor: string;
  buttonTextColor: string;
  laterTextColor: string;
  /** Fill behind "Later"; off leaves it as a ghost button that tints on hover. */
  laterFill: boolean;
  laterBgColor: string;
  /**
   * Inset of the image/video from the card edge (0 = full bleed). Text and buttons follow it
   * but never sit closer than MIN_CONTENT_INSET, and the gaps between sections grow with it.
   */
  padding: number;
  cardRadius: number;
  mediaRadius: number;
  buttonRadius: number;
  showMedia: boolean;
  showHeading: boolean;
  showCounter: boolean;
  showClose: boolean;
  /** Space between the subtext and the footer (counter + buttons), in px. */
  footerGap: number;
  headingPosition: "top" | "above-text";
  /** CSS font-family; empty inherits the app's sans font. */
  fontFamily: string;
  headingSize: number;
  /** Body, counter and button text size; buttons inherit it. */
  textSize: number;
  headingWeight: number;
  textWeight: number;
  buttonWeight: number;
  showArrow: boolean;
  /** Where the pointer sits, as a compass angle from the card's centre (0 = top, 90 = right). */
  arrowAngle: number;
  /** How far the pointer sticks out, in px. */
  arrowSize: number;
};

export const DEFAULT_CARD_CONTENT: CardContent = {
  title: "Workspace switcher",
  description: "Manage workspace settings and change to another workspace easily from the workspace switcher.",
  media: "/petal-pattern.svg",
  primaryLabel: "New section",
  laterLabel: "Later",
  counter: "4 of 4",
};

export const DEFAULT_CARD_STYLE: CardStyle = {
  cardColor: TUTORIAL_CARD_BG,
  headingColor: "#FFFFFF",
  textColor: "#ADB6BE",
  buttonColor: "#019D91",
  buttonTextColor: "#FFFFFF",
  laterTextColor: "#FFFFFF",
  laterFill: false,
  laterBgColor: "#3A444B",
  padding: 16,
  cardRadius: 12,
  mediaRadius: 8,
  buttonRadius: 6,
  showMedia: true,
  showHeading: true,
  showCounter: true,
  showClose: true,
  footerGap: 28,
  headingPosition: "top",
  fontFamily: "",
  headingSize: 18,
  textSize: 16,
  headingWeight: 700,
  textWeight: 400,
  buttonWeight: 500,
  showArrow: true,
  arrowAngle: 270,
  arrowSize: 14,
  cardGradient: false,
  cardGradientTo: "#2E4A52",
  cardGradientAngle: 160,
};

/** Figma's in-product announcement modal, rebuilt from these same controls. */
export const FIGMA_CARD_STYLE: CardStyle = {
  ...DEFAULT_CARD_STYLE,
  cardColor: "#2C2C2C",
  textColor: "#FFFFFF",
  buttonColor: "#0D99FF",
  laterFill: true,
  laterBgColor: "#444444",
  padding: 0,
  cardRadius: 13,
  mediaRadius: 0,
  showCounter: false,
  headingWeight: 600,
  textWeight: 500,
  arrowAngle: 120,
  arrowSize: 10,
};

type TutorialCardProps = {
  content?: Partial<CardContent>;
  style?: Partial<CardStyle>;
  /** Changes on each step so the copy cross-fades. */
  stepKey?: string | number;
  /** Double-click text to edit it, double-click media to replace it. */
  editable?: boolean;
  onEdit?: (field: EditableField, value: string) => void;
  onMediaPick?: () => void;
  onClose?: () => void;
  onLater?: () => void;
  onPrimary?: () => void;
};

function Media({ src }: { src: string }) {
  const className = "h-full w-full object-cover";
  if (VIDEO_EXT.test(src)) {
    return <video src={src} className={className} autoPlay muted loop playsInline />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- arbitrary GIF/SVG sources
  return <img src={src} alt="" className={className} draggable={false} />;
}

/** Text that turns editable on double-click; Enter or blur commits, Escape cancels. */
function EditableText({
  value,
  editable,
  onCommit,
}: {
  value: string;
  editable?: boolean;
  onCommit?: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!editing || !el) return;
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
  }, [editing]);

  return (
    <span
      // Remount on commit so React never reconciles against browser-edited text nodes.
      key={value}
      ref={ref}
      contentEditable={editing}
      suppressContentEditableWarning
      spellCheck={false}
      title={editable && !editing ? "Double-click to edit" : undefined}
      onDoubleClick={(e) => {
        if (!editable) return;
        e.stopPropagation();
        setEditing(true);
      }}
      onClick={(e) => editing && e.stopPropagation()}
      onKeyDown={(e) => {
        if (!editing) return;
        e.stopPropagation();
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          e.currentTarget.blur();
        } else if (e.key === "Escape") {
          e.currentTarget.textContent = value;
          e.currentTarget.blur();
        }
      }}
      onBlur={(e) => {
        setEditing(false);
        const next = e.currentTarget.textContent?.replace(/\s+/g, " ").trim() ?? "";
        if (next && next !== value) onCommit?.(next);
        else e.currentTarget.textContent = value;
      }}
      className={cn(
        "rounded-[3px] outline-none",
        editable && "cursor-text",
        editing && "outline-1 outline-offset-2 outline-white/50 [outline-style:solid]",
      )}
    >
      {value}
    </span>
  );
}

/**
 * A div acting as a button (a <button> can't host editable text). When the card is
 * editable, the action waits a beat so a double-click edits the label instead.
 */
function ActionButton({
  onAction,
  delayed,
  className,
  style,
  children,
}: {
  onAction?: () => void;
  delayed?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={(e) => {
        if (!delayed) return onAction?.();
        window.clearTimeout(timer.current);
        if (e.detail > 1) return;
        timer.current = window.setTimeout(() => onAction?.(), 230);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onAction?.();
        }
      }}
      className={cn("cursor-pointer select-none", className)}
      style={style}
    >
      {children}
    </div>
  );
}

/**
 * Casts a ray from the card's centre at `angle` and returns where it leaves the card,
 * kept clear of the rounded corners, plus which way the pointer should face.
 */
function arrowPlacement(angle: number, w: number, h: number, radius: number, arrowSize: number) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const tx = Math.abs(dx) > 1e-6 ? w / 2 / Math.abs(dx) : Infinity;
  const ty = Math.abs(dy) > 1e-6 ? h / 2 / Math.abs(dy) : Infinity;
  const t = Math.min(tx, ty);
  const inset = radius + arrowSize + 2;
  const clamp = (v: number, max: number) => Math.min(Math.max(v, inset), max - inset);
  if (tx < ty) {
    return { x: dx > 0 ? w : 0, y: clamp(h / 2 + t * dy, h), rotate: dx > 0 ? 90 : 270 };
  }
  return { x: clamp(w / 2 + t * dx, w), y: dy > 0 ? h : 0, rotate: dy > 0 ? 180 : 0 };
}

const MIN_CONTENT_INSET = 16;

/**
 * Colour of a CSS linear-gradient at point (x, y) of a w×h box, so the pointer matches the edge
 * it sits on. Mirrors the spec: the gradient line runs through the centre at `angle` and is long
 * enough that the corners hit 0% and 100%.
 */
function gradientColorAt(from: string, to: string, angle: number, x: number, y: number, w: number, h: number) {
  const a = (angle * Math.PI) / 180;
  const dx = Math.sin(a);
  const dy = -Math.cos(a);
  const len = Math.abs(w * dx) + Math.abs(h * dy);
  const t = Math.min(1, Math.max(0, 0.5 + ((x - w / 2) * dx + (y - h / 2) * dy) / len));
  return `color-mix(in srgb, ${to} ${Math.round(t * 100)}%, ${from})`;
}

export default function TutorialCard({
  content: contentProp,
  style: styleProp,
  stepKey = 0,
  editable,
  onEdit,
  onMediaPick,
  onClose,
  onLater,
  onPrimary,
}: TutorialCardProps) {
  const c = { ...DEFAULT_CARD_CONTENT, ...contentProp };
  // Screen readers get a labelled dialog; reduced-motion users get fades without movement.
  const titleId = useId();
  const descId = useId();
  const reduceMotion = useReducedMotion();
  const s = { ...DEFAULT_CARD_STYLE, ...styleProp };
  const edit = (field: EditableField) => (v: string) => onEdit?.(field, v);

  const cardRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setSize({ w: el.offsetWidth, h: el.offsetHeight }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const arrow = s.showArrow && size ? arrowPlacement(s.arrowAngle, size.w, size.h, s.cardRadius, s.arrowSize) : null;
  const cardBackground = s.cardGradient
    ? `linear-gradient(${s.cardGradientAngle}deg, ${s.cardColor}, ${s.cardGradientTo})`
    : s.cardColor;
  const arrowColor =
    arrow && size && s.cardGradient
      ? gradientColorAt(s.cardColor, s.cardGradientTo, s.cardGradientAngle, arrow.x, arrow.y, size.w, size.h)
      : s.cardColor;

  // With no media there's nothing to sit "above the text", so the heading goes back on top.
  const headingOnTop = s.showHeading && (s.headingPosition === "top" || !s.showMedia);
  const headingAboveText = s.showHeading && !headingOnTop;
  const mediaFirst = s.showMedia && !headingOnTop;

  // Media hugs the edge by `padding`; text and buttons keep a readable minimum.
  const inset = Math.max(s.padding, MIN_CONTENT_INSET);
  const insetY = inset + 4;
  const gap = inset;

  const closeButton = (floating: boolean) => (
    <button
      type="button"
      onClick={onClose}
      aria-label="Close"
      className={cn(
        "shrink-0 rounded-md p-1 transition-colors",
        floating
          ? "absolute z-10 bg-black/35 text-white backdrop-blur-sm hover:bg-black/50"
          : "opacity-70 hover:bg-white/10 hover:opacity-100",
      )}
      style={
        floating
          ? { top: (mediaFirst ? s.padding : insetY) + 8, right: (mediaFirst ? s.padding : inset) + 8 }
          : { color: s.headingColor }
      }
    >
      <HugeiconsIcon icon={Cancel01Icon} size={20} />
    </button>
  );

  const heading = (
    <h2
      id={titleId}
      className="leading-tight"
      style={{ color: s.headingColor, fontWeight: s.headingWeight, fontSize: s.headingSize }}
    >
      <EditableText value={c.title} editable={editable} onCommit={edit("title")} />
    </h2>
  );

  return (
    <div className="relative w-[500px] max-w-full">
      {arrow && (
        // A square centred on the edge whose outer half is the triangle, turned to face out.
        <span
          aria-hidden
          className="pointer-events-none absolute"
          style={{
            width: s.arrowSize * 2,
            height: s.arrowSize * 2,
            left: arrow.x - s.arrowSize,
            top: arrow.y - s.arrowSize,
            background: arrowColor,
            // The base runs a few px under the card so no hairline shows at the seam when zoomed.
            clipPath: "polygon(50% 0, 100% 50%, 100% 70%, 0 70%, 0 50%)",
            transform: `rotate(${arrow.rotate}deg)`,
          }}
        />
      )}
      <div
        ref={cardRef}
        role="dialog"
        aria-labelledby={s.showHeading ? titleId : undefined}
        aria-label={s.showHeading ? undefined : c.title}
        aria-describedby={descId}
        className="relative flex w-full flex-col overflow-hidden font-sans"
        style={{
          background: cardBackground,
          borderRadius: s.cardRadius,
          fontFamily: s.fontFamily || undefined,
          fontSize: s.textSize,
          paddingTop: mediaFirst ? s.padding : insetY,
          paddingBottom: insetY,
        }}
      >
        {headingOnTop ? (
          <div
            className="flex items-center justify-between gap-3"
            style={{ paddingLeft: inset, paddingRight: inset, paddingBottom: s.showMedia ? gap : 0 }}
          >
            {heading}
            {s.showClose && closeButton(false)}
          </div>
        ) : (
          s.showClose && closeButton(true)
        )}

        <AnimatePresence initial={false}>
          {s.showMedia && (
            <motion.div
              key="media"
              className="shrink-0 overflow-hidden"
              style={{ paddingLeft: s.padding, paddingRight: s.padding }}
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Keeps the original 468×350 shape at full size and scales down on small screens */}
              <div
                className="relative aspect-[468/350] w-full overflow-hidden"
                style={{ borderRadius: s.mediaRadius }}
                onDoubleClick={editable ? onMediaPick : undefined}
              >
                <AnimatePresence initial={false}>
                  <motion.div
                    key={c.media}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: reduceMotion ? 1 : 1.04 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <Media src={c.media} />
                  </motion.div>
                </AnimatePresence>
                {editable && (
                  <div className="group absolute inset-0 grid cursor-pointer place-items-center">
                    <span className="flex items-center gap-1.5 rounded-full bg-black/55 px-3 py-1.5 text-[13px] font-medium text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
                      <HugeiconsIcon icon={Image01Icon} size={16} />
                      Double-click to replace
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stepKey}
            initial={{ opacity: 0, y: reduceMotion ? 0 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduceMotion ? 0 : -4 }}
            transition={{ duration: 0.2 }}
            style={{
              paddingLeft: inset,
              paddingTop: s.showMedia || headingOnTop ? gap : 0,
              // Leave room for the floating close button when nothing else sits beside it.
              paddingRight: s.showClose && !headingOnTop && !s.showMedia ? inset + 32 : inset,
            }}
          >
            {headingAboveText && <div className="pb-2.5">{heading}</div>}
            <p id={descId} className="leading-[1.75]" style={{ color: s.textColor, fontWeight: s.textWeight }}>
              <EditableText value={c.description} editable={editable} onCommit={edit("description")} />
            </p>
          </motion.div>
        </AnimatePresence>

        <div
          className={cn("flex items-center gap-3", s.showCounter ? "justify-between" : "justify-end")}
          style={{ paddingLeft: inset, paddingRight: inset, paddingTop: s.footerGap }}
        >
          {s.showCounter && (
            <span aria-live="polite" className="leading-[1.75]" style={{ color: s.textColor, fontWeight: s.textWeight }}>
              <EditableText value={c.counter} editable={editable} onCommit={edit("counter")} />
            </span>
          )}
          <div className="flex gap-2">
            <ActionButton
              onAction={onLater}
              delayed={editable}
              className={cn(
                "px-3 py-1",
                s.laterFill ? "transition-[filter] hover:brightness-110" : "transition-colors hover:bg-[var(--later-hover)]",
              )}
              style={
                {
                  color: s.laterTextColor,
                  fontWeight: s.buttonWeight,
                  borderRadius: s.buttonRadius,
                  background: s.laterFill ? s.laterBgColor : undefined,
                  "--later-hover": `color-mix(in srgb, ${s.cardColor}, white 9%)`,
                } as React.CSSProperties
              }
            >
              <EditableText value={c.laterLabel} editable={editable} onCommit={edit("laterLabel")} />
            </ActionButton>
            <ActionButton
              onAction={onPrimary}
              delayed={editable}
              className="px-3 py-1 transition-[filter] hover:brightness-90"
              style={{
                background: s.buttonColor,
                color: s.buttonTextColor,
                borderRadius: s.buttonRadius,
                fontWeight: s.buttonWeight,
              }}
            >
              <EditableText value={c.primaryLabel} editable={editable} onCommit={edit("primaryLabel")} />
            </ActionButton>
          </div>
        </div>
      </div>
    </div>
  );
}
