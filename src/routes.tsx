import { createHashRouter, Navigate } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { TeamPage } from './pages/TeamPage'
import { MatchPage } from './pages/MatchPage'
import { SearchPage } from './pages/SearchPage'
import { BrowsePage } from './pages/BrowsePage'
import { CompetitionPage } from './pages/CompetitionPage'
import { CategoryPage } from './pages/CategoryPage'
import { GroupPage } from './pages/GroupPage'
import { ClubPage } from './pages/ClubPage'
import { PlayerPage } from './pages/PlayerPage'
import { FavoritesPage } from './pages/FavoritesPage'

export const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/search', element: <SearchPage /> },
      { path: '/browse', element: <BrowsePage /> },
      { path: '/competition/:compId', element: <CompetitionPage /> },
      { path: '/competition/:compId/category/:catId', element: <CategoryPage /> },
      { path: '/group/:compId/:catId/:groupId', element: <GroupPage /> },
      { path: '/club/:clubId', element: <ClubPage /> },
      { path: '/team/:teamId', element: <TeamPage /> },
      { path: '/player/:playerId', element: <PlayerPage /> },
      { path: '/match/:matchId', element: <MatchPage /> },
      { path: '/favorites', element: <FavoritesPage /> },
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
])
