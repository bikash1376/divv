"use client"

// Link with a small logo in front: grey (#505050 label, desaturated logo) at rest; on hover the logo takes
// its colour and straightens, and the label goes semibold in the accent colour.
// The label sits on a grid over an invisible semibold copy of itself, so the
// heavier weight never pushes the words around it.
export const LogoLink = ({
  href,
  logo,
  text,
  color,
}: {
  href: string;
  logo: string;
  text: string;
  color: string;
}) => (
  <a href={href} target="_blank" rel="noreferrer" className="group inline-flex items-baseline gap-1">
    {/* eslint-disable-next-line @next/next/no-img-element */}
    <img
      src={logo}
      alt=""
      aria-hidden
      className="size-[1.15em] shrink-0 translate-y-[0.18em] -rotate-12 rounded-[0.28em] grayscale transition-[filter,transform] duration-300 ease-in-out group-hover:rotate-0 group-hover:grayscale-0 [@media(hover:none)]:rotate-0 [@media(hover:none)]:grayscale-0"
    />
    <span className="inline-grid">
      <span aria-hidden className="invisible col-start-1 row-start-1 font-semibold">
        {text}
      </span>
      <span
        className="col-start-1 row-start-1 text-[#505050] transition-[color,font-weight] duration-200 ease-in-out group-hover:font-semibold group-hover:text-[var(--accent)] [@media(hover:none)]:font-semibold [@media(hover:none)]:text-[var(--accent)]"
        style={{ "--accent": color } as React.CSSProperties}
      >
        {text}
      </span>
    </span>
  </a>
);
