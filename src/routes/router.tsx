import { Suspense } from 'react'
import type { ReactNode } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { AuthPage } from '../pages/AuthPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import { GuestRoute, ProtectedRoute } from '../features/auth/AuthGuards'
import { AboutPage, CalendarPage, DashboardPage, EditalDetailsPage, EditalEditorPage, EditaisPage, SettingsPage } from './lazy-pages'

function loadingPage() {
  return <main className="page-loading" role="status" aria-live="polite">Carregando página…</main>
}

function suspensePage(element: ReactNode) {
  return <Suspense fallback={loadingPage()}>{element}</Suspense>
}

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              { path: 'dashboard', element: suspensePage(<DashboardPage />) },
              { path: 'editais', element: suspensePage(<EditaisPage />) },
              { path: 'editais/novo', element: suspensePage(<EditalEditorPage mode="create" />) },
              { path: 'editais/:id', element: suspensePage(<EditalDetailsPage />) },
              { path: 'editais/:id/editar', element: suspensePage(<EditalEditorPage mode="edit" />) },
              { path: 'calendario', element: suspensePage(<CalendarPage />) },
              { path: 'configuracoes', element: suspensePage(<SettingsPage />) },
              { path: 'sobre', element: suspensePage(<AboutPage />) },
              { path: '*', element: <NotFoundPage /> },
            ],
          },
        ],
      },
      {
        element: <GuestRoute />,
        children: [
          { path: 'login', element: <AuthPage mode="login" /> },
          { path: 'cadastro', element: <AuthPage mode="signup" /> },
        ],
      },
      { path: 'esqueci-senha', element: <AuthPage mode="recovery" /> },
      { path: 'redefinir-senha', element: <AuthPage mode="reset" /> },
      { path: 'recuperar-senha', element: <Navigate to="/esqueci-senha" replace /> },
    ],
  },
])
