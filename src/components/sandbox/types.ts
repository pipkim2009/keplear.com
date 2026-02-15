import { lazy, type LazyExoticComponent, type ComponentType } from 'react'

export type SnapZone =
  | 'left'
  | 'right'
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right'
  | null

export interface SandboxWindowState {
  id: string
  toolKey: string
  x: number
  y: number
  width: number
  height: number
  zIndex: number
}

export interface ToolConfig {
  key: string
  labelKey: string
  component: LazyExoticComponent<ComponentType>
  defaultWidth: number
  defaultHeight: number
}

export const TOOL_CONFIGS: ToolConfig[] = [
  {
    key: 'generator',
    labelKey: 'nav.generator',
    component: lazy(() => import('../pages/Sandbox')),
    defaultWidth: 900,
    defaultHeight: 700,
  },
  {
    key: 'instruments',
    labelKey: 'nav.instrument',
    component: lazy(() => import('../pages/Instruments')),
    defaultWidth: 800,
    defaultHeight: 600,
  },
  {
    key: 'songs',
    labelKey: 'nav.songs',
    component: lazy(() => import('../pages/Songs')),
    defaultWidth: 850,
    defaultHeight: 650,
  },
  {
    key: 'stems',
    labelKey: 'nav.stems',
    component: lazy(() => import('../pages/Stems')),
    defaultWidth: 800,
    defaultHeight: 550,
  },
  {
    key: 'metronome',
    labelKey: 'nav.metronome',
    component: lazy(() => import('../pages/Metronome')),
    defaultWidth: 400,
    defaultHeight: 500,
  },
  {
    key: 'tuner',
    labelKey: 'nav.tuner',
    component: lazy(() => import('../pages/Tuner')),
    defaultWidth: 400,
    defaultHeight: 500,
  },
]
