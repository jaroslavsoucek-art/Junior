import type { ReactNode } from 'react';

/**
 * Bottom sheet. Big buttons, no hover, closes only via explicit action –
 * a stray tap on the backdrop while wearing gloves must not lose an edit.
 */
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose?: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-ink/50" role="dialog" aria-modal="true">
      <div className="safe-bottom max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-paper p-4 shadow-xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-xl font-bold">{title}</h2>
          {onClose && (
            <button type="button" onClick={onClose} className="tap rounded-lg px-3 text-ink-muted" aria-label="Zavřít">
              ✕
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}

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
  kind?: 'default' | 'primary' | 'danger' | 'ghost';
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}) {
  const look = {
    default: 'bg-white border border-ink/20 text-ink',
    primary: 'bg-pitch text-white',
    danger: 'bg-role-fwd text-white',
    ghost: 'bg-transparent text-ink-muted',
  }[kind];
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`tap rounded-xl px-4 py-3 text-base font-semibold disabled:opacity-40 ${look} ${className}`}
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
      <div className="mb-4 text-base">{text}</div>
      <div className="flex gap-2">
        <Btn onClick={onCancel} className="flex-1">
          Zrušit
        </Btn>
        <Btn onClick={onConfirm} kind={danger ? 'danger' : 'primary'} className="flex-1">
          {confirmLabel}
        </Btn>
      </div>
    </Modal>
  );
}
