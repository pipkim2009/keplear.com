import { useCallback } from 'react'
import {
  useInstrumentType,
  useAudioPlayback,
  useNoteSelection,
  useOctaveRange,
} from '../../hooks/useInstrumentSelectors'
import { useTranslation } from '../../contexts/TranslationContext'
import SEOHead from '../common/SEOHead'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import type { Note } from '../../utils/notes'
import styles from '../../styles/Instruments.module.css'

export default function Instruments() {
  const { t } = useTranslation()
  const { instrument, handleInstrumentChange } = useInstrumentType()
  const { playNote, playGuitarNote, playBassNote } = useAudioPlayback()
  const { setGuitarNotes } = useNoteSelection()
  const { handleOctaveRangeChange } = useOctaveRange()

  // Play-only handler — no note selection
  const handleNotePlay = useCallback(
    async (note: Note) => {
      if (instrument === 'guitar') {
        await playGuitarNote(note.name)
      } else if (instrument === 'bass') {
        await playBassNote(note.name)
      } else {
        await playNote(note.name)
      }
    },
    [instrument, playNote, playGuitarNote, playBassNote]
  )

  return (
    <div className={styles.instrumentsContainer}>
      <SEOHead
        title={t('instrument.title')}
        description={t('instrument.subtitle')}
        path="/instruments"
      />

      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>{t('instrument.title')}</h1>
        <p className={styles.pageSubtitle}>{t('instrument.subtitle')}</p>
      </div>

      <InstrumentDisplay
        onNoteClick={handleNotePlay}
        instrument={instrument}
        setInstrument={handleInstrumentChange}
        setGuitarNotes={setGuitarNotes}
        onOctaveRangeChange={handleOctaveRangeChange}
        hideGenerateButton
        hideBpmButtons
        hideBeatsButtons
        hideChordMode
        hideScalesChords
        hideDeselectAll
        practiceMode
      />
    </div>
  )
}
