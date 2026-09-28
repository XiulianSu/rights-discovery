import { Shell } from './components/Shell'
import { parsePath, usePath } from './lib/router'
import { Actions } from './pages/Actions'
import { Ask } from './pages/Ask'
import { Detail } from './pages/Detail'
import { Discover } from './pages/Discover'
import { Docs } from './pages/Docs'
import { Gate } from './pages/Gate'
import { Home } from './pages/Home'
import { PolicyGuide } from './pages/PolicyGuide'
import { PolicyList } from './pages/PolicyList'

export default function App() {
  const { path } = parsePath(usePath())

  let page = <Home />
  if (path === '/gate') page = <Gate />
  else if (path === '/ask') page = <Ask />
  else if (path === '/discover') page = <Discover />
  else if (path.startsWith('/opportunity/')) page = <Detail />
  else if (path === '/actions') page = <Actions />
  else if (path === '/docs') page = <Docs />
  else if (path === '/policies') page = <PolicyList />
  else if (path.startsWith('/policy/')) page = <PolicyGuide key={path} />

  return <Shell>{page}</Shell>
}
