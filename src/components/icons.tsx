import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const base = (size: number, p: P) => ({
  viewBox: '0 0 24 24',
  width: size,
  height: size,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.9,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...p,
});

export const IconUsers = ({ size = 19, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="9" cy="8" r="3.2" />
    <circle cx="16.5" cy="9" r="2.4" />
    <path d="M3.5 19c0-3 2.5-4.6 5.5-4.6s5.5 1.6 5.5 4.6" />
    <path d="M16 14.6c2.6.2 4.5 1.7 4.5 4.4" />
  </svg>
);
export const IconClipboard = ({ size = 19, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="5" y="4" width="14" height="17" rx="3" />
    <line x1="9" y1="9.5" x2="15" y2="9.5" />
    <line x1="9" y1="13.5" x2="15" y2="13.5" />
    <line x1="9" y1="17.5" x2="12" y2="17.5" />
  </svg>
);
export const IconFormation = ({ size = 19, ...p }: P) => (
  <svg {...base(size, p)}>
    <rect x="4" y="3.5" width="16" height="17" rx="3" />
    <line x1="4" y1="12" x2="20" y2="12" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);
export const IconTimer = ({ size = 19, ...p }: P) => (
  <svg {...base(size, p)}>
    <circle cx="12" cy="13" r="7.5" />
    <polyline points="12 9.5 12 13 14.5 14.5" />
    <line x1="9.5" y1="3.5" x2="14.5" y2="3.5" />
  </svg>
);
export const IconGear = ({ size = 20, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 1.8, ...p })}>
    <circle cx="12" cy="12" r="3.2" />
    <line x1="12" y1="3" x2="12" y2="6" />
    <line x1="12" y1="18" x2="12" y2="21" />
    <line x1="3" y1="12" x2="6" y2="12" />
    <line x1="18" y1="12" x2="21" y2="12" />
    <line x1="5.6" y1="5.6" x2="7.7" y2="7.7" />
    <line x1="16.3" y1="16.3" x2="18.4" y2="18.4" />
    <line x1="18.4" y1="5.6" x2="16.3" y2="7.7" />
    <line x1="7.7" y1="16.3" x2="5.6" y2="18.4" />
  </svg>
);
export const IconChevronRight = ({ size = 18, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2, ...p })}>
    <polyline points="9 5 16 12 9 19" />
  </svg>
);
export const IconChevronDown = ({ size = 16, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2.2, ...p })}>
    <polyline points="6 10 12 16 18 10" />
  </svg>
);
export const IconBack = ({ size = 20, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2, ...p })}>
    <polyline points="14 5 7 12 14 19" />
  </svg>
);
export const IconPlus = ({ size = 18, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2.2, ...p })}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);
export const IconClose = ({ size = 18, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2.2, ...p })}>
    <line x1="6" y1="6" x2="18" y2="18" />
    <line x1="18" y1="6" x2="6" y2="18" />
  </svg>
);
export const IconPause = ({ size = 18, ...p }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden {...p}>
    <rect x="7" y="5" width="4" height="14" rx="1.4" />
    <rect x="13" y="5" width="4" height="14" rx="1.4" />
  </svg>
);
export const IconPlay = ({ size = 18, ...p }: P) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden {...p}>
    <path d="M8 5.5v13l10-6.5z" />
  </svg>
);
export const IconRotate = ({ size = 22, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2.1, ...p })}>
    <polyline points="7 7 4 10 7 13" />
    <line x1="4" y1="10" x2="19" y2="10" />
    <polyline points="17 11 20 14 17 17" />
    <line x1="20" y1="14" x2="5" y2="14" />
  </svg>
);
export const IconPencil = ({ size = 20, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M4 20h4l10-10-4-4L4 16z" />
    <line x1="14" y1="6" x2="18" y2="10" />
  </svg>
);
export const IconTrash = ({ size = 18, ...p }: P) => (
  <svg {...base(size, p)}>
    <polyline points="4 7 20 7" />
    <path d="M9 7V4.5h6V7" />
    <path d="M6.5 7l1 13h9l1-13" />
  </svg>
);
export const IconCheck = ({ size = 18, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2.4, ...p })}>
    <polyline points="5 12.5 10 17.5 19 7" />
  </svg>
);
export const IconArrowRight = ({ size = 18, ...p }: P) => (
  <svg {...base(size, { strokeWidth: 2.2, ...p })}>
    <polyline points="9 6 15 12 9 18" />
  </svg>
);
export const IconCloud = ({ size = 18, ...p }: P) => (
  <svg {...base(size, p)}>
    <path d="M7 18h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.5 4.25 4.25 0 0 0 7 18z" />
  </svg>
);
