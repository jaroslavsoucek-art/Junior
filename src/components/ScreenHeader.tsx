import type { ReactNode } from 'react';
import logo from '../assets/logo.png';
import { ACTIVE_TEAM } from '../store';
import { IconBack } from './icons';

/** List-screen header: logo tile, 26 px title + gold team pill, subtitle, optional right control. */
export function ScreenHeader({ title, subtitle, right, showLogo = true }: { title: string; subtitle?: string; right?: ReactNode; showLogo?: boolean }) {
  return (
    <header className="mb-[18px] flex items-center gap-3">
      {showLogo && (
        <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-line bg-surface">
          <img src={logo} alt="SK Junior Praha" className="size-8 object-contain" />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="truncate text-[26px] font-extrabold leading-[1.1] tracking-[-0.02em] text-heading">{title}</h1>
          <span className="shrink-0 rounded-full bg-gold px-[9px] py-[3px] text-[11px] font-extrabold tracking-[0.06em] text-[#141728]">TÝM {ACTIVE_TEAM}</span>
        </div>
        {subtitle && <p className="mt-0.5 truncate text-[13px] font-medium text-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}

/** Detail header: 48 px back button, 22 px title, subtitle, optional right control. */
export function DetailHeader({ title, subtitle, onBack, right }: { title: string; subtitle?: string; onBack: () => void; right?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <IconButton onClick={onBack} label="Zpět">
        <IconBack />
      </IconButton>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[22px] font-extrabold leading-[1.15] tracking-[-0.015em] text-ink">{title}</h1>
        {subtitle && <p className="mt-0.5 truncate text-[13px] font-medium text-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/** 48 × 48 rounded icon button on a surface card. */
export function IconButton({ children, onClick, label, className = '', disabled }: { children: ReactNode; onClick?: () => void; label: string; className?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={`tap flex size-12 shrink-0 items-center justify-center rounded-2xl border border-line-2 bg-surface text-heading disabled:opacity-40 ${className}`}
    >
      {children}
    </button>
  );
}
