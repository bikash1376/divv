"use client"
import Image from "next/image";
import React, { useCallback, useRef, useState } from "react";
import { motion } from "motion/react";
import Projects from "@/components/Projects";
import Craft from "@/components/Craft";
import { ExperienceList } from "@/components/Experience";
import { LogoLink } from "@/components/IntroLinks";

// Layout and type follow madebyadi.cc: Geist 14/18, one 470px column, 30px
// between every block, 12px meta text.
const COLUMN = 470;
const GAP = 30;

// Adi's palette: near-black text, faded tints of it, three link accents
const FG = "#9A717A";
const FG_40 = "rgb(29 29 29 / 0.4)";
const BLUE = "#417dff";
const PETALS = "#e063bb"; // the Petals mark's pink

const X_HREF = "https://x.com/bikash1376";
const GITHUB_HREF = "https://github.com/bikash1376";
const EMAIL = "bikash13763@gmail.com";

const UPDATED = "Updated November 2026";

// Links read as the surrounding text with a fine dashed rule under it (drawn as
// a background, since text-decoration dashes can't be made thinner or shorter)
const DASHED_CLASS = "bg-[length:100%_1px] bg-bottom bg-repeat-x pb-[3px] transition-colors duration-200 hover:text-[#AAAAAF]";
const DASHED_STYLE: React.CSSProperties = {
  backgroundImage:
    "repeating-linear-gradient(to right, currentColor 0 2px, transparent 2px 4px)",
};

const Accent = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <a
    href={href}
    {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
    className={DASHED_CLASS}
    style={DASHED_STYLE}
  >
    {children}
  </a>
);

// ---- Side showcase: two walls of tilted, slowly drifting screenshots ----

// screenshots of the projects listed on bikash.useiota.space
const SHOWCASE_IMAGES = [
  "/projects/zineps.jpg",
  "/projects/iota.jpg",
  "/projects/prepara.jpg",
  "/projects/study-deck.jpg",
  "/projects/trition.jpg",
  "/projects/revpdf.jpg",
  "/projects/components.jpg",
];
// how much of each side of the screen a wall covers (vw)
const SHOWCASE_WIDTH = 38;
const SHOWCASE_TILT = 24;
const EASE_OUT_CSS = "cubic-bezier(0.22, 1, 0.36, 1)";
const SHOWCASE_OPACITY = 0.4;

// One endlessly scrolling column. The list is rendered twice and moved by -50%,
// so when it loops the second copy sits exactly where the first one started.
// (Spacing is mb-* on each item, not gap, so both halves are the same height.)
// The drift is a CSS animation (runs on the compositor, not the JS thread) and
// is paused while the wall is hidden.
const ShowcaseColumn = ({ shift, reverse, duration }: { shift: number; reverse?: boolean; duration: number }) => {
  const images = SHOWCASE_IMAGES.map((_, i) => SHOWCASE_IMAGES[(i + shift) % SHOWCASE_IMAGES.length]);
  return (
    <div
      className="flex flex-col will-change-transform [animation-play-state:var(--drift-state)]"
      style={{ animation: `${reverse ? "drift-down" : "drift-up"} ${duration}s linear infinite` }}
    >
      {[...images, ...images].map((src, i) => (
        <div key={i} className="mb-6 rounded-xl border border-[rgb(29_29_29/0.1)] bg-white p-1.5 shadow-sm">
          <Image
            src={src}
            width={256}
            height={160}
            alt=""
            draggable="false"
            // loaded up front, so nothing decodes mid-fade on the first hover
            loading="eager"
            className="h-40 w-64 rounded-lg object-cover"
          />
        </div>
      ))}
    </div>
  );
};

const ShowcaseWall = ({ side }: { side: "left" | "right" }) => (
  <div
    className="absolute inset-y-0 overflow-hidden"
    style={{
      [side]: 0,
      width: `${SHOWCASE_WIDTH}vw`,
      // fade the wall out towards the text in the middle
      maskImage: `linear-gradient(to ${side === "left" ? "right" : "left"}, black 35%, transparent)`,
    }}
  >
    {/* oversized so the tilted columns still cover the corners */}
    <div
      className="absolute -inset-1/2 flex items-center justify-center gap-6"
      style={{ transform: `rotate(${SHOWCASE_TILT}deg)` }}
    >
      {/* neighbouring columns drift in opposite directions at slightly different speeds */}
      <ShowcaseColumn shift={side === "left" ? 0 : 3} duration={40} />
      <ShowcaseColumn shift={side === "left" ? 2 : 5} duration={48} reverse />
      <ShowcaseColumn shift={side === "left" ? 4 : 1} duration={44} />
    </div>
  </div>
);

// Always mounted: hovering only fades its opacity (cheap), instead of mounting
// ~80 images and scaling a full-screen masked layer. Once faded out it's
// hidden and its drift paused, so it costs nothing while you read.
const Showcase = ({ show }: { show: boolean }) => (
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 z-0 overflow-hidden will-change-[opacity]"
    style={
      {
        opacity: show ? SHOWCASE_OPACITY : 0,
        visibility: show ? "visible" : "hidden",
        // fade in at once; on the way out, hide only after the fade finishes
        transition: show
          ? `opacity 0.6s ${EASE_OUT_CSS}, visibility 0s`
          : `opacity 0.45s ${EASE_OUT_CSS}, visibility 0s 0.45s`,
        "--drift-state": show ? "running" : "paused",
      } as React.CSSProperties
    }
  >
    <ShowcaseWall side="left" />
    <ShowcaseWall side="right" />
  </div>
);

const TABS = ["Projects", "Craft", "Experience"] as const;
type Tab = (typeof TABS)[number];
const TAB_W = 100;
// sticky bar is ~60px tall: a new panel starts just under it
const SCROLL_MARGIN = 72;

// Segmented control: a raised thumb slides under the selected tab
const Tabs = ({ tab, onChange }: { tab: Tab; onChange: (t: Tab) => void }) => (
  <div role="tablist" className="relative inline-flex rounded-[10px] bg-[#f5f5f5] p-0.5">
    <span
      aria-hidden
      className="absolute left-0.5 top-0.5 h-7 rounded-lg bg-[#fcfbfc] shadow-[inset_0_0_1px_#00000040] transition-transform duration-[340ms] ease-[cubic-bezier(.16,1,.3,1)]"
      style={{ width: TAB_W, transform: `translateX(${TABS.indexOf(tab) * TAB_W}px)` }}
    />
    {TABS.map((t) => (
      <button
        key={t}
        type="button"
        role="tab"
        aria-selected={tab === t}
        onClick={() => onChange(t)}
        className="relative h-7 cursor-pointer whitespace-nowrap rounded-lg text-xs leading-4 transition-colors hover:text-[rgb(29_29_29)]"
        style={{ width: TAB_W, color: tab === t ? FG : "rgb(29 29 29 / 0.5)" }}
      >
        {t}
      </button>
    ))}
  </div>
);

const HomePage = () => {
  const [tab, setTab] = useState<Tab>("Projects");
  const [showcase, setShowcase] = useState(false);
  const panel = useRef<HTMLElement>(null);
  // Show tab `t`. If the tabs are stuck at the top, jump back to the start of the
  // panel so the new one is read from its first line.
  // `reveal` (from the intro links) glides down to the panel; switching tabs only
  // jumps back up when you're already scrolled past the panel's start
  const goTo = useCallback((t: Tab, reveal = false) => {
    setTab(t);
    setShowcase(false);
    const el = panel.current;
    if (!el) return;
    const start = el.getBoundingClientRect().top + window.scrollY - SCROLL_MARGIN;
    if (reveal) window.scrollTo({ top: start, behavior: "smooth" });
    else if (window.scrollY > start) window.scrollTo({ top: start, behavior: "instant" });
  }, []);

  return (
    <div
      className="min-h-svh bg-[#fcfbfc] antialiased"
      style={{ color: FG, fontFamily: "var(--font-geist-sans), system-ui, sans-serif", fontSize: 14, lineHeight: "20px" }}
    >
      <Showcase show={showcase} />
      <main
        className="relative z-10 mx-auto flex w-full flex-col px-5 pb-24 pt-8 md:pt-20 sm:pb-[150px]"
        style={{ maxWidth: COLUMN + 40, gap: GAP }}
      >
        <header className="flex h-[61px] items-start justify-between">
          <div className="size-[61px] overflow-hidden rounded-[10px] bg-[#f5f5f5]">
            <Image src="/loader/pfp.jpg" alt="Bikash" width={122} height={122} priority className="size-full object-cover" />
          </div>
          <p className="self-end whitespace-nowrap text-xs leading-4 tabular-nums" style={{ color: FG_40 }}>
            {UPDATED}
          </p>
        </header>

        <p>
          I&rsquo;m Bikash, a design engineer{" "}
          <a
            href="#craft"
            onClick={(e) => {
              e.preventDefault();
              goTo("Craft", true);
            }}
            className={DASHED_CLASS}
            style={DASHED_STYLE}
          >
            crafting interfaces
          </a>{" "}
          for small teams, and{" "}
          {/* hover shows the drifting walls of project shots; click opens the Projects tab */}
          <a
            href="#projects"
            onMouseEnter={() => setShowcase(true)}
            onMouseLeave={() => setShowcase(false)}
            onClick={(e) => {
              e.preventDefault();
              goTo("Projects", true);
            }}
            className={DASHED_CLASS}
            style={DASHED_STYLE}
          >
            tinkering on side projects
          </a>
          .
        </p>

        <p>
          I care about interfaces that feel alive — the micro-interactions, the motion, and the small details you only
          notice once they&rsquo;re gone.
        </p>

        <p>
          Lately I&rsquo;m building{" "}
          <LogoLink href="https://useiota.space" logo="/iota-icon.png" text="iOTA" color={BLUE} />, a collection of small web animation
          tools, and designing{" "}
          <LogoLink href="https://petalsapp.vercel.app" logo="/petals-mark.svg" text="Petals" color={PETALS} />, a
          local-first design tool in the browser.
        </p>

        <p>
          I&rsquo;m open to work, full-time or freelance. Find me on{" "}
          <Accent href={X_HREF}>X (Twitter)</Accent> and <Accent href={GITHUB_HREF}>GitHub</Accent>,
          or email me at{" "}
          <Accent href={`mailto:${EMAIL}`}>
            {EMAIL}
          </Accent>
        </p>

        {/* sticks to the top while the panel scrolls under it */}
        <div
          className="sticky top-0 z-20 -mx-5 px-5 pb-4 pt-3"
          style={{ background: "linear-gradient(#fcfbfc 75%, rgb(252 251 252 / 0))" }}
        >
          <Tabs tab={tab} onChange={goTo} />
        </div>

        <section
          ref={panel}
          id={tab.toLowerCase()}
          role="tabpanel"
          aria-label={tab}
          className="-mt-4"
          style={{ scrollMarginTop: SCROLL_MARGIN }}
        >
          {/* keyed so each switch springs the new panel in */}
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              y: { type: "spring", stiffness: 260, damping: 20, mass: 0.9 },
              opacity: { duration: 0.25, ease: "easeOut" },
            }}
          >
            {tab === "Projects" ? <Projects /> : tab === "Craft" ? <Craft /> : <ExperienceList />}
          </motion.div>
        </section>
      </main>
    </div>
  );
};

export default HomePage;
