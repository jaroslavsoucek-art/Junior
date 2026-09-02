/** − value + stepper (design: 40 px buttons, tabular value). Replaces free-text number fields. */
export function Stepper({ value, min, max, step = 1, unit = '', onChange, label }: { value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void; label: string }) {
  const set = (v: number) => onChange(Math.min(max, Math.max(min, v)));
  return (
    <span className="flex items-center gap-2" role="group" aria-label={label}>
      <button type="button" onClick={() => set(value - step)} disabled={value <= min} className="tap flex size-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-line-2 bg-surface-3 text-lg font-bold text-ink disabled:opacity-40" aria-label={`${label} méně`}>
        −
      </button>
      <span className="tabular min-w-[52px] text-center text-[17px] font-extrabold text-ink">
        {value}
        {unit}
      </span>
      <button type="button" onClick={() => set(value + step)} disabled={value >= max} className="tap flex size-10 min-h-10 min-w-10 items-center justify-center rounded-xl border border-line-2 bg-surface-3 text-lg font-bold text-ink disabled:opacity-40" aria-label={`${label} více`}>
        +
      </button>
    </span>
  );
}
