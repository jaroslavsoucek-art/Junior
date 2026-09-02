import type { ReactNode } from 'react';
import logo from '../assets/logo.png';
import { ACTIVE_TEAM } from '../store';

export function ScreenHeader({ title, subtitle, right, onBack }: { title: string; subtitle?: string; right?: ReactNode; onBack?: () => void }) {
  return (
    <header className="flex items-center gap-3 py-3">
      {onBack ? (
        <button type="button" onClick={onBack} className="tap rounded-xl px-2 text-xl" aria-label="Zpět">
          ←
        </button>
      ) : (
        <img src={logo} alt="SK Junior Praha" className="h-11 w-11 shrink-0" />
      )}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-2xl font-bold text-primary">
          {title} <span className="ml-1 rounded bg-gold px-1.5 text-sm font-bold text-ink align-middle">{ACTIVE_TEAM}</span>
        </h1>
        {subtitle && <p className="truncate text-sm text-ink-muted">{subtitle}</p>}
      </div>
      {right}
    </header>
  );
}
