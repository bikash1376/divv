"use client"
import Image from "next/image";
import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import MediaShelf, { type Shot } from "@/components/MediaShelf";

// Selected projects; thumbnails live in /public/projects, bigger shots and clips in /public/v2.
// `figma` / `framer` / `wonder` add a link to the source file next to the live one.
// `media` is what the row shows, left to right, when it's opened.
type Project = {
  name: string;
  kind: string;
  description: string;
  image: string;
  media: string[];
  href: string;
  figma?: string;
  framer?: string;
  wonder?: string;
};

const PROJECTS: Project[] = [
  {
    name: "iota",
    kind: "Tool · WIP",
    media: ["/projects/videos/iota-walkthrough.mp4", "/v2/useiota.png"],
    description: "A collection of small web animation tools. Draw, tweak, and export SVG animations. (WIP)",
    image: "/projects/iota.jpg",
    href: "https://useiota.space",
  },
  {
    name: "Zineps (redesign)",
    kind: "Redesign",
    media: ["/v2/zineps-hero.png", "/projects/shots/zineps-bento.webp"],
    description: "Redesign of the Zineps logistics platform: landing page and dashboard, from Figma to code.",
    image: "/projects/zineps.jpg",
    href: "https://zineps-redesign.vercel.app/",
    figma:
      "https://www.figma.com/design/fTsiVGTDlj6qwHdnvWcuUP/Untitled?node-id=0-1&t=TKFEvHDkLLuzVeVX-1",
  },
  {
    name: "Petals",
    kind: "Design tool · WIP",
    media: ["/projects/videos/petals-projects.mp4", "/v2/petals-redesign.mp4", "/v2/petal-pattern.svg"],
    description:
      "Browser-based design tool with a canvas, frames, layers and a full inspector — local-first, nothing leaves the device. (WIP)",
    image: "/projects/petals.webp",
    href: "https://petalsapp.vercel.app",
    wonder:
      "https://app.wonder.so/bikash/files/01a12ad4-3b78-780e-8fcc-04802839a717/branches/main/pages/01a12ad4-3b7a-7d3a-af74-c6eadef29a3e",
  },
  {
    name: "iOTA Design",
    kind: "Agent kit",
    media: ["/projects/iota-design.webp"],
    description:
      "Give your agent taste: one prompt installs 65 components and the rules that go with them into your coding agent.",
    image: "/projects/iota-design.webp",
    href: "https://design.useiota.space",
  },
  {
    name: "Cirrus",
    kind: "Framer template",
    media: [1, 2, 3, 4].map((i) => `/projects/shots/cirrus-${i}.webp`),
    description: "An animated Framer template for agencies — bold type, fluid motion and a premium, editorial layout.",
    image: "/projects/cirrus.webp",
    href: "https://cirrus.framer.website/",
    framer: "https://www.framer.com/marketplace/templates/cirrus/",
  },
  {
    name: "StudyDeck",
    kind: "Concept",
    media: ["/projects/study-deck.jpg"],
    description:
      "AI study app that turns any topic, PDF or photo of your notes into flashcards and quizzes that remember what you got wrong.",
    image: "/projects/study-deck.jpg",
    // no live build yet — the Wonder file is the project
    href: "https://app.wonder.so/bikash/files/01a16965-4045-7e0b-ba58-657d1036fb91/branches/main/pages/01a16965-4048-780c-8ed9-391a1e8b42ab",
    wonder:
      "https://app.wonder.so/bikash/files/01a16965-4045-7e0b-ba58-657d1036fb91/branches/main/pages/01a16965-4048-780c-8ed9-391a1e8b42ab",
  },
  {
    name: "Trition",
    kind: "Workspace",
    media: ["/v2/trition-ui.png", "/projects/trition.jpg"],
    description:
      "A Notion-like workspace that stores every page, block and table directly in your Trello boards — no separate database.",
    image: "/projects/trition.jpg",
    href: "https://trition.vercel.app",
  },
  {
    name: "RevPDF",
    kind: "Reader",
    media: ["/v2/revpdf.png", "/projects/revpdf.jpg"],
    description: "Local PDF, EPUB, DOC and DOCX reader with Chrome-style selection search.",
    image: "/projects/revpdf.jpg",
    href: "https://revpdf.in",
  },
  {
    name: "Prepara",
    kind: "Landing page",
    media: [1, 2, 3, 4, 5].map((i) => `/projects/shots/prepara-${i}.webp`),
    description: "Landing page for an exam-prep app — a calm hero, clear plans and a closing call to action.",
    image: "/projects/prepara.jpg",
    href: "https://prepara.useiota.space",
  },
  {
    name: "Dotfolio",
    kind: "Framer template",
    media: [1, 2, 3].map((i) => `/projects/shots/dotfolio-${i}.webp`),
    description: "Minimal, dot-matrix portfolio for developers — a free Framer template.",
    image: "/projects/dotfolio.webp",
    href: "https://satisfied-fact-878900.framer.app/",
    framer: "https://www.framer.com/marketplace/templates/dotfolio/",
  },
];

// Logo chip in the project's title line: icon-only in the resting row, then the
// source name slides out when the row is hovered. The SVGs carry their own colour.
export const ProjectIconLink = ({
  href,
  logo,
  label,
  text,
}: {
  href: string;
  logo: { src: string; width: number; height: number; blend?: boolean };
  label: string;
  text: string;
}) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    aria-label={label}
    title={label}
    className="relative z-10 flex shrink-0 items-center overflow-hidden rounded-lg bg-[#F2F2F2] px-1.5 py-1 transition-colors hover:bg-[#EAEAEA] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
  >
    <Image
      src={logo.src}
      alt=""
      width={logo.width}
      height={logo.height}
      unoptimized
      className={`shrink-0 object-contain ${logo.blend ? "mix-blend-multiply" : ""}`}
      style={{ width: logo.width, height: logo.height }}
    />
    <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm leading-none text-neutral-700 opacity-0 transition-all duration-300 ease-out group-hover:ml-1.5 group-hover:max-w-20 group-hover:opacity-100">
      {text}
    </span>
  </a>
);

// every project's shots in list order, so the viewer can run on from one project into the next
const ALL_SHOTS: Shot[] = PROJECTS.flatMap((p) => p.media.map((src) => ({ src, project: p.name })));

const FG_40 = "rgb(29 29 29 / 0.4)";
const FG_50 = "rgb(29 29 29 / 0.5)";
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

const SOURCES = [
  { key: "figma", text: "Figma", logo: { src: "/figma-logo.svg", width: 8, height: 12 } },
  { key: "framer", text: "Framer", logo: { src: "/framer-logo.svg", width: 8, height: 12 } },
  { key: "wonder", text: "Wonder", logo: { src: "/wonder-logo-icon.png", width: 12, height: 12, blend: true } },
] as const;

// Pill link: soft grey chip with a small mark on the left, like a swatch chip
const Chip = ({ href, icon, children }: { href: string; icon: React.ReactNode; children: React.ReactNode }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer"
    className="inline-flex h-7 items-center gap-1.5 rounded-full bg-[#F2F2F2] pl-2 pr-3 text-[13px] leading-none transition-colors hover:bg-[#E9E9E9] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400"
  >
    <span aria-hidden className="grid size-3.5 shrink-0 place-items-center">
      {icon}
    </span>
    {children}
  </a>
);

// globe mark for the live site
const VisitIcon = () => (
  <svg viewBox="0 0 16 16" width={14} height={14} fill="none" stroke="currentColor" strokeWidth={1.3} style={{ color: "rgb(29 29 29 / 0.55)" }}>
    <circle cx="8" cy="8" r="6.25" />
    <path d="M1.75 8h12.5M8 1.75c1.8 1.7 2.7 3.8 2.7 6.25S9.8 12.55 8 14.25C6.2 12.55 5.3 10.45 5.3 8S6.2 3.45 8 1.75Z" />
  </svg>
);

// Name + kind + a plus that turns into ×; opening it reveals the description,
// the links and a left-to-right shelf of the project's shots.
const ProjectRow = ({ project, open, onToggle }: { project: Project; open: boolean; onToggle: () => void }) => (
  <li className="transition-opacity duration-300 ease-[cubic-bezier(.2,.8,.2,1)]">
    <button
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      className="flex w-full cursor-pointer items-center justify-between gap-2.5 text-left"
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate">{project.name}</span>
        <motion.svg
          viewBox="0 0 16 16"
          width={10}
          height={10}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          aria-hidden
          className="shrink-0"
          style={{ color: FG_40 }}
          animate={{ rotate: open ? 45 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 26 }}
        >
          <path d="M8 3v10M3 8h10" />
        </motion.svg>
      </span>
      {/* the tag steps aside while the row is open */}
      <span
        className="shrink-0 transition-[opacity,transform] duration-300 ease-[cubic-bezier(.16,1,.3,1)]"
        style={{ color: FG_40, opacity: open ? 0 : 1, transform: open ? "translateX(6px)" : "none" }}
        aria-hidden={open}
      >
        {project.kind}
      </span>
    </button>

    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          className="overflow-hidden"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.3, ease: EASE_OUT }}
        >
          <p className="pt-2.5" style={{ color: FG_50 }}>
            {project.description}
          </p>
          <div className="mb-1 mt-4 flex flex-wrap gap-2">
            <Chip href={project.href} icon={<VisitIcon />}>
              Visit
            </Chip>
            {SOURCES.filter((src) => project[src.key]).map((src) => (
              <Chip
                key={src.key}
                href={project[src.key]!}
                icon={
                  <Image
                    src={src.logo.src}
                    alt=""
                    width={src.logo.width}
                    height={src.logo.height}
                    unoptimized
                    className={"blend" in src.logo ? "mix-blend-multiply" : ""}
                    style={{ width: src.logo.width, height: src.logo.height }}
                  />
                }
              >
                {src.text}
              </Chip>
            ))}
          </div>
          <MediaShelf
            name={project.name}
            media={project.media}
            all={ALL_SHOTS}
            offset={ALL_SHOTS.findIndex((m) => m.project === project.name)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  </li>
);

const Projects = () => {
  // one open at a time, so the list stays short
  const [open, setOpen] = useState<string | null>(null);
  return (
    // hovering a row (mouse only) fades the others back
    <ul className="flex flex-col gap-[30px] [@media(hover:hover)]:[&:has(>li:hover)>li:not(:hover)]:opacity-40">
      {PROJECTS.map((project) => (
        <ProjectRow
          key={project.name}
          project={project}
          open={open === project.name}
          onToggle={() => setOpen((o) => (o === project.name ? null : project.name))}
        />
      ))}
    </ul>
  );
};

export default Projects;
