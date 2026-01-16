/**
 * Sandbox Page - Free play mode with optional pitch detection feedback
 * Also includes Practice session functionality
 */

import { useState, useEffect, useRef, useCallback, useMemo, useContext } from 'react'
import { createPortal } from 'react-dom'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import { type LessonSettings } from './PracticeOptionsModal'
import { useInstrument } from '../../contexts/InstrumentContext'
import { useTranslation } from '../../contexts/TranslationContext'
import AuthContext from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { useDSPPitchDetection, usePerformanceGrading } from '../../hooks'
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
  getBassNoteById,
  getKeyboardNoteById
} from '../../utils/practice/practiceNotes'
import type { AppliedScale, AppliedChord } from '../common/ScaleChordOptions'
import styles from '../../styles/Practice.module.css'

// Moved to component to access translations

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
  const { t } = useTranslation()
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null
  const { navigateToClassroom } = useInstrument()

  // Translated instrument names
  const instrumentNames: Record<string, string> = useMemo(() => ({
    keyboard: t('instruments.keyboard'),
    guitar: t('instruments.guitar'),
    bass: t('instruments.bass')
  }), [t])

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
    triggerClearChordsAndScales,
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
    melodyBpm,
    lowerOctaves,
    higherOctaves
  } = useInstrument()

  // Assignment creation state
  const [assigningToClassroomId, setAssigningToClassroomId] = useState<string | null>(null)
  const [showAssignTitleModal, setShowAssignTitleModal] = useState(false)
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)


  // Loading state - check on initial render if we have assignment to load
  const [isLoadingFromAssignment, setIsLoadingFromAssignment] = useState(() => {
    return !!localStorage.getItem('assignmentSettings')
  })

  // Flag to force initialization when loading from assignment (bypasses hasNoContent check)
  const [forceInitFromAssignment, setForceInitFromAssignment] = useState(false)

  // Pending selection data for guitar/bass (applied when handlers become ready)
  const [pendingSelectionData, setPendingSelectionData] = useState<any>(null)

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

        // Reset refs - DON'T set hasInitializedNotes to true here
        // Let the second effect handle initialization after component is mounted
        hasInitializedNotes.current = false
        hasAppliedVisualDisplay.current = false
        hasAnnouncedMelody.current = false

        // Set up basic session info
        setSelectedInstrument(settings.instrument)
        setInstrument(settings.instrument as 'keyboard' | 'guitar' | 'bass')
        setBpm(settings.bpm)
        setNumberOfBeats(settings.beats)
        setPracticeOptions([settings.lessonType])
        setDifficulty(1)
        setHasGeneratedMelody(false)

        // Set force flag to bypass hasNoContent check
        setForceInitFromAssignment(true)

        // Set lesson settings - the second effect will use selectionData to apply scales/chords
        const newLessonSettings: LessonSettings = {
          lessonType: settings.lessonType,
          difficulty: 1,
          bpm: settings.bpm,
          beats: settings.beats,
          chordCount: settings.chordCount,
          scales: settings.scales,
          chords: settings.chords,
          octaveLow: settings.octaveLow,
          octaveHigh: settings.octaveHigh,
          fretLow: settings.fretLow,
          fretHigh: settings.fretHigh,
          selectionData: settings.selectionData
        }
        setLessonSettings(newLessonSettings)

        // Clear existing content first (only selected notes, not scales/chords)
        // Don't call triggerClearChordsAndScales() here because it causes a race condition
        // when handlers change after Guitar/Bass mount. The pending selection effect
        // will set appliedScales/appliedChords directly, replacing any existing data.
        clearSelection()

        // Start session immediately - this puts user directly into practice mode
        setSessionStarted(true)
        setIsLoadingFromAssignment(false)

      } catch (err) {
        // Error parsing assignment settings
        localStorage.removeItem('assignmentSettings')
        setIsLoadingFromAssignment(false)
      }
    } else {
      // No assignment settings found, clear loading state
      setIsLoadingFromAssignment(false)
    }
  }, [setInstrument, clearSelection, setBpm, setNumberOfBeats])

  // Check for assignment creation mode from Classroom page
  useEffect(() => {
    const classroomId = localStorage.getItem('assigningToClassroom')
    if (classroomId) {
      setAssigningToClassroomId(classroomId)
      // Don't remove yet - we'll remove after saving or canceling
    }
  }, [])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGeneratingMelody])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generatedMelody, sessionStarted, selectedInstrument, melodyBpm])

  // Stop practice session
  const handleStopPracticeWithFeedback = useCallback(() => {
    pitchDetection.stopListening()
    performanceGrading.stopPerformance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Assignment creation handlers
  const handleOpenAssignModal = () => {
    setAssignmentTitle('')
    setAssignmentError(null)
    setShowAssignTitleModal(true)
  }

  const handleCloseAssignModal = () => {
    setShowAssignTitleModal(false)
    setAssignmentTitle('')
    setAssignmentError(null)
  }

  const handleCancelAssignment = () => {
    localStorage.removeItem('assigningToClassroom')
    setAssigningToClassroomId(null)
    navigateToClassroom()
  }

  const handleSaveAssignment = async () => {
    if (!assignmentTitle.trim()) {
      setAssignmentError('Please enter a title')
      return
    }

    if (!user || !assigningToClassroomId) {
      setAssignmentError('Invalid session')
      return
    }

    // Determine lesson type based on what's applied
    const hasScales = scaleChordManagement.appliedScales.length > 0
    const hasChords = scaleChordManagement.appliedChords.length > 0
    const hasNotes = selectedNotes.length > 0
    const lessonType = hasChords ? 'chords' : 'melodies'

    // Get scales/chords from applied items - scale name is in s.scale.name, chord name is in c.chord.name
    const appliedScaleNames = scaleChordManagement.appliedScales.map(s => s.scale?.name || 'Major')
    const appliedChordNames = scaleChordManagement.appliedChords.map(c => c.chord?.name || 'Major')

    // Only save manually selected notes (not scale/chord notes)
    // For guitar/bass, isManualSelection === true means manual
    // For keyboard, isManualSelection is undefined (all keyboard notes are manual)
    const manualNoteIds = selectedNotes
      .filter(n => n.isManualSelection === true || n.isManualSelection === undefined)
      .map(n => n.id)

    // Build the complete selection data to save the exact teacher selection
    const selectionData = {
      selectedNoteIds: manualNoteIds,
      appliedScales: scaleChordManagement.appliedScales.map(s => ({
        root: s.root,
        scaleName: s.scale?.name || 'Major',
        octave: s.octave,
        displayName: s.displayName
      })),
      appliedChords: scaleChordManagement.appliedChords.map(c => ({
        root: c.root,
        chordName: c.chord?.name || 'Major',
        octave: c.octave,
        fretZone: c.fretZone,
        displayName: c.displayName
      }))
    }

    // Calculate octave range from current state
    // Default keyboard range is 4-5, so:
    // octaveLow = 4 - lowerOctaves (start octave minus lower extension)
    // octaveHigh = 5 + higherOctaves (end octave plus higher extension)
    const octaveLow = 4 - lowerOctaves
    const octaveHigh = 5 + higherOctaves

    try {
      setIsSavingAssignment(true)
      setAssignmentError(null)

      const { error: insertError } = await supabase
        .from('assignments')
        .insert({
          classroom_id: assigningToClassroomId,
          title: assignmentTitle.trim(),
          lesson_type: lessonType,
          instrument: instrument,
          bpm: bpm,
          beats: numberOfBeats,
          chord_count: hasChords ? scaleChordManagement.appliedChords.length : 4,
          scales: appliedScaleNames.length > 0 ? appliedScaleNames : ['Major', 'Minor'],
          chords: appliedChordNames.length > 0 ? appliedChordNames : ['Major', 'Minor'],
          octave_low: octaveLow,
          octave_high: octaveHigh,
          fret_low: 0,
          fret_high: 12,
          selection_data: (hasNotes || hasScales || hasChords) ? selectionData : null,
          created_by: user.id
        })

      if (insertError) {
        setAssignmentError(insertError.message)
        return
      }

      // Success - clean up
      localStorage.removeItem('assigningToClassroom')
      setAssigningToClassroomId(null)
      setShowAssignTitleModal(false)

      // Navigate to classroom after saving
      localStorage.setItem('navigateToClassroomId', assigningToClassroomId)
      navigateToClassroom()
    } catch (err) {
      setAssignmentError('An error occurred while saving')
      console.error('Error saving assignment:', err)
    } finally {
      setIsSavingAssignment(false)
    }
  }

  const handleExportToClassroom = () => {
    // Build export data from current sandbox state
    const hasScales = scaleChordManagement.appliedScales.length > 0
    const hasChords = scaleChordManagement.appliedChords.length > 0
    const hasNotes = selectedNotes.length > 0
    const lessonType = hasChords ? 'chords' : 'melodies'

    // Get scales/chords from applied items
    const appliedScaleNames = scaleChordManagement.appliedScales.map(s => s.scale?.name || 'Major')
    const appliedChordNames = scaleChordManagement.appliedChords.map(c => c.chord?.name || 'Major')

    // Only save manually selected notes
    const manualNoteIds = selectedNotes
      .filter(n => n.isManualSelection === true || n.isManualSelection === undefined)
      .map(n => n.id)

    // Build the complete selection data
    const selectionData = {
      selectedNoteIds: manualNoteIds,
      appliedScales: scaleChordManagement.appliedScales.map(s => ({
        root: s.root,
        scaleName: s.scale?.name || 'Major',
        octave: s.octave,
        displayName: s.displayName
      })),
      appliedChords: scaleChordManagement.appliedChords.map(c => ({
        root: c.root,
        chordName: c.chord?.name || 'Major',
        octave: c.octave,
        fretZone: c.fretZone,
        displayName: c.displayName
      }))
    }

    // Calculate octave range
    const octaveLow = 4 - lowerOctaves
    const octaveHigh = 5 + higherOctaves

    // Store export data in localStorage
    const exportData = {
      instrument,
      lessonType,
      bpm,
      beats: numberOfBeats,
      chordMode,
      chordCount: hasChords ? scaleChordManagement.appliedChords.length : 4,
      scales: appliedScaleNames.length > 0 ? appliedScaleNames : ['Major', 'Minor'],
      chords: appliedChordNames.length > 0 ? appliedChordNames : ['Major', 'Minor'],
      octaveLow,
      octaveHigh,
      selectionData: (hasNotes || hasScales || hasChords) ? selectionData : null
    }

    localStorage.setItem('exportToClassroomData', JSON.stringify(exportData))
    navigateToClassroom()
  }

  const handleLessonComplete = useCallback(() => {
    const message = t('sandbox.congratulations')
    setCongratulationsMessage(message)
  }, [t])

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

    // For assignment-loaded sessions, force initialization regardless of current content
    const shouldInitialize = hasNoContent || forceInitFromAssignment

    // Reset the force flag after checking
    if (forceInitFromAssignment) {
      setForceInitFromAssignment(false)
    }

    // Use settings from the modal
    const selectedBpm = lessonSettings.bpm
    const selectedNoteCount = lessonSettings.beats
    const selectedChordCount = lessonSettings.chordCount

    // If we have selectionData, restore the exact teacher selection instead of randomizing
    if (shouldInitialize && lessonSettings.selectionData) {
      hasInitializedNotes.current = true
      setBpm(selectedBpm)
      setNumberOfBeats(selectedNoteCount)

      const selectionData = lessonSettings.selectionData

      // Set octave range for keyboard
      // Default keyboard range is 4-5, so:
      // lowerOctaves = 4 - octaveLow (how many octaves below 4)
      // higherOctaves = octaveHigh - 5 (how many octaves above 5)
      if (selectedInstrument === 'keyboard') {
        const octaveLow = lessonSettings.octaveLow || 4
        const octaveHigh = lessonSettings.octaveHigh || 5
        const lowerOctavesForRange = 4 - octaveLow
        const higherOctavesForRange = octaveHigh - 5
        handleOctaveRangeChange(lowerOctavesForRange, higherOctavesForRange)
      }

      // Apply the exact selection after handlers are ready
      // For guitar/bass, we need to wait for InstrumentDisplay to mount and register handlers
      const applySelectionData = () => {
        // Apply scales
        if (selectionData.appliedScales && selectionData.appliedScales.length > 0) {
          if (selectedInstrument === 'keyboard') {
            selectionData.appliedScales.forEach(scaleData => {
              const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleKeyboardScaleApply(scaleData.root, scaleObj, scaleData.octave || 4)
              }
            })
          } else if (selectedInstrument === 'guitar') {
            selectionData.appliedScales.forEach(scaleData => {
              const scaleObj = GUITAR_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleScaleSelect(scaleData.root, scaleObj)
              }
            })
          } else if (selectedInstrument === 'bass') {
            selectionData.appliedScales.forEach(scaleData => {
              const scaleObj = BASS_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleScaleSelect(scaleData.root, scaleObj as any)
              }
            })
          }
        }

        // Apply chords
        if (selectionData.appliedChords && selectionData.appliedChords.length > 0) {
          setChordMode('progression')
          if (selectedInstrument === 'keyboard') {
            selectionData.appliedChords.forEach(chordData => {
              const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleKeyboardChordApply(chordData.root, chordObj, chordData.octave || 4)
              }
            })
          } else if (selectedInstrument === 'guitar') {
            selectionData.appliedChords.forEach(chordData => {
              const chordObj = GUITAR_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleGuitarChordApply(chordData.root, chordObj, chordData.fretZone || 0)
              }
            })
          } else if (selectedInstrument === 'bass') {
            selectionData.appliedChords.forEach(chordData => {
              const chordObj = BASS_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleBassChordApply(chordData.root, chordObj, chordData.fretZone || 0)
              }
            })
          }
        }

        // Apply individual notes
        if (selectionData.selectedNoteIds && selectionData.selectedNoteIds.length > 0) {
          if (selectedInstrument === 'keyboard') {
            // Calculate octave range for note lookup
            // Default keyboard range is 4-5, so:
            // lowerOctaves = 4 - octaveLow (how many octaves below 4)
            // higherOctaves = octaveHigh - 5 (how many octaves above 5)
            const octaveLow = lessonSettings.octaveLow || 4
            const octaveHigh = lessonSettings.octaveHigh || 5
            const lowerOctaves = 4 - octaveLow
            const higherOctaves = octaveHigh - 5

            // Apply octave range so notes are visible
            handleOctaveRangeChange(lowerOctaves, higherOctaves)

            selectionData.selectedNoteIds.forEach((noteId: string) => {
              const noteObj = getKeyboardNoteById(noteId, lowerOctaves, higherOctaves)
              if (noteObj) {
                selectNote(noteObj, 'multi')
              }
            })
          } else if (selectedInstrument === 'guitar') {
            selectionData.selectedNoteIds.forEach((noteId: string) => {
              const noteObj = getGuitarNoteById(noteId)
              if (noteObj) {
                // Convert guitar note to Note format for selectNote
                const note = {
                  id: noteObj.id,
                  name: noteObj.name,
                  frequency: noteObj.frequency,
                  isBlack: noteObj.name.includes('#'),
                  position: noteObj.position
                }
                selectNote(note, 'multi')
              }
            })
          } else if (selectedInstrument === 'bass') {
            selectionData.selectedNoteIds.forEach((noteId: string) => {
              const noteObj = getBassNoteById(noteId)
              if (noteObj) {
                // Convert bass note to Note format for selectNote
                const note = {
                  id: noteObj.id,
                  name: noteObj.name,
                  frequency: noteObj.frequency,
                  isBlack: noteObj.name.includes('#'),
                  position: noteObj.position
                }
                selectNote(note, 'multi')
              }
            })
          }
        }
      }

      // For keyboard, apply immediately after a short delay
      // For guitar/bass, store as pending - a separate effect will apply when handlers are ready
      if (selectedInstrument === 'keyboard') {
        setTimeout(applySelectionData, 300)
      } else {
        // Store the selection data and instrument - a separate useEffect will apply it when handlers are ready
        setPendingSelectionData({
          instrument: selectedInstrument,
          selectionData: selectionData,
          lessonSettings: lessonSettings
        })
      }

      // Set up details for display
      const scaleNames = selectionData.appliedScales?.map(s => `${s.root} ${s.scaleName}`).join(', ') || ''
      const chordNames = selectionData.appliedChords?.map(c => `${c.root} ${c.chordName}`).join(', ') || ''

      if (selectionData.appliedChords && selectionData.appliedChords.length > 0) {
        setSetupDetails({ type: 'chords', details: { chordCount: selectionData.appliedChords.length, description: chordNames } })
      } else if (selectionData.appliedScales && selectionData.appliedScales.length > 0) {
        setSetupDetails({ type: 'melodies', details: { description: scaleNames } })
      }

      return // Don't continue to random generation
    }

    if (shouldInitialize && selectedInstrument === 'keyboard') {
      hasInitializedNotes.current = true
      // Use BPM from settings
      setBpm(selectedBpm)

      // Use note count from settings
      setNumberOfBeats(selectedNoteCount)

      // Use octave range from settings (default to 4-5 if not set)
      const octaveLow = lessonSettings.octaveLow || 4
      const octaveHigh = lessonSettings.octaveHigh || 5

      // Set octave range to show the selected range
      // Default keyboard range is 4-5, so:
      // lowerOctaves = 4 - octaveLow (how many octaves below 4)
      // higherOctaves = octaveHigh - 5 (how many octaves above 5)
      const lowerOctavesForRange = 4 - octaveLow
      const higherOctavesForRange = octaveHigh - 5
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
    if (shouldInitialize && selectedInstrument === 'guitar') {
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
    if (shouldInitialize && selectedInstrument === 'bass') {
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
  }, [sessionStarted, practiceOptions, selectedNotes.length, scaleChordManagement.appliedScales.length, scaleChordManagement.appliedChords.length, setGuitarNotes, setBpm, setNumberOfBeats, selectedInstrument, setChordMode, handleOctaveRangeChange, scaleChordManagement, lessonSettings, forceInitFromAssignment, selectNote])

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

  // Apply pending selection data for guitar/bass using direct setters
  // This bypasses handlers and sets appliedScales/appliedChords directly
  // The Guitar/Bass components will sync their internal state from these props
  useEffect(() => {
    if (!pendingSelectionData) return

    const { instrument: pendingInstrument, selectionData } = pendingSelectionData

    // Delay to ensure Guitar/Bass components have mounted and their sync effects are ready
    const applyTimeoutId = setTimeout(() => {
    // Apply scales using direct setter
    if (selectionData.appliedScales && selectionData.appliedScales.length > 0) {
      const scalesToApply: AppliedScale[] = []

      if (pendingInstrument === 'guitar') {
        selectionData.appliedScales.forEach((scaleData: any) => {
          // Handle scale box names like "Major (Frets 0-4)" by extracting base scale name and fret range
          const fretRangeMatch = scaleData.scaleName.match(/\(Frets (\d+)-(\d+)\)$/)
          const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
          const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
          const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
          const scaleObj = GUITAR_SCALES.find(s => s.name === baseScaleName || s.name === scaleData.scaleName)
          if (scaleObj) {
            // Get scale positions and filter to the specific fret range
            const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
            const positions = allPositions.filter(pos => pos.fret >= fretLow && pos.fret <= fretHigh)
            const scaleNotes = positions.map(pos => {
              const noteId = `g-s${pos.string}-f${pos.fret}`
              const guitarNote = getGuitarNoteById(noteId)
              // Visual coordinates for the Guitar component
              const stringIndex = 6 - pos.string
              const fretIndex = pos.fret
              return {
                id: noteId,
                name: pos.note,
                frequency: guitarNote?.frequency || 0,
                isBlack: pos.note.includes('#'),
                position: guitarNote?.position || 0,
                __guitarCoord: { stringIndex, fretIndex }
              }
            })

            scalesToApply.push({
              id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
              root: scaleData.root,
              scale: scaleObj,
              displayName: `${scaleData.root} ${scaleObj.name}`,
              notes: scaleNotes
            })
          }
        })
      } else if (pendingInstrument === 'bass') {
        selectionData.appliedScales.forEach((scaleData: any) => {
          // Handle scale box names like "Major (Frets 0-4)" by extracting base scale name and fret range
          const fretRangeMatch = scaleData.scaleName.match(/\(Frets (\d+)-(\d+)\)$/)
          const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
          const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
          const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
          const scaleObj = BASS_SCALES.find(s => s.name === baseScaleName || s.name === scaleData.scaleName)
          if (scaleObj) {
            const allPositions = getBassScalePositions(scaleData.root, scaleObj, bassNotes)
            const positions = allPositions.filter(pos => pos.fret >= fretLow && pos.fret <= fretHigh)
            const scaleNotes = positions.map(pos => {
              const noteId = `b-s${pos.string}-f${pos.fret}`
              const bassNote = getBassNoteById(noteId)
              // Visual coordinates for the Bass component
              const stringIndex = 4 - pos.string
              const fretIndex = pos.fret
              return {
                id: noteId,
                name: pos.note,
                frequency: bassNote?.frequency || 0,
                isBlack: pos.note.includes('#'),
                position: bassNote?.position || 0,
                __bassCoord: { stringIndex, fretIndex }
              }
            })

            scalesToApply.push({
              id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
              root: scaleData.root,
              scale: scaleObj as any,
              displayName: `${scaleData.root} ${scaleObj.name}`,
              notes: scaleNotes
            })
          }
        })
      }

      if (scalesToApply.length > 0) {
        scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
      }
    }

    // Apply chords using direct setter
    if (selectionData.appliedChords && selectionData.appliedChords.length > 0) {
      setChordMode('progression')

      const chordsToApply: AppliedChord[] = []

      if (pendingInstrument === 'guitar') {
        selectionData.appliedChords.forEach((chordData: any) => {
          // Handle chord shape names like "C Major (Frets 0-4)" by extracting base chord type
          // First remove fret range, then remove root note prefix
          let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
          // Remove root note prefix (e.g., "C Major" -> "Major", "C# Minor" -> "Minor")
          baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
          const chordObj = GUITAR_CHORDS.find(c => c.name === baseChordName || c.name === chordData.chordName)
          if (chordObj) {
            const chordBoxes = getChordBoxes(chordData.root, chordObj, guitarNotes)
            if (chordBoxes.length > 0) {
              const boxIndex = Math.min(chordData.fretZone || 0, chordBoxes.length - 1)
              const chordBox = chordBoxes[boxIndex]

              // Build note keys for the chord
              const noteKeys = chordBox.positions.map(pos => {
                const stringIndex = 6 - pos.string
                const fretIndex = pos.fret
                return fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
              })

              chordsToApply.push({
                id: `guitar-${chordData.root}-${chordObj.name}-${Date.now()}`,
                root: chordData.root,
                chord: chordObj as any,
                displayName: `${chordData.root} ${chordObj.name}`,
                noteKeys: noteKeys,
                fretZone: boxIndex
              })
            }
          }
        })
      } else if (pendingInstrument === 'bass') {
        selectionData.appliedChords.forEach((chordData: any) => {
          // Handle chord shape names like "C Major (Frets 0-4)" by extracting base chord type
          let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
          baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
          const chordObj = BASS_CHORDS.find(c => c.name === baseChordName || c.name === chordData.chordName)
          if (chordObj) {
            const chordBoxes = getBassChordBoxes(chordData.root, chordObj, bassNotes)
            if (chordBoxes.length > 0) {
              const boxIndex = Math.min(chordData.fretZone || 0, chordBoxes.length - 1)
              const chordBox = chordBoxes[boxIndex]

              // Build note keys for the chord
              const noteKeys = chordBox.positions.map(pos => {
                const stringIndex = 4 - pos.string
                const fretIndex = pos.fret
                return fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
              })

              chordsToApply.push({
                id: `bass-${chordData.root}-${chordObj.name}-${Date.now()}`,
                root: chordData.root,
                chord: chordObj as any,
                displayName: `${chordData.root} ${chordObj.name}`,
                noteKeys: noteKeys,
                fretZone: boxIndex
              })
            }
          }
        })
      }

      if (chordsToApply.length > 0) {
        scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
      }
    }

    // Apply individual notes - filter out nulls from old assignments
    const validNoteIds = (selectionData.selectedNoteIds || []).filter((id: string | null) => id !== null && id !== undefined)
    if (validNoteIds.length > 0) {
      if (pendingInstrument === 'guitar') {
        // Use note handler if available to set manual notes directly on guitar
        if (scaleChordManagement.noteHandlers?.handleSetManualNotes) {
          scaleChordManagement.noteHandlers.handleSetManualNotes(validNoteIds)
        } else {
          // Fallback to context selectNote
          validNoteIds.forEach((noteId: string) => {
            const noteObj = getGuitarNoteById(noteId)
            if (noteObj) {
              const note = {
                id: noteObj.id,
                name: noteObj.name,
                frequency: noteObj.frequency,
                isBlack: noteObj.name.includes('#'),
                position: noteObj.position
              }
              selectNote(note, 'multi')
            }
          })
        }
      } else if (pendingInstrument === 'bass') {
        // Use bass note handler if available
        if (scaleChordManagement.bassNoteHandlers?.handleSetManualNotes) {
          scaleChordManagement.bassNoteHandlers.handleSetManualNotes(validNoteIds)
        } else {
          // Fallback to context selectNote
          validNoteIds.forEach((noteId: string) => {
            const noteObj = getBassNoteById(noteId)
            if (noteObj) {
              const note = {
                id: noteObj.id,
                name: noteObj.name,
                frequency: noteObj.frequency,
                isBlack: noteObj.name.includes('#'),
                position: noteObj.position
              }
              selectNote(note, 'multi')
            }
          })
        }
      }
    }

    // Clear pending data after applying
    setPendingSelectionData(null)
    }, 300) // 300ms delay to ensure components are mounted

    return () => clearTimeout(applyTimeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingSelectionData])

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
      setMelodySetupMessage(t('sandbox.melodySetup'))
    }
  }, [welcomeSpeechDone, generatedMelody, recordedAudioBlob, setupDetails, t])


  // If loading from assignment, show nothing (prevents flash of sandbox mode)
  if (isLoadingFromAssignment) {
    return null
  }

  // If session started, show the practice session UI
  if (sessionStarted && selectedInstrument) {
    const instrumentName = instrumentNames[selectedInstrument] || 'Instrument'
    const welcomeMessage = t('sandbox.welcomeToLesson', { instrument: instrumentName })

    // Calculate octave range for keyboard based on lesson settings
    // Default keyboard range is 4-5
    const octaveLow = lessonSettings?.octaveLow ?? 4
    const octaveHigh = lessonSettings?.octaveHigh ?? 5
    const calculatedLowerOctaves = selectedInstrument === 'keyboard' ? 4 - octaveLow : 0
    const calculatedHigherOctaves = selectedInstrument === 'keyboard' ? octaveHigh - 5 : 0

    // Get fret range for guitar/bass lessons
    // For assignments with selection data, don't restrict fret range (show full fretboard)
    const hasSelectionData = lessonSettings?.selectionData && (
      lessonSettings.selectionData.appliedScales?.length > 0 ||
      lessonSettings.selectionData.appliedChords?.length > 0 ||
      lessonSettings.selectionData.selectedNoteIds?.length > 0
    )
    const fretLow = hasSelectionData ? undefined : lessonSettings?.fretLow
    const fretHigh = hasSelectionData ? undefined : lessonSettings?.fretHigh

    return (
      <>
        <div className={styles.backButtonContainer}>
          <button
            className={styles.backButton}
            onClick={handleBackToSelection}
            aria-label={t('sandbox.endSession')}
          >
            {t('sandbox.endSession')}
          </button>
          <button
            className={styles.doneButton}
            onClick={handleBackToSelection}
            aria-label={t('sandbox.done')}
          >
            {t('sandbox.done')}
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
          isListening={pitchDetection.isListening}
          onStartFeedback={handleStartPracticeWithFeedback}
          onStopFeedback={handleStopPracticeWithFeedback}
          performanceState={performanceGrading.state}
          volumeLevel={pitchDetection.volumeLevel}
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

  // Assignment title modal
  const assignTitleModal = showAssignTitleModal && createPortal(
    <div
      className={styles.modalOverlay}
      onClick={(e) => e.target === e.currentTarget && handleCloseAssignModal()}
    >
      <div className={styles.assignModal}>
        <div className={styles.assignModalHeader}>
          <h2 className={styles.assignModalTitle}>{t('sandbox.createAssignment')}</h2>
          <button
            className={styles.assignModalClose}
            onClick={handleCloseAssignModal}
            aria-label={t('common.close')}
          >
            ×
          </button>
        </div>

        <div className={styles.assignModalContent}>
          {assignmentError && <div className={styles.assignModalError}>{assignmentError}</div>}

          <div className={styles.assignModalField}>
            <label className={styles.assignModalLabel} htmlFor="assignmentTitle">
              {t('sandbox.assignmentTitle')}
            </label>
            <input
              id="assignmentTitle"
              type="text"
              className={styles.assignModalInput}
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder={t('sandbox.enterAssignmentTitle')}
              autoFocus
              disabled={isSavingAssignment}
            />
          </div>

          <div className={styles.assignModalInfo}>
            <p><strong>{t('sandbox.instrument')}:</strong> {instrumentNames[instrument]}</p>
            <p><strong>{t('sandbox.bpm')}:</strong> {bpm}</p>
            <p><strong>{t('sandbox.beats')}:</strong> {numberOfBeats}</p>
            <p><strong>{t('sandbox.type')}:</strong> {scaleChordManagement.appliedChords.length > 0 ? t('sandbox.chords') : t('sandbox.melodies')}</p>
          </div>

          <button
            className={styles.assignModalSubmit}
            onClick={handleSaveAssignment}
            disabled={isSavingAssignment || !assignmentTitle.trim()}
          >
            {isSavingAssignment ? t('sandbox.saving') : t('sandbox.createAssignment')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )

  // Default: Free play sandbox mode
  return (
    <>
      {/* Assignment mode buttons - only show when coming from Classroom page */}
      {assigningToClassroomId && (
        <div className={styles.assignmentModeBar}>
          <span className={styles.assignmentModeText}>{t('sandbox.assignmentEditor')}</span>
          <div className={styles.assignmentModeButtons}>
            <button
              className={styles.assignmentCancelButton}
              onClick={handleCancelAssignment}
            >
              {t('common.cancel')}
            </button>
            <button
              className={styles.assignmentAssignButton}
              onClick={handleOpenAssignModal}
            >
              {t('common.apply')}
            </button>
          </div>
        </div>
      )}

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
        isListening={pitchDetection.isListening}
        onStartFeedback={handleStartPracticeWithFeedback}
        onStopFeedback={handleStopPracticeWithFeedback}
        performanceState={performanceGrading.state}
        volumeLevel={pitchDetection.volumeLevel}
        onExportToClassroom={handleExportToClassroom}
        canExportToClassroom={!!user && !assigningToClassroomId}
        hasExportableContent={selectedNotes.length > 0 || scaleChordManagement.appliedScales.length > 0 || scaleChordManagement.appliedChords.length > 0}
      />

      {assignTitleModal}
    </>
  )
}

export default Sandbox
