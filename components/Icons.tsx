/**
 * Demo icons. Inline SVG rather than an icon package - five shapes is not worth a
 * dependency, and drawing them by hand means they can look like the actual subject
 * (a rack, a barbell) instead of a generic glyph.
 *
 * All stroke currentColor, so they take their colour from whatever contains them.
 */
type P = { className?: string };

const base = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Gym Builder — a power rack: two uprights, a pull-up bar, safeties, feet. */
export const IconRack = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M6 4.5v15M18 4.5v15" />
    <path d="M6 5h12" />
    <path d="M6 13h12" strokeDasharray="2 2.5" />
    <path d="M3.5 19.5h5M15.5 19.5h5" />
    <circle cx="6" cy="8.5" r=".45" fill="currentColor" stroke="none" />
    <circle cx="18" cy="8.5" r=".45" fill="currentColor" stroke="none" />
  </svg>
);

/** Catalogue Audit — rows of catalogue data, one of them flagged. */
export const IconAudit = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M4 6.5h11M4 12h8M4 17.5h10" />
    <path d="M18.5 9.5v4.2" />
    <circle cx="18.5" cy="16.6" r=".55" fill="currentColor" stroke="none" />
  </svg>
);

/** Catalogue Monitor — a scheduled cycle, with the moment it catches something. */
export const IconMonitor = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M20 12a8 8 0 1 1-2.6-5.9" />
    <path d="M20.2 4.6v3.6h-3.6" />
    <circle cx="12" cy="12" r="1.7" />
  </svg>
);

/** CS Copilot — a reply, with the citation it is grounded in. */
export const IconCopilot = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-4 3.2V6.5A2.5 2.5 0 0 1 7.5 4h10A2.5 2.5 0 0 1 20 6.5z" />
    <path d="M9 9.5h7M9 13h4.5" />
  </svg>
);

/** Spotter — a loaded barbell. */
export const IconSpotter = ({ className }: P) => (
  <svg {...base} className={className}>
    <path d="M2.6 12h18.8" />
    <path d="M6.4 8.2v7.6M9 6.6v10.8M15 6.6v10.8M17.6 8.2v7.6" />
  </svg>
);

export const DEMO_ICONS: Record<string, (p: P) => JSX.Element> = {
  '/builder': IconRack,
  '/audit': IconAudit,
  '/monitor': IconMonitor,
  '/copilot': IconCopilot,
  '/spotter': IconSpotter,
};
