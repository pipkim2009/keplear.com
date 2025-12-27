import { useState, useEffect, useRef } from 'react'
import styles from '../../styles/Practice.module.css'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import PracticeOptionsModal, { type LessonSettings } from './PracticeOptionsModal'
import { useInstrument } from '../../contexts/InstrumentContext'
import type { Note } from '../../utils/notes'
import { KEYBOARD_SCALES, ROOT_NOTES } from '../../utils/instruments/keyboard/keyboardScales'
import { KEYBOARD_CHORDS, KEYBOARD_CHORD_ROOT_NOTES } from '../../utils/instruments/keyboard/keyboardChords'
import { GUITAR_SCALES, ROOT_NOTES as GUITAR_ROOT_NOTES, getScalePositions } from '../../utils/instruments/guitar/guitarScales'
import { GUITAR_CHORDS, CHORD_ROOT_NOTES as GUITAR_CHORD_ROOT_NOTES } from '../../utils/instruments/guitar/guitarChords'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import { BASS_SCALES, BASS_ROOT_NOTES, getBassScalePositions } from '../../utils/instruments/bass/bassScales'
import { BASS_CHORDS, BASS_CHORD_ROOT_NOTES } from '../../utils/instruments/bass/bassChords'
import { bassNotes } from '../../utils/instruments/bass/bassNotes'
import {
  getGuitarNoteById,
  getBassNoteById
} from '../../utils/practice/practiceNotes'

interface PracticeProps {
  onNavigateToSandbox: () => void
}

const instrumentNames: Record<string, string> = {
  keyboard: 'Keyboard',
  guitar: 'Guitar',
  bass: 'Bass'
}

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

  // Lesson State
  const [feedbackMessage, setFeedbackMessage] = useState<string>('')
  const [welcomeSpeechDone, setWelcomeSpeechDone] = useState(false)
  const [hasGeneratedMelody, setHasGeneratedMelody] = useState(false)
  const hasAnnouncedMelody = useRef(false)
  const hasInitializedNotes = useRef(false)
  const hasAppliedVisualDisplay = useRef(false)
  const [melodySetupMessage, setMelodySetupMessage] = useState<string>('')
  const [congratulationsMessage, setCongratulationsMessage] = useState<string>('')
  const [setupDetails, setSetupDetails] = useState<{ type: string; details: any } | null>(null)
  const [autoPlayAudio, setAutoPlayAudio] = useState(false)

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
    setInstrument,
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

  const handleStartLesson = () => {
    setShowOptionsModal(true)
  }

  const [difficulty, setDifficulty] = useState<number>(2) // 0-4: Beginner to Expert
  const [lessonSettings, setLessonSettings] = useState<LessonSettings | null>(null)

  const handleOptionsStart = (instrumentId: string, selectedOptions: string[], selectedDifficulty: number, settings: LessonSettings) => {
    setSelectedInstrument(instrumentId)
    // Use setInstrument directly instead of handleInstrumentChange to avoid
    // triggering clearChordsAndScales which would clear scales added by initialization
    setInstrument(instrumentId as 'keyboard' | 'guitar' | 'bass')
    setPracticeOptions(selectedOptions)
    setDifficulty(selectedDifficulty)
    setLessonSettings(settings)
    setShowOptionsModal(false)
    setSessionStarted(true)
  }

  const handleOptionsCancel = () => {
    setShowOptionsModal(false)
    setSelectedInstrument(null)
  }

  const handleBackToSelection = () => {
    // Stop any ongoing text-to-speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    setSelectedInstrument(null)
    setShowOptionsModal(false)
    setPracticeOptions([])
    setSessionStarted(false)
    setFeedbackMessage('')
    setWelcomeSpeechDone(false)
    setHasGeneratedMelody(false)
    hasAnnouncedMelody.current = false
    hasInitializedNotes.current = false
    hasAppliedVisualDisplay.current = false
    setMelodySetupMessage('')
    setCongratulationsMessage('')
    setSetupDetails(null)
    setAutoPlayAudio(false)
    setLessonSettings(null)
    setBpm(120) // Reset BPM to default
    setNumberOfBeats(4) // Reset beats to default
    setChordMode('arpeggiator') // Reset chord mode to default
    handleOctaveRangeChange(0, 0) // Reset octave range to default (show only middle octave)
  }

  const handleLessonComplete = () => {
    const message = "Congratulations on completing today's lesson!"
    setCongratulationsMessage(message)
  }

  // Helper function to filter scales based on user selection
  const getFilteredScales = (scales: typeof KEYBOARD_SCALES, scaleFilter: string | undefined) => {
    if (!scaleFilter || scaleFilter === 'all') return scales
    if (scaleFilter === 'major') return scales.filter(s => s.name === 'Major')
    if (scaleFilter === 'major-minor') return scales.filter(s => s.name === 'Major' || s.name === 'Minor')
    if (scaleFilter === 'modes') return scales.filter(s =>
      ['Dorian', 'Phrygian', 'Lydian', 'Mixolydian', 'Locrian'].includes(s.name)
    )
    return scales
  }

  // Helper function to filter chords based on user selection
  const getFilteredChords = (chords: typeof KEYBOARD_CHORDS, chordFilter: string | undefined) => {
    if (!chordFilter || chordFilter === 'all') return chords
    if (chordFilter === 'major') return chords.filter(c => c.name === 'Major')
    if (chordFilter === 'major-minor') return chords.filter(c => c.name === 'Major' || c.name === 'Minor')
    return chords
  }

  // Auto-select notes/scales/chords and BPM when session starts
  useEffect(() => {
    // Use ref to prevent double initialization (React Strict Mode or async timing)
    if (!sessionStarted || hasInitializedNotes.current || !lessonSettings) {
      return
    }

    const hasNoContent = selectedNotes.length === 0 &&
                         scaleChordManagement.appliedScales.length === 0 &&
                         scaleChordManagement.appliedChords.length === 0

    // Use settings from the modal
    const selectedBpm = lessonSettings.bpm
    const selectedNoteCount = lessonSettings.beats

    if (hasNoContent && selectedInstrument === 'keyboard') {
      hasInitializedNotes.current = true
      // Use BPM from settings
      setBpm(selectedBpm)

      // Use note count from settings
      setNumberOfBeats(selectedNoteCount)

      // Use octave range from settings (default to 3-5 if not set)
      const octaveLow = lessonSettings.octaveLow || 3
      const octaveHigh = lessonSettings.octaveHigh || 5

      // Set octave range to show the selected range
      // Formula: to show octave N, set lowerOctaves = 4 - N, higherOctaves = N - 4
      const lowerOctavesForRange = 4 - octaveLow
      const higherOctavesForRange = octaveHigh - 4
      handleOctaveRangeChange(lowerOctavesForRange, higherOctavesForRange)

      // Pick a random octave within the selected range for the lesson
      const octaveRange = Array.from({ length: octaveHigh - octaveLow + 1 }, (_, i) => octaveLow + i)
      const selectedOctave = octaveRange[Math.floor(Math.random() * octaveRange.length)]

      // SCALES: Scale spanning all octaves in the selected range (filtered by user selection)
      if (practiceOptions.includes('melodies')) {
        const filteredScales = getFilteredScales(KEYBOARD_SCALES, lessonSettings.scale)
        const randomScale = filteredScales[Math.floor(Math.random() * filteredScales.length)]
        const randomRoot = ROOT_NOTES[Math.floor(Math.random() * ROOT_NOTES.length)]

        // Delay scale application to run after any clearing effects complete
        // Apply scale to each octave individually using standard system
        setTimeout(() => {
          octaveRange.forEach(octave => {
            scaleChordManagement.handleKeyboardScaleApply(randomRoot, randomScale, octave)
          })
        }, 50)

        setSetupDetails({ type: 'melodies', details: { scaleName: randomScale.name, root: randomRoot, octaveRange: `${octaveLow}-${octaveHigh}` } })
      }

      // CHORDS: chords with progression mode (filtered by user selection)
      else if (practiceOptions.includes('chords')) {
        setChordMode('progression')

        const filteredChords = getFilteredChords(KEYBOARD_CHORDS, lessonSettings.chord)
        const chordDetails: { root: string; chord: string; octave: number }[] = []

        // Distribute chords across octaves - ensure each octave gets at least one chord
        const octavesToUse: number[] = []

        // First, ensure each octave in range gets at least one chord
        for (let i = 0; i < selectedNoteCount; i++) {
          if (i < octaveRange.length) {
            // Assign one chord to each octave first
            octavesToUse.push(octaveRange[i])
          } else {
            // Remaining chords get random octaves from the range
            octavesToUse.push(octaveRange[Math.floor(Math.random() * octaveRange.length)])
          }
        }

        // Shuffle the octave assignments so it's not predictable (low to high)
        for (let i = octavesToUse.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[octavesToUse[i], octavesToUse[j]] = [octavesToUse[j], octavesToUse[i]]
        }

        for (let i = 0; i < selectedNoteCount; i++) {
          const randomChord = filteredChords[Math.floor(Math.random() * filteredChords.length)]
          const randomRoot = KEYBOARD_CHORD_ROOT_NOTES[Math.floor(Math.random() * KEYBOARD_CHORD_ROOT_NOTES.length)]
          const chordOctave = octavesToUse[i]

          // Use the scale chord management system to apply each chord
          scaleChordManagement.handleKeyboardChordApply(randomRoot, randomChord, chordOctave)

          chordDetails.push({ root: randomRoot, chord: randomChord.name, octave: chordOctave })
        }

        setSetupDetails({ type: 'chords', details: { chordCount: selectedNoteCount, chords: chordDetails, octaveRange: `${octaveLow}-${octaveHigh}` } })
      }

    }

    // GUITAR LESSONS
    if (hasNoContent && selectedInstrument === 'guitar') {
      hasInitializedNotes.current = true
      // Use BPM from settings
      setBpm(selectedBpm)

      // Use note count from settings
      setNumberOfBeats(selectedNoteCount)

      // SCALES: All scale positions within the fret range
      if (practiceOptions.includes('melodies')) {
        const filteredScales = getFilteredScales(GUITAR_SCALES, lessonSettings.scale)
        const randomScale = filteredScales[Math.floor(Math.random() * filteredScales.length)]
        const randomRoot = GUITAR_ROOT_NOTES[Math.floor(Math.random() * GUITAR_ROOT_NOTES.length)]

        // Get fret range from settings (default 0-12)
        const fretLow = lessonSettings.fretLow ?? 0
        const fretHigh = lessonSettings.fretHigh ?? 12

        // Get all scale positions for this scale and root
        const allPositions = getScalePositions(randomRoot, randomScale, guitarNotes)

        // Filter positions to only those within the selected fret range
        const filteredPositions = allPositions.filter(pos =>
          pos.fret >= fretLow && pos.fret <= fretHigh
        )

        if (filteredPositions.length > 0) {
          // Convert filtered positions to Note objects using IDs
          const scaleNotes: Note[] = filteredPositions.map(pos => {
            const noteId = `g-s${pos.string}-f${pos.fret}`
            const guitarNote = getGuitarNoteById(noteId)
            return {
              id: noteId,
              name: pos.note,
              frequency: guitarNote?.frequency || 0,
              isBlack: pos.note.includes('#'),
              position: guitarNote?.position || 0
            }
          })

          // Set the notes directly for melody generation
          setGuitarNotes(scaleNotes)

          // Create a scale box for visual display
          const scaleBox = {
            name: `Frets ${fretLow}-${fretHigh}`,
            minFret: fretLow,
            maxFret: fretHigh,
            positions: filteredPositions
          }

          setSetupDetails({
            type: 'melodies',
            details: {
              scaleName: randomScale.name,
              root: randomRoot,
              position: `frets ${fretLow} to ${fretHigh}`,
              fretRange: `${fretLow}-${fretHigh}`,
              noteIds: scaleNotes.map(n => n.id),
              scaleBox: scaleBox // Store for visual display when handlers ready
            }
          })
        }
      }

      // CHORDS: chords with progression mode (filtered by user selection)
      else if (practiceOptions.includes('chords')) {
        setChordMode('progression')

        const filteredChords = getFilteredChords(GUITAR_CHORDS, lessonSettings.chord)
        const chordDetails: { root: string; chord: string; chordObj: typeof GUITAR_CHORDS[0] }[] = []

        // Get fret range from settings (default 0-12)
        const fretLow = lessonSettings.fretLow ?? 0
        const fretHigh = lessonSettings.fretHigh ?? 12

        for (let i = 0; i < selectedNoteCount; i++) {
          const randomChord = filteredChords[Math.floor(Math.random() * filteredChords.length)]
          const randomRoot = GUITAR_CHORD_ROOT_NOTES[Math.floor(Math.random() * GUITAR_CHORD_ROOT_NOTES.length)]

          chordDetails.push({ root: randomRoot, chord: randomChord.name, chordObj: randomChord })
        }

        // Don't call setGuitarNotes - let appliedChords handle it in progression mode
        setSetupDetails({ type: 'chords', details: { chordCount: selectedNoteCount, chords: chordDetails, fretRange: `${fretLow}-${fretHigh}` } })
      }

    }

    // BASS LESSONS
    if (hasNoContent && selectedInstrument === 'bass') {
      hasInitializedNotes.current = true
      // Use BPM from settings
      setBpm(selectedBpm)

      // Use note count from settings
      setNumberOfBeats(selectedNoteCount)

      // SCALES: All scale positions within the fret range
      if (practiceOptions.includes('melodies')) {
        const filteredScales = getFilteredScales(BASS_SCALES, lessonSettings.scale)
        const randomScale = filteredScales[Math.floor(Math.random() * filteredScales.length)]
        const randomRoot = BASS_ROOT_NOTES[Math.floor(Math.random() * BASS_ROOT_NOTES.length)]

        // Get fret range from settings (default 0-12)
        const fretLow = lessonSettings.fretLow ?? 0
        const fretHigh = lessonSettings.fretHigh ?? 12

        // Get all scale positions for this scale and root
        const allPositions = getBassScalePositions(randomRoot, randomScale, bassNotes)

        // Filter positions to only those within the selected fret range
        const filteredPositions = allPositions.filter(pos =>
          pos.fret >= fretLow && pos.fret <= fretHigh
        )

        if (filteredPositions.length > 0) {
          // Convert filtered positions to Note objects using IDs
          const scaleNotes: Note[] = filteredPositions.map(pos => {
            const noteId = `b-s${pos.string}-f${pos.fret}`
            const bassNote = getBassNoteById(noteId)
            return {
              id: noteId,
              name: pos.note,
              frequency: bassNote?.frequency || 0,
              isBlack: pos.note.includes('#'),
              position: bassNote?.position || 0
            }
          })

          // Set the notes directly for melody generation
          setGuitarNotes(scaleNotes)

          // Create a scale box for visual display
          const scaleBox = {
            name: `Frets ${fretLow}-${fretHigh}`,
            minFret: fretLow,
            maxFret: fretHigh,
            positions: filteredPositions
          }

          setSetupDetails({
            type: 'melodies',
            details: {
              scaleName: randomScale.name,
              root: randomRoot,
              position: `frets ${fretLow} to ${fretHigh}`,
              fretRange: `${fretLow}-${fretHigh}`,
              noteIds: scaleNotes.map(n => n.id),
              scaleBox: scaleBox // Store for visual display when handlers ready
            }
          })
        }
      }

      // CHORDS: chords with progression mode (filtered by user selection)
      else if (practiceOptions.includes('chords')) {
        setChordMode('progression')

        const filteredChords = getFilteredChords(BASS_CHORDS, lessonSettings.chord)
        const chordDetails: { root: string; chord: string; chordObj: typeof BASS_CHORDS[0] }[] = []

        // Get fret range from settings (default 0-12)
        const fretLow = lessonSettings.fretLow ?? 0
        const fretHigh = lessonSettings.fretHigh ?? 12

        for (let i = 0; i < selectedNoteCount; i++) {
          const randomChord = filteredChords[Math.floor(Math.random() * filteredChords.length)]
          const randomRoot = BASS_CHORD_ROOT_NOTES[Math.floor(Math.random() * BASS_CHORD_ROOT_NOTES.length)]

          chordDetails.push({ root: randomRoot, chord: randomChord.name, chordObj: randomChord })
        }

        // Don't call setGuitarNotes - let appliedChords handle it in progression mode
        setSetupDetails({ type: 'chords', details: { chordCount: selectedNoteCount, chords: chordDetails, fretRange: `${fretLow}-${fretHigh}` } })
      }

    }
  }, [sessionStarted, practiceOptions, selectedNotes.length, scaleChordManagement.appliedScales.length, scaleChordManagement.appliedChords.length, setGuitarNotes, setBpm, setNumberOfBeats, selectedInstrument, handleKeyboardSelectionModeChange, setChordMode, handleOctaveRangeChange, scaleChordManagement, lessonSettings])

  // Set visual display on fretboard once handlers become available
  useEffect(() => {
    if (!setupDetails || hasAppliedVisualDisplay.current) {
      return
    }

    const { type, details } = setupDetails

    // Delay handler calls to let React Strict Mode stabilize
    // This ensures the Guitar/Bass component state is ready to receive updates
    const timeoutId = setTimeout(() => {
      // Scales - use wrapper functions that add to appliedScales AND update visual display
      if (type === 'melodies' && details.scaleBox) {
        if ((instrument === 'guitar' && scaleChordManagement.scaleHandlers) ||
            (instrument === 'bass' && scaleChordManagement.bassScaleHandlers)) {
          scaleChordManagement.handleScaleBoxSelect(details.scaleBox)
          hasAppliedVisualDisplay.current = true
        }
      }

      // Chord progressions - use wrapper functions that add to appliedChords AND update visual display
      if (type === 'chords' && details.chords) {
        if ((instrument === 'guitar' && scaleChordManagement.chordHandlers) ||
            (instrument === 'bass' && scaleChordManagement.bassChordHandlers)) {
          details.chords.forEach((c: any) => {
            if (c.chordObj) {
              scaleChordManagement.handleChordSelect(c.root, c.chordObj)
            }
          })
          hasAppliedVisualDisplay.current = true
        }
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [setupDetails, instrument, scaleChordManagement.noteHandlers, scaleChordManagement.bassNoteHandlers, scaleChordManagement.scaleHandlers, scaleChordManagement.bassScaleHandlers, scaleChordManagement.chordHandlers, scaleChordManagement.bassChordHandlers, scaleChordManagement.handleScaleBoxSelect, scaleChordManagement.handleChordSelect])

  // Trigger melody generation once notes/scales/chords are selected (for all lesson types)
  useEffect(() => {
    const hasContent = selectedNotes.length > 0 ||
                       scaleChordManagement.appliedScales.length > 0 ||
                       scaleChordManagement.appliedChords.length > 0

    if (sessionStarted && hasContent && !hasGeneratedMelody) {
      // Delay to let React update handleGenerateMelody callback with new appliedScales/appliedChords
      const timeoutId = setTimeout(() => {
        handleGenerateMelody()
        setHasGeneratedMelody(true)
      }, 150)
      return () => clearTimeout(timeoutId)
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
      if (setupDetails.type === 'melodies') {
        // Check if it's keyboard (has octaveRange) or guitar/bass (has position)
        if (setupDetails.details.octaveRange) {
          announcement = `I have set up a ${generatedMelody.length} beat melody using the ${setupDetails.details.root} ${setupDetails.details.scaleName} scale across octaves ${setupDetails.details.octaveRange} at ${bpm} BPM`
        } else if (setupDetails.details.position) {
          announcement = `I have set up a ${generatedMelody.length} beat melody using the ${setupDetails.details.root} ${setupDetails.details.scaleName} scale on ${setupDetails.details.position} at ${bpm} BPM`
        } else {
          announcement = `I have set up a ${generatedMelody.length} beat melody using the ${setupDetails.details.root} ${setupDetails.details.scaleName} scale at ${bpm} BPM`
        }
      }
      else if (setupDetails.type === 'chords') {
        // Check if it's keyboard (has octave) or guitar/bass (no octave specified)
        if (setupDetails.details.octave) {
          const octaveOrdinal = octaveOrdinals[setupDetails.details.octave.toString()] || 'fourth'
          const chordNames = setupDetails.details.chords.map((c: any) => `${c.root} ${c.chord}`).join(', ')
          announcement = `I have set up a ${generatedMelody.length} beat melody using chords on the ${octaveOrdinal} octave at ${bpm} BPM`
        } else {
          const chordNames = setupDetails.details.chords.map((c: any) => `${c.root} ${c.chord}`).join(', ')
          announcement = `I have set up a ${generatedMelody.length} beat melody using chords at ${bpm} BPM`
        }
      }
      // Set the message for subtitle display (WelcomeSubtitle component will handle TTS and subtitle)
      setMelodySetupMessage(announcement)
    }
  }, [welcomeSpeechDone, generatedMelody, recordedAudioBlob, bpm, setupDetails])


  // Show practice options modal
  if (showOptionsModal) {
    return (
      <PracticeOptionsModal
        onStart={handleOptionsStart}
        onCancel={handleOptionsCancel}
      />
    )
  }

  // If an instrument is selected and session started, show the instrument display
  if (selectedInstrument && sessionStarted) {
    const instrumentName = instrumentNames[selectedInstrument] || 'Instrument'

    // Get the practice topic label
    const practiceTopics = [
      { id: 'melodies', label: 'Melodies' },
      { id: 'chords', label: 'Chords' }
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
          hideChordMode={true}
          disableBpmInput={true}
          disableBeatsInput={true}
          disableChordMode={true}
          disableSelectionMode={true}
          hideSelectionMode={true}
          practiceMode={true}
          onLessonComplete={handleLessonComplete}
          autoPlayAudio={autoPlayAudio}
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
            onSpeechEnd={() => setAutoPlayAudio(true)}
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

  // Otherwise, show the start session page
  return (
    <div className={styles.practiceContainer}>
      {/* Header Section */}
      <section className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Practice Mode</h1>
        <p className={styles.pageSubtitle}>
          Train your ear with guided lessons for keyboard, guitar, and bass
        </p>
      </section>

      {/* Start Button Section */}
      <section className={styles.startSection}>
        <button
          className={styles.startSessionButton}
          onClick={handleStartLesson}
          aria-label="Start practice session"
        >
          Begin Session
        </button>
      </section>
    </div>
  )
}

export default Practice
