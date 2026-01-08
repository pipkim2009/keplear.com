/**
 * Sandbox Page - Free play mode with optional pitch detection feedback
 * Also includes Practice session functionality
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import { type LessonSettings } from './PracticeOptionsModal'
import { useInstrument } from '../../contexts/InstrumentContext'
import { useDSPPitchDetection, usePerformanceGrading } from '../../hooks'
import { LiveFeedback } from '../practice'
import type { PitchDetectionResult } from '../../hooks/usePitchDetection'
import type { Note } from '../../utils/notes'
import { KEYBOARD_SCALES, ROOT_NOTES } from '../../utils/instruments/keyboard/keyboardScales'
import { KEYBOARD_CHORDS, KEYBOARD_CHORD_ROOT_NOTES } from '../../utils/instruments/keyboard/keyboardChords'
import { GUITAR_SCALES, ROOT_NOTES as GUITAR_ROOT_NOTES, getScalePositions, getScaleBoxes } from '../../utils/instruments/guitar/guitarScales'
import { GUITAR_CHORDS, CHORD_ROOT_NOTES as GUITAR_CHORD_ROOT_NOTES, getChordBoxes } from '../../utils/instruments/guitar/guitarChords'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import { BASS_SCALES, BASS_ROOT_NOTES, getBassScalePositions, getBassScaleBoxes } from '../../utils/instruments/bass/bassScales'
import { BASS_CHORDS, BASS_CHORD_ROOT_NOTES, getBassChordBoxes } from '../../utils/instruments/bass/bassChords'
import { bassNotes } from '../../utils/instruments/bass/bassNotes'
import {
  getGuitarNoteById,
  getBassNoteById
} from '../../utils/practice/practiceNotes'
import styles from '../../styles/Practice.module.css'

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

function Sandbox() {
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
    scaleChordManagement,
    melodyBpm
  } = useInstrument()

  // Practice session state
  const [sessionStarted, setSessionStarted] = useState(false)
  const [selectedInstrument, setSelectedInstrument] = useState<string | null>(null)
  const [practiceOptions, setPracticeOptions] = useState<string[]>([])
  const [difficulty, setDifficulty] = useState<number>(2)
  const [lessonSettings, setLessonSettings] = useState<LessonSettings | null>(null)

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

  // DSP-based pitch detection and performance grading hooks
  const pitchDetection = useDSPPitchDetection({ instrument: instrument as 'keyboard' | 'guitar' | 'bass' })
  const performanceGrading = usePerformanceGrading()

  // Check for assignment settings from Classroom page
  useEffect(() => {
    const storedSettings = localStorage.getItem('assignmentSettings')
    if (storedSettings) {
      try {
        const settings = JSON.parse(storedSettings)
        // Clear the stored settings so they don't persist
        localStorage.removeItem('assignmentSettings')

        // Convert to LessonSettings format and start session
        const lessonSettings: LessonSettings = {
          lessonType: settings.lessonType,
          difficulty: 1, // Custom
          bpm: settings.bpm,
          beats: settings.beats,
          chordCount: settings.chordCount,
          scales: settings.scales,
          chords: settings.chords,
          octaveLow: settings.octaveLow,
          octaveHigh: settings.octaveHigh,
          fretLow: settings.fretLow,
          fretHigh: settings.fretHigh
        }

        // Start the session with assignment settings
        setSelectedInstrument(settings.instrument)
        setInstrument(settings.instrument as 'keyboard' | 'guitar' | 'bass')
        setPracticeOptions([settings.lessonType])
        setDifficulty(1)
        setLessonSettings(lessonSettings)
        setSessionStarted(true)
      } catch (err) {
        console.error('Error parsing assignment settings:', err)
        localStorage.removeItem('assignmentSettings')
      }
    }
  }, [setInstrument])

  // Convert DSP pitch result to the format expected by grading system
  const currentPitchForGrading = useMemo((): PitchDetectionResult | null => {
    if (!pitchDetection.currentPitch) return null
    return {
      frequency: pitchDetection.currentPitch.frequency,
      note: pitchDetection.currentPitch.note,
      confidence: pitchDetection.currentPitch.confidence,
      centsOffset: pitchDetection.currentPitch.cents,
      timestamp: pitchDetection.currentPitch.timestamp,
      isOnset: pitchDetection.currentPitch.isOnset
    }
  }, [pitchDetection.currentPitch])

  // Keep pitch detection in sync with current instrument
  useEffect(() => {
    pitchDetection.setInstrument(instrument as 'keyboard' | 'guitar' | 'bass')
  }, [instrument, pitchDetection.setInstrument])

  // Pass pitch detection results to grading system
  useEffect(() => {
    if (currentPitchForGrading && performanceGrading.state.isActive) {
      performanceGrading.processPitch(currentPitchForGrading)
    }
  }, [currentPitchForGrading, performanceGrading.state.isActive, performanceGrading.processPitch])

  // Stop listening when a new melody is being generated
  useEffect(() => {
    if (isGeneratingMelody) {
      pitchDetection.stopListening()
      performanceGrading.stopPerformance()
    }
  }, [isGeneratingMelody, pitchDetection, performanceGrading])

  // Start performance grading when user starts listening and melody is ready
  const handleStartPracticeWithFeedback = useCallback(() => {
    if (generatedMelody.length > 0) {
      // Set the correct instrument for pitch detection filtering
      if (sessionStarted && selectedInstrument) {
        pitchDetection.setInstrument(selectedInstrument as 'keyboard' | 'guitar' | 'bass')
      }
      // Use melodyBpm (BPM when melody was generated) not current bpm
      performanceGrading.startPerformance(generatedMelody, melodyBpm)
      pitchDetection.startListening()
    } else {
      // Just start listening without grading if no melody
      pitchDetection.startListening()
    }
  }, [generatedMelody, sessionStarted, selectedInstrument, melodyBpm, performanceGrading, pitchDetection])

  // Stop practice session
  const handleStopPracticeWithFeedback = useCallback(() => {
    pitchDetection.stopListening()
    performanceGrading.stopPerformance()
  }, [pitchDetection, performanceGrading])

  // Practice options modal handlers
  const handleOptionsStart = (instrumentId: string, selectedOptions: string[], selectedDifficulty: number, settings: LessonSettings) => {
    setSelectedInstrument(instrumentId)
    // Use setInstrument directly instead of handleInstrumentChange to avoid
    // triggering clearChordsAndScales which would clear scales added by initialization
    setInstrument(instrumentId as 'keyboard' | 'guitar' | 'bass')
    setPracticeOptions(selectedOptions)
    setDifficulty(selectedDifficulty)
    setLessonSettings(settings)
    setSessionStarted(true)
  }

  const handleBackToSelection = () => {
    // Stop any ongoing text-to-speech
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    setSelectedInstrument(null)
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
  const getFilteredScales = (scales: typeof KEYBOARD_SCALES, selectedScales: string[] | undefined) => {
    if (!selectedScales || selectedScales.length === 0) return scales
    return scales.filter(s => selectedScales.includes(s.name))
  }

  // Helper function to filter chords based on user selection
  const getFilteredChords = (chords: typeof KEYBOARD_CHORDS, selectedChords: string[] | undefined) => {
    if (!selectedChords || selectedChords.length === 0) return chords
    return chords.filter(c => selectedChords.includes(c.name))
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
    const selectedChordCount = lessonSettings.chordCount

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
      const lowerOctavesForRange = 4 - octaveLow
      const higherOctavesForRange = octaveHigh - 4
      handleOctaveRangeChange(lowerOctavesForRange, higherOctavesForRange)

      // Pick a random octave within the selected range for the lesson
      const octaveRange = Array.from({ length: octaveHigh - octaveLow + 1 }, (_, i) => octaveLow + i)

      // SCALES: Scale spanning all octaves in the selected range
      if (practiceOptions.includes('melodies')) {
        const filteredScales = getFilteredScales(KEYBOARD_SCALES, lessonSettings.scales)
        const randomScale = filteredScales[Math.floor(Math.random() * filteredScales.length)]
        const randomRoot = ROOT_NOTES[Math.floor(Math.random() * ROOT_NOTES.length)]

        // Delay scale application to run after any clearing effects complete
        setTimeout(() => {
          octaveRange.forEach(octave => {
            scaleChordManagement.handleKeyboardScaleApply(randomRoot, randomScale, octave)
          })
        }, 50)

        setSetupDetails({ type: 'melodies', details: { scaleName: randomScale.name, root: randomRoot, octaveRange: `${octaveLow}-${octaveHigh}` } })
      }

      // CHORDS: chords with progression mode
      else if (practiceOptions.includes('chords')) {
        setChordMode('progression')

        const filteredChords = getFilteredChords(KEYBOARD_CHORDS, lessonSettings.chords)
        const chordDetails: { root: string; chord: string; octave: number }[] = []

        // Distribute chords across octaves randomly
        const octavesToUse: number[] = []

        if (selectedChordCount >= octaveRange.length) {
          const shuffledOctaves = [...octaveRange].sort(() => Math.random() - 0.5)
          octavesToUse.push(...shuffledOctaves)

          for (let i = octaveRange.length; i < selectedChordCount; i++) {
            octavesToUse.push(octaveRange[Math.floor(Math.random() * octaveRange.length)])
          }
        } else {
          for (let i = 0; i < selectedChordCount; i++) {
            octavesToUse.push(octaveRange[Math.floor(Math.random() * octaveRange.length)])
          }
        }

        // Final shuffle to randomize the order completely
        for (let i = octavesToUse.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1))
          ;[octavesToUse[i], octavesToUse[j]] = [octavesToUse[j], octavesToUse[i]]
        }

        // Build chord details first
        for (let i = 0; i < selectedChordCount; i++) {
          const randomChord = filteredChords[Math.floor(Math.random() * filteredChords.length)]
          const randomRoot = KEYBOARD_CHORD_ROOT_NOTES[Math.floor(Math.random() * KEYBOARD_CHORD_ROOT_NOTES.length)]
          const chordOctave = octavesToUse[i]
          chordDetails.push({ root: randomRoot, chord: randomChord.name, octave: chordOctave })
        }

        // Delay chord application to run after any clearing effects complete
        setTimeout(() => {
          chordDetails.forEach(detail => {
            const chordObj = filteredChords.find(c => c.name === detail.chord)
            if (chordObj) {
              scaleChordManagement.handleKeyboardChordApply(detail.root, chordObj, detail.octave)
            }
          })
        }, 50)

        setSetupDetails({ type: 'chords', details: { chordCount: selectedChordCount, chords: chordDetails, octaveRange: `${octaveLow}-${octaveHigh}` } })
      }

    }

    // GUITAR LESSONS
    if (hasNoContent && selectedInstrument === 'guitar') {
      hasInitializedNotes.current = true
      setBpm(selectedBpm)
      setNumberOfBeats(selectedNoteCount)

      // SCALES: All scale positions within the fret range
      if (practiceOptions.includes('melodies')) {
        const filteredScales = getFilteredScales(GUITAR_SCALES, lessonSettings.scales)
        const randomScale = filteredScales[Math.floor(Math.random() * filteredScales.length)]
        const randomRoot = GUITAR_ROOT_NOTES[Math.floor(Math.random() * GUITAR_ROOT_NOTES.length)]

        const fretLow = lessonSettings.fretLow ?? 0
        const fretHigh = lessonSettings.fretHigh ?? 12

        const allPositions = getScalePositions(randomRoot, randomScale, guitarNotes)
        const filteredPositions = allPositions.filter(pos =>
          pos.fret >= fretLow && pos.fret <= fretHigh
        )

        if (filteredPositions.length > 0) {
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

          setGuitarNotes(scaleNotes)

          const allScaleBoxes = getScaleBoxes(randomRoot, randomScale, guitarNotes)
          const scaleBoxes = allScaleBoxes.filter(box =>
            box.minFret >= fretLow && box.maxFret <= fretHigh
          )

          setSetupDetails({
            type: 'melodies',
            details: {
              scaleName: randomScale.name,
              root: randomRoot,
              position: `frets ${fretLow} to ${fretHigh}`,
              fretRange: `${fretLow}-${fretHigh}`,
              noteIds: scaleNotes.map(n => n.id),
              scaleBoxes: scaleBoxes
            }
          })
        }
      }

      // CHORDS: chords with progression mode
      else if (practiceOptions.includes('chords')) {
        setChordMode('progression')

        const filteredChords = getFilteredChords(GUITAR_CHORDS, lessonSettings.chords)
        const chordDetails: { root: string; chord: string; chordObj: typeof GUITAR_CHORDS[0]; boxIndex: number }[] = []

        const fretLow = lessonSettings.fretLow ?? 0
        const fretHigh = lessonSettings.fretHigh ?? 12

        const usedBoxPositions = new Set<string>()

        for (let i = 0; i < selectedChordCount; i++) {
          const randomChord = filteredChords[Math.floor(Math.random() * filteredChords.length)]
          const randomRoot = GUITAR_CHORD_ROOT_NOTES[Math.floor(Math.random() * GUITAR_CHORD_ROOT_NOTES.length)]

          const chordBoxes = getChordBoxes(randomRoot, randomChord, guitarNotes)
          const validBoxes = chordBoxes.filter(box =>
            box.minFret >= fretLow && box.maxFret <= fretHigh
          )

          if (validBoxes.length > 0) {
            const unusedBoxes = validBoxes.filter(box =>
              !usedBoxPositions.has(`${box.minFret}-${box.maxFret}`)
            )

            const targetBoxes = unusedBoxes.length > 0 ? unusedBoxes : validBoxes
            const selectedBoxIndex = Math.floor(Math.random() * targetBoxes.length)
            const selectedBox = targetBoxes[selectedBoxIndex]

            const boxIndex = chordBoxes.findIndex(box =>
              box.minFret === selectedBox.minFret && box.maxFret === selectedBox.maxFret
            )

            usedBoxPositions.add(`${selectedBox.minFret}-${selectedBox.maxFret}`)
            chordDetails.push({ root: randomRoot, chord: randomChord.name, chordObj: randomChord, boxIndex })
          }
        }

        // Shuffle the chord details
        for (let i = chordDetails.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chordDetails[i], chordDetails[j]] = [chordDetails[j], chordDetails[i]]
        }

        setTimeout(() => {
          chordDetails.forEach(detail => {
            scaleChordManagement.handleGuitarChordApply(detail.root, detail.chordObj, detail.boxIndex)
          })
        }, 50)

        setSetupDetails({ type: 'chords', details: { chordCount: selectedChordCount, chords: chordDetails, fretRange: `${fretLow}-${fretHigh}` } })
      }

    }

    // BASS LESSONS
    if (hasNoContent && selectedInstrument === 'bass') {
      hasInitializedNotes.current = true
      setBpm(selectedBpm)
      setNumberOfBeats(selectedNoteCount)

      // SCALES: All scale positions within the fret range
      if (practiceOptions.includes('melodies')) {
        const filteredScales = getFilteredScales(BASS_SCALES, lessonSettings.scales)
        const randomScale = filteredScales[Math.floor(Math.random() * filteredScales.length)]
        const randomRoot = BASS_ROOT_NOTES[Math.floor(Math.random() * BASS_ROOT_NOTES.length)]

        const fretLow = lessonSettings.fretLow ?? 0
        const fretHigh = lessonSettings.fretHigh ?? 12

        const allPositions = getBassScalePositions(randomRoot, randomScale, bassNotes)
        const filteredPositions = allPositions.filter(pos =>
          pos.fret >= fretLow && pos.fret <= fretHigh
        )

        if (filteredPositions.length > 0) {
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

          setGuitarNotes(scaleNotes)

          const allScaleBoxes = getBassScaleBoxes(randomRoot, randomScale, bassNotes)
          const scaleBoxes = allScaleBoxes.filter(box =>
            box.minFret >= fretLow && box.maxFret <= fretHigh
          )

          setSetupDetails({
            type: 'melodies',
            details: {
              scaleName: randomScale.name,
              root: randomRoot,
              position: `frets ${fretLow} to ${fretHigh}`,
              fretRange: `${fretLow}-${fretHigh}`,
              noteIds: scaleNotes.map(n => n.id),
              scaleBoxes: scaleBoxes
            }
          })
        }
      }

      // CHORDS: chords with progression mode
      else if (practiceOptions.includes('chords')) {
        setChordMode('progression')

        const filteredChords = getFilteredChords(BASS_CHORDS, lessonSettings.chords)
        const chordDetails: { root: string; chord: string; chordObj: typeof BASS_CHORDS[0]; boxIndex: number }[] = []

        const fretLow = lessonSettings.fretLow ?? 0
        const fretHigh = lessonSettings.fretHigh ?? 12

        const usedBoxPositions = new Set<string>()

        for (let i = 0; i < selectedChordCount; i++) {
          const randomChord = filteredChords[Math.floor(Math.random() * filteredChords.length)]
          const randomRoot = BASS_CHORD_ROOT_NOTES[Math.floor(Math.random() * BASS_CHORD_ROOT_NOTES.length)]

          const chordBoxes = getBassChordBoxes(randomRoot, randomChord, bassNotes)
          const validBoxes = chordBoxes.filter(box =>
            box.minFret >= fretLow && box.maxFret <= fretHigh
          )

          if (validBoxes.length > 0) {
            const unusedBoxes = validBoxes.filter(box =>
              !usedBoxPositions.has(`${box.minFret}-${box.maxFret}`)
            )

            const targetBoxes = unusedBoxes.length > 0 ? unusedBoxes : validBoxes
            const selectedBoxIndex = Math.floor(Math.random() * targetBoxes.length)
            const selectedBox = targetBoxes[selectedBoxIndex]

            const boxIndex = chordBoxes.findIndex(box =>
              box.minFret === selectedBox.minFret && box.maxFret === selectedBox.maxFret
            )

            usedBoxPositions.add(`${selectedBox.minFret}-${selectedBox.maxFret}`)
            chordDetails.push({ root: randomRoot, chord: randomChord.name, chordObj: randomChord, boxIndex })
          }
        }

        // Shuffle the chord details
        for (let i = chordDetails.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chordDetails[i], chordDetails[j]] = [chordDetails[j], chordDetails[i]]
        }

        setTimeout(() => {
          chordDetails.forEach(detail => {
            scaleChordManagement.handleBassChordApply(detail.root, detail.chordObj, detail.boxIndex)
          })
        }, 50)

        setSetupDetails({ type: 'chords', details: { chordCount: selectedChordCount, chords: chordDetails, fretRange: `${fretLow}-${fretHigh}` } })
      }

    }
  }, [sessionStarted, practiceOptions, selectedNotes.length, scaleChordManagement.appliedScales.length, scaleChordManagement.appliedChords.length, setGuitarNotes, setBpm, setNumberOfBeats, selectedInstrument, setChordMode, handleOctaveRangeChange, scaleChordManagement, lessonSettings])

  // Set visual display on fretboard once handlers become available
  useEffect(() => {
    if (!setupDetails || hasAppliedVisualDisplay.current) {
      return
    }

    const { type, details } = setupDetails

    const timeoutId = setTimeout(() => {
      // Scales - apply each scale box individually for proper display
      if (type === 'melodies' && details.scaleBoxes) {
        if ((instrument === 'guitar' && scaleChordManagement.scaleHandlers) ||
            (instrument === 'bass' && scaleChordManagement.bassScaleHandlers)) {
          details.scaleBoxes.forEach((box: any) => {
            scaleChordManagement.handleScaleBoxSelect(box)
          })
          hasAppliedVisualDisplay.current = true
        }
      }

      // Chord progressions - use standard chord apply functions with fretZone
      if (type === 'chords' && details.chords) {
        if (instrument === 'guitar' && scaleChordManagement.chordHandlers) {
          details.chords.forEach((c: any) => {
            if (c.chordObj) {
              scaleChordManagement.handleGuitarChordApply(c.root, c.chordObj, c.boxIndex ?? 0)
            }
          })
          hasAppliedVisualDisplay.current = true
        } else if (instrument === 'bass' && scaleChordManagement.bassChordHandlers) {
          details.chords.forEach((c: any) => {
            if (c.chordObj) {
              scaleChordManagement.handleBassChordApply(c.root, c.chordObj, c.boxIndex ?? 0)
            }
          })
          hasAppliedVisualDisplay.current = true
        }
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [setupDetails, instrument, scaleChordManagement.noteHandlers, scaleChordManagement.bassNoteHandlers, scaleChordManagement.scaleHandlers, scaleChordManagement.bassScaleHandlers, scaleChordManagement.chordHandlers, scaleChordManagement.bassChordHandlers, scaleChordManagement.handleScaleBoxSelect, scaleChordManagement.handleGuitarChordApply, scaleChordManagement.handleBassChordApply])

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
      setMelodySetupMessage('I have set up a melody for you to attempt')
    }
  }, [welcomeSpeechDone, generatedMelody, recordedAudioBlob, setupDetails])


  // If session started, show the practice session UI
  if (sessionStarted && selectedInstrument) {
    const instrumentName = instrumentNames[selectedInstrument] || 'Instrument'
    const welcomeMessage = `Welcome to your ${instrumentName} lesson`

    // Calculate octave range for keyboard based on lesson settings
    const octaveLow = lessonSettings?.octaveLow ?? 3
    const octaveHigh = lessonSettings?.octaveHigh ?? 5
    const calculatedLowerOctaves = selectedInstrument === 'keyboard' ? 4 - octaveLow : 0
    const calculatedHigherOctaves = selectedInstrument === 'keyboard' ? octaveHigh - 5 : 0

    // Get fret range for guitar/bass lessons
    const fretLow = lessonSettings?.fretLow
    const fretHigh = lessonSettings?.fretHigh

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
          <button
            className={styles.doneButton}
            onClick={handleBackToSelection}
            aria-label="Done with lesson"
          >
            Done
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
          initialLowerOctaves={calculatedLowerOctaves}
          initialHigherOctaves={calculatedHigherOctaves}
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
          practiceMode={true}
          onLessonComplete={handleLessonComplete}
          autoPlayAudio={autoPlayAudio}
          fretRangeLow={fretLow}
          fretRangeHigh={fretHigh}
          lessonType={lessonSettings?.lessonType as 'melodies' | 'chords' | undefined}
        />

        {/* Real-time Pitch Feedback Section */}
        {generatedMelody.length > 0 && !isGeneratingMelody && (
          <div style={{ width: '100%', maxWidth: '600px', margin: '2rem auto', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <LiveFeedback
              isListening={pitchDetection.isListening}
              onStartListening={handleStartPracticeWithFeedback}
              onStopListening={handleStopPracticeWithFeedback}
              currentPitch={currentPitchForGrading}
              volumeLevel={pitchDetection.volumeLevel}
              performanceState={performanceGrading.state}
              error={pitchDetection.error}
              permission={pitchDetection.permission}
              melody={generatedMelody}
            />
          </div>
        )}

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

  // Default: Free play sandbox mode
  return (
    <>
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
      />

      {/* Pitch Feedback Section for free play */}
      <div style={{ width: '100%', maxWidth: '600px', margin: '2rem auto', padding: '0 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {generatedMelody.length > 0 && !isGeneratingMelody && (
          <LiveFeedback
            isListening={pitchDetection.isListening}
            onStartListening={handleStartPracticeWithFeedback}
            onStopListening={handleStopPracticeWithFeedback}
            currentPitch={currentPitchForGrading}
            volumeLevel={pitchDetection.volumeLevel}
            performanceState={performanceGrading.state}
            error={pitchDetection.error}
            permission={pitchDetection.permission}
            melody={generatedMelody}
          />
        )}
      </div>
    </>
  )
}

export default Sandbox
