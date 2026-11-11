import { Route, Routes } from 'react-router-dom'
import { Layout } from './ui/Layout'
import { AccountPage } from './ui/pages/AccountPage'
import { HistoryPage } from './ui/pages/HistoryPage'
import { HomePage } from './ui/pages/HomePage'
import { NewSessionPage } from './ui/pages/NewSessionPage'
import { Placeholder } from './ui/pages/Placeholder'
import { PlayersPage } from './ui/pages/PlayersPage'
import { RoundEditPage } from './ui/pages/RoundEditPage'
import { RulesPage } from './ui/pages/RulesPage'
import { SeatingPage } from './ui/pages/SeatingPage'
import { SessionPage } from './ui/pages/SessionPage'
import { StatsPage } from './ui/pages/StatsPage'


export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="new" element={<NewSessionPage />} />
        <Route path="session/:id" element={<SessionPage />} />
        <Route path="session/:id/seating" element={<SeatingPage />} />
        <Route path="session/:id/round/:roundId" element={<RoundEditPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="account" element={<AccountPage />} />
        <Route path="*" element={<Placeholder title="Not found" note="That page does not exist." />} />
      </Route>
    </Routes>
  )
}
