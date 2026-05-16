import { Route, Switch } from 'wouter'
import Layout from './components/Layout'
import PlayersPage from './pages/PlayersPage'
import RecordMatchPage from './pages/RecordMatchPage'
import StatsPage from './pages/StatsPage'

export default function App() {
  return (
    <Layout>
      <Switch>
        <Route path="/players" component={PlayersPage} />
        <Route path="/record" component={RecordMatchPage} />
        <Route path="/stats" component={StatsPage} />
        <Route path="/" component={StatsPage} />
      </Switch>
    </Layout>
  )
}
