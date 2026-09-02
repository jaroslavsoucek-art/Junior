import { IconClipboard, IconFormation, IconTimer, IconUsers } from './icons';

export type TabId = 'roster' | 'match' | 'lineup' | 'live';

const TABS: { id: TabId; label: string; Icon: typeof IconUsers }[] = [
  { id: 'roster', label: 'Kádr', Icon: IconUsers },
  { id: 'match', label: 'Zápas', Icon: IconClipboard },
  { id: 'lineup', label: 'Sestava', Icon: IconFormation },
  { id: 'live', label: 'Live', Icon: IconTimer },
];

/** Floating navigation pill (design: blur, 22 px radius, active item filled). */
export function TabBar({ active, onChange, liveRunning }: { active: TabId; onChange: (t: TabId) => void; liveRunning: boolean }) {
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
          const live = id === 'live' && liveRunning && !isActive;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className={`tap relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-[3px] rounded-2xl text-[10px] font-bold ${
                isActive ? 'bg-btn text-btn-fg' : live ? 'text-accent-text' : 'text-muted'
              }`}
            >
              <Icon />
              <span className={live ? 'font-extrabold' : ''}>{label}</span>
              {live && <span className="absolute right-[18px] top-1.5 size-[7px] rounded-full bg-accent" aria-hidden />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
