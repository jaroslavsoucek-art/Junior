import type { ReactNode } from 'react';
import { PITCH_H, PITCH_W } from '../lib/pitchGeometry';

/**
 * Portrait pitch as SVG. viewBox 0 0 100 150. y=0 (top) is the opponent's goal,
 * y=150 (bottom) is ours – so a slot with data y=0 renders at the bottom.
 */
export function Pitch({ children, className = '' }: { children?: ReactNode; className?: string }) {
  const line = { stroke: 'var(--color-pitch-line)', strokeWidth: 0.6, fill: 'none' } as const;
  return (
    <svg
      viewBox={`0 0 ${PITCH_W} ${PITCH_H}`}
      className={`no-touch-fx h-full w-full ${className}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="Hřiště"
    >
      <rect x="0" y="0" width={PITCH_W} height={PITCH_H} rx="2" fill="var(--color-pitch)" />
      {/* subtle mowing stripes – low contrast, only texture */}
      {Array.from({ length: 6 }, (_, i) => (
        <rect key={i} x="0" y={i * 25} width={PITCH_W} height="12.5" fill="var(--color-pitch-dark)" opacity="0.28" />
      ))}
      <rect x="3" y="3" width={PITCH_W - 6} height={PITCH_H - 6} {...line} />
      <line x1="3" y1={PITCH_H / 2} x2={PITCH_W - 3} y2={PITCH_H / 2} {...line} />
      <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="12" {...line} />
      <circle cx={PITCH_W / 2} cy={PITCH_H / 2} r="0.9" fill="var(--color-pitch-line)" />
      {/* penalty & goal areas, top (opponent) and bottom (ours) */}
      <rect x="22" y="3" width="56" height="22" {...line} />
      <rect x="36" y="3" width="28" height="8" {...line} />
      <rect x="22" y={PITCH_H - 25} width="56" height="22" {...line} />
      <rect x="36" y={PITCH_H - 11} width="28" height="8" {...line} />
      {/* goals */}
      <rect x="42" y="0.5" width="16" height="2.5" fill="var(--color-pitch-line)" opacity="0.8" />
      <rect x="42" y={PITCH_H - 3} width="16" height="2.5" fill="var(--color-pitch-line)" opacity="0.8" />
      {children}
    </svg>
  );
}
