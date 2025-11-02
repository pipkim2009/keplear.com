import { useState } from 'react'
import styles from '../../styles/Practice.module.css'
import { PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarBassHead, GiGuitarHead } from 'react-icons/gi'
import type { IconType } from 'react-icons'
import InstrumentDisplay from '../keyboard/InstrumentDisplay'
import { useInstrument } from '../../contexts/InstrumentContext'

interface PracticeProps {
  onNavigateToSandbox: () => void
}

interface InstrumentLesson {
  id: string
  name: string
  icon: IconType
  description: string
}

const instrumentLessons: InstrumentLesson[] = [
  {
    id: 'keyboard',
    name: 'Keyboard',
    icon: PiPianoKeysFill,
    description: 'Start a keyboard ear training session'
  },
  {
    id: 'guitar',
    name: 'Guitar',
    icon: GiGuitarHead,
    description: 'Start a guitar ear training session'
  },
  {
    id: 'bass',
    name: 'Bass',
    icon: GiGuitarBassHead,
    description: 'Start a bass ear training session'
  }
]

function Practice({ onNavigateToSandbox }: PracticeProps) {
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null)

  const {
    handleNoteClick,
    isSelected,
    isInMelody,
    showNotes,
    bpm,
    setBpm,
    numberOfBeats,
    setNumberOfBeats,
    chordMode,
    setChordMode,
    instrument,
    handleInstrumentChange,
    setGuitarNotes,
    clearSelection,
    clearTrigger,
    selectedNotes,
    selectNote,
    handleOctaveRangeChange,
    keyboardSelectionMode,
    handleKeyboardSelectionModeChange,
    flashingInputs,
    activeInputs,
    triggerInputFlash,
    setInputActive,
    clearChordsAndScalesTrigger,
    handleGenerateMelody,
    handlePlayMelody,
    handleRecordMelody,
    isPlaying,
    isRecording,
    generatedMelody,
    toggleShowNotes,
    playbackProgress,
    melodyDuration,
    setPlaybackProgress,
    handleClearRecordedAudio,
    recordedAudioBlob,
    hasChanges,
    isGeneratingMelody,
    isAutoRecording,
    currentlyPlayingNoteIndex,
    handleCurrentlyPlayingNoteChange
  } = useInstrument()

  const handleStartLesson = (instrumentId: string) => {
    console.log(`Starting ${instrumentId} lesson`)
    setSelectedInstrument(instrumentId)
    handleInstrumentChange(instrumentId)
  }

  const handleBackToSelection = () => {
    setSelectedInstrument(null)
  }

  // If an instrument is selected, show the instrument display
  if (selectedInstrument) {
    return (
      <>
        <div className={styles.backButtonContainer}>
          <button
            className={styles.backButton}
            onClick={handleBackToSelection}
            aria-label="End practice session"
          >
            End Session
          </button>
        </div>
        <InstrumentDisplay
          onNoteClick={handleNoteClick}
          isSelected={isSelected}
          isInMelody={isInMelody}
          showNotes={showNotes}
          bpm={bpm}
          setBpm={setBpm}
          numberOfBeats={numberOfBeats}
          setNumberOfBeats={setNumberOfBeats}
          chordMode={chordMode}
          setChordMode={setChordMode}
          instrument={instrument}
          setInstrument={handleInstrumentChange}
          setGuitarNotes={setGuitarNotes}
          clearSelection={clearSelection}
          clearTrigger={clearTrigger}
          selectedNotes={selectedNotes}
          selectNote={selectNote}
          onOctaveRangeChange={handleOctaveRangeChange}
          keyboardSelectionMode={keyboardSelectionMode}
          onKeyboardSelectionModeChange={handleKeyboardSelectionModeChange}
          flashingInputs={{
            bpm: flashingInputs.bpm || activeInputs.bpm,
            beats: flashingInputs.beats || activeInputs.beats,
            mode: flashingInputs.mode || activeInputs.mode
          }}
          triggerInputFlash={triggerInputFlash}
          setInputActive={setInputActive}
          clearChordsAndScales={clearChordsAndScalesTrigger}
          onGenerateMelody={handleGenerateMelody}
          onPlayMelody={handlePlayMelody}
          onRecordMelody={handleRecordMelody}
          isPlaying={isPlaying}
          isRecording={isRecording}
          hasGeneratedMelody={generatedMelody.length > 0}
          onToggleNotes={toggleShowNotes}
          playbackProgress={playbackProgress}
          melodyDuration={melodyDuration}
          onProgressChange={setPlaybackProgress}
          onClearRecordedAudio={handleClearRecordedAudio}
          recordedAudioBlob={recordedAudioBlob}
          generatedMelody={generatedMelody}
          hasChanges={hasChanges}
          isGeneratingMelody={isGeneratingMelody}
          isAutoRecording={isAutoRecording}
          currentlyPlayingNoteIndex={currentlyPlayingNoteIndex}
          onCurrentlyPlayingNoteChange={handleCurrentlyPlayingNoteChange}
          hideInstrumentSelector={true}
          hideOctaveRange={true}
          hideBpmButtons={true}
          hideBeatsButtons={true}
          hideGenerateButton={true}
          hideDeselectAll={true}
          showOnlyAppliedList={true}
        />
      </>
    )
  }

  // Otherwise, show the instrument selection
  return (
    <div className={styles.practiceContainer}>
      {/* Header Section */}
      <section className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Practice Mode</h1>
        <p className={styles.pageSubtitle}>
          Choose your instrument and start improving your ear training skills
        </p>
      </section>

      {/* Instruments Grid */}
      <section className={styles.instrumentsSection}>
        <div className={styles.instrumentsGrid}>
          {instrumentLessons.map((instrument) => {
            const Icon = instrument.icon
            return (
              <div key={instrument.id} className={styles.instrumentCard}>
                <div className={styles.instrumentIcon}>
                  <Icon />
                </div>
                <h3 className={styles.instrumentName}>{instrument.name}</h3>
                <p className={styles.instrumentDescription}>{instrument.description}</p>
                <button
                  className={styles.instrumentButton}
                  onClick={() => handleStartLesson(instrument.id)}
                  aria-label={`Start ${instrument.name} lesson`}
                >
                  Start Lesson
                </button>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

export default Practice
