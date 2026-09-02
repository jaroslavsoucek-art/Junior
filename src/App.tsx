import { TabBar } from './components/TabBar';
import { useStore } from './store';
import { RosterScreen } from './screens/RosterScreen';
import { MatchScreen } from './screens/MatchScreen';
import { LineupScreen } from './screens/LineupScreen';
import { LiveScreen } from './screens/LiveScreen';

export default function App() {
  const tab = useStore((s) => s.tab);
  const setTab = useStore((s) => s.setTab);

  return (
    <div className="flex h-full flex-col bg-paper text-ink">
      <main className="min-h-0 flex-1 overflow-y-auto safe-top">
        {tab === 'roster' && <RosterScreen />}
        {tab === 'match' && <MatchScreen />}
        {tab === 'lineup' && <LineupScreen />}
        {tab === 'live' && <LiveScreen />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}
