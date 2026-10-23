"use client"
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import Reveal from "@/components/Reveal";

// Selected projects from bikash.useiota.space; thumbnails live in /public/projects.
// `figma` / `framer` / `wonder` add an icon link to the source file next to the live one.
type Project = {
  name: string;
  description: string;
  image: string;
  href: string;
  figma?: string;
  framer?: string;
  wonder?: string;
};

const PROJECTS: Project[] = [
  {
    name: "iota",
    description: "A collection of small web animation tools. Draw, tweak, and export SVG animations. (WIP)",
    image: "/projects/iota.jpg",
    href: "https://useiota.space",
  },
  {
    name: "Zineps (redesign)",
    description: "Redesign of the Zineps logistics platform: landing page and dashboard, from Figma to code.",
    image: "/projects/zineps.jpg",
    href: "https://zineps-redesign.vercel.app/",
    figma:
      "https://www.figma.com/design/fTsiVGTDlj6qwHdnvWcuUP/Untitled?node-id=0-1&t=TKFEvHDkLLuzVeVX-1",
  },
  {
    name: "Petals",
    description:
      "Browser-based design tool with a canvas, frames, layers and a full inspector — local-first, nothing leaves the device. (WIP)",
    image: "/projects/petals.webp",
    href: "https://petalsapp.vercel.app",
    wonder:
      "https://app.wonder.so/bikash/files/01a12ad4-3b78-780e-8fcc-04802839a717/branches/main/pages/01a12ad4-3b7a-7d3a-af74-c6eadef29a3e",
  },
  {
    name: "Cirrus",
    description: "An animated Framer template for agencies — bold type, fluid motion and a premium, editorial layout.",
    image: "/projects/cirrus.webp",
    href: "https://cirrus.framer.website/",
    framer: "https://www.framer.com/marketplace/templates/cirrus/",
  },
  {
    name: "StudyDeck",
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
    description:
      "A Notion-like workspace that stores every page, block and table directly in your Trello boards — no separate database.",
    image: "/projects/trition.jpg",
    href: "https://trition.vercel.app",
  },
  {
    name: "RevPDF",
    description: "Local PDF, EPUB, DOC and DOCX reader with Chrome-style selection search.",
    image: "/projects/revpdf.jpg",
    href: "https://revpdf.in",
  },
  {
    name: "Dotfolio",
    description: "Minimal, dot-matrix portfolio for developers — a free Framer template.",
    image: "/projects/dotfolio.webp",
    href: "https://satisfied-fact-878900.framer.app/",
    framer: "https://www.framer.com/marketplace/templates/dotfolio/",
  },
];

// same column as the sections above and below it
const COLUMN = 820;

// Logo chip in the project's title line: icon-only in the resting row, then the
// source name slides out when the row is hovered. The SVGs carry their own colour.
const ProjectIconLink = ({
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

// The row itself is the live-site link (a stretched link under the content, so the
// icon links can sit on top without nesting anchors inside one another).
const ProjectRow = ({ project }: { project: Project }) => (
  <li className="group relative flex items-center gap-4 py-5 sm:gap-6">
    <div className="w-24 shrink-0 overflow-hidden rounded-xl bg-[#F2F2F2] sm:w-32">
      <Image
        src={project.image}
        width={256}
        height={160}
        alt=""
        draggable="false"
        className="aspect-[16/10] w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]"
      />
    </div>
    <div className="min-w-0 flex-1">
      <p className="flex items-center gap-1 text-base text-neutral-800 transition-colors group-hover:text-neutral-500">
        <span className="truncate">{project.name}</span>
        {/* kept visible (not hover-only) so touch users can see the row is a link */}
        <HugeiconsIcon
          icon={ArrowUpRight01Icon}
          size={16}
          strokeWidth={2}
          className="shrink-0 text-neutral-300 transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-neutral-800"
        />
        {(project.figma || project.framer || project.wonder) && (
          <span className="ml-2 flex items-center gap-1.5">
            {project.figma && (
              <ProjectIconLink
                href={project.figma}
                logo={{ src: "/figma-logo.svg", width: 10, height: 15 }}
                label={`${project.name} — Figma file`}
                text="Figma"
              />
            )}
            {project.framer && (
              <ProjectIconLink
                href={project.framer}
                logo={{ src: "/framer-logo.svg", width: 10, height: 15 }}
                label={`${project.name} — Framer template`}
                text="Framer"
              />
            )}
            {project.wonder && (
              <ProjectIconLink
                href={project.wonder}
                logo={{ src: "/wonder-logo-icon.png", width: 15, height: 15, blend: true }}
                label={`${project.name} — Wonder file`}
                text="Wonder"
              />
            )}
          </span>
        )}
      </p>
      <p className="mt-1 text-sm leading-normal text-neutral-500">{project.description}</p>
    </div>
    <a
      href={project.href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${project.name} — live site`}
      className="absolute inset-0 rounded-xl focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-neutral-400"
    />
  </li>
);

const Projects = () => (
  <Reveal id="projects" className="bg-[#FBFBFB] pb-16" style={{ fontFamily: "var(--font-inter)" }}>
    <div className="mx-auto w-full px-4 tracking-tight" style={{ maxWidth: COLUMN + 32 }}>
      <h2 className="text-lg text-neutral-800">Selected Projects</h2>

      {/* hairlines between rows, and one above the first under the heading */}
      <ul className="mt-4 divide-y divide-neutral-200 border-t border-neutral-200">
        {PROJECTS.map((project) => (
          <ProjectRow key={project.name} project={project} />
        ))}
      </ul>
    </div>
  </Reveal>
);

export default Projects;
