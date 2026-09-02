import type { ReactNode } from 'react';
import { IconClose } from './icons';

/**
 * Bottom sheet (design: 28 px top radius, canvas background, deep shadow).
 * Closes only via explicit action – a stray tap in gloves must not lose an edit.
 */
export function Modal({ title, subtitle, children, onClose }: { title: string; subtitle?: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end" style={{ background: 'rgba(11,14,28,0.35)' }} role="dialog" aria-modal="true">
      <div className="safe-bottom max-h-[92dvh] overflow-y-auto rounded-t-[28px] bg-canvas px-[18px] pb-5 pt-[18px]" style={{ boxShadow: '0 -12px 40px rgba(11,14,28,0.28)' }}>
        <div className="mb-3.5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-[-0.015em] text-ink">{title}</h2>
            {subtitle && <p className="mt-[3px] text-xs font-semibold text-muted">{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="tap flex size-11 shrink-0 items-center justify-center rounded-[14px] border border-line-2 bg-surface text-muted" aria-label="Zavřít">
              <IconClose />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

export type BtnKind = 'primary' | 'accent' | 'default' | 'ghost' | 'dangerSoft' | 'soft';

export function Btn({
  children,
  onClick,
  kind = 'default',
  disabled,
  className = '',
  type = 'button',
}: {
  children: ReactNode;
  onClick?: () => void;
  kind?: BtnKind;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const look: Record<BtnKind, string> = {
    primary: 'bg-btn text-btn-fg',
    accent: 'bg-accent text-white',
    default: 'border border-line-2 bg-surface text-ink',
    soft: 'border border-primary/15 bg-primary/5 text-heading',
    ghost: 'bg-transparent text-muted',
    dangerSoft: 'border border-accent-line bg-accent-soft text-accent-text',
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tap rounded-2xl px-4 py-3 text-[14px] font-bold disabled:opacity-40 ${look[kind]} ${className}`}
    >
      {children}
    </button>
  );
}

export function Confirm({
  title,
  text,
  confirmLabel,
  danger,
  onConfirm,
  onCancel,
}: {
  title: string;
  text: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal title={title}>
      <div className="mb-4 text-[15px] text-ink">{text}</div>
      <div className="flex gap-2">
        <Btn onClick={onCancel} className="flex-1">
          Zrušit
        </Btn>
        <Btn onClick={onConfirm} kind={danger ? 'accent' : 'primary'} className="flex-1">
          {confirmLabel}
        </Btn>
      </div>
    </Modal>
  );
}

/** Card container (22 px radius, surface, hairline). */
export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-[22px] border border-line bg-surface p-4 ${className}`}>{children}</section>;
}

/** Numbered step badge used in match prep sections. */
export function StepBadge({ n, tone = 'primary' }: { n: number; tone?: 'primary' | 'accent' | 'muted' }) {
  const cls = { primary: 'bg-primary/10 text-heading', accent: 'bg-accent/10 text-accent-text', muted: 'bg-ink/5 text-muted' }[tone];
  return <span className={`flex size-[26px] items-center justify-center rounded-[9px] text-[13px] font-extrabold ${cls}`}>{n}</span>;
}
