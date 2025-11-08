import { useState, useEffect, useRef } from 'react'
import styles from '../../styles/Practice.module.css'
import { PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarBassHead, GiGuitarHead } from 'react-icons/gi'
import type { IconType } from 'react-icons'
import InstrumentDisplay from '../keyboard/InstrumentDisplay'
import PracticeOptionsModal from './PracticeOptionsModal'
import { useInstrument } from '../../contexts/InstrumentContext'
import { generateNotesWithSeparateOctaves } from '../../utils/notes'
import type { Note } from '../../utils/notes'

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

// Welcome Subtitle Component with Text-to-Speech
interface WelcomeSubtitleProps {
  message: string
  onSpeechEnd?: () => void
}

const WelcomeSubtitle: React.FC<WelcomeSubtitleProps> = ({ message, onSpeechEnd }) => {
  const [isVisible, setIsVisible] = useState(true)
  const hasSpoken = useRef(false)
  const speechFinished = useRef(false)

  useEffect(() => {
    // Text-to-speech functionality - only speak once
    if ('speechSynthesis' in window && !hasSpoken.current) {
      hasSpoken.current = true

      const utterance = new SpeechSynthesisUtterance(message)
      utterance.rate = 0.9 // Slightly slower for clarity
      utterance.pitch = 1
      utterance.volume = 1

      // Call onSpeechEnd when speech finishes
      utterance.onend = () => {
        speechFinished.current = true
        if (onSpeechEnd) {
          onSpeechEnd()
        }
      }

      window.speechSynthesis.speak(utterance)
    } else if (!('speechSynthesis' in window) && onSpeechEnd) {
      // If no TTS, call onSpeechEnd immediately
      onSpeechEnd()
    }

    // Hide subtitle after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false)
    }, 5000)

    return () => {
      clearTimeout(timer)
    }
  }, [message, onSpeechEnd])

  if (!isVisible) return null

  return (
    <div className={styles.welcomeSubtitle}>
      {message}
    </div>
  )
}

function Practice({ onNavigateToSandbox }: PracticeProps) {
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null)
  const [showOptionsModal, setShowOptionsModal] = useState(false)
  const [practiceOptions, setPracticeOptions] = useState<string[]>([])
  const [sessionStarted, setSessionStarted] = useState(false)

  // Simple Melodies Lesson State
  const [feedbackMessage, setFeedbackMessage] = useState<string>('')
  const [welcomeSpeechDone, setWelcomeSpeechDone] = useState(false)
  const [hasGeneratedMelody, setHasGeneratedMelody] = useState(false)
  const hasAnnouncedMelody = useRef(false)
  const [melodySetupMessage, setMelodySetupMessage] = useState<string>('')
  const [congratulationsMessage, setCongratulationsMessage] = useState<string>('')

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
    setSelectedInstrument(instrumentId)
    handleInstrumentChange(instrumentId)
    setShowOptionsModal(true)
  }

  const handleOptionsStart = (selectedOptions: string[]) => {
    setPracticeOptions(selectedOptions)
    setShowOptionsModal(false)
    setSessionStarted(true)
  }

  const handleOptionsCancel = () => {
    setShowOptionsModal(false)
    setSelectedInstrument(null)
  }

  const handleBackToSelection = () => {
    setSelectedInstrument(null)
    setShowOptionsModal(false)
    setPracticeOptions([])
    setSessionStarted(false)
    setFeedbackMessage('')
    setWelcomeSpeechDone(false)
    setHasGeneratedMelody(false)
    hasAnnouncedMelody.current = false
    setMelodySetupMessage('')
    setCongratulationsMessage('')
    setBpm(120) // Reset BPM to default
    setNumberOfBeats(4) // Reset beats to default
  }

  const handleLessonComplete = () => {
    const message = "Congratulations on completing today's lesson!"
    setCongratulationsMessage(message)
  }

  // Auto-select notes and BPM when session starts for Simple Melodies
  useEffect(() => {
    if (sessionStarted && practiceOptions.includes('simple-melodies') && selectedNotes.length === 0) {
      // Switch to multi-selection mode for keyboard (needed for 3-6 notes)
      if (instrument === 'keyboard') {
        handleKeyboardSelectionModeChange('multi', false)
      }

      // Randomly select BPM (30 to 240 in 30 BPM increments)
      const bpmOptions = Array.from({ length: 8 }, (_, i) => (i + 1) * 30)
      const randomBPM = bpmOptions[Math.floor(Math.random() * bpmOptions.length)]
      setBpm(randomBPM)

      // Randomly select number of beats (3 to 8)
      const randomBeats = Math.floor(Math.random() * 6) + 3
      setNumberOfBeats(randomBeats)

      // Generate all notes for full keyboard range (octaves 1-8)
      const allNotes = generateNotesWithSeparateOctaves(3, 3)

      // Randomly select a range of notes from all octaves
      const octaves = [1, 2, 3, 4, 5, 6, 7, 8]
      const randomOctave = octaves[Math.floor(Math.random() * octaves.length)]

      // All notes in chromatic scale
      const chromaticNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

      // Randomly choose 3-6 notes from the chromatic scale
      const noteCount = Math.floor(Math.random() * 4) + 3

      // Shuffle and pick random notes
      const shuffledNotes = [...chromaticNotes].sort(() => Math.random() - 0.5)
      const selectedNoteNames = shuffledNotes.slice(0, noteCount)

      // Create full note names with the octave (e.g., "C4", "E4")
      const autoNoteNames = selectedNoteNames.map(noteName => `${noteName}${randomOctave}`)

      // Find the actual Note objects from the full notes array
      const autoNotes = autoNoteNames
        .map(noteName => allNotes.find(n => n.name === noteName))
        .filter((note): note is Note => note !== undefined)

      // Use setGuitarNotes to set all notes at once (works for all instruments)
      setGuitarNotes(autoNotes)
    }
  }, [sessionStarted, practiceOptions, selectedNotes.length, setGuitarNotes, setBpm, instrument, handleKeyboardSelectionModeChange])

  // Trigger melody generation once notes are selected
  useEffect(() => {
    if (sessionStarted && practiceOptions.includes('simple-melodies') && selectedNotes.length > 0 && !hasGeneratedMelody) {
      handleGenerateMelody()
      setHasGeneratedMelody(true)
    }
  }, [sessionStarted, practiceOptions, selectedNotes.length, hasGeneratedMelody, handleGenerateMelody])

  // Announce and play when welcome speech is done and melody is ready
  useEffect(() => {
    if (welcomeSpeechDone && practiceOptions.includes('simple-melodies') && generatedMelody.length > 0 && recordedAudioBlob && !hasAnnouncedMelody.current) {
      hasAnnouncedMelody.current = true

      // Extract octave number from first note (all notes are in same octave)
      const firstNoteName = generatedMelody[0].name
      const octaveNumber = firstNoteName.match(/\d+$/)?.[0] || '4'

      // Convert octave number to ordinal
      const octaveOrdinals: { [key: string]: string } = {
        '1': 'first', '2': 'second', '3': 'third', '4': 'fourth',
        '5': 'fifth', '6': 'sixth', '7': 'seventh', '8': 'eighth'
      }
      const octaveOrdinal = octaveOrdinals[octaveNumber] || 'fourth'

      const announcement = `I have set up a ${generatedMelody.length} note melody on the ${octaveOrdinal} octave at ${bpm} BPM`

      // Set the message for subtitle display (WelcomeSubtitle component will handle TTS and subtitle)
      setMelodySetupMessage(announcement)
    }
  }, [welcomeSpeechDone, practiceOptions, generatedMelody, recordedAudioBlob, bpm])


  // Show practice options modal
  if (showOptionsModal && selectedInstrument) {
    const instrumentName = instrumentLessons.find(i => i.id === selectedInstrument)?.name || 'Instrument'
    return (
      <PracticeOptionsModal
        instrumentName={instrumentName}
        onStart={handleOptionsStart}
        onCancel={handleOptionsCancel}
      />
    )
  }

  // If an instrument is selected and session started, show the instrument display
  if (selectedInstrument && sessionStarted) {
    const instrumentName = instrumentLessons.find(i => i.id === selectedInstrument)?.name || 'Instrument'

    // Get the practice topic label
    const practiceTopics = [
      { id: 'simple-melodies', label: 'Simple Melodies' },
      { id: 'scales', label: 'Scales' },
      { id: 'chord-progressions', label: 'Chord Progressions' },
      { id: 'chord-arpeggios', label: 'Chord Arpeggios' }
    ]
    const practiceTopicLabel = practiceOptions.map(opt =>
      practiceTopics.find(t => t.id === opt)?.label || opt
    ).join(', ')

    const welcomeMessage = `Welcome to your ${instrumentName} lesson on ${practiceTopicLabel}`

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
          initialLowerOctaves={3}
          initialHigherOctaves={3}
          disableOctaveCleanup={true}
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
          showOnlyAppliedList={false}
          hideChordMode={true}
          disableBpmInput={true}
          disableBeatsInput={true}
          disableChordMode={true}
          disableSelectionMode={true}
          hideSelectionMode={true}
          practiceMode={true}
          onLessonComplete={handleLessonComplete}
        />

        {/* Welcome Subtitle Overlay */}
        <WelcomeSubtitle
          message={welcomeMessage}
          onSpeechEnd={() => setWelcomeSpeechDone(true)}
        />

        {/* Melody Setup Subtitle Overlay */}
        {melodySetupMessage && (
          <WelcomeSubtitle
            message={melodySetupMessage}
            onSpeechEnd={handlePlayMelody}
          />
        )}

        {/* Congratulations Subtitle Overlay */}
        {congratulationsMessage && (
          <WelcomeSubtitle
            message={congratulationsMessage}
            onSpeechEnd={handleBackToSelection}
          />
        )}
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
