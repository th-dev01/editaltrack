import { lazy } from 'react'

export const DashboardPage = lazy(() => import('../pages/DashboardPage').then((module) => ({ default: module.DashboardPage })))
export const EditaisPage = lazy(() => import('../pages/EditaisPage').then((module) => ({ default: module.EditaisPage })))
export const EditalDetailsPage = lazy(() => import('../pages/EditalDetailsPage').then((module) => ({ default: module.EditalDetailsPage })))
export const EditalEditorPage = lazy(() => import('../pages/EditalEditorPage').then((module) => ({ default: module.EditalEditorPage })))
export const CalendarPage = lazy(() => import('../pages/CalendarPage').then((module) => ({ default: module.CalendarPage })))
export const SettingsPage = lazy(() => import('../pages/SettingsPage').then((module) => ({ default: module.SettingsPage })))
export const AboutPage = lazy(() => import('../pages/AboutPage').then((module) => ({ default: module.AboutPage })))
