import { useState, useEffect, useRef } from 'react'
import styles from '../../styles/Practice.module.css'
import { PiPianoKeysFill } from 'react-icons/pi'
import { GiGuitarBassHead, GiGuitarHead } from 'react-icons/gi'
import type { IconType } from 'react-icons'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import PracticeOptionsModal, { type LessonSettings } from './PracticeOptionsModal'
import { useInstrument } from '../../contexts/InstrumentContext'
import { generateNotesWithSeparateOctaves } from '../../utils/notes'
import type { Note } from '../../utils/notes'
import { KEYBOARD_SCALES, ROOT_NOTES } from '../../utils/instruments/keyboard/keyboardScales'
import { KEYBOARD_CHORDS, KEYBOARD_CHORD_ROOT_NOTES } from '../../utils/instruments/keyboard/keyboardChords'
import { GUITAR_SCALES, ROOT_NOTES as GUITAR_ROOT_NOTES, getScaleBoxes } from '../../utils/instruments/guitar/guitarScales'
import { GUITAR_CHORDS, CHORD_ROOT_NOTES as GUITAR_CHORD_ROOT_NOTES } from '../../utils/instruments/guitar/guitarChords'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import type { GuitarNote } from '../../utils/instruments/guitar/guitarNotes'
import { BASS_SCALES, BASS_ROOT_NOTES, getBassScaleBoxes } from '../../utils/instruments/bass/bassScales'
import { BASS_CHORDS, BASS_CHORD_ROOT_NOTES } from '../../utils/instruments/bass/bassChords'
import { bassNotes } from '../../utils/instruments/bass/bassNotes'
import type { BassNote } from '../../utils/instruments/bass/bassNotes'
import {
  getRandomGuitarNotesOnString,
  getRandomBassNotesOnString,
  getRandomKeyboardNotesInOctave,
  convertToNoteFormat,
  getGuitarNoteById,
  getBassNoteById
} from '../../utils/practice/practiceNotes'

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

  const [difficulty, setDifficulty] = useState<number>(2) // 0-4: Beginner to Expert
  const [lessonSettings, setLessonSettings] = useState<LessonSettings | null>(null)

  const handleOptionsStart = (selectedOptions: string[], selectedDifficulty: number, settings: LessonSettings) => {
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

  // Auto-select notes/scales/chords and BPM when session starts
  useEffect(() => {
    // Use ref to prevent double initialization (React Strict Mode or async timing)
    if (!sessionStarted || hasInitializedNotes.current) {
      return
    }

    const hasNoContent = selectedNotes.length === 0 &&
                         scaleChordManagement.appliedScales.length === 0 &&
                         scaleChordManagement.appliedChords.length === 0

    if (hasNoContent && instrument === 'keyboard') {
      hasInitializedNotes.current = true
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

      // SIMPLE MELODIES: 3-6 random notes on single octave (using ID-based selection)
      if (practiceOptions.includes('simple-melodies')) {
        handleKeyboardSelectionModeChange('multi', false)

        const noteCount = Math.floor(Math.random() * 4) + 3
        const autoNotes = getRandomKeyboardNotesInOctave(randomOctave, noteCount, 3, 3)

        setGuitarNotes(autoNotes)
        setSetupDetails({
          type: 'simple-melodies',
          details: {
            noteCount: autoNotes.length,
            octave: randomOctave,
            noteIds: autoNotes.map(n => n.id) // Store IDs for scene reference
          }
        })
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
      else if (practiceOptions.includes('chords')) {
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

        setSetupDetails({ type: 'chords', details: { chordCount, chords: chordDetails, octave: randomOctave } })
      }

    }

    // GUITAR LESSONS
    if (hasNoContent && instrument === 'guitar') {
      hasInitializedNotes.current = true
      // Randomly select BPM (30 to 240 in 30 BPM increments)
      const bpmOptions = Array.from({ length: 8 }, (_, i) => (i + 1) * 30)
      const randomBPM = bpmOptions[Math.floor(Math.random() * bpmOptions.length)]
      setBpm(randomBPM)

      // Randomly select number of beats (3 to 8)
      const randomBeats = Math.floor(Math.random() * 6) + 3
      setNumberOfBeats(randomBeats)

      // SIMPLE MELODIES: 3-6 random notes on a single string (using ID-based selection)
      if (practiceOptions.includes('simple-melodies')) {
        // Randomly select one string (1-6 for guitar)
        const randomString = Math.floor(Math.random() * 6) + 1

        // Randomly select 3-6 notes from that string using ID-based utility
        const noteCount = Math.floor(Math.random() * 4) + 3
        const selectedGuitarNotes = getRandomGuitarNotesOnString(randomString, noteCount)

        // Convert to Note format for melody generation
        const convertedNotes = convertToNoteFormat(selectedGuitarNotes)

        setGuitarNotes(convertedNotes)
        setSetupDetails({
          type: 'simple-melodies',
          details: {
            noteCount: selectedGuitarNotes.length,
            string: randomString,
            noteIds: selectedGuitarNotes.map(n => n.id) // Store IDs for visual display
          }
        })
      }

      // SCALES: Single random scale in a specific position
      else if (practiceOptions.includes('scales')) {
        const randomScale = GUITAR_SCALES[Math.floor(Math.random() * GUITAR_SCALES.length)]
        const randomRoot = GUITAR_ROOT_NOTES[Math.floor(Math.random() * GUITAR_ROOT_NOTES.length)]

        // Get all scale boxes for this scale and root
        const scaleBoxes = getScaleBoxes(randomRoot, randomScale, guitarNotes)

        // Pick a random box position
        if (scaleBoxes.length > 0) {
          const randomBox = scaleBoxes[Math.floor(Math.random() * scaleBoxes.length)]

          // Convert scale box positions to Note objects using IDs
          const scaleNotes: Note[] = randomBox.positions.map(pos => {
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

          setSetupDetails({
            type: 'scales',
            details: {
              scaleName: randomScale.name,
              root: randomRoot,
              position: `frets ${randomBox.minFret} to ${randomBox.maxFret}`,
              noteIds: scaleNotes.map(n => n.id),
              scaleBox: randomBox // Store for visual display when handlers ready
            }
          })
        }
      }

      // CHORD PROGRESSIONS: 3-6 random chords with progression mode
      else if (practiceOptions.includes('chords')) {
        setChordMode('progression')

        const chordCount = Math.floor(Math.random() * 4) + 3 // 3-6 chords
        const chordDetails: { root: string; chord: string; chordObj: typeof GUITAR_CHORDS[0] }[] = []

        for (let i = 0; i < chordCount; i++) {
          const randomChord = GUITAR_CHORDS[Math.floor(Math.random() * GUITAR_CHORDS.length)]
          const randomRoot = GUITAR_CHORD_ROOT_NOTES[Math.floor(Math.random() * GUITAR_CHORD_ROOT_NOTES.length)]

          chordDetails.push({ root: randomRoot, chord: randomChord.name, chordObj: randomChord })
        }

        // Don't call setGuitarNotes - let appliedChords handle it in progression mode
        setSetupDetails({ type: 'chords', details: { chordCount, chords: chordDetails } })
      }

    }

    // BASS LESSONS
    if (hasNoContent && instrument === 'bass') {
      hasInitializedNotes.current = true
      // Randomly select BPM (30 to 240 in 30 BPM increments)
      const bpmOptions = Array.from({ length: 8 }, (_, i) => (i + 1) * 30)
      const randomBPM = bpmOptions[Math.floor(Math.random() * bpmOptions.length)]
      setBpm(randomBPM)

      // Randomly select number of beats (3 to 8)
      const randomBeats = Math.floor(Math.random() * 6) + 3
      setNumberOfBeats(randomBeats)

      // SIMPLE MELODIES: 3-6 random notes on a single string (using ID-based selection)
      if (practiceOptions.includes('simple-melodies')) {
        // Randomly select one string (1-4 for bass)
        const randomString = Math.floor(Math.random() * 4) + 1

        // Randomly select 3-6 notes from that string using ID-based utility
        const noteCount = Math.floor(Math.random() * 4) + 3
        const selectedBassNotes = getRandomBassNotesOnString(randomString, noteCount)

        // Convert to Note format for melody generation
        const convertedNotes = convertToNoteFormat(selectedBassNotes)

        setGuitarNotes(convertedNotes)
        setSetupDetails({
          type: 'simple-melodies',
          details: {
            noteCount: selectedBassNotes.length,
            string: randomString,
            noteIds: selectedBassNotes.map(n => n.id) // Store IDs for visual display
          }
        })
      }

      // SCALES: Single random scale in a specific position
      else if (practiceOptions.includes('scales')) {
        const randomScale = BASS_SCALES[Math.floor(Math.random() * BASS_SCALES.length)]
        const randomRoot = BASS_ROOT_NOTES[Math.floor(Math.random() * BASS_ROOT_NOTES.length)]

        // Get all scale boxes for this scale and root
        const scaleBoxes = getBassScaleBoxes(randomRoot, randomScale, bassNotes)

        // Pick a random box position
        if (scaleBoxes.length > 0) {
          const randomBox = scaleBoxes[Math.floor(Math.random() * scaleBoxes.length)]

          // Convert scale box positions to Note objects using IDs
          const scaleNotes: Note[] = randomBox.positions.map(pos => {
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

          setSetupDetails({
            type: 'scales',
            details: {
              scaleName: randomScale.name,
              root: randomRoot,
              position: `frets ${randomBox.minFret} to ${randomBox.maxFret}`,
              noteIds: scaleNotes.map(n => n.id),
              scaleBox: randomBox // Store for visual display when handlers ready
            }
          })
        }
      }

      // CHORD PROGRESSIONS: 3-6 random chords with progression mode
      else if (practiceOptions.includes('chords')) {
        setChordMode('progression')

        const chordCount = Math.floor(Math.random() * 4) + 3 // 3-6 chords
        const chordDetails: { root: string; chord: string; chordObj: typeof BASS_CHORDS[0] }[] = []

        for (let i = 0; i < chordCount; i++) {
          const randomChord = BASS_CHORDS[Math.floor(Math.random() * BASS_CHORDS.length)]
          const randomRoot = BASS_CHORD_ROOT_NOTES[Math.floor(Math.random() * BASS_CHORD_ROOT_NOTES.length)]

          chordDetails.push({ root: randomRoot, chord: randomChord.name, chordObj: randomChord })
        }

        // Don't call setGuitarNotes - let appliedChords handle it in progression mode
        setSetupDetails({ type: 'chords', details: { chordCount, chords: chordDetails } })
      }

    }
  }, [sessionStarted, practiceOptions, selectedNotes.length, scaleChordManagement.appliedScales.length, scaleChordManagement.appliedChords.length, setGuitarNotes, setBpm, setNumberOfBeats, instrument, handleKeyboardSelectionModeChange, setChordMode, handleOctaveRangeChange, scaleChordManagement])

  // Set visual display on fretboard once handlers become available
  useEffect(() => {
    if (!setupDetails || hasAppliedVisualDisplay.current) {
      return
    }

    const { type, details } = setupDetails

    // Simple melodies - use manual note handlers
    if (type === 'simple-melodies' && details.noteIds) {
      if (instrument === 'guitar' && scaleChordManagement.noteHandlers) {
        scaleChordManagement.noteHandlers.handleSetManualNotes(details.noteIds)
        hasAppliedVisualDisplay.current = true
      }
      if (instrument === 'bass' && scaleChordManagement.bassNoteHandlers) {
        scaleChordManagement.bassNoteHandlers.handleSetManualNotes(details.noteIds)
        hasAppliedVisualDisplay.current = true
      }
    }

    // Delay handler calls to let React Strict Mode stabilize
    // This ensures the Guitar/Bass component state is ready to receive updates
    const timeoutId = setTimeout(() => {
      // Scales - use wrapper functions that add to appliedScales AND update visual display
      if (type === 'scales' && details.scaleBox) {
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

      // Convert string number to ordinal (for guitar/bass)
      const stringOrdinals: { [key: string]: string } = {
        '1': 'first', '2': 'second', '3': 'third', '4': 'fourth',
        '5': 'fifth', '6': 'sixth'
      }

      // Create announcement based on lesson type
      if (setupDetails.type === 'simple-melodies') {
        // Check if it's keyboard (has octave) or guitar/bass (has string)
        if (setupDetails.details.octave) {
          const octaveOrdinal = octaveOrdinals[setupDetails.details.octave.toString()] || 'fourth'
          announcement = `I have set up a ${generatedMelody.length} beat melody on the ${octaveOrdinal} octave at ${bpm} BPM`
        } else if (setupDetails.details.string) {
          const stringOrdinal = stringOrdinals[setupDetails.details.string.toString()] || 'first'
          announcement = `I have set up a ${generatedMelody.length} beat melody on the ${stringOrdinal} string at ${bpm} BPM`
        }
      }
      else if (setupDetails.type === 'scales') {
        // Check if it's keyboard (has octave) or guitar/bass (has position)
        if (setupDetails.details.octave) {
          const octaveOrdinal = octaveOrdinals[setupDetails.details.octave.toString()] || 'fourth'
          announcement = `I have set up a ${generatedMelody.length} beat melody using the ${setupDetails.details.root} ${setupDetails.details.scaleName} scale on the ${octaveOrdinal} octave at ${bpm} BPM`
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
                  Begin
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
