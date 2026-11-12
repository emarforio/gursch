import { Route, Routes } from 'react-router-dom'
import { useT } from './i18n'
import { Layout } from './ui/Layout'
import { HistoryPage } from './ui/pages/HistoryPage'
import { HomePage } from './ui/pages/HomePage'
import { NewSessionPage } from './ui/pages/NewSessionPage'
import { Placeholder } from './ui/pages/Placeholder'
import { PlayersPage } from './ui/pages/PlayersPage'
import { RoundEditPage } from './ui/pages/RoundEditPage'
import { RulesPage } from './ui/pages/RulesPage'
import { SeatingPage } from './ui/pages/SeatingPage'
import { SessionPage } from './ui/pages/SessionPage'
import { SettingsPage } from './ui/pages/SettingsPage'
import { SharedPage } from './ui/pages/SharedPage'
import { StatsPage } from './ui/pages/StatsPage'

export function App() {
  const t = useT()
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="new" element={<NewSessionPage />} />
        <Route path="session/:id" element={<SessionPage />} />
        <Route path="session/:id/seating" element={<SeatingPage />} />
        <Route path="session/:id/round/:roundId" element={<RoundEditPage />} />
        <Route path="s/:id" element={<SharedPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="stats" element={<StatsPage />} />
        <Route path="players" element={<PlayersPage />} />
        <Route path="rules" element={<RulesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Placeholder title={t.nav.notFound} note={t.nav.notFoundNote} />} />
      </Route>
    </Routes>
  )
}
