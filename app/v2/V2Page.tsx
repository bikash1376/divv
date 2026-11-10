"use client";
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import { motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { ProjectIconLink } from "@/components/Projects";
import Experience from "@/components/Experience";

// Second take on the home page: the intro sits still on the left (40%), and the work
// scrolls past it on the right (60%) — live embeds where the thing is interactive,
// screenshots and video where it isn't.

const CONTACT_HREF = "https://x.com/bikash1376";
const HERO_IMAGE = "https://images.pexels.com/photos/6984997/pexels-photo-6984997.jpeg";

// Embed-only routes on the projects' own sites (no nav or footer).
const IOTA_DESIGN = "https://design.useiota.space";
const ZINEPS = "https://zineps-redesign.vercel.app";
const ZINEPS_FIGMA = "https://www.figma.com/design/fTsiVGTDlj6qwHdnvWcuUP/Untitled?node-id=0-1&t=TKFEvHDkLLuzVeVX-1";
const PETALS_WONDER =
  "https://app.wonder.so/bikash/files/01a12ad4-3b78-780e-8fcc-04802839a717/branches/main/pages/01a12ad4-3b7a-7d3a-af74-c6eadef29a3e";
const STUDYDECK_WONDER =
  "https://app.wonder.so/bikash/files/01a16965-4045-7e0b-ba58-657d1036fb91/branches/main/pages/01a16965-4048-780c-8ed9-391a1e8b42ab";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

// ---- left: the intro ----

const Intro = () => {
  const link = "font-medium transition-colors hover:text-neutral-500";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: EASE_OUT }}
      className="text-base leading-normal text-neutral-800"
    >
      <Image src={HERO_IMAGE} width={40} height={40} alt="" className="mb-4 size-10 rounded-lg object-cover" />
      <p>
        Designer &amp; developer crafting interfaces for small teams, and{" "}
        <a href="#work" className={`text-[#A1A1A1] ${link}`}>
          tinkering on side projects
        </a>
        .
      </p>
      <p className="mt-3">
        Reach out at{" "}
        <a href="mailto:bikash13763@gmail.com" className={`text-neutral-950 ${link}`}>
          bikash13763@gmail.com
        </a>{" "}
        — I&apos;m open to work.
      </p>

      <div className="mt-12 flex flex-wrap gap-3">
        <a
          href={CONTACT_HREF}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-3 text-base text-white transition-all hover:bg-neutral-700 active:scale-96"
        >
          get in touch
          <HugeiconsIcon icon={ArrowUpRight01Icon} size={18} strokeWidth={2} />
        </a>
        <button
          type="button"
          // past all the cards, to the experience list at the end
          onClick={() => document.getElementById("experience")?.scrollIntoView({ behavior: "smooth" })}
          className="cursor-pointer rounded-xl bg-[#F2F2F2] px-5 py-3 text-base text-neutral-800 transition-all hover:bg-[#EAEAEA] active:scale-96"
        >
          See more
        </button>
      </div>
    </motion.div>
  );
};

// ---- right: the work ----

type Links = { href?: string; figma?: string; framer?: string; wonder?: string };

// Same title line as the Projects list (name + arrow for the live link, then source
// chips), laid over the bottom of the card on a white fade so it reads on any artwork.
// Shows on card hover (always on touch screens, which can't hover). The fade lets
// clicks through to the embed underneath; only the links catch them.
const Caption = ({ name, links }: { name: string; links: Links }) => (
  <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex flex-wrap items-center gap-x-1 gap-y-2 bg-linear-to-t from-white via-white/80 to-transparent px-4 pt-12 pb-3 text-base transition-all duration-300 ease-out [@media(hover:hover)]:translate-y-2 [@media(hover:hover)]:opacity-0 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100">
    <a
      href={links.href}
      target="_blank"
      rel="noreferrer"
      className="pointer-events-auto flex items-center gap-1 text-neutral-800 transition-colors hover:text-neutral-500"
    >
      {name}
      <HugeiconsIcon
        icon={ArrowUpRight01Icon}
        size={16}
        strokeWidth={2}
        className="text-neutral-400 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-800"
      />
    </a>
    {(links.figma || links.framer || links.wonder) && (
      <span className="pointer-events-auto ml-2 flex items-center gap-1.5">
        {links.figma && (
          <ProjectIconLink
            href={links.figma}
            logo={{ src: "/figma-logo.svg", width: 10, height: 15 }}
            label={`${name} — Figma file`}
            text="Figma"
          />
        )}
        {links.framer && (
          <ProjectIconLink
            href={links.framer}
            logo={{ src: "/framer-logo.svg", width: 10, height: 15 }}
            label={`${name} — Framer template`}
            text="Framer"
          />
        )}
        {links.wonder && (
          <ProjectIconLink
            href={links.wonder}
            logo={{ src: "/wonder-logo-icon.png", width: 15, height: 15, blend: true }}
            label={`${name} — Wonder file`}
            text="Wonder"
          />
        )}
      </span>
    )}
  </figcaption>
);

// A card in the work column; `links` adds the title line over its top edge.
const Piece = ({ name, links, children }: { name: string; links?: Links; children: ReactNode }) => (
  <motion.figure
    aria-label={name}
    initial={{ opacity: 0, y: 24 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-10% 0px" }}
    transition={{ duration: 0.7, ease: EASE_OUT }}
    className="group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-[0_1px_2px_rgb(0_0_0/0.04)]"
  >
    {children}
    {links && <Caption name={name} links={links} />}
  </motion.figure>
);

// Embeds on our own sites report their content height, so the frame fits without
// scrolling inside itself.
const useEmbedHeight = (origin: string, id: string, fallback: number) => {
  const [height, setHeight] = useState(fallback);
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== origin || e.data?.type !== "embed-height" || e.data.id !== id) return;
      if (typeof e.data.height === "number") setHeight(Math.ceil(e.data.height));
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin, id]);
  return height;
};

// Width the framed sites lay out at, so they show their desktop layout (matching the
// screenshots) instead of the tablet one the column's width would give them.
const DESKTOP = 1440;

// Renders the page at DESKTOP px wide and scales it down to the column. `height` is the
// frame's height at desktop width; it's still fully interactive (clicks map through the scale).
const Frame = ({ src, title, height }: { src: string; title: string; height: number }) => {
  const [box, setBox] = useState<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(0.55);
  useEffect(() => {
    if (!box) return;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / DESKTOP));
    ro.observe(box);
    return () => ro.disconnect();
  }, [box]);

  return (
    <div ref={setBox} className="relative overflow-hidden bg-white" style={{ height: height * scale }}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        // the frame is the page section, not a window into a page
        scrolling="no"
        className="absolute top-0 left-0 block origin-top-left border-0 bg-white"
        style={{ width: DESKTOP, height, transform: `scale(${scale})` }}
      />
    </div>
  );
};

const Shot = ({ src, alt, width, height }: { src: string; alt: string; width: number; height: number }) => (
  <Image src={src} alt={alt} width={width} height={height} sizes="(min-width: 768px) 60vw, 100vw" className="h-auto w-full" />
);

// Short looping screen recordings: silent, inline, no controls.
const Clip = ({ src }: { src: string }) => (
  <video src={src} autoPlay muted loop playsInline preload="metadata" className="block h-auto w-full" />
);

const Work = () => {
  const zinepsBento = useEmbedHeight(ZINEPS, "zineps-bento", 1200);

  return (
    <div id="work" className="flex flex-col gap-5 scroll-mt-6">
      <Piece name="iOTA Design">
        <div className="h-[560px] bg-[#FBFBFB] p-2">
          <iframe
            src={`${IOTA_DESIGN}/embed`}
            title="iOTA component canvas"
            loading="lazy"
            className="block size-full rounded-xl border-0"
          />
        </div>
      </Piece>

      <Piece name="iota">
        <Shot src="/v2/useiota.png" alt="useiota.space home page" width={2880} height={1800} />
      </Piece>

      <Piece name="Zineps (redesign)" links={{ href: ZINEPS, figma: ZINEPS_FIGMA }}>
        <Shot src="/v2/zineps-hero.png" alt="Zineps landing page hero" width={1906} height={1078} />
      </Piece>

      <Piece name="Zineps — bento">
        <Frame src={`${ZINEPS}/embed/bento`} title="Zineps bento" height={zinepsBento} />
      </Piece>

      <Piece name="Grid">
        <Clip src="/v2/grid.mp4" />
      </Piece>

      <Piece name="Petals" links={{ href: "https://petalsapp.vercel.app", wonder: PETALS_WONDER }}>
        <video
          src="/v2/petals-redesign.mp4"
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="block h-auto w-full"
        />
      </Piece>

      <Piece
        name="Cirrus"
        links={{ href: "https://cirrus.framer.website/", framer: "https://www.framer.com/marketplace/templates/cirrus/" }}
      >
        <Frame src="https://cirrus.framer.website/" title="Cirrus Framer template" height={900} />
      </Piece>

      <Piece name="StudyDeck" links={{ href: STUDYDECK_WONDER, wonder: STUDYDECK_WONDER }}>
        <Shot src="/projects/study-deck.jpg" alt="StudyDeck app" width={1200} height={750} />
      </Piece>

      <Piece name="Loaders grid">
        <Clip src="/v2/loaders-grid.mp4" />
      </Piece>

      <Piece name="RevPDF" links={{ href: "https://revpdf.in" }}>
        <Shot src="/v2/revpdf.png" alt="revpdf.in home page" width={2880} height={1800} />
      </Piece>

      <Piece name="Trition" links={{ href: "https://trition.vercel.app" }}>
        {/* the app window on a soft wallpaper, running off the card's right and bottom edges */}
        <div
          className="relative aspect-video overflow-hidden"
          style={{
            background:
              "radial-gradient(60% 70% at 15% 20%, #ffd6e8 0%, transparent 70%), radial-gradient(55% 65% at 85% 30%, #e3d9ff 0%, transparent 70%), radial-gradient(70% 60% at 50% 100%, #ffc9a8 0%, transparent 70%), #fbeef3",
          }}
        >
          <div className="absolute top-[12%] -right-[20%] bottom-0 left-[8%] overflow-hidden rounded-tl-[14px] bg-white shadow-[0_24px_60px_-12px_rgb(120_40_80/0.25),0_0_0_1px_rgb(255_255_255/0.6)]">
            <Image
              src="/v2/trition-ui.png"
              alt="Trition workspace"
              width={1956}
              height={834}
              sizes="(min-width: 768px) 72vw, 120vw"
              className="size-full object-cover object-left-top"
            />
          </div>
        </div>
      </Piece>

      <Piece name="OddlyAI">
        <Shot src="/projects/oddlyai.webp" alt="OddlyAI landing page" width={1280} height={720} />
      </Piece>

      <Piece name="Copy SVG">
        <Clip src="/v2/copy-svg.mp4" />
      </Piece>

      <Piece name="Brief.ai — field note">
        <Shot src="/v2/brief-notes.png" alt="Brief.ai field note and how-it-works section" width={1891} height={1078} />
      </Piece>

      <Piece name="Avii — Hiko">
        <Shot src="/v2/avii.png" alt="Avii portfolio, Hiko project page" width={1920} height={1200} />
      </Piece>

      <Piece name="Brief.ai">
        <Shot src="/v2/brief-hero.png" alt="Brief.ai landing page hero" width={1890} height={1075} />
      </Piece>

      <Piece name="Prepara" links={{ href: "https://prepara.useiota.space" }}>
        <Shot src="/v2/prepara-hero.png" alt="Prepara landing page hero" width={2880} height={1800} />
      </Piece>

      <Piece name="Prepara — closing call to action">
        <Shot src="/v2/prepara-cta.png" alt="Prepara: Your best score is still ahead" width={2880} height={1301} />
      </Piece>

      {/* sign-off: the animated petal pattern (its SMIL animation runs inside <img>) */}
      <Piece name="Petals pattern">
        <Image
          src="/v2/petal-pattern.svg"
          alt=""
          width={736}
          height={342}
          unoptimized
          className="block h-auto w-full"
        />
      </Piece>
    </div>
  );
};

const V2Page = () => (
  <div className="min-h-svh bg-[#FBFBFB] tracking-tight" style={{ fontFamily: "var(--font-inter)" }}>
    <div className="md:flex">
      {/* stays put while the work scrolls beside it */}
      <aside className="flex px-6 pb-12 pt-24 md:sticky md:top-0 md:h-svh md:w-2/5 md:items-center md:px-12 md:py-0 lg:px-16">
        <div className="max-w-md">
          <Intro />
        </div>
      </aside>
      <main className="px-4 pb-10 md:w-3/5 md:py-12 md:pr-12 md:pl-0">
        <Work />
      </main>
    </div>

    {/* once the work has scrolled past, the same experience list as the home page, centred */}
    <div id="experience" className="pt-16">
      <Experience />
    </div>
  </div>
);

export default V2Page;
