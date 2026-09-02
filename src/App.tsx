import { TabBar } from './components/TabBar';
import { useStore } from './store';
import { useTheme } from './hooks/useTheme';
import { RosterScreen } from './screens/RosterScreen';
import { MatchScreen } from './screens/MatchScreen';
import { LineupScreen } from './screens/LineupScreen';

export default function App() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const setLineupView = useStore((s) => s.setLineupView);
  const matchDetailId = useStore((s) => s.matchDetailId);
  const lineupView = useStore((s) => s.lineupView);
  const theme = useStore((s) => s.settings.theme ?? 'light');
  useTheme(theme);

  // Tapping a tab always lands on its overview (list); deep links open the detail/editor directly.
  const onTab = (t: typeof tab) => {
    if (t === 'match') openMatchDetail(null);
    if (t === 'lineup') setLineupView('list');
    setTab(t);
  };

  // Floating nav only on overview screens; detail and editor use their own back buttons and need the height.
  const showNav = tab === 'roster' || (tab === 'match' && !matchDetailId) || (tab === 'lineup' && lineupView === 'list');

  return (
    <div className="relative flex h-full flex-col bg-canvas text-ink">
      <main className="safe-top min-h-0 flex-1 overflow-y-auto">
        {tab === 'roster' && <RosterScreen />}
        {tab === 'match' && <MatchScreen />}
        {tab === 'lineup' && <LineupScreen />}
      </main>
      {showNav && <TabBar active={tab} onChange={onTab} />}
    </div>
  );
}
