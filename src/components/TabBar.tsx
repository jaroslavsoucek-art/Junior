export type TabId = 'roster' | 'match' | 'lineup' | 'live';

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'roster', label: 'Kádr', icon: '👥' },
  { id: 'match', label: 'Zápas', icon: '📋' },
  { id: 'lineup', label: 'Sestava', icon: '🟩' },
  { id: 'live', label: 'Live', icon: '⏱️' },
];

export function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav
      className="safe-bottom flex shrink-0 border-t border-ink/15 bg-white no-touch-fx"
      aria-label="Hlavní navigace"
    >
      {TABS.map((t) => {
        const isActive = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            aria-current={isActive ? 'page' : undefined}
            className={
              'tap flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-xs font-semibold ' +
              (isActive ? 'text-primary' : 'text-ink-muted')
            }
          >
            <span className="text-2xl leading-none" aria-hidden>
              {t.icon}
            </span>
            <span>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
