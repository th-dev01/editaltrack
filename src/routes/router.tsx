import { createBrowserRouter } from 'react-router-dom'
import { AppLayout } from '../components/AppLayout'
import { AboutPage } from '../pages/AboutPage'
import { AuthPage } from '../pages/AuthPage'
import { CalendarPage } from '../pages/CalendarPage'
import { DashboardPage } from '../pages/DashboardPage'
import { EditalDetailsPage } from '../pages/EditalDetailsPage'
import { EditalEditorPage } from '../pages/EditalEditorPage'
import { EditaisPage } from '../pages/EditaisPage'
import { NotFoundPage } from '../pages/NotFoundPage'
import { RouteErrorPage } from '../pages/RouteErrorPage'
import { SettingsPage } from '../pages/SettingsPage'

export const router = createBrowserRouter([
  {
    path: '/',
    errorElement: <RouteErrorPage />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: 'editais', element: <EditaisPage /> },
          { path: 'editais/novo', element: <EditalEditorPage mode="create" /> },
          { path: 'editais/:id', element: <EditalDetailsPage /> },
          { path: 'editais/:id/editar', element: <EditalEditorPage mode="edit" /> },
          { path: 'calendario', element: <CalendarPage /> },
          { path: 'configuracoes', element: <SettingsPage /> },
          { path: 'sobre', element: <AboutPage /> },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
      { path: 'login', element: <AuthPage mode="login" /> },
      { path: 'cadastro', element: <AuthPage mode="signup" /> },
      { path: 'recuperar-senha', element: <AuthPage mode="recovery" /> },
    ],
  },
])
