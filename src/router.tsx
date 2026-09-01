import { createHashRouter } from 'react-router-dom';
import { BaseLayout } from './components/BaseLayout';
import { HomePage } from './src/Home';
import { MatchSetupPage } from './src/MatchSetup';
import { GamePage } from './src/Game';
import { SummaryPage } from './src/Summary';

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
