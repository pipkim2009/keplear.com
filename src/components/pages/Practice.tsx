import { useState, useEffect, useRef, useCallback } from 'react'
import styles from '../../styles/Practice.module.css'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import PracticeOptionsModal, { type LessonSettings } from './PracticeOptionsModal'
import { useInstrument } from '../../contexts/InstrumentContext'
import { useAuth } from '../../hooks/useAuth'
import AuthModal from '../auth/AuthModal'
import type { Note } from '../../utils/notes'
import { useAIPitchDetection, usePerformanceGrading } from '../../hooks'
import { LiveFeedback } from '../practice'
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

  // Auth state for skills button
  const { user } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [pendingSkillsNavigation, setPendingSkillsNavigation] = useState(false)

  // AI Pitch detection and performance grading hooks
  const pitchDetection = useAIPitchDetection()
  const performanceGrading = usePerformanceGrading()
  const [showPitchFeedback, setShowPitchFeedback] = useState(false)

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
    scaleChordManagement,
    pendingSkillLesson,
    clearPendingSkillLesson,
    navigateToSkills
  } = useInstrument()

  // Pass pitch detection results to grading system
  useEffect(() => {
    if (pitchDetection.currentPitch && performanceGrading.state.isActive) {
      performanceGrading.processPitch(pitchDetection.currentPitch)
    }
  }, [pitchDetection.currentPitch, performanceGrading.state.isActive, performanceGrading.processPitch])

  // Start performance grading when user starts listening and melody is ready
  const handleStartPracticeWithFeedback = useCallback(() => {
    if (generatedMelody.length > 0) {
      setShowPitchFeedback(true)
      // Set the correct instrument for pitch detection filtering
      if (selectedInstrument) {
        pitchDetection.setInstrument(selectedInstrument as 'keyboard' | 'guitar' | 'bass')
      }
      // Pass BPM for beat-synced practice
      performanceGrading.startPerformance(generatedMelody, bpm)
      pitchDetection.startListening()
    }
  }, [generatedMelody, selectedInstrument, bpm, pitchDetection, performanceGrading])

  // Stop practice session
  const handleStopPracticeWithFeedback = () => {
    pitchDetection.stopListening()
    performanceGrading.stopPerformance()
    setShowPitchFeedback(false)
  }

  const handleStartLesson = () => {
    setShowOptionsModal(true)
  }

  // Handle navigation to skills after successful login
  useEffect(() => {
    if (user && pendingSkillsNavigation) {
      setPendingSkillsNavigation(false)
      setShowAuthModal(false)
      navigateToSkills()
    }
  }, [user, pendingSkillsNavigation, navigateToSkills])

  const handleSkillsClick = () => {
    if (user) {
      navigateToSkills()
    } else {
      setPendingSkillsNavigation(true)
      setShowAuthModal(true)
    }
  }

  const handleAuthModalClose = () => {
    setShowAuthModal(false)
    // Only clear pending navigation if user didn't log in (manual dismiss)
    // The useEffect will handle navigation and clearing if login succeeded
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

  // Handle pending skill lesson from Skills page
  useEffect(() => {
    if (pendingSkillLesson) {
      const { instrument, skillType, skillName, octaveLow, octaveHigh, fretLow, fretHigh, bpm, beats, chordCount } = pendingSkillLesson

      // Create lesson settings for the specific skill
      const settings: LessonSettings = {
        lessonType: skillType === 'scales' ? 'melodies' : 'chords',
        difficulty: 0, // Learn mode
        bpm,
        beats,
        chordCount,
        scales: skillType === 'scales' ? [skillName] : undefined,
        chords: skillType === 'chords' ? [skillName] : undefined,
        octaveLow,
        octaveHigh,
        fretLow,
        fretHigh
      }

      // Start the lesson with these settings
      const practiceOption = skillType === 'scales' ? 'melodies' : 'chords'
      handleOptionsStart(instrument, [practiceOption], 0, settings)

      // Clear the pending skill lesson
      clearPendingSkillLesson()
    }
  }, [pendingSkillLesson, clearPendingSkillLesson])

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

  // Helper function to filter scales based on user selection (now uses array of scale names)
  const getFilteredScales = (scales: typeof KEYBOARD_SCALES, selectedScales: string[] | undefined) => {
    if (!selectedScales || selectedScales.length === 0) return scales
    return scales.filter(s => selectedScales.includes(s.name))
  }

  // Helper function to filter chords based on user selection (now uses array of chord names)
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
      // Formula: to show octave N, set lowerOctaves = 4 - N, higherOctaves = N - 4
      const lowerOctavesForRange = 4 - octaveLow
      const higherOctavesForRange = octaveHigh - 4
      handleOctaveRangeChange(lowerOctavesForRange, higherOctavesForRange)

      // Pick a random octave within the selected range for the lesson
      const octaveRange = Array.from({ length: octaveHigh - octaveLow + 1 }, (_, i) => octaveLow + i)
      const selectedOctave = octaveRange[Math.floor(Math.random() * octaveRange.length)]

      // SCALES: Scale spanning all octaves in the selected range (filtered by user selection)
      if (practiceOptions.includes('melodies')) {
        const filteredScales = getFilteredScales(KEYBOARD_SCALES, lessonSettings.scales)
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

        const filteredChords = getFilteredChords(KEYBOARD_CHORDS, lessonSettings.chords)
        const chordDetails: { root: string; chord: string; octave: number }[] = []

        // Distribute chords across octaves randomly
        const octavesToUse: number[] = []

        if (selectedChordCount >= octaveRange.length) {
          // Enough chords to cover all octaves - ensure each gets at least one
          // Shuffle octave range first for random assignment
          const shuffledOctaves = [...octaveRange].sort(() => Math.random() - 0.5)
          octavesToUse.push(...shuffledOctaves)

          // Add random octaves for remaining chords
          for (let i = octaveRange.length; i < selectedChordCount; i++) {
            octavesToUse.push(octaveRange[Math.floor(Math.random() * octaveRange.length)])
          }
        } else {
          // Fewer chords than octaves - assign randomly
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
      // Use BPM from settings
      setBpm(selectedBpm)

      // Use note count from settings
      setNumberOfBeats(selectedNoteCount)

      // SCALES: All scale positions within the fret range
      if (practiceOptions.includes('melodies')) {
        const filteredScales = getFilteredScales(GUITAR_SCALES, lessonSettings.scales)
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

          // Get individual scale boxes and filter to those within fret range
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
              scaleBoxes: scaleBoxes // Store array of scale boxes for visual display
            }
          })
        }
      }

      // CHORDS: chords with progression mode (filtered by user selection)
      else if (practiceOptions.includes('chords')) {
        setChordMode('progression')

        const filteredChords = getFilteredChords(GUITAR_CHORDS, lessonSettings.chords)
        const chordDetails: { root: string; chord: string; chordObj: typeof GUITAR_CHORDS[0]; boxIndex: number }[] = []

        // Get fret range from settings (default 0-12)
        const fretLow = lessonSettings.fretLow ?? 0
        const fretHigh = lessonSettings.fretHigh ?? 12

        // Track which box positions have been used (by fret range) to ensure coverage
        const usedBoxPositions = new Set<string>()

        // Build chord details - distribute across fret positions within range
        for (let i = 0; i < selectedChordCount; i++) {
          const randomChord = filteredChords[Math.floor(Math.random() * filteredChords.length)]
          const randomRoot = GUITAR_CHORD_ROOT_NOTES[Math.floor(Math.random() * GUITAR_CHORD_ROOT_NOTES.length)]

          // Get actual chord boxes for this chord/root and filter to fret range
          const chordBoxes = getChordBoxes(randomRoot, randomChord, guitarNotes)
          const validBoxes = chordBoxes.filter(box =>
            box.minFret >= fretLow && box.maxFret <= fretHigh
          )

          if (validBoxes.length > 0) {
            // Prefer boxes that haven't been used yet to ensure each fret position gets coverage
            const unusedBoxes = validBoxes.filter(box =>
              !usedBoxPositions.has(`${box.minFret}-${box.maxFret}`)
            )

            // Pick from unused boxes if available, otherwise from all valid boxes
            const targetBoxes = unusedBoxes.length > 0 ? unusedBoxes : validBoxes
            const selectedBoxIndex = Math.floor(Math.random() * targetBoxes.length)
            const selectedBox = targetBoxes[selectedBoxIndex]

            // Find the actual index in the original chordBoxes array
            const boxIndex = chordBoxes.findIndex(box =>
              box.minFret === selectedBox.minFret && box.maxFret === selectedBox.maxFret
            )

            usedBoxPositions.add(`${selectedBox.minFret}-${selectedBox.maxFret}`)
            chordDetails.push({ root: randomRoot, chord: randomChord.name, chordObj: randomChord, boxIndex })
          }
        }

        // Shuffle the chord details for random application order (not sequential)
        for (let i = chordDetails.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chordDetails[i], chordDetails[j]] = [chordDetails[j], chordDetails[i]]
        }

        // Delay chord application to run after any clearing effects complete
        // Uses the same chord box system as sandbox mode
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
      // Use BPM from settings
      setBpm(selectedBpm)

      // Use note count from settings
      setNumberOfBeats(selectedNoteCount)

      // SCALES: All scale positions within the fret range
      if (practiceOptions.includes('melodies')) {
        const filteredScales = getFilteredScales(BASS_SCALES, lessonSettings.scales)
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

          // Get individual scale boxes and filter to those within fret range
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
              scaleBoxes: scaleBoxes // Store array of scale boxes for visual display
            }
          })
        }
      }

      // CHORDS: chords with progression mode (filtered by user selection)
      else if (practiceOptions.includes('chords')) {
        setChordMode('progression')

        const filteredChords = getFilteredChords(BASS_CHORDS, lessonSettings.chords)
        const chordDetails: { root: string; chord: string; chordObj: typeof BASS_CHORDS[0]; boxIndex: number }[] = []

        // Get fret range from settings (default 0-12)
        const fretLow = lessonSettings.fretLow ?? 0
        const fretHigh = lessonSettings.fretHigh ?? 12

        // Track which box positions have been used (by fret range) to ensure coverage
        const usedBoxPositions = new Set<string>()

        // Build chord details - distribute across fret positions within range
        for (let i = 0; i < selectedChordCount; i++) {
          const randomChord = filteredChords[Math.floor(Math.random() * filteredChords.length)]
          const randomRoot = BASS_CHORD_ROOT_NOTES[Math.floor(Math.random() * BASS_CHORD_ROOT_NOTES.length)]

          // Get actual chord boxes for this chord/root and filter to fret range
          const chordBoxes = getBassChordBoxes(randomRoot, randomChord, bassNotes)
          const validBoxes = chordBoxes.filter(box =>
            box.minFret >= fretLow && box.maxFret <= fretHigh
          )

          if (validBoxes.length > 0) {
            // Prefer boxes that haven't been used yet to ensure each fret position gets coverage
            const unusedBoxes = validBoxes.filter(box =>
              !usedBoxPositions.has(`${box.minFret}-${box.maxFret}`)
            )

            // Pick from unused boxes if available, otherwise from all valid boxes
            const targetBoxes = unusedBoxes.length > 0 ? unusedBoxes : validBoxes
            const selectedBoxIndex = Math.floor(Math.random() * targetBoxes.length)
            const selectedBox = targetBoxes[selectedBoxIndex]

            // Find the actual index in the original chordBoxes array
            const boxIndex = chordBoxes.findIndex(box =>
              box.minFret === selectedBox.minFret && box.maxFret === selectedBox.maxFret
            )

            usedBoxPositions.add(`${selectedBox.minFret}-${selectedBox.maxFret}`)
            chordDetails.push({ root: randomRoot, chord: randomChord.name, chordObj: randomChord, boxIndex })
          }
        }

        // Shuffle the chord details for random application order (not sequential)
        for (let i = chordDetails.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [chordDetails[i], chordDetails[j]] = [chordDetails[j], chordDetails[i]]
        }

        // Delay chord application to run after any clearing effects complete
        // Uses the same chord box system as sandbox mode
        setTimeout(() => {
          chordDetails.forEach(detail => {
            scaleChordManagement.handleBassChordApply(detail.root, detail.chordObj, detail.boxIndex)
          })
        }, 50)

        setSetupDetails({ type: 'chords', details: { chordCount: selectedChordCount, chords: chordDetails, fretRange: `${fretLow}-${fretHigh}` } })
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

    const welcomeMessage = `Welcome to your ${instrumentName} lesson`

    // Calculate octave range for keyboard based on lesson settings
    // Formula: lowerOctaves = 4 - octaveLow, higherOctaves = octaveHigh - 5
    // Base keyboard range is octaves 4-5
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
          keyboardSelectionMode={keyboardSelectionMode}
          onKeyboardSelectionModeChange={handleKeyboardSelectionModeChange}
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
          disableSelectionMode={true}
          hideSelectionMode={true}
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
            {/* Live Feedback - pitch detection controls and notes history */}
            <LiveFeedback
              isListening={pitchDetection.isListening}
              onStartListening={handleStartPracticeWithFeedback}
              onStopListening={handleStopPracticeWithFeedback}
              currentPitch={pitchDetection.currentPitch}
              volumeLevel={pitchDetection.volumeLevel}
              performanceState={performanceGrading.state}
              lastNoteResult={performanceGrading.lastNoteResult}
              error={pitchDetection.error}
              permission={pitchDetection.permission}
              totalNotes={generatedMelody.length}
              melody={generatedMelody}
              modelStatus={pitchDetection.modelStatus}
              onSkipNote={performanceGrading.skipNote}
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

      {/* Buttons Section */}
      <section className={styles.buttonsSection}>
        <button
          className={styles.startSessionButton}
          onClick={handleStartLesson}
          aria-label="Start practice session"
        >
          Begin Session
        </button>
        <button
          className={styles.skillsButton}
          onClick={handleSkillsClick}
          aria-label="View skills"
        >
          Skills
        </button>
      </section>

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleAuthModalClose}
        initialForm="login"
      />
    </div>
  )
}

export default Practice
