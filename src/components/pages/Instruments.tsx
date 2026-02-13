import { useCallback } from 'react'
import { useInstrument } from '../../contexts/InstrumentContext'
import { useTranslation } from '../../contexts/TranslationContext'
import SEOHead from '../common/SEOHead'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import type { Note } from '../../utils/notes'
import styles from '../../styles/Instruments.module.css'

export default function Instruments() {
  const { t } = useTranslation()
  const {
    instrument,
    handleInstrumentChange,
    setGuitarNotes,
    handleOctaveRangeChange,
    playNote,
    playGuitarNote,
    playBassNote,
  } = useInstrument()

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

  const noOp = useCallback(() => {}, [])
  const alwaysFalse = useCallback(() => false, [])

  return (
    <div className={styles.instrumentsContainer}>
      <SEOHead
        title={t('instrument.title')}
        description={t('instrument.subtitle')}
        path="/instrument"
      />

      <div className={styles.headerSection}>
        <h1 className={styles.pageTitle}>{t('instrument.title')}</h1>
        <p className={styles.pageSubtitle}>{t('instrument.subtitle')}</p>
      </div>

      <InstrumentDisplay
        onNoteClick={handleNotePlay}
        isSelected={alwaysFalse}
        isInMelody={alwaysFalse}
        showNotes={false}
        bpm={120}
        setBpm={noOp}
        numberOfBeats={4}
        setNumberOfBeats={noOp}
        instrument={instrument}
        setInstrument={handleInstrumentChange}
        setGuitarNotes={setGuitarNotes}
        clearSelection={noOp}
        clearTrigger={0}
        selectedNotes={[]}
        onOctaveRangeChange={handleOctaveRangeChange}
        flashingInputs={{ bpm: false, beats: false, mode: false }}
        triggerInputFlash={noOp}
        setInputActive={noOp}
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
