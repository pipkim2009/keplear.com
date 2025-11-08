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
import { KEYBOARD_SCALES, ROOT_NOTES } from '../../utils/instruments/keyboard/keyboardScales'
import { KEYBOARD_CHORDS, KEYBOARD_CHORD_ROOT_NOTES } from '../../utils/instruments/keyboard/keyboardChords'

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
  const [setupDetails, setSetupDetails] = useState<{ type: string; details: any } | null>(null)

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
    handleCurrentlyPlayingNoteChange,
    scaleChordManagement
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
    setSetupDetails(null)
    setBpm(120) // Reset BPM to default
    setNumberOfBeats(4) // Reset beats to default
    setChordMode('arpeggiator') // Reset chord mode to default
    handleOctaveRangeChange(0, 0) // Reset octave range to default (show only middle octave)
  }

  const handleLessonComplete = () => {
    const message = "Congratulations on completing today's lesson!"
    setCongratulationsMessage(message)
  }

  // Auto-select notes/scales/chords and BPM when session starts
  useEffect(() => {
    const hasNoContent = selectedNotes.length === 0 &&
                         scaleChordManagement.appliedScales.length === 0 &&
                         scaleChordManagement.appliedChords.length === 0

    if (sessionStarted && hasNoContent && instrument === 'keyboard') {
      // Randomly select BPM (30 to 240 in 30 BPM increments)
      const bpmOptions = Array.from({ length: 8 }, (_, i) => (i + 1) * 30)
      const randomBPM = bpmOptions[Math.floor(Math.random() * bpmOptions.length)]
      setBpm(randomBPM)

      // Randomly select number of beats (3 to 8)
      const randomBeats = Math.floor(Math.random() * 6) + 3
      setNumberOfBeats(randomBeats)

      // Randomly select octave (1-8)
      const octaves = [1, 2, 3, 4, 5, 6, 7, 8]
      const randomOctave = octaves[Math.floor(Math.random() * octaves.length)]

      // Set octave range to show only the selected octave
      // Formula: to show octave N, set lowerOctaves = 4 - N, higherOctaves = N - 4
      const lowerOctavesForRange = 4 - randomOctave
      const higherOctavesForRange = randomOctave - 4
      handleOctaveRangeChange(lowerOctavesForRange, higherOctavesForRange)

      // Generate all notes for the selected octave
      const allNotesInOctave = generateNotesWithSeparateOctaves(3, 3).filter(note => {
        const noteOctave = note.name.match(/\d+$/)?.[0]
        return noteOctave === randomOctave.toString()
      })

      // SIMPLE MELODIES: 3-6 random notes on single octave
      if (practiceOptions.includes('simple-melodies')) {
        handleKeyboardSelectionModeChange('multi', false)

        const chromaticNotes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        const noteCount = Math.floor(Math.random() * 4) + 3
        const shuffledNotes = [...chromaticNotes].sort(() => Math.random() - 0.5)
        const selectedNoteNames = shuffledNotes.slice(0, noteCount)
        const autoNoteNames = selectedNoteNames.map(noteName => `${noteName}${randomOctave}`)
        const autoNotes = autoNoteNames
          .map(noteName => allNotesInOctave.find(n => n.name === noteName))
          .filter((note): note is Note => note !== undefined)

        setGuitarNotes(autoNotes)
        setSetupDetails({ type: 'simple-melodies', details: { noteCount: autoNotes.length, octave: randomOctave } })
      }

      // SCALES: Single random scale on single octave
      else if (practiceOptions.includes('scales')) {
        const randomScale = KEYBOARD_SCALES[Math.floor(Math.random() * KEYBOARD_SCALES.length)]
        const randomRoot = ROOT_NOTES[Math.floor(Math.random() * ROOT_NOTES.length)]

        // Use the scale chord management system to apply the scale
        scaleChordManagement.handleKeyboardScaleApply(randomRoot, randomScale, randomOctave)

        setSetupDetails({ type: 'scales', details: { scaleName: randomScale.name, root: randomRoot, octave: randomOctave } })
      }

      // CHORD PROGRESSIONS: 3-6 random chords with progression mode
      else if (practiceOptions.includes('chord-progressions')) {
        setChordMode('progression')

        const chordCount = Math.floor(Math.random() * 4) + 3 // 3-6 chords
        const chordDetails: { root: string; chord: string }[] = []

        for (let i = 0; i < chordCount; i++) {
          const randomChord = KEYBOARD_CHORDS[Math.floor(Math.random() * KEYBOARD_CHORDS.length)]
          const randomRoot = KEYBOARD_CHORD_ROOT_NOTES[Math.floor(Math.random() * KEYBOARD_CHORD_ROOT_NOTES.length)]

          // Use the scale chord management system to apply each chord
          scaleChordManagement.handleKeyboardChordApply(randomRoot, randomChord, randomOctave)

          chordDetails.push({ root: randomRoot, chord: randomChord.name })
        }

        setSetupDetails({ type: 'chord-progressions', details: { chordCount, chords: chordDetails, octave: randomOctave } })
      }

      // CHORD ARPEGGIOS: 3-6 random chords with arpeggiator mode
      else if (practiceOptions.includes('chord-arpeggios')) {
        setChordMode('arpeggiator')

        const chordCount = Math.floor(Math.random() * 4) + 3 // 3-6 chords
        const chordDetails: { root: string; chord: string }[] = []

        for (let i = 0; i < chordCount; i++) {
          const randomChord = KEYBOARD_CHORDS[Math.floor(Math.random() * KEYBOARD_CHORDS.length)]
          const randomRoot = KEYBOARD_CHORD_ROOT_NOTES[Math.floor(Math.random() * KEYBOARD_CHORD_ROOT_NOTES.length)]

          // Use the scale chord management system to apply each chord
          scaleChordManagement.handleKeyboardChordApply(randomRoot, randomChord, randomOctave)

          chordDetails.push({ root: randomRoot, chord: randomChord.name })
        }

        setSetupDetails({ type: 'chord-arpeggios', details: { chordCount, chords: chordDetails, octave: randomOctave } })
      }
    }
  }, [sessionStarted, practiceOptions, selectedNotes.length, scaleChordManagement.appliedScales.length, scaleChordManagement.appliedChords.length, setGuitarNotes, setBpm, setNumberOfBeats, instrument, handleKeyboardSelectionModeChange, setChordMode, handleOctaveRangeChange, scaleChordManagement])

  // Trigger melody generation once notes/scales/chords are selected (for all lesson types)
  useEffect(() => {
    const hasContent = selectedNotes.length > 0 ||
                       scaleChordManagement.appliedScales.length > 0 ||
                       scaleChordManagement.appliedChords.length > 0

    if (sessionStarted && hasContent && !hasGeneratedMelody) {
      handleGenerateMelody()
      setHasGeneratedMelody(true)
    }
  }, [sessionStarted, selectedNotes.length, scaleChordManagement.appliedScales.length, scaleChordManagement.appliedChords.length, hasGeneratedMelody, handleGenerateMelody])

  // Announce and play when welcome speech is done and melody is ready (for all lesson types)
  useEffect(() => {
    if (welcomeSpeechDone && generatedMelody.length > 0 && recordedAudioBlob && !hasAnnouncedMelody.current && setupDetails) {
      hasAnnouncedMelody.current = true

      // Convert octave number to ordinal
      const octaveOrdinals: { [key: string]: string } = {
        '1': 'first', '2': 'second', '3': 'third', '4': 'fourth',
        '5': 'fifth', '6': 'sixth', '7': 'seventh', '8': 'eighth'
      }

      let announcement = ''

      // Create announcement based on lesson type
      if (setupDetails.type === 'simple-melodies') {
        const octaveOrdinal = octaveOrdinals[setupDetails.details.octave.toString()] || 'fourth'
        announcement = `I have set up a ${generatedMelody.length} note melody on the ${octaveOrdinal} octave at ${bpm} BPM`
      }
      else if (setupDetails.type === 'scales') {
        const octaveOrdinal = octaveOrdinals[setupDetails.details.octave.toString()] || 'fourth'
        announcement = `I have set up a ${setupDetails.details.root} ${setupDetails.details.scaleName} scale on the ${octaveOrdinal} octave at ${bpm} BPM`
      }
      else if (setupDetails.type === 'chord-progressions') {
        const octaveOrdinal = octaveOrdinals[setupDetails.details.octave.toString()] || 'fourth'
        const chordNames = setupDetails.details.chords.map((c: any) => `${c.root} ${c.chord}`).join(', ')
        announcement = `I have set up a ${setupDetails.details.chordCount} chord progression on the ${octaveOrdinal} octave at ${bpm} BPM with progression mode`
      }
      else if (setupDetails.type === 'chord-arpeggios') {
        const octaveOrdinal = octaveOrdinals[setupDetails.details.octave.toString()] || 'fourth'
        const chordNames = setupDetails.details.chords.map((c: any) => `${c.root} ${c.chord}`).join(', ')
        announcement = `I have set up ${setupDetails.details.chordCount} chord arpeggios on the ${octaveOrdinal} octave at ${bpm} BPM with arpeggiator mode`
      }

      // Set the message for subtitle display (WelcomeSubtitle component will handle TTS and subtitle)
      setMelodySetupMessage(announcement)
    }
  }, [welcomeSpeechDone, generatedMelody, recordedAudioBlob, bpm, setupDetails])


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
