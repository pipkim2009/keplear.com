/**
 * TemplatePickerModal - Starting point when creating a new assignment
 * Offers: default lesson, use saved template
 */

import { PiMusicNotesFill, PiBookOpenFill } from 'react-icons/pi'
import type { InstrumentType } from '../../types/instrument'

export type TemplateChoice = 'default' | 'template'

interface TemplatePickerModalProps {
  readonly isOpen: boolean
  readonly instrument: InstrumentType
  readonly hasTemplates: boolean
  readonly onChoice: (choice: TemplateChoice) => void
  readonly onClose: () => void
}

export default function TemplatePickerModal({
  isOpen,
  instrument,
  hasTemplates,
  onChoice,
  onClose,
}: TemplatePickerModalProps) {
  if (!isOpen) return null

  const options: Array<{
    key: TemplateChoice
    icon: React.ReactNode
    title: string
    description: string
    color: string
    disabled?: boolean
  }> = [
    {
      key: 'default',
      icon: <PiMusicNotesFill size={22} />,
      title: 'Start from default',
      description: 'Warmup + Practice + Song (3 exercises)',
      color: '#7c3aed',
    },
    {
      key: 'template',
      icon: <PiBookOpenFill size={22} />,
      title: 'Use saved template',
      description: hasTemplates ? 'Load from your template library' : 'No templates saved yet',
      color: '#06b6d4',
      disabled: !hasTemplates,
    },
  ]

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)',
      }}
      onClick={e => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary, #1a1a2e)',
          borderRadius: '16px',
          padding: '2rem',
          width: '90%',
          maxWidth: '440px',
          border: '1px solid var(--border-color, rgba(255,255,255,0.1))',
          boxShadow: '0 16px 48px rgba(0,0,0,0.4)',
        }}
      >
        <h2
          style={{
            margin: '0 0 0.5rem',
            fontSize: '1.2rem',
            color: 'var(--text-primary, #fff)',
          }}
        >
          New Assignment
        </h2>
        <p
          style={{
            margin: '0 0 1.5rem',
            fontSize: '0.85rem',
            color: 'var(--text-secondary, #888)',
          }}
        >
          Choose how to start your {instrument} lesson
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {options.map(opt => (
            <button
              key={opt.key}
              onClick={() => !opt.disabled && onChoice(opt.key)}
              disabled={opt.disabled}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '14px',
                width: '100%',
                padding: '14px 16px',
                background: 'var(--bg-tertiary, rgba(255,255,255,0.03))',
                border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                borderRadius: '12px',
                color: 'var(--text-primary, #fff)',
                cursor: opt.disabled ? 'not-allowed' : 'pointer',
                textAlign: 'left',
                opacity: opt.disabled ? 0.4 : 1,
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                if (!opt.disabled) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                  e.currentTarget.style.borderColor = opt.color
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--bg-tertiary, rgba(255,255,255,0.03))'
                e.currentTarget.style.borderColor = 'var(--border-color, rgba(255,255,255,0.06))'
              }}
            >
              <div
                style={{
                  width: '42px',
                  height: '42px',
                  borderRadius: '10px',
                  background: opt.color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  flexShrink: 0,
                }}
              >
                {opt.icon}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '2px' }}>
                  {opt.title}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary, #888)' }}>
                  {opt.description}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
