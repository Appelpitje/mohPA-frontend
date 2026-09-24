import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AdminRoute } from '../components/auth/AdminRoute';

import { Dashboard } from '../pages/dashboard/Dashboard';
import { Login } from '../pages/auth/Login';
import { Register } from '../pages/auth/Register';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { SoldierManager } from '../pages/soldiers/SoldierManager';
import { ServerBrowser } from '../pages/servers/ServerBrowser';
import { ServerHistory } from '../pages/servers/ServerHistory';
import { Leaderboards } from '../pages/stats/Leaderboards';
import { PlayerProfile } from '../pages/stats/PlayerProfile';
import { DownloadGuides } from '../pages/setup/DownloadGuides';
import { Profile } from '../pages/profile/Profile';
import { AdminDashboard } from '../pages/admin/AdminDashboard';
import { ProtocolInspector } from '../pages/admin/ProtocolInspector';
import { Moderation } from '../pages/admin/Moderation';
import { ServerManager } from '../pages/admin/ServerManager';
import { NotFound } from '../pages/NotFound';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      {
        path: 'dashboard',
        element: <Dashboard />,
      },
      {
        path: 'login',
        element: <Login />,
      },
      {
        path: 'register',
        element: <Register />,
      },
      {
        path: 'forgot-password',
        element: <ForgotPassword />,
      },
      {
        path: 'soldiers',
        element: <SoldierManager />,
      },
      {
        path: 'servers',
        element: <ServerBrowser />,
      },
      {
        path: 'servers/:id/history',
        element: <ServerHistory />,
      },
      {
        path: 'leaderboards',
        element: <Leaderboards />,
      },
      {
        path: 'stats',
        element: <Leaderboards />,
      },
      {
        path: 'stats/player/:name',
        element: <PlayerProfile />,
      },
      {
        path: 'setup',
        element: <DownloadGuides />,
      },
      {
        path: 'profile',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'entitlements',
        element: (
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        ),
      },
      {
        path: 'admin',
        element: (
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/inspector',
        element: (
          <AdminRoute>
            <ProtocolInspector />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/moderation',
        element: (
          <AdminRoute>
            <Moderation />
          </AdminRoute>
        ),
      },
      {
        path: 'admin/servers',
        element: (
          <AdminRoute>
            <ServerManager />
          </AdminRoute>
        ),
      },
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
]);
