"use client"
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

// Work history. `details` makes the row expandable on click; `href` links the company.
type Job = { when: string; role: string; company?: string; details?: string; href?: string };

const JOBS: Job[] = [
  { when: "May 2026", role: "SDE Intern", company: "Stealth" },
  {
    when: "2025 – Present",
    role: "Software Consultant",
    company: "Self-Employed",
    details: "Shipped 4+ projects for clients, both local and international.",
  },
  { when: "2024", role: "Builder", company: "buildspace", href: "https://buildspace.so" },
  { when: "2024", role: "SDE Intern", company: "Suggaa" },
  { when: "2023 – 2024", role: "Freelance Developer" },
];

// same column as the Stuff shelf above it
const COLUMN = 820;

const ROW = "grid grid-cols-[7.5rem_1fr] items-center gap-x-6 sm:grid-cols-[1fr_4.5rem_1.6fr] sm:gap-x-10";

const JobRow = ({ job }: { job: Job }) => {
  const [open, setOpen] = useState(false);

  const line = (
    <>
      <span className="text-neutral-500 tabular-nums">{job.when}</span>
      {/* dotted leader between the date and the role */}
      <span aria-hidden className="hidden border-t border-dotted border-neutral-300 sm:block" />
      <span className="flex items-center gap-2 text-neutral-800">
        <span>
          {job.role}
          {job.company && " @ "}
          {job.company && job.href ? (
            <a
              href={job.href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-neutral-300 underline-offset-4 transition-colors hover:text-neutral-500"
            >
              {job.company}
            </a>
          ) : (
            job.company
          )}
        </span>
        {job.details && (
          <motion.svg
            viewBox="0 0 16 16"
            width={12}
            height={12}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden
            className="text-neutral-400"
            animate={{ rotate: open ? 45 : 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 26 }}
          >
            <path d="M8 3v10M3 8h10" />
          </motion.svg>
        )}
      </span>
    </>
  );

  if (!job.details) return <li className={ROW}>{line}</li>;

  return (
    <li>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={`${ROW} w-full cursor-pointer text-left transition-opacity hover:opacity-70`}
      >
        {line}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="overflow-hidden"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* lines up under the role column */}
            <div className={ROW}>
              <p className="col-start-2 pt-2 text-sm text-neutral-500 sm:col-start-3">{job.details}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
};

const Experience = () => (
  <section className="bg-[#FBFBFB] pb-32 pt-8" style={{ fontFamily: "var(--font-inter)" }}>
    <div className="mx-auto w-full px-4 tracking-tight" style={{ maxWidth: COLUMN + 32 }}>
      <h2 className="mb-10 text-lg text-neutral-800">Work Experience</h2>

      <ul className="flex flex-col gap-5 text-base">
        {JOBS.map((job) => (
          <JobRow key={`${job.role}-${job.company}`} job={job} />
        ))}
      </ul>
    </div>
  </section>
);

export default Experience;
