import { createHashRouter } from 'react-router-dom';
import { BaseLayout } from './components/BaseLayout';
import { HomePage } from './pages/Home';
import { MatchSetupPage } from './pages/MatchSetup';
import { GamePage } from './pages/Game';
import { SummaryPage } from './pages/Summary';

// Hash router avoids the need for server-side rewrites on GitHub Pages, and
// works consistently under any `base` path.
export const router = createHashRouter([
  {
    path: '/',
    element: <BaseLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: 'setup', element: <MatchSetupPage /> },
      { path: 'game', element: <GamePage /> },
      { path: 'summary', element: <SummaryPage /> },
    ],
  },
]);
