import { TabBar } from './components/TabBar';
import { useStore } from './store';
import { RosterScreen } from './screens/RosterScreen';
import { MatchScreen } from './screens/MatchScreen';
import { LineupScreen } from './screens/LineupScreen';
import { LiveScreen } from './screens/LiveScreen';

export default function App() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);
  const openMatchDetail = useStore((s) => s.openMatchDetail);
  const setLineupView = useStore((s) => s.setLineupView);
  // Tapping a tab always lands on its overview (list); deep links open the detail/editor directly.
  const onTab = (t: typeof tab) => {
    if (t === 'match') openMatchDetail(null);
    if (t === 'lineup') setLineupView('list');
    setTab(t);
  };

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      <main className="min-h-0 flex-1 overflow-y-auto safe-top">
        {tab === 'roster' && <RosterScreen />}
        {tab === 'match' && <MatchScreen />}
        {tab === 'lineup' && <LineupScreen />}
        {tab === 'live' && <LiveScreen />}
      </main>
      <TabBar active={tab} onChange={onTab} />
    </div>
  );
}
