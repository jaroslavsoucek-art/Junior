import { IconClipboard, IconFormation, IconUsers } from './icons';

export type TabId = 'roster' | 'match' | 'lineup';

const TABS: { id: TabId; label: string; Icon: typeof IconUsers }[] = [
  { id: 'roster', label: 'Kádr', Icon: IconUsers },
  { id: 'match', label: 'Zápas', Icon: IconClipboard },
  { id: 'lineup', label: 'Sestava', Icon: IconFormation },
];

/** Floating navigation pill (design: blur, 22 px radius, active item filled). */
export function TabBar({ active, onChange }: { active: TabId; onChange: (t: TabId) => void }) {
  return (
    <nav
      className="no-touch-fx pointer-events-none absolute inset-x-4 z-30 flex"
      style={{ bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}
      aria-label="Hlavní navigace"
    >
      <div
        className="pointer-events-auto flex w-full gap-1 rounded-[22px] border border-line p-1.5 shadow-float backdrop-blur-xl"
        style={{ background: 'var(--nav-bg)' }}
      >
        {TABS.map(({ id, label, Icon }) => {
          const isActive = id === active;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`tap relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[3px] rounded-2xl text-[10px] font-bold ${isActive ? 'bg-btn text-btn-fg' : 'text-muted'}`}
            >
              <Icon />
              <span>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
