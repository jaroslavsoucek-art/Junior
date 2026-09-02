/** Segmented control: track with 16 px radius, 12 px items; active item is a raised surface (or gold). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  gold = false,
  size = 'md',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  gold?: boolean;
  size?: 'md' | 'lg';
}) {
  return (
    <div className="no-touch-fx flex gap-1 rounded-2xl bg-surface-2 p-1" role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`tap flex-1 rounded-xl font-bold ${size === 'lg' ? 'min-h-12 text-[15px]' : 'min-h-11 text-[14px]'} ${
              active ? (gold ? 'bg-gold text-[#141728] font-extrabold' : 'bg-surface text-heading shadow-[0_1px_3px_rgba(20,23,40,0.12)]') : 'text-muted'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
