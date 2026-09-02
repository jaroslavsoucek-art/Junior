import { useRef } from 'react';

/**
 * Number field that tolerates an empty value while typing. The old version
 * re-parsed on every keystroke and snapped back to the previous number as
 * soon as the field was cleared – on a phone you could not retype it.
 * Uncontrolled: parent gets a clamped number when the text is a number;
 * on blur the field is normalised to the committed value.
 */
export function NumInput({
  value,
  min,
  max,
  onChange,
  className = '',
  ariaLabel,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  className?: string;
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <input
      ref={ref}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      defaultValue={value}
      aria-label={ariaLabel}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const n = parseInt(e.target.value, 10);
        if (Number.isFinite(n)) onChange(clamp(n));
      }}
      onBlur={(e) => {
        const n = parseInt(e.target.value, 10);
        const v = Number.isFinite(n) ? clamp(n) : value;
        e.target.value = String(v);
        if (v !== value) onChange(v);
      }}
      className={`tap rounded-xl border border-ink/20 bg-white px-3 text-lg tabular-nums ${className}`}
    />
  );
}
