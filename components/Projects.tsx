"use client"
import Image from "next/image";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowUpRight01Icon } from "@hugeicons/core-free-icons";
import Reveal from "@/components/Reveal";

// Selected projects from bikash.useiota.space; thumbnails live in /public/projects.
type Project = { name: string; description: string; image: string; href: string };

const PROJECTS: Project[] = [
  {
    name: "Zineps (redesign)",
    description: "Redesign of the Zineps logistics platform: landing page and dashboard, from Figma to code.",
    image: "/projects/zineps.jpg",
    href: "https://zineps-redesign.vercel.app/",
  },
  {
    name: "iota",
    description: "A collection of small web animation tools. Draw, tweak, and export SVG animations. (WIP)",
    image: "/projects/iota.jpg",
    href: "https://useiota.space",
  },
  {
    name: "Prepara",
    description: "Practice Test Platform for Students & Teachers",
    image: "/projects/prepara.jpg",
    href: "https://prepara.useiota.space",
  },
  {
    name: "Trition",
    description:
      "A Notion-like workspace that stores every page, block and table directly in your Trello boards — no separate database.",
    image: "/projects/trition.jpg",
    href: "https://trition.vercel.app",
  },
  {
    name: "Petals",
    description:
      "Browser-based design tool with a canvas, frames, layers and a full inspector — local-first, nothing leaves the device.",
    image: "/projects/petals.webp",
    href: "https://petalsapp.vercel.app",
  },
  {
    name: "Cirrus",
    description: "An animated Framer template for agencies — bold type, fluid motion and a premium, editorial layout.",
    image: "/projects/cirrus.webp",
    href: "https://cirrus.framer.website/",
  },
  {
    name: "RevPDF",
    description: "Local PDF, EPUB, DOC and DOCX reader with Chrome-style selection search.",
    image: "/projects/revpdf.jpg",
    href: "https://revpdf.in",
  },
];

// same column as the sections above and below it
const COLUMN = 820;

const ProjectRow = ({ project }: { project: Project }) => (
  <li>
    <a
      href={project.href}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-4 py-5 sm:gap-6"
    >
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
        </p>
        <p className="mt-1 text-sm leading-normal text-neutral-500">{project.description}</p>
      </div>
    </a>
  </li>
);

const Projects = () => (
  <Reveal className="bg-[#FBFBFB] pb-16" style={{ fontFamily: "var(--font-inter)" }}>
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
