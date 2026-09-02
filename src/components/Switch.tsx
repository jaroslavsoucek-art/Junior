/** iOS-like toggle (design: 52 × 30, navy when on). */
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} className={`tap flex h-[30px] min-h-[30px] w-[52px] min-w-[52px] items-center rounded-full p-[3px] ${on ? 'justify-end bg-btn' : 'justify-start bg-ink/15'}`}>
      <span className="size-6 rounded-full bg-white shadow-[0_1px_3px_rgba(20,23,40,0.25)]" />
    </button>
  );
}

/** Row with label and a switch, 52 px tall on a surface card. */
export function SwitchRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex min-h-[52px] items-center justify-between gap-3 rounded-2xl border border-line bg-surface px-3.5">
      <span className="text-[15px] font-semibold text-ink">{label}</span>
      <Switch on={on} onChange={onChange} label={label} />
    </div>
  );
}
