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
      // Cancel any ongoing speech
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      }
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
  const [melodyLength, setMelodyLength] = useState(4)
  const [targetMelody, setTargetMelody] = useState<Note[]>([])
  const [feedbackMessage, setFeedbackMessage] = useState<string>('')
  const [welcomeSpeechDone, setWelcomeSpeechDone] = useState(false)

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
    console.log('Starting practice session with options:', selectedOptions)
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
    setTargetMelody([])
    setFeedbackMessage('')
    setWelcomeSpeechDone(false)
  }

  // Auto-select notes when session starts for Simple Melodies
  useEffect(() => {
    if (sessionStarted && practiceOptions.includes('simple-melodies') && selectedNotes.length === 0) {
      console.log('Auto-selecting notes for Simple Melodies...')

      // Generate all notes for full keyboard range (octaves 1-8)
      const allNotes = generateNotesWithSeparateOctaves(3, 3)

      // Randomly select a range of notes from all octaves
      const octaves = [1, 2, 3, 4, 5, 6, 7, 8] // Full octave range
      const randomOctave = octaves[Math.floor(Math.random() * octaves.length)]

      // All notes in chromatic scale
      const chromaticNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

      // Randomly choose 3-6 notes from the chromatic scale
      const noteCount = Math.floor(Math.random() * 4) + 3 // 3 to 6 notes

      // Shuffle and pick random notes
      const shuffledNotes = [...chromaticNotes].sort(() => Math.random() - 0.5)
      const selectedNoteNames = shuffledNotes.slice(0, noteCount)

      // Create full note names with the octave (e.g., "C4", "E4")
      const autoNoteNames = selectedNoteNames.map(noteName => `${noteName}${randomOctave}`)

      console.log('Looking for notes:', autoNoteNames)

      // Find the actual Note objects from the full notes array
      const autoNotes = autoNoteNames
        .map(noteName => {
          const found = allNotes.find(n => n.name === noteName)
          if (!found) {
            console.log('Could not find note:', noteName)
          }
          return found
        })
        .filter((note): note is Note => note !== undefined)

      console.log('Selected notes:', autoNotes.map(n => n.name))

      // Use setGuitarNotes to set all notes at once (works for all instruments)
      setGuitarNotes(autoNotes)
      console.log('Notes set via setGuitarNotes')
    }
  }, [sessionStarted, practiceOptions, selectedNotes.length, setGuitarNotes, instrument])

  // Generate melody after welcome speech is done
  useEffect(() => {
    if (welcomeSpeechDone && practiceOptions.includes('simple-melodies') && targetMelody.length === 0 && selectedNotes.length > 0) {
      handleGenerateTargetMelody()
    }
  }, [welcomeSpeechDone, practiceOptions, targetMelody.length, selectedNotes.length])

  // Simple Melodies Lesson Functions
  const handleGenerateTargetMelody = () => {
    if (selectedNotes.length === 0) {
      setFeedbackMessage('Please select some notes first!')
      return
    }

    // Generate random melody from selected notes
    const melody: Note[] = []
    for (let i = 0; i < melodyLength; i++) {
      const randomIndex = Math.floor(Math.random() * selectedNotes.length)
      melody.push(selectedNotes[randomIndex])
    }

    setTargetMelody(melody)
    setFeedbackMessage('')

    // Text-to-speech announcement
    const noteNames = melody.map(note => note.name).join(', ')
    const announcement = `I have set up a ${melodyLength} note melody containing ${noteNames} at ${bpm} BPM`

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(announcement)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1

      // Auto-play melody after announcement
      utterance.onend = () => {
        handlePlayMelody()
      }

      window.speechSynthesis.speak(utterance)
    } else {
      // Fallback: just play melody if no TTS
      handlePlayMelody()
    }

    console.log('Target melody:', melody.map(n => n.name))
  }

  const handleCheckAnswer = () => {
    if (targetMelody.length === 0) {
      setFeedbackMessage('Generate a melody first!')
      return
    }

    if (generatedMelody.length === 0) {
      setFeedbackMessage('Please recreate the melody by clicking notes!')
      return
    }

    // Check if user's melody matches target (compare by note names)
    const isCorrect =
      generatedMelody.length === targetMelody.length &&
      generatedMelody.every((note, index) => note.name === targetMelody[index].name)

    if (isCorrect) {
      setFeedbackMessage('✓ Correct! Well done!')
    } else {
      setFeedbackMessage('✗ Not quite right. Listen again and try!')
    }
  }

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
          showOnlyAppliedList={true}
          disableBpmInput={true}
          disableBeatsInput={true}
          disableChordMode={true}
          disableSelectionMode={true}
        />

        {/* Welcome Subtitle Overlay */}
        <WelcomeSubtitle
          message={welcomeMessage}
          onSpeechEnd={() => setWelcomeSpeechDone(true)}
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
