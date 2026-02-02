/**
 * Classroom Page - View and create classrooms
 * Now includes embedded instrument UI for creating assignments and taking lessons
 */

import { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import { AuthContext } from '../../contexts/AuthContext'
import { useTranslation } from '../../contexts/TranslationContext'
import { useInstrument } from '../../contexts/InstrumentContext'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
// Old feedback system removed - now using useMelodyFeedback in CustomAudioPlayer
import type { Note } from '../../utils/notes'
import type { AppliedScale, AppliedChord } from '../common/ScaleChordOptions'
import { KEYBOARD_SCALES, ROOT_NOTES } from '../../utils/instruments/keyboard/keyboardScales'
import { KEYBOARD_CHORDS, KEYBOARD_CHORD_ROOT_NOTES } from '../../utils/instruments/keyboard/keyboardChords'
import { GUITAR_SCALES, ROOT_NOTES as GUITAR_ROOT_NOTES, getScalePositions } from '../../utils/instruments/guitar/guitarScales'
import { GUITAR_CHORDS, getChordBoxes } from '../../utils/instruments/guitar/guitarChords'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import { BASS_SCALES, BASS_ROOT_NOTES, getBassScalePositions } from '../../utils/instruments/bass/bassScales'
import { BASS_CHORDS, getBassChordBoxes } from '../../utils/instruments/bass/bassChords'
import { bassNotes } from '../../utils/instruments/bass/bassNotes'
import {
  getGuitarNoteById,
  getBassNoteById,
  getKeyboardNoteById
} from '../../utils/practice/practiceNotes'
import { useRecordPracticeSession } from '../../hooks/usePracticeSessions'
import { PiTrashFill, PiChatCircleFill, PiPencilSimpleFill, PiEyeFill, PiCheckCircleFill, PiXCircleFill } from 'react-icons/pi'
import { useRecordCompletion, useUserCompletions, useAssignmentCompletions } from '../../hooks/useClassrooms'
import styles from '../../styles/Classroom.module.css'
import practiceStyles from '../../styles/Practice.module.css'
import TutorialOverlay from '../onboarding/TutorialOverlay'
import { useTutorial } from '../../hooks/useTutorial'

interface StudentData {
  user_id: string
  profiles: {
    username: string | null
  } | null
}

interface SelectionData {
  selectedNoteIds: string[]
  appliedScales: Array<{
    root: string
    scaleName: string
    octave?: number
    displayName: string
  }>
  appliedChords: Array<{
    root: string
    chordName: string
    octave?: number
    fretZone?: number
    displayName: string
  }>
}

interface AssignmentData {
  id: string
  title: string
  lesson_type: string
  instrument: string
  bpm: number
  beats: number
  chord_count: number
  scales: string[]
  chords: string[]
  octave_low: number
  octave_high: number
  fret_low: number
  fret_high: number
  selection_data: SelectionData | null
  created_at: string
  created_by: string
}

interface ClassroomData {
  id: string
  title: string
  description: string | null
  created_by: string | null
  created_at: string
  is_public: boolean
  join_code: string | null
  profiles: {
    username: string | null
  } | null
  classroom_students: StudentData[]
  assignments: AssignmentData[]
}

interface ExerciseData {
  id: string
  name: string
  transcript: string
  bpm: number
  beats: number
  chordMode: 'single' | 'progression'
  lowerOctaves: number
  higherOctaves: number
  selectedNoteIds: string[]
  appliedScales: Array<{
    root: string
    scaleName: string
    octave?: number
    displayName: string
  }>
  appliedChords: Array<{
    root: string
    chordName: string
    octave?: number
    fretZone?: number
    displayName: string
  }>
}


// Generate a random 6-character join code
const generateJoinCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Welcome Subtitle Component with Text-to-Speech
interface WelcomeSubtitleProps {
  message: string
  onSpeechEnd?: () => void
}

const WelcomeSubtitle: React.FC<WelcomeSubtitleProps> = ({ message, onSpeechEnd }) => {
  const [isVisible, setIsVisible] = useState(true)
  const lastSpokenMessage = useRef<string>('')
  const onSpeechEndRef = useRef(onSpeechEnd)

  // Keep the ref updated
  useEffect(() => {
    onSpeechEndRef.current = onSpeechEnd
  }, [onSpeechEnd])

  useEffect(() => {
    // Only process if message changed
    if (message && message !== lastSpokenMessage.current) {
      // Reset visibility for new message
      setIsVisible(true)
      lastSpokenMessage.current = message

      if ('speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(message)
        utterance.rate = 0.9
        utterance.pitch = 1
        utterance.volume = 1

        utterance.onend = () => {
          setIsVisible(false)
          if (onSpeechEndRef.current) onSpeechEndRef.current()
        }
        window.speechSynthesis.speak(utterance)
      } else {
        // No speech synthesis - hide after a brief delay and call onSpeechEnd
        const timer = setTimeout(() => {
          setIsVisible(false)
          if (onSpeechEndRef.current) onSpeechEndRef.current()
        }, 3000)
        return () => clearTimeout(timer)
      }
    }
  }, [message])

  if (!isVisible || !message) return null
  return <div className={practiceStyles.welcomeSubtitle}>{message}</div>
}

// Assignment Complete Overlay Component
interface AssignmentCompleteOverlayProps {
  onComplete?: () => void
}

const AssignmentCompleteOverlay: React.FC<AssignmentCompleteOverlayProps> = ({ onComplete }) => {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      if (onComplete) onComplete()
    }, 1500)
    return () => clearTimeout(timer)
  }, [onComplete])

  if (!isVisible) return null

  return (
    <div className={practiceStyles.assignmentCompleteOverlay}>
      <div className={practiceStyles.assignmentCompleteContent}>
        <div className={practiceStyles.assignmentCompleteIcon}>✓</div>
        <h2 className={practiceStyles.assignmentCompleteTitle}>Assignment Complete!</h2>
      </div>
    </div>
  )
}

type ViewMode = 'list' | 'classroom' | 'creating-assignment' | 'taking-lesson'

function Classroom() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null
  const { t } = useTranslation()

  // Tutorial
  const {
    isActive: isTutorialActive,
    currentStep: tutorialStep,
    nextStep: tutorialNextStep,
    prevStep: tutorialPrevStep,
    skipTutorial,
    completeTutorial,
    shouldShowTutorial,
    startTutorial
  } = useTutorial()

  // Hook to record practice sessions to Supabase
  const recordPracticeSession = useRecordPracticeSession()

  // Translated instrument names
  const instrumentNames = useMemo(() => ({
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

  // View mode state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [classrooms, setClassrooms] = useState<ClassroomData[]>([])
  const [selectedClassroom, setSelectedClassroom] = useState<ClassroomData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [joiningClassId, setJoiningClassId] = useState<string | null>(null)

  // Join modal state
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false)
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [isJoining, setIsJoining] = useState(false)

  // Copy feedback state
  const [codeCopied, setCodeCopied] = useState(false)

  // Edit classroom state
  const [isEditingClassroom, setIsEditingClassroom] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Assignment creation state
  const [assigningToClassroomId, setAssigningToClassroomId] = useState<string | null>(null)
  const [showAssignTitleModal, setShowAssignTitleModal] = useState(false)
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  const [isPreviewMode, setIsPreviewMode] = useState(false)

  // Multi-exercise state for assignment editor
  const [exercises, setExercises] = useState<ExerciseData[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentExerciseTranscript, setCurrentExerciseTranscript] = useState('')

  // Lesson taking state
  const [currentAssignment, setCurrentAssignment] = useState<AssignmentData | null>(null)
  const [pendingSelectionData, setPendingSelectionData] = useState<any>(null)
  const [lessonExercises, setLessonExercises] = useState<ExerciseData[]>([])
  const [lessonExerciseIndex, setLessonExerciseIndex] = useState(0)
  const [externalSelectedNoteIds, setExternalSelectedNoteIds] = useState<string[]>([])
  const [welcomeSpeechDone, setWelcomeSpeechDone] = useState(false)
  const [genericWelcomeDone, setGenericWelcomeDone] = useState(false)
  const [hasGeneratedMelody, setHasGeneratedMelody] = useState(false)
  const [autoPlayAudio, setAutoPlayAudio] = useState(false)
  const [melodySetupMessage, setMelodySetupMessage] = useState<string>('')
  const [congratulationsMessage, setCongratulationsMessage] = useState<string>('')
  const [showAssignmentComplete, setShowAssignmentComplete] = useState(false)
  const hasInitializedNotes = useRef(false)
  const hasAnnouncedMelody = useRef(false)

  // Assignment completion tracking
  const recordCompletion = useRecordCompletion()
  const userCompletions = useUserCompletions(user?.id)
  const completedAssignmentIds = useMemo(() => {
    if (!userCompletions.data) return new Set<string>()
    return new Set(userCompletions.data.map(c => c.assignment_id))
  }, [userCompletions.data])
  const [viewingCompletionsForAssignment, setViewingCompletionsForAssignment] = useState<string | null>(null)
  const assignmentCompletions = useAssignmentCompletions(viewingCompletionsForAssignment)

  // Feedback system now handled internally by CustomAudioPlayer using useMelodyFeedback

  // Check for dark mode
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.body.classList.contains('dark'))
    }
    checkDarkMode()
    const observer = new MutationObserver(checkDarkMode)
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

  // Clear external note IDs when instrument changes (treat manual notes like scales/chords)
  const prevInstrumentRef = useRef(instrument)
  useEffect(() => {
    if (prevInstrumentRef.current !== instrument) {
      setExternalSelectedNoteIds([])
      prevInstrumentRef.current = instrument
    }
  }, [instrument])

  // Fetch classrooms
  const fetchClassrooms = useCallback(async () => {
    try {
      setLoading(true)
      let { data, error: fetchError } = await supabase
        .from('classrooms')
        .select('*, profiles(username), classroom_students(user_id, profiles(username)), assignments(*)')
        .order('created_at', { ascending: false })

      if (fetchError) {
        console.error('Error fetching with profiles:', fetchError)
        const fallback = await supabase
          .from('classrooms')
          .select('*')
          .order('created_at', { ascending: false })
        data = fallback.data?.map(c => ({ ...c, profiles: null, classroom_students: [], assignments: [] })) ?? []
      }

      setClassrooms(data ?? [])

      // Check if we need to auto-select a classroom (from export redirect)
      const navigateToId = localStorage.getItem('navigateToClassroomId')
      if (navigateToId) {
        localStorage.removeItem('navigateToClassroomId')
        const classroomToSelect = data?.find(c => c.id === navigateToId)
        if (classroomToSelect) {
          setSelectedClassroom(classroomToSelect)
          setViewMode('classroom')
        }
      } else if (selectedClassroom) {
        const updated = data?.find(c => c.id === selectedClassroom.id)
        if (updated) setSelectedClassroom(updated)
      }
    } catch (err) {
      console.error('Error fetching classrooms:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedClassroom])

  useEffect(() => {
    fetchClassrooms()
  }, [])

  // Check for export data from Sandbox and apply it
  useEffect(() => {
    const exportDataStr = localStorage.getItem('exportToClassroomData')
    if (exportDataStr) {
      try {
        const data = JSON.parse(exportDataStr)
        localStorage.removeItem('exportToClassroomData')

        // Apply exported settings to instrument context
        setInstrument(data.instrument as 'keyboard' | 'guitar' | 'bass')
        setBpm(data.bpm)
        setNumberOfBeats(data.beats)
        if (data.chordMode) {
          setChordMode(data.chordMode)
        }

        // Set octave range for keyboard
        if (data.instrument === 'keyboard') {
          const lowerOct = 4 - (data.octaveLow || 4)
          const higherOct = (data.octaveHigh || 5) - 5
          handleOctaveRangeChange(lowerOct, higherOct)
        }

        // Clear existing selection first
        clearSelection()
        scaleChordManagement.setAppliedScalesDirectly([])
        scaleChordManagement.setAppliedChordsDirectly([])

        // Apply exported scales, chords, and notes after a short delay
        if (data.selectionData) {
          setTimeout(() => {
            const selectionData = data.selectionData

            // Apply scales
            if (selectionData.appliedScales?.length > 0) {
              if (data.instrument === 'keyboard') {
                selectionData.appliedScales.forEach((scaleData: any) => {
                  const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
                  if (scaleObj) {
                    scaleChordManagement.handleKeyboardScaleApply(scaleData.root, scaleObj, scaleData.octave || 4)
                  }
                })
              } else if (data.instrument === 'guitar') {
                const scalesToApply: AppliedScale[] = []
                selectionData.appliedScales.forEach((scaleData: any) => {
                  const fretRangeMatch = scaleData.scaleName.match(/\(Frets (\d+)-(\d+)\)$/)
                  const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                  const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
                  const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
                  const scaleObj = GUITAR_SCALES.find(s => s.name === baseScaleName || s.name === scaleData.scaleName)
                  if (scaleObj) {
                    const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
                    const positions = allPositions.filter(pos => pos.fret >= fretLow && pos.fret <= fretHigh)
                    const scaleNotes = positions.map(pos => {
                      const noteId = `g-s${pos.string}-f${pos.fret}`
                      const guitarNote = getGuitarNoteById(noteId)
                      return {
                        id: noteId,
                        name: pos.note,
                        frequency: guitarNote?.frequency || 0,
                        isBlack: pos.note.includes('#'),
                        position: guitarNote?.position || 0,
                        __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret }
                      }
                    })
                    const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                    scalesToApply.push({
                      id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                      root: scaleData.root,
                      scale: scaleObj,
                      displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                      notes: scaleNotes
                    })
                  }
                })
                if (scalesToApply.length > 0) {
                  scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
                }
              } else if (data.instrument === 'bass') {
                const scalesToApply: AppliedScale[] = []
                selectionData.appliedScales.forEach((scaleData: any) => {
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
                      return {
                        id: noteId,
                        name: pos.note,
                        frequency: bassNote?.frequency || 0,
                        isBlack: pos.note.includes('#'),
                        position: bassNote?.position || 0,
                        __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret }
                      }
                    })
                    const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                    scalesToApply.push({
                      id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                      root: scaleData.root,
                      scale: scaleObj as any,
                      displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                      notes: scaleNotes
                    })
                  }
                })
                if (scalesToApply.length > 0) {
                  scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
                }
              }
            }

            // Apply chords
            if (selectionData.appliedChords?.length > 0) {
              setChordMode('progression')
              if (data.instrument === 'keyboard') {
                selectionData.appliedChords.forEach((chordData: any) => {
                  const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
                  if (chordObj) {
                    scaleChordManagement.handleKeyboardChordApply(chordData.root, chordObj, chordData.octave || 4)
                  }
                })
              } else if (data.instrument === 'guitar') {
                const chordsToApply: AppliedChord[] = []
                selectionData.appliedChords.forEach((chordData: any) => {
                  let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                  baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
                  const chordObj = GUITAR_CHORDS.find(c => c.name === baseChordName || c.name === chordData.chordName)
                  if (chordObj) {
                    const chordBoxes = getChordBoxes(chordData.root, chordObj, guitarNotes)
                    if (chordBoxes.length > 0) {
                      const boxIndex = Math.min(chordData.fretZone || 0, chordBoxes.length - 1)
                      const chordBox = chordBoxes[boxIndex]
                      const noteKeys: string[] = []
                      const chordNotes: Note[] = []
                      chordBox.positions.forEach(pos => {
                        const stringIndex = 6 - pos.string
                        const fretIndex = pos.fret
                        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
                        noteKeys.push(noteKey)
                        // Find the guitar note for this position
                        const guitarNote = guitarNotes.find(n => n.string === pos.string && n.fret === pos.fret)
                        if (guitarNote) {
                          chordNotes.push({
                            id: `g-s${pos.string}-f${pos.fret}`,
                            name: guitarNote.name,
                            frequency: guitarNote.frequency,
                            isBlack: guitarNote.name.includes('#'),
                            position: stringIndex * 100 + (fretIndex > 0 ? fretIndex - 1 : -1),
                            __guitarCoord: { stringIndex, fretIndex: pos.fret }
                          } as Note)
                        }
                      })
                      chordsToApply.push({
                        id: `guitar-${chordData.root}-${chordObj.name}-${Date.now()}-${Math.random()}`,
                        root: chordData.root,
                        chord: chordObj as any,
                        displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                        noteKeys: noteKeys,
                        notes: chordNotes,
                        fretZone: boxIndex
                      })
                    }
                  }
                })
                if (chordsToApply.length > 0) {
                  scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
                }
              } else if (data.instrument === 'bass') {
                const chordsToApply: AppliedChord[] = []
                selectionData.appliedChords.forEach((chordData: any) => {
                  let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                  baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
                  const chordObj = BASS_CHORDS.find(c => c.name === baseChordName || c.name === chordData.chordName)
                  if (chordObj) {
                    const chordBoxes = getBassChordBoxes(chordData.root, chordObj, bassNotes)
                    if (chordBoxes.length > 0) {
                      const boxIndex = Math.min(chordData.fretZone || 0, chordBoxes.length - 1)
                      const chordBox = chordBoxes[boxIndex]
                      const noteKeys: string[] = []
                      const chordNotes: Note[] = []
                      chordBox.positions.forEach(pos => {
                        const stringIndex = 4 - pos.string
                        const fretIndex = pos.fret
                        const noteKey = fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
                        noteKeys.push(noteKey)
                        // Find the bass note for this position
                        const bassNote = bassNotes.find(n => n.string === pos.string && n.fret === pos.fret)
                        if (bassNote) {
                          chordNotes.push({
                            id: `b-s${pos.string}-f${pos.fret}`,
                            name: bassNote.name,
                            frequency: bassNote.frequency,
                            isBlack: bassNote.name.includes('#'),
                            position: stringIndex * 100 + (fretIndex > 0 ? fretIndex - 1 : -1),
                            __bassCoord: { stringIndex, fretIndex: pos.fret }
                          } as Note)
                        }
                      })
                      chordsToApply.push({
                        id: `bass-${chordData.root}-${chordObj.name}-${Date.now()}-${Math.random()}`,
                        root: chordData.root,
                        chord: chordObj as any,
                        displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                        noteKeys: noteKeys,
                        notes: chordNotes,
                        fretZone: boxIndex
                      })
                    }
                  }
                })
                if (chordsToApply.length > 0) {
                  scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
                }
              }
            }

            // Apply manually selected notes
            if (selectionData.selectedNoteIds?.length > 0) {
              if (data.instrument === 'keyboard') {
                // Use full octave range (3 below, 3 above base) to ensure all notes are found
                selectionData.selectedNoteIds.forEach((noteId: string) => {
                  const noteObj = getKeyboardNoteById(noteId, 3, 3)
                  if (noteObj) selectNote(noteObj, 'multi')
                })
              } else {
                setExternalSelectedNoteIds(selectionData.selectedNoteIds)
              }
            }

            // Initialize exercises array with the exported data
            const lowerOct = 4 - (data.octaveLow || 4)
            const higherOct = (data.octaveHigh || 5) - 5
            setExercises([{
              id: `exercise-${Date.now()}`,
              name: 'Exercise 1',
              transcript: '',
              bpm: data.bpm || 120,
              beats: data.beats || 5,
              chordMode: data.chordMode || 'single',
              lowerOctaves: lowerOct,
              higherOctaves: higherOct,
              selectedNoteIds: selectionData.selectedNoteIds || [],
              appliedScales: selectionData.appliedScales || [],
              appliedChords: selectionData.appliedChords || []
            }])
            setCurrentExerciseIndex(0)
          }, 300)
        } else {
          // No selection data - initialize with empty exercise
          const lowerOct = 4 - (data.octaveLow || 4)
          const higherOct = (data.octaveHigh || 5) - 5
          setExercises([{
            id: `exercise-${Date.now()}`,
            name: 'Exercise 1',
            transcript: '',
            bpm: data.bpm || 120,
            beats: data.beats || 5,
            chordMode: data.chordMode || 'single',
            lowerOctaves: lowerOct,
            higherOctaves: higherOct,
            selectedNoteIds: [],
            appliedScales: [],
            appliedChords: []
          }])
          setCurrentExerciseIndex(0)
        }

        // Go straight to creating-assignment mode (no classroom selected yet)
        setViewMode('creating-assignment')
      } catch (err) {
        console.error('Error parsing export data:', err)
        localStorage.removeItem('exportToClassroomData')
      }
    }
  }, [])

  // Delete classroom
  const handleDeleteClassroom = async (classroomId: string) => {
    if (!user) return
    try {
      const { error: deleteError } = await supabase
        .from('classrooms')
        .delete()
        .eq('id', classroomId)
        .eq('created_by', user.id)
      if (deleteError) {
        console.error('Error deleting classroom:', deleteError)
        return
      }
      setSelectedClassroom(null)
      setViewMode('list')
      fetchClassrooms()
    } catch (err) {
      console.error('Error deleting classroom:', err)
    }
  }

  // Start editing classroom
  const handleStartEditClassroom = () => {
    if (!selectedClassroom) return
    setEditTitle(selectedClassroom.title)
    setEditDescription(selectedClassroom.description || '')
    setIsEditingClassroom(true)
  }

  // Cancel editing classroom
  const handleCancelEditClassroom = () => {
    setIsEditingClassroom(false)
    setEditTitle('')
    setEditDescription('')
  }

  // Save classroom edits
  const handleSaveClassroom = async () => {
    if (!user || !selectedClassroom) return
    if (!editTitle.trim()) return

    try {
      setIsSavingEdit(true)
      const { error: updateError } = await supabase
        .from('classrooms')
        .update({
          title: editTitle.trim(),
          description: editDescription.trim() || null
        })
        .eq('id', selectedClassroom.id)
        .eq('created_by', user.id)

      if (updateError) {
        console.error('Error updating classroom:', updateError)
        return
      }

      setIsEditingClassroom(false)
      setEditTitle('')
      setEditDescription('')
      fetchClassrooms()
    } catch (err) {
      console.error('Error updating classroom:', err)
    } finally {
      setIsSavingEdit(false)
    }
  }

  // Delete assignment
  const handleDeleteAssignment = async (assignmentId: string) => {
    if (!user) return
    try {
      const { error: deleteError } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)
        .eq('created_by', user.id)
      if (deleteError) {
        console.error('Error deleting assignment:', deleteError)
        return
      }
      fetchClassrooms()
    } catch (err) {
      console.error('Error deleting assignment:', err)
    }
  }

  // Join classroom
  const handleJoinClassroom = async (classroomId: string) => {
    if (!user) {
      setError(t('classroom.loginRequired'))
      return
    }
    try {
      setJoiningClassId(classroomId)
      const { error: joinError } = await supabase
        .from('classroom_students')
        .insert({ classroom_id: classroomId, user_id: user.id })
      if (joinError) {
        console.error('Error joining classroom:', joinError)
        return
      }
      fetchClassrooms()
    } catch (err) {
      console.error('Error joining classroom:', err)
    } finally {
      setJoiningClassId(null)
    }
  }

  // Leave classroom
  const handleLeaveClassroom = async (classroomId: string) => {
    if (!user) return
    try {
      setJoiningClassId(classroomId)
      const { error: leaveError } = await supabase
        .from('classroom_students')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('user_id', user.id)
      if (leaveError) {
        console.error('Error leaving classroom:', leaveError)
        return
      }
      fetchClassrooms()
    } catch (err) {
      console.error('Error leaving classroom:', err)
    } finally {
      setJoiningClassId(null)
    }
  }

  // Remove student from classroom
  const handleRemoveStudent = async (classroomId: string, studentId: string) => {
    if (!user) return
    try {
      const { error: removeError } = await supabase
        .from('classroom_students')
        .delete()
        .eq('classroom_id', classroomId)
        .eq('user_id', studentId)
      if (removeError) {
        console.error('Error removing student:', removeError)
        return
      }
      fetchClassrooms()
    } catch (err) {
      console.error('Error removing student:', err)
    }
  }

  const hasJoined = (classroom: ClassroomData) => {
    if (!user) return false
    return classroom.classroom_students?.some(s => s.user_id === user.id) ?? false
  }

  // Create classroom
  const handleCreateClassroom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      setError(t('classroom.enterTitle'))
      return
    }
    if (!user) {
      setError(t('classroom.loginRequired'))
      return
    }
    try {
      setCreating(true)
      setError(null)
      const joinCodeValue = isPublic ? null : generateJoinCode()
      const { error: insertError } = await supabase
        .from('classrooms')
        .insert({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          created_by: user.id,
          is_public: isPublic,
          join_code: joinCodeValue
        })
      if (insertError) {
        setError(insertError.message)
        return
      }
      setNewTitle('')
      setNewDescription('')
      setIsPublic(true)
      setIsModalOpen(false)
      fetchClassrooms()
    } catch (err) {
      setError(t('errors.generic'))
      console.error('Error creating classroom:', err)
    } finally {
      setCreating(false)
    }
  }

  // Join classroom by code
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) {
      setJoinError(t('classroom.enterClassCode'))
      return
    }
    if (!user) {
      setJoinError(t('classroom.loginRequired'))
      return
    }
    try {
      setIsJoining(true)
      setJoinError(null)

      // Find classroom by join code
      const { data: classroom, error: findError } = await supabase
        .from('classrooms')
        .select('id, title')
        .eq('join_code', joinCode.trim().toUpperCase())
        .single()

      if (findError || !classroom) {
        setJoinError(t('classroom.invalidCode'))
        return
      }

      // Check if already joined
      const { data: existingMembership } = await supabase
        .from('classroom_students')
        .select('user_id')
        .eq('classroom_id', classroom.id)
        .eq('user_id', user.id)
        .single()

      if (existingMembership) {
        setJoinError(t('classroom.alreadyMember'))
        return
      }

      // Join the classroom
      const { error: joinError } = await supabase
        .from('classroom_students')
        .insert({ classroom_id: classroom.id, user_id: user.id })

      if (joinError) {
        setJoinError(joinError.message)
        return
      }

      setJoinCode('')
      setIsJoinModalOpen(false)
      fetchClassrooms()
    } catch (err) {
      setJoinError(t('errors.generic'))
      console.error('Error joining classroom:', err)
    } finally {
      setIsJoining(false)
    }
  }

  // Enter assignment creation mode
  const handleCreateAssignment = (classroomId: string) => {
    setAssigningToClassroomId(classroomId)
    clearSelection()
    triggerClearChordsAndScales()
    // Initialize with one empty exercise
    setExercises([{
      id: `exercise-${Date.now()}`,
      name: 'Exercise 1',
      transcript: '',
      bpm: bpm,
      beats: numberOfBeats,
      chordMode: chordMode,
      lowerOctaves: lowerOctaves,
      higherOctaves: higherOctaves,
      selectedNoteIds: [],
      appliedScales: [],
      appliedChords: []
    }])
    setCurrentExerciseIndex(0)
    setEditingAssignmentId(null)
    setViewMode('creating-assignment')
  }

  // Edit an existing assignment
  const handleEditAssignment = (assignment: AssignmentData, classroomId: string) => {
    setAssigningToClassroomId(classroomId)
    setEditingAssignmentId(assignment.id)
    setAssignmentTitle(assignment.title)
    clearSelection()
    triggerClearChordsAndScales()

    // Set instrument
    setInstrument(assignment.instrument as 'keyboard' | 'guitar' | 'bass')
    setBpm(assignment.bpm)
    setNumberOfBeats(assignment.beats)

    // Set octave range
    const octaveLow = assignment.octave_low ?? 4
    const octaveHigh = assignment.octave_high ?? 5
    handleOctaveRangeChange(4 - octaveLow, octaveHigh - 5)

    // Load exercises from selection_data
    const selectionData = assignment.selection_data

    if (selectionData?.exercises && selectionData.exercises.length > 0) {
      const loadedExercises = selectionData.exercises.map((ex: any) => ({
        id: ex.id || `exercise-${Date.now()}-${Math.random()}`,
        name: ex.name || 'Exercise',
        transcript: ex.transcript || '',
        bpm: ex.bpm || assignment.bpm,
        beats: ex.beats || assignment.beats,
        chordMode: ex.chordMode || 'single',
        lowerOctaves: ex.lowerOctaves ?? (4 - octaveLow),
        higherOctaves: ex.higherOctaves ?? (octaveHigh - 5),
        selectedNoteIds: ex.selectedNoteIds || [],
        appliedScales: ex.appliedScales || [],
        appliedChords: ex.appliedChords || []
      }))
      setExercises(loadedExercises)
      setCurrentExerciseIndex(0)
      // Set transcript for first exercise
      if (selectionData.exercises[0]?.transcript) {
        setCurrentExerciseTranscript(selectionData.exercises[0].transcript)
      }

      // Apply first exercise's scales and chords after state settles
      const firstExercise = loadedExercises[0]
      const targetInstrument = assignment.instrument as 'keyboard' | 'guitar' | 'bass'

      setTimeout(() => {
        // Apply scales from first exercise
        if (firstExercise.appliedScales?.length > 0) {
          if (targetInstrument === 'keyboard') {
            firstExercise.appliedScales.forEach((scaleData: any) => {
              const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleKeyboardScaleApply(scaleData.root, scaleObj, scaleData.octave || 4)
              }
            })
          } else if (targetInstrument === 'guitar') {
            const scalesToApply: AppliedScale[] = []
            firstExercise.appliedScales.forEach((scaleData: any) => {
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
              const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
              const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
              const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
              const scaleObj = GUITAR_SCALES.find(s => s.name === baseScaleName || s.name === scaleData.scaleName)
              if (scaleObj) {
                const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
                const positions = allPositions.filter(pos => pos.fret >= fretLow && pos.fret <= fretHigh)
                const scaleNotes = positions.map(pos => {
                  const noteId = `g-s${pos.string}-f${pos.fret}`
                  const guitarNote = getGuitarNoteById(noteId)
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: guitarNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: guitarNote?.position || 0,
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret }
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes
                })
              }
            })
            if (scalesToApply.length > 0) {
              scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
            }
          } else if (targetInstrument === 'bass') {
            const scalesToApply: AppliedScale[] = []
            firstExercise.appliedScales.forEach((scaleData: any) => {
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
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
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: bassNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: bassNote?.position || 0,
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret }
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj as any,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes
                })
              }
            })
            if (scalesToApply.length > 0) {
              scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
            }
          }
        }

        // Apply chords from first exercise
        if (firstExercise.appliedChords?.length > 0) {
          setChordMode('progression')
          if (targetInstrument === 'keyboard') {
            firstExercise.appliedChords.forEach((chordData: any) => {
              const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleKeyboardChordApply(chordData.root, chordObj, chordData.octave || 4)
              }
            })
          } else if (targetInstrument === 'guitar') {
            const chordsToApply: AppliedChord[] = []
            firstExercise.appliedChords.forEach((chordData: any) => {
              const chordBoxes = getChordBoxes(chordData.root, chordData.chordName)
              const chordBox = chordBoxes[chordData.fretZone ?? 0] || chordBoxes[0]
              if (chordBox) {
                const chordNotes = chordBox.positions.map(pos => {
                  const noteId = `g-s${pos.string}-f${pos.fret}`
                  const guitarNote = getGuitarNoteById(noteId)
                  return {
                    id: noteId,
                    name: guitarNote?.name || '',
                    frequency: guitarNote?.frequency || 0,
                    isBlack: guitarNote?.isBlack || false,
                    position: guitarNote?.position || 0,
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret }
                  }
                })
                chordsToApply.push({
                  id: `guitar-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                  root: chordData.root,
                  chord: { name: chordData.chordName, intervals: [] },
                  displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                  notes: chordNotes
                })
              }
            })
            if (chordsToApply.length > 0) {
              scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
            }
          } else if (targetInstrument === 'bass') {
            const chordsToApply: AppliedChord[] = []
            firstExercise.appliedChords.forEach((chordData: any) => {
              const chordBoxes = getBassChordBoxes(chordData.root, chordData.chordName)
              const chordBox = chordBoxes[chordData.fretZone ?? 0] || chordBoxes[0]
              if (chordBox) {
                const chordNotes = chordBox.positions.map(pos => {
                  const noteId = `b-s${pos.string}-f${pos.fret}`
                  const bassNote = getBassNoteById(noteId)
                  return {
                    id: noteId,
                    name: bassNote?.name || '',
                    frequency: bassNote?.frequency || 0,
                    isBlack: bassNote?.isBlack || false,
                    position: bassNote?.position || 0,
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret }
                  }
                })
                chordsToApply.push({
                  id: `bass-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                  root: chordData.root,
                  chord: { name: chordData.chordName, intervals: [] },
                  displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                  notes: chordNotes
                })
              }
            })
            if (chordsToApply.length > 0) {
              scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
            }
          }
        }

        // Apply notes from first exercise
        if (firstExercise.selectedNoteIds?.length > 0) {
          const targetLower = firstExercise.lowerOctaves ?? 0
          const targetHigher = firstExercise.higherOctaves ?? 0
          if (targetInstrument === 'keyboard') {
            firstExercise.selectedNoteIds.forEach((noteId: string) => {
              const noteObj = getKeyboardNoteById(noteId, targetLower, targetHigher)
              if (noteObj) selectNote(noteObj, 'multi')
            })
          } else {
            // Guitar/Bass - use direct handler call like keyboard does
            const validNoteIds = firstExercise.selectedNoteIds.filter((id: string | null) => id !== null) as string[]
            if (validNoteIds.length > 0) {
              // Also set external IDs as fallback
              setExternalSelectedNoteIds(validNoteIds)
              // Try to call handlers directly after a short delay for component to mount
              setTimeout(() => {
                if (targetInstrument === 'guitar' && scaleChordManagement.noteHandlers?.handleSetManualNotes) {
                  scaleChordManagement.noteHandlers.handleSetManualNotes(validNoteIds)
                } else if (targetInstrument === 'bass' && scaleChordManagement.bassNoteHandlers?.handleSetManualNotes) {
                  scaleChordManagement.bassNoteHandlers.handleSetManualNotes(validNoteIds)
                }
              }, 50)
            }
          }
        }
      }, 50)
    } else {
      // No exercises, create one with legacy data
      const legacyExercise = {
        id: `exercise-${Date.now()}`,
        name: 'Exercise 1',
        transcript: '',
        bpm: assignment.bpm,
        beats: assignment.beats,
        chordMode: 'single' as const,
        lowerOctaves: 4 - octaveLow,
        higherOctaves: octaveHigh - 5,
        selectedNoteIds: selectionData?.selectedNoteIds || [],
        appliedScales: selectionData?.appliedScales || [],
        appliedChords: selectionData?.appliedChords || []
      }
      setExercises([legacyExercise])
      setCurrentExerciseIndex(0)

      // Apply legacy exercise's scales and chords after state settles
      const targetInstrument = assignment.instrument as 'keyboard' | 'guitar' | 'bass'

      setTimeout(() => {
        // Apply scales from legacy exercise
        if (legacyExercise.appliedScales?.length > 0) {
          if (targetInstrument === 'keyboard') {
            legacyExercise.appliedScales.forEach((scaleData: any) => {
              const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleKeyboardScaleApply(scaleData.root, scaleObj, scaleData.octave || 4)
              }
            })
          } else if (targetInstrument === 'guitar') {
            const scalesToApply: AppliedScale[] = []
            legacyExercise.appliedScales.forEach((scaleData: any) => {
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
              const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
              const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
              const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
              const scaleObj = GUITAR_SCALES.find(s => s.name === baseScaleName || s.name === scaleData.scaleName)
              if (scaleObj) {
                const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
                const positions = allPositions.filter(pos => pos.fret >= fretLow && pos.fret <= fretHigh)
                const scaleNotes = positions.map(pos => {
                  const noteId = `g-s${pos.string}-f${pos.fret}`
                  const guitarNote = getGuitarNoteById(noteId)
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: guitarNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: guitarNote?.position || 0,
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret }
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes
                })
              }
            })
            if (scalesToApply.length > 0) {
              scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
            }
          } else if (targetInstrument === 'bass') {
            const scalesToApply: AppliedScale[] = []
            legacyExercise.appliedScales.forEach((scaleData: any) => {
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
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
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: bassNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: bassNote?.position || 0,
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret }
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj as any,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes
                })
              }
            })
            if (scalesToApply.length > 0) {
              scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
            }
          }
        }

        // Apply chords from legacy exercise
        if (legacyExercise.appliedChords?.length > 0) {
          setChordMode('progression')
          if (targetInstrument === 'keyboard') {
            legacyExercise.appliedChords.forEach((chordData: any) => {
              const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleKeyboardChordApply(chordData.root, chordObj, chordData.octave || 4)
              }
            })
          } else if (targetInstrument === 'guitar') {
            const chordsToApply: AppliedChord[] = []
            legacyExercise.appliedChords.forEach((chordData: any) => {
              const chordBoxes = getChordBoxes(chordData.root, chordData.chordName)
              const chordBox = chordBoxes[chordData.fretZone ?? 0] || chordBoxes[0]
              if (chordBox) {
                const chordNotes = chordBox.positions.map(pos => {
                  const noteId = `g-s${pos.string}-f${pos.fret}`
                  const guitarNote = getGuitarNoteById(noteId)
                  return {
                    id: noteId,
                    name: guitarNote?.name || '',
                    frequency: guitarNote?.frequency || 0,
                    isBlack: guitarNote?.isBlack || false,
                    position: guitarNote?.position || 0,
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret }
                  }
                })
                chordsToApply.push({
                  id: `guitar-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                  root: chordData.root,
                  chord: { name: chordData.chordName, intervals: [] },
                  displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                  notes: chordNotes
                })
              }
            })
            if (chordsToApply.length > 0) {
              scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
            }
          } else if (targetInstrument === 'bass') {
            const chordsToApply: AppliedChord[] = []
            legacyExercise.appliedChords.forEach((chordData: any) => {
              const chordBoxes = getBassChordBoxes(chordData.root, chordData.chordName)
              const chordBox = chordBoxes[chordData.fretZone ?? 0] || chordBoxes[0]
              if (chordBox) {
                const chordNotes = chordBox.positions.map(pos => {
                  const noteId = `b-s${pos.string}-f${pos.fret}`
                  const bassNote = getBassNoteById(noteId)
                  return {
                    id: noteId,
                    name: bassNote?.name || '',
                    frequency: bassNote?.frequency || 0,
                    isBlack: bassNote?.isBlack || false,
                    position: bassNote?.position || 0,
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret }
                  }
                })
                chordsToApply.push({
                  id: `bass-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                  root: chordData.root,
                  chord: { name: chordData.chordName, intervals: [] },
                  displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                  notes: chordNotes
                })
              }
            })
            if (chordsToApply.length > 0) {
              scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
            }
          }
        }

        // Apply notes from legacy exercise
        if (legacyExercise.selectedNoteIds?.length > 0) {
          const targetLower = legacyExercise.lowerOctaves ?? 0
          const targetHigher = legacyExercise.higherOctaves ?? 0
          if (targetInstrument === 'keyboard') {
            legacyExercise.selectedNoteIds.forEach((noteId: string) => {
              const noteObj = getKeyboardNoteById(noteId, targetLower, targetHigher)
              if (noteObj) selectNote(noteObj, 'multi')
            })
          } else {
            // Guitar/Bass - use direct handler call like keyboard does
            const validNoteIds = legacyExercise.selectedNoteIds.filter((id: string | null) => id !== null) as string[]
            if (validNoteIds.length > 0) {
              // Also set external IDs as fallback
              setExternalSelectedNoteIds(validNoteIds)
              // Try to call handlers directly after a short delay for component to mount
              setTimeout(() => {
                if (targetInstrument === 'guitar' && scaleChordManagement.noteHandlers?.handleSetManualNotes) {
                  scaleChordManagement.noteHandlers.handleSetManualNotes(validNoteIds)
                } else if (targetInstrument === 'bass' && scaleChordManagement.bassNoteHandlers?.handleSetManualNotes) {
                  scaleChordManagement.bassNoteHandlers.handleSetManualNotes(validNoteIds)
                }
              }, 50)
            }
          }
        }
      }, 50)
    }

    setViewMode('creating-assignment')
  }

  // Cancel assignment creation
  const handleCancelAssignment = () => {
    setAssigningToClassroomId(null)
    setEditingAssignmentId(null)
    clearSelection()
    triggerClearChordsAndScales()
    setExercises([])
    setCurrentExerciseIndex(0)
    setCurrentExerciseTranscript('')
    setViewMode('classroom')
  }

  // Save current instrument state to an exercise
  const saveCurrentToExercise = useCallback(() => {
    const manualNoteIds = selectedNotes
      .filter(n => n.isManualSelection === true || n.isManualSelection === undefined)
      .map(n => n.id)

    return {
      bpm: bpm,
      beats: numberOfBeats,
      chordMode: chordMode,
      lowerOctaves: lowerOctaves,
      higherOctaves: higherOctaves,
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
  }, [selectedNotes, scaleChordManagement.appliedScales, scaleChordManagement.appliedChords, bpm, numberOfBeats, chordMode, lowerOctaves, higherOctaves])

  // Add a new exercise (saves current state first) - max 10 exercises
  const handleAddExercise = useCallback(() => {
    if (exercises.length >= 10) return // Max 10 exercises

    const currentData = saveCurrentToExercise()

    // Update current exercise with latest data - merge intelligently
    setExercises(prev => {
      const updated = [...prev]
      if (updated.length > 0) {
        const existingExercise = updated[currentExerciseIndex]
        updated[currentExerciseIndex] = {
          ...existingExercise,
          transcript: currentExerciseTranscript,
          bpm: currentData.bpm,
          beats: currentData.beats,
          chordMode: currentData.chordMode,
          lowerOctaves: currentData.lowerOctaves,
          higherOctaves: currentData.higherOctaves,
          selectedNoteIds: currentData.selectedNoteIds.length > 0
            ? currentData.selectedNoteIds
            : existingExercise.selectedNoteIds,
          appliedScales: currentData.appliedScales.length > 0
            ? currentData.appliedScales
            : existingExercise.appliedScales,
          appliedChords: currentData.appliedChords.length > 0
            ? currentData.appliedChords
            : existingExercise.appliedChords
        }
      }

      // Add new exercise
      const newExercise: ExerciseData = {
        id: `exercise-${Date.now()}`,
        name: `Exercise ${updated.length + 1}`,
        transcript: '',
        bpm: bpm,
        beats: numberOfBeats,
        chordMode: chordMode,
        lowerOctaves: lowerOctaves,
        higherOctaves: higherOctaves,
        selectedNoteIds: [],
        appliedScales: [],
        appliedChords: []
      }
      return [...updated, newExercise]
    })

    // Clear notes for new exercise
    clearSelection()
    triggerClearChordsAndScales()
    setCurrentExerciseTranscript('')

    // Switch to new exercise
    setCurrentExerciseIndex(prev => exercises.length > 0 ? exercises.length : 0)
  }, [saveCurrentToExercise, currentExerciseIndex, exercises.length, clearSelection, triggerClearChordsAndScales, bpm, numberOfBeats, chordMode, lowerOctaves, higherOctaves, currentExerciseTranscript])

  // Switch to a different exercise
  const handleSwitchExercise = useCallback((index: number) => {
    if (index === currentExerciseIndex || index < 0 || index >= exercises.length) return

    // Save current state before switching - merge intelligently
    const currentData = saveCurrentToExercise()

    // Build updated exercises array synchronously so we can read target exercise from it
    const updatedExercises = [...exercises]
    const existingExercise = updatedExercises[currentExerciseIndex]
    updatedExercises[currentExerciseIndex] = {
      ...existingExercise,
      transcript: currentExerciseTranscript,
      bpm: currentData.bpm,
      beats: currentData.beats,
      chordMode: currentData.chordMode,
      lowerOctaves: currentData.lowerOctaves,
      higherOctaves: currentData.higherOctaves,
      selectedNoteIds: currentData.selectedNoteIds.length > 0
        ? currentData.selectedNoteIds
        : existingExercise.selectedNoteIds,
      appliedScales: currentData.appliedScales.length > 0
        ? currentData.appliedScales
        : existingExercise.appliedScales,
      appliedChords: currentData.appliedChords.length > 0
        ? currentData.appliedChords
        : existingExercise.appliedChords
    }

    // Update state with the new exercises array
    setExercises(updatedExercises)

    // Clear current selection
    clearSelection()
    scaleChordManagement.setAppliedScalesDirectly([])
    scaleChordManagement.setAppliedChordsDirectly([])
    setExternalSelectedNoteIds([])

    // Load the target exercise data from the UPDATED array
    const targetExercise = updatedExercises[index]
    if (targetExercise) {
      // Apply BPM, beats, chord mode, transcript, and octave range (instrument is assignment-level)
      if (targetExercise.bpm) setBpm(targetExercise.bpm)
      if (targetExercise.beats) setNumberOfBeats(targetExercise.beats)
      if (targetExercise.chordMode) setChordMode(targetExercise.chordMode)
      setCurrentExerciseTranscript(targetExercise.transcript || '')
      // Apply octave range (use defaults if not set for backward compatibility)
      const targetLower = targetExercise.lowerOctaves ?? 0
      const targetHigher = targetExercise.higherOctaves ?? 0
      handleOctaveRangeChange(targetLower, targetHigher)

      // Use assignment-level instrument (same for all exercises)
      const targetInstrument = instrument

      setTimeout(() => {
        // Apply scales from exercise
        if (targetExercise.appliedScales?.length > 0) {
          if (targetInstrument === 'keyboard') {
            targetExercise.appliedScales.forEach((scaleData) => {
              const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleKeyboardScaleApply(scaleData.root, scaleObj, scaleData.octave || 4)
              }
            })
          } else if (targetInstrument === 'guitar') {
            const scalesToApply: AppliedScale[] = []
            targetExercise.appliedScales.forEach((scaleData) => {
              // Extract fret range from displayName (e.g., "C Major (Frets 0-12)")
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
              const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
              const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
              const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
              const scaleObj = GUITAR_SCALES.find(s => s.name === baseScaleName || s.name === scaleData.scaleName)
              if (scaleObj) {
                const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
                const positions = allPositions.filter(pos => pos.fret >= fretLow && pos.fret <= fretHigh)
                const scaleNotes = positions.map(pos => {
                  const noteId = `g-s${pos.string}-f${pos.fret}`
                  const guitarNote = getGuitarNoteById(noteId)
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: guitarNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: guitarNote?.position || 0,
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret }
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes
                })
              }
            })
            if (scalesToApply.length > 0) {
              scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
            }
          } else if (targetInstrument === 'bass') {
            const scalesToApply: AppliedScale[] = []
            targetExercise.appliedScales.forEach((scaleData) => {
              // Extract fret range from displayName (e.g., "C Major (Frets 0-12)")
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
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
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: bassNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: bassNote?.position || 0,
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret }
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj as any,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes
                })
              }
            })
            if (scalesToApply.length > 0) {
              scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
            }
          }
        }

        // Apply chords from exercise
        if (targetExercise.appliedChords?.length > 0) {
          setChordMode('progression')
          if (targetInstrument === 'keyboard') {
            targetExercise.appliedChords.forEach((chordData) => {
              const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleKeyboardChordApply(chordData.root, chordObj, chordData.octave || 4)
              }
            })
          } else if (targetInstrument === 'guitar') {
            const chordsToApply: AppliedChord[] = []
            targetExercise.appliedChords.forEach((chordData) => {
              let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
              baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
              const chordObj = GUITAR_CHORDS.find(c => c.name === baseChordName || c.name === chordData.chordName)
              if (chordObj) {
                const chordBoxes = getChordBoxes(chordData.root, chordObj, guitarNotes)
                if (chordBoxes.length > 0) {
                  const boxIndex = Math.min(chordData.fretZone || 0, chordBoxes.length - 1)
                  const chordBox = chordBoxes[boxIndex]
                  const noteKeys = chordBox.positions.map(pos => {
                    const stringIndex = 6 - pos.string
                    const fretIndex = pos.fret
                    return fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
                  })
                  chordsToApply.push({
                    id: `guitar-${chordData.root}-${chordObj.name}-${Date.now()}-${Math.random()}`,
                    root: chordData.root,
                    chord: chordObj as any,
                    displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                    noteKeys: noteKeys,
                    fretZone: boxIndex
                  })
                }
              }
            })
            if (chordsToApply.length > 0) {
              scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
            }
          } else if (targetInstrument === 'bass') {
            const chordsToApply: AppliedChord[] = []
            targetExercise.appliedChords.forEach((chordData) => {
              let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
              baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
              const chordObj = BASS_CHORDS.find(c => c.name === baseChordName || c.name === chordData.chordName)
              if (chordObj) {
                const chordBoxes = getBassChordBoxes(chordData.root, chordObj, bassNotes)
                if (chordBoxes.length > 0) {
                  const boxIndex = Math.min(chordData.fretZone || 0, chordBoxes.length - 1)
                  const chordBox = chordBoxes[boxIndex]
                  const noteKeys = chordBox.positions.map(pos => {
                    const stringIndex = 4 - pos.string
                    const fretIndex = pos.fret
                    return fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
                  })
                  chordsToApply.push({
                    id: `bass-${chordData.root}-${chordObj.name}-${Date.now()}-${Math.random()}`,
                    root: chordData.root,
                    chord: chordObj as any,
                    displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                    noteKeys: noteKeys,
                    fretZone: boxIndex
                  })
                }
              }
            })
            if (chordsToApply.length > 0) {
              scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
            }
          }
        }

        // Apply notes from exercise
        if (targetExercise.selectedNoteIds?.length > 0) {
          if (targetInstrument === 'keyboard') {
            targetExercise.selectedNoteIds.forEach((noteId) => {
              const noteObj = getKeyboardNoteById(noteId, targetLower, targetHigher)
              if (noteObj) selectNote(noteObj, 'multi')
            })
          } else {
            // Guitar/Bass - use direct handler call like keyboard does
            const validNoteIds = targetExercise.selectedNoteIds.filter((id: string | null) => id !== null) as string[]
            if (validNoteIds.length > 0) {
              // Also set external IDs as fallback
              setExternalSelectedNoteIds(validNoteIds)
              // Try to call handlers directly after a short delay for component to mount
              setTimeout(() => {
                if (targetInstrument === 'guitar' && scaleChordManagement.noteHandlers?.handleSetManualNotes) {
                  scaleChordManagement.noteHandlers.handleSetManualNotes(validNoteIds)
                } else if (targetInstrument === 'bass' && scaleChordManagement.bassNoteHandlers?.handleSetManualNotes) {
                  scaleChordManagement.bassNoteHandlers.handleSetManualNotes(validNoteIds)
                }
              }, 50)
            }
          }
        }
      }, 0)
    }

    setCurrentExerciseIndex(index)
  }, [currentExerciseIndex, exercises, saveCurrentToExercise, clearSelection, scaleChordManagement, instrument, setChordMode, selectNote, handleOctaveRangeChange, currentExerciseTranscript])

  // Remove an exercise
  const handleRemoveExercise = useCallback((indexToRemove: number) => {
    if (exercises.length <= 1) return // Keep at least one exercise

    // First, save the current exercise state before removing
    const currentData = saveCurrentToExercise()

    // Build the updated exercises array synchronously so we can access the new current exercise
    const withCurrentSaved = [...exercises]
    if (withCurrentSaved[currentExerciseIndex]) {
      withCurrentSaved[currentExerciseIndex] = {
        ...withCurrentSaved[currentExerciseIndex],
        ...currentData,
        transcript: currentExerciseTranscript
      }
    }

    // Filter out the exercise to remove and rename
    const updatedExercises = withCurrentSaved
      .filter((_, i) => i !== indexToRemove)
      .map((exercise, i) => ({
        ...exercise,
        name: `Exercise ${i + 1}`
      }))

    setExercises(updatedExercises)

    // Calculate new current index
    const newLength = exercises.length - 1
    let newCurrentIndex = currentExerciseIndex
    if (indexToRemove <= currentExerciseIndex && currentExerciseIndex > 0) {
      newCurrentIndex = currentExerciseIndex - 1
    } else if (currentExerciseIndex >= newLength) {
      newCurrentIndex = Math.max(0, newLength - 1)
    }
    setCurrentExerciseIndex(newCurrentIndex)

    // Get the exercise we're switching to
    const targetExercise = updatedExercises[newCurrentIndex]
    const targetInstrument = instrument

    // Clear current state and load the new current exercise's data
    clearSelection()
    scaleChordManagement.setAppliedScalesDirectly([])
    scaleChordManagement.setAppliedChordsDirectly([])
    setExternalSelectedNoteIds([])

    if (targetExercise) {
      // Apply exercise settings
      setCurrentExerciseTranscript(targetExercise.transcript || '')
      if (targetExercise.bpm) setBpm(targetExercise.bpm)
      if (targetExercise.beats) setNumberOfBeats(targetExercise.beats)
      if (targetExercise.chordMode) setChordMode(targetExercise.chordMode)
      const targetLower = targetExercise.lowerOctaves ?? 0
      const targetHigher = targetExercise.higherOctaves ?? 0
      handleOctaveRangeChange(targetLower, targetHigher)

      setTimeout(() => {
        // Apply scales from target exercise
        if (targetExercise.appliedScales?.length > 0) {
          if (targetInstrument === 'keyboard') {
            targetExercise.appliedScales.forEach((scaleData: any) => {
              const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleKeyboardScaleApply(scaleData.root, scaleObj, scaleData.octave || 4)
              }
            })
          } else if (targetInstrument === 'guitar') {
            const scalesToApply: AppliedScale[] = []
            targetExercise.appliedScales.forEach((scaleData: any) => {
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
              const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
              const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
              const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
              const scaleObj = GUITAR_SCALES.find(s => s.name === baseScaleName || s.name === scaleData.scaleName)
              if (scaleObj) {
                const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
                const positions = allPositions.filter(pos => pos.fret >= fretLow && pos.fret <= fretHigh)
                const scaleNotes = positions.map(pos => {
                  const noteId = `g-s${pos.string}-f${pos.fret}`
                  const guitarNote = getGuitarNoteById(noteId)
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: guitarNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: guitarNote?.position || 0,
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret }
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes
                })
              }
            })
            if (scalesToApply.length > 0) {
              scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
            }
          } else if (targetInstrument === 'bass') {
            const scalesToApply: AppliedScale[] = []
            targetExercise.appliedScales.forEach((scaleData: any) => {
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
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
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: bassNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: bassNote?.position || 0,
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret }
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj as any,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes
                })
              }
            })
            if (scalesToApply.length > 0) {
              scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
            }
          }
        }

        // Apply chords from target exercise
        if (targetExercise.appliedChords?.length > 0) {
          setChordMode('progression')
          if (targetInstrument === 'keyboard') {
            targetExercise.appliedChords.forEach((chordData: any) => {
              const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleKeyboardChordApply(chordData.root, chordObj, chordData.octave || 4)
              }
            })
          } else if (targetInstrument === 'guitar') {
            const chordsToApply: AppliedChord[] = []
            targetExercise.appliedChords.forEach((chordData: any) => {
              const chordBoxes = getChordBoxes(chordData.root, chordData.chordName)
              const chordBox = chordBoxes[chordData.fretZone ?? 0] || chordBoxes[0]
              if (chordBox) {
                const chordNotes = chordBox.positions.map(pos => {
                  const noteId = `g-s${pos.string}-f${pos.fret}`
                  const guitarNote = getGuitarNoteById(noteId)
                  return {
                    id: noteId,
                    name: guitarNote?.name || '',
                    frequency: guitarNote?.frequency || 0,
                    isBlack: guitarNote?.isBlack || false,
                    position: guitarNote?.position || 0,
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret }
                  }
                })
                chordsToApply.push({
                  id: `guitar-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                  root: chordData.root,
                  chord: { name: chordData.chordName, intervals: [] },
                  displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                  notes: chordNotes
                })
              }
            })
            if (chordsToApply.length > 0) {
              scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
            }
          } else if (targetInstrument === 'bass') {
            const chordsToApply: AppliedChord[] = []
            targetExercise.appliedChords.forEach((chordData: any) => {
              const chordBoxes = getBassChordBoxes(chordData.root, chordData.chordName)
              const chordBox = chordBoxes[chordData.fretZone ?? 0] || chordBoxes[0]
              if (chordBox) {
                const chordNotes = chordBox.positions.map(pos => {
                  const noteId = `b-s${pos.string}-f${pos.fret}`
                  const bassNote = getBassNoteById(noteId)
                  return {
                    id: noteId,
                    name: bassNote?.name || '',
                    frequency: bassNote?.frequency || 0,
                    isBlack: bassNote?.isBlack || false,
                    position: bassNote?.position || 0,
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret }
                  }
                })
                chordsToApply.push({
                  id: `bass-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                  root: chordData.root,
                  chord: { name: chordData.chordName, intervals: [] },
                  displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                  notes: chordNotes
                })
              }
            })
            if (chordsToApply.length > 0) {
              scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
            }
          }
        }

        // Apply notes from target exercise
        if (targetExercise.selectedNoteIds?.length > 0) {
          if (targetInstrument === 'keyboard') {
            targetExercise.selectedNoteIds.forEach((noteId: string) => {
              const noteObj = getKeyboardNoteById(noteId, targetLower, targetHigher)
              if (noteObj) selectNote(noteObj, 'multi')
            })
          } else {
            // Guitar/Bass - use direct handler call
            const validNoteIds = targetExercise.selectedNoteIds.filter((id: string | null) => id !== null) as string[]
            if (validNoteIds.length > 0) {
              setExternalSelectedNoteIds(validNoteIds)
              setTimeout(() => {
                if (targetInstrument === 'guitar' && scaleChordManagement.noteHandlers?.handleSetManualNotes) {
                  scaleChordManagement.noteHandlers.handleSetManualNotes(validNoteIds)
                } else if (targetInstrument === 'bass' && scaleChordManagement.bassNoteHandlers?.handleSetManualNotes) {
                  scaleChordManagement.bassNoteHandlers.handleSetManualNotes(validNoteIds)
                }
              }, 50)
            }
          }
        }
      }, 50)
    }
  }, [exercises, currentExerciseIndex, saveCurrentToExercise, currentExerciseTranscript, clearSelection, scaleChordManagement, instrument, setChordMode, selectNote, handleOctaveRangeChange])

  // Open assignment title modal
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

  // Save assignment
  const handleSaveAssignment = async () => {
    if (!assignmentTitle.trim()) {
      setAssignmentError(t('classroom.enterTitle'))
      return
    }
    if (!user || !assigningToClassroomId) {
      setAssignmentError(t('classroom.invalidSession'))
      return
    }

    // Save current exercise state before saving
    // Merge intelligently - preserve original data if current state is empty
    const currentData = saveCurrentToExercise()
    const updatedExercises = [...exercises]
    if (updatedExercises.length > 0) {
      const existingExercise = updatedExercises[currentExerciseIndex]
      updatedExercises[currentExerciseIndex] = {
        ...existingExercise,
        // Use current state if it has content, otherwise keep original
        transcript: currentExerciseTranscript,
        bpm: currentData.bpm,
        beats: currentData.beats,
        chordMode: currentData.chordMode,
        lowerOctaves: currentData.lowerOctaves,
        higherOctaves: currentData.higherOctaves,
        selectedNoteIds: currentData.selectedNoteIds.length > 0
          ? currentData.selectedNoteIds
          : existingExercise.selectedNoteIds,
        appliedScales: currentData.appliedScales.length > 0
          ? currentData.appliedScales
          : existingExercise.appliedScales,
        appliedChords: currentData.appliedChords.length > 0
          ? currentData.appliedChords
          : existingExercise.appliedChords
      }
    }

    // Check if any exercise has content
    const hasAnyContent = updatedExercises.some(exercise =>
      exercise.selectedNoteIds.length > 0 ||
      exercise.appliedScales.length > 0 ||
      exercise.appliedChords.length > 0
    )

    const hasScales = scaleChordManagement.appliedScales.length > 0
    const hasChords = scaleChordManagement.appliedChords.length > 0
    const hasNotes = selectedNotes.length > 0
    const lessonType = hasChords ? 'chords' : 'melodies'

    const appliedScaleNames = scaleChordManagement.appliedScales.map(s => s.scale?.name || 'Major')
    const appliedChordNames = scaleChordManagement.appliedChords.map(c => c.chord?.name || 'Major')

    // Build selection_data with exercises support
    // For backward compatibility, if there's only one exercise, also include top-level fields
    const firstExercise = updatedExercises[0]
    const selectionData = {
      // Legacy fields for backward compatibility (from first exercise)
      selectedNoteIds: firstExercise?.selectedNoteIds || [],
      appliedScales: firstExercise?.appliedScales || [],
      appliedChords: firstExercise?.appliedChords || [],
      // Exercise timeline array (instrument is assignment-level, not per-exercise)
      exercises: updatedExercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
        transcript: exercise.transcript,
        bpm: exercise.bpm,
        beats: exercise.beats,
        chordMode: exercise.chordMode,
        lowerOctaves: exercise.lowerOctaves,
        higherOctaves: exercise.higherOctaves,
        selectedNoteIds: exercise.selectedNoteIds,
        appliedScales: exercise.appliedScales,
        appliedChords: exercise.appliedChords
      }))
    }

    const octaveLow = 4 - lowerOctaves
    const octaveHigh = 5 + higherOctaves

    try {
      setIsSavingAssignment(true)
      setAssignmentError(null)

      const assignmentData = {
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
        selection_data: hasAnyContent ? selectionData : null
      }

      let saveError: any = null

      if (editingAssignmentId) {
        // Update existing assignment
        const { error } = await supabase
          .from('assignments')
          .update(assignmentData)
          .eq('id', editingAssignmentId)
        saveError = error
      } else {
        // Insert new assignment
        const { error } = await supabase
          .from('assignments')
          .insert({
            ...assignmentData,
            created_by: user.id
          })
        saveError = error
      }

      if (saveError) {
        setAssignmentError(saveError.message)
        return
      }

      // Success - go back to classroom view
      const savedClassroomId = assigningToClassroomId
      setAssignmentTitle('')
      setAssigningToClassroomId(null)
      setEditingAssignmentId(null)
      clearSelection()
      triggerClearChordsAndScales()
      setExercises([])
      setCurrentExerciseIndex(0)
      setCurrentExerciseTranscript('')

      // Navigate to the classroom where assignment was saved
      const targetClassroom = classrooms.find(c => c.id === savedClassroomId)
      if (targetClassroom) {
        setSelectedClassroom(targetClassroom)
      }
      setViewMode('classroom')
      fetchClassrooms()
    } catch (err) {
      setAssignmentError(t('errors.generic'))
      console.error('Error saving assignment:', err)
    } finally {
      setIsSavingAssignment(false)
    }
  }

  // Start taking a lesson
  const handleStartAssignment = (assignment: AssignmentData) => {
    setCurrentAssignment(assignment)
    hasInitializedNotes.current = false
    hasAnnouncedMelody.current = false
    setWelcomeSpeechDone(false)
    setGenericWelcomeDone(false)
    setHasGeneratedMelody(false)
    setAutoPlayAudio(false)
    setMelodySetupMessage('')
    setCongratulationsMessage('')

    // Set up instrument (assignment-level, same for all exercises)
    setInstrument(assignment.instrument as 'keyboard' | 'guitar' | 'bass')
    setBpm(assignment.bpm)
    setNumberOfBeats(assignment.beats)

    // Clear ALL existing content (notes, scales, chords)
    clearSelection()
    triggerClearChordsAndScales()
    scaleChordManagement.setAppliedScalesDirectly([])
    scaleChordManagement.setAppliedChordsDirectly([])
    setExternalSelectedNoteIds([])

    // Initialize exercises from assignment
    const selectionData = assignment.selection_data

    if (selectionData?.exercises && selectionData.exercises.length > 0) {
      // Map exercises with fallback for bpm/beats, transcript
      setLessonExercises(selectionData.exercises.map((ex: any) => ({
        ...ex,
        transcript: ex.transcript || '',
        bpm: ex.bpm || assignment.bpm,
        beats: ex.beats || assignment.beats
      })))
    } else if (selectionData) {
      // Legacy format - single exercise from top-level fields
      setLessonExercises([{
        id: 'legacy-exercise',
        name: 'Exercise 1',
        transcript: '',
        bpm: assignment.bpm,
        beats: assignment.beats,
        chordMode: 'single',
        lowerOctaves: 0,
        higherOctaves: 0,
        selectedNoteIds: selectionData.selectedNoteIds || [],
        appliedScales: selectionData.appliedScales || [],
        appliedChords: selectionData.appliedChords || []
      }])
    } else {
      setLessonExercises([])
    }
    setLessonExerciseIndex(0)

    setViewMode('taking-lesson')
  }

  // Track if we've already recorded progress for the current lesson session
  const hasRecordedProgressRef = useRef(false)
  // Track completed exercises synchronously (state updates are async)
  const completedExercisesRef = useRef(0)

  // Reset the flags when starting a new lesson
  useEffect(() => {
    if (viewMode === 'taking-lesson' && currentAssignment) {
      hasRecordedProgressRef.current = false
      completedExercisesRef.current = 0
    }
  }, [viewMode, currentAssignment])

  // Save partial progress on component unmount (in-app navigation)
  useEffect(() => {
    return () => {
      if (hasRecordedProgressRef.current) return
      if (!currentAssignment || isPreviewMode || !user?.id) return
      if (completedExercisesRef.current === 0) return
      if (viewMode !== 'taking-lesson') return

      hasRecordedProgressRef.current = true
      recordPracticeSession.mutate({
        type: 'classroom',
        instrument: currentAssignment.instrument,
        melodiesCompleted: completedExercisesRef.current
      })
    }
  }, [currentAssignment, isPreviewMode, user?.id, viewMode, recordPracticeSession])

  // Save partial progress on browser close/refresh using direct Supabase insert
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasRecordedProgressRef.current) return
      if (!currentAssignment || isPreviewMode || !user?.id) return
      if (completedExercisesRef.current === 0) return
      if (viewMode !== 'taking-lesson') return

      hasRecordedProgressRef.current = true

      // Synchronous insert for beforeunload
      const data = {
        user_id: user.id,
        type: 'classroom',
        instrument: currentAssignment.instrument,
        melodies_completed: completedExercisesRef.current
      }

      // Use fetch with keepalive for browser close
      fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/practice_sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(data),
        keepalive: true
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [currentAssignment, isPreviewMode, user?.id, viewMode])

  // End lesson
  const handleEndLesson = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }

    // Record partial progress if user completed any melodies before leaving
    // Only record for actual lessons (not preview mode) and if not already recorded
    if (!hasRecordedProgressRef.current && !isPreviewMode && user?.id && currentAssignment && completedExercisesRef.current > 0) {
      hasRecordedProgressRef.current = true
      recordPracticeSession.mutate({
        type: 'classroom',
        instrument: currentAssignment.instrument,
        melodiesCompleted: completedExercisesRef.current
      })
    }

    // Feedback cleanup now handled by CustomAudioPlayer
    setCurrentAssignment(null)
    setPendingSelectionData(null)
    setExternalSelectedNoteIds([])
    setLessonExercises([])
    setLessonExerciseIndex(0)
    clearSelection()
    triggerClearChordsAndScales()

    // If we were in preview mode, return to assignment editor
    if (isPreviewMode) {
      setIsPreviewMode(false)
      setViewMode('creating-assignment')
    } else {
      setViewMode('classroom')
    }
  }

  // Preview assignment - enter lesson mode with current editor data
  const handlePreviewAssignment = () => {
    // Save current exercise state before previewing
    const updatedExercises = [...exercises]
    updatedExercises[currentExerciseIndex] = {
      ...updatedExercises[currentExerciseIndex],
      selectedNoteIds: selectedNotes.map(n => n.id),
      appliedScales: scaleChordManagement.appliedScales,
      appliedChords: scaleChordManagement.appliedChords,
      transcript: currentExerciseTranscript,
      bpm,
      beats: numberOfBeats,
      chordMode
    }

    // Build a preview assignment object
    const previewAssignment: AssignmentData = {
      id: 'preview',
      title: assignmentTitle || 'Preview Assignment',
      instrument,
      bpm,
      beats: numberOfBeats,
      selection_data: {
        exercises: updatedExercises
      },
      created_at: new Date().toISOString()
    }

    // Enter preview mode
    setIsPreviewMode(true)

    // Set up the lesson environment (similar to handleStartAssignment)
    setCurrentAssignment(previewAssignment)
    hasInitializedNotes.current = false
    hasAnnouncedMelody.current = false
    setWelcomeSpeechDone(false)
    setGenericWelcomeDone(false)
    setHasGeneratedMelody(false)
    setAutoPlayAudio(false)
    setMelodySetupMessage('')
    setCongratulationsMessage('')

    // Clear existing content
    clearSelection()
    triggerClearChordsAndScales()
    scaleChordManagement.setAppliedScalesDirectly([])
    scaleChordManagement.setAppliedChordsDirectly([])
    setExternalSelectedNoteIds([])

    // Set up lesson exercises from editor data
    setLessonExercises(updatedExercises.map(ex => ({
      ...ex,
      transcript: ex.transcript || '',
      bpm: ex.bpm || bpm,
      beats: ex.beats || numberOfBeats
    })))
    setLessonExerciseIndex(0)

    // Switch to lesson mode
    setViewMode('taking-lesson')
  }

  // Handle Done button click - show animation before ending
  const handleDoneClick = useCallback(() => {
    setShowAssignmentComplete(true)
  }, [])

  // Callback when assignment complete animation finishes
  const handleAssignmentCompleteFinish = useCallback(() => {
    setShowAssignmentComplete(false)
    handleEndLesson()
  }, [])

  // Switch to a different exercise in lesson mode
  const handleSwitchLessonExercise = useCallback((index: number) => {
    if (index === lessonExerciseIndex || index < 0 || index >= lessonExercises.length || !currentAssignment) return

    // Clear current content
    clearSelection()
    triggerClearChordsAndScales()
    scaleChordManagement.setAppliedScalesDirectly([])
    scaleChordManagement.setAppliedChordsDirectly([])
    setExternalSelectedNoteIds([])

    // Reset melody and speech state for new exercise
    setHasGeneratedMelody(false)
    setAutoPlayAudio(false)
    setMelodySetupMessage('')
    hasAnnouncedMelody.current = false

    // Load the target exercise
    const targetExercise = lessonExercises[index]

    // If no transcript, mark speech as done immediately so auto-play can proceed
    if (!targetExercise?.transcript) {
      setWelcomeSpeechDone(true)
    } else {
      setWelcomeSpeechDone(false)
    }

    if (targetExercise) {
      // Apply BPM, beats, and chord mode from exercise (instrument is assignment-level)
      if (targetExercise.bpm) setBpm(targetExercise.bpm)
      if (targetExercise.beats) setNumberOfBeats(targetExercise.beats)
      if (targetExercise.chordMode) setChordMode(targetExercise.chordMode)
      // Apply octave range from exercise (use defaults if not set)
      const targetLower = targetExercise.lowerOctaves ?? 0
      const targetHigher = targetExercise.higherOctaves ?? 0
      handleOctaveRangeChange(targetLower, targetHigher)
    }

    // Use assignment-level instrument (same for all exercises)
    const exerciseInstrument = currentAssignment.instrument
    if (targetExercise) {
      // Use exercise-level octave range or fall back to assignment-level
      const targetLower = targetExercise.lowerOctaves ?? 0
      const targetHigher = targetExercise.higherOctaves ?? 0

      if (exerciseInstrument === 'keyboard') {
        setTimeout(() => {
          // Apply scales from exercise
          if (targetExercise.appliedScales?.length > 0) {
            targetExercise.appliedScales.forEach((scaleData) => {
              const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleKeyboardScaleApply(scaleData.root, scaleObj, scaleData.octave || 4)
              }
            })
          }

          // Apply chords from exercise
          if (targetExercise.appliedChords?.length > 0) {
            setChordMode('progression')
            targetExercise.appliedChords.forEach((chordData) => {
              const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleKeyboardChordApply(chordData.root, chordObj, chordData.octave || 4)
              }
            })
          }

          // Apply notes from exercise
          if (targetExercise.selectedNoteIds?.length > 0) {
            targetExercise.selectedNoteIds.forEach((noteId) => {
              const noteObj = getKeyboardNoteById(noteId, targetLower, targetHigher)
              if (noteObj) selectNote(noteObj, 'multi')
            })
          }
        }, 0)
      } else {
        // Guitar/Bass - use pending selection data pattern
        setPendingSelectionData({
          instrument: exerciseInstrument,
          selectionData: targetExercise
        })
      }
    }

    setLessonExerciseIndex(index)
  }, [lessonExerciseIndex, lessonExercises, currentAssignment, clearSelection, triggerClearChordsAndScales, scaleChordManagement, setChordMode, selectNote, handleOctaveRangeChange])

  // Auto-advance to next exercise or end lesson
  const handleExerciseComplete = useCallback(() => {
    // Track completed exercise synchronously
    completedExercisesRef.current += 1

    if (lessonExerciseIndex < lessonExercises.length - 1) {
      // More exercises available - advance to next
      handleSwitchLessonExercise(lessonExerciseIndex + 1)
    } else {
      // Last exercise - show completion animation then end lesson
      setShowAssignmentComplete(true)
      // Record completion to database
      if (currentAssignment && user?.id) {
        recordCompletion.mutate({ assignmentId: currentAssignment.id, userId: user.id })

        // Also record to Supabase practice_sessions for dashboard stats
        // Mark as recorded to prevent duplicate in handleEndLesson
        hasRecordedProgressRef.current = true
        recordPracticeSession.mutate({
          type: 'classroom',
          instrument: currentAssignment.instrument,
          melodiesCompleted: lessonExercises.length
        })
      }
    }
  }, [lessonExerciseIndex, lessonExercises.length, handleSwitchLessonExercise, currentAssignment, user?.id, recordCompletion, recordPracticeSession])

  // Apply assignment selection data when in lesson mode (first exercise)
  useEffect(() => {
    if (viewMode !== 'taking-lesson' || !currentAssignment || hasInitializedNotes.current) return
    if (lessonExercises.length === 0) return

    hasInitializedNotes.current = true
    const currentExercise = lessonExercises[0] // Start with first exercise
    const exerciseInstrument = currentExercise.instrument || currentAssignment.instrument

    // For keyboard, apply immediately; for guitar/bass, store as pending
    if (exerciseInstrument === 'keyboard') {
      // Set octave range from exercise (use defaults if not set for backward compatibility)
      const exerciseLower = currentExercise.lowerOctaves ?? 0
      const exerciseHigher = currentExercise.higherOctaves ?? 0
      handleOctaveRangeChange(exerciseLower, exerciseHigher)

      // Apply BPM, beats, and chord mode from first exercise
      if (currentExercise.bpm) setBpm(currentExercise.bpm)
      if (currentExercise.beats) setNumberOfBeats(currentExercise.beats)
      if (currentExercise.chordMode) setChordMode(currentExercise.chordMode)

      setTimeout(() => {
        // Apply scales
        if (currentExercise.appliedScales?.length > 0) {
          currentExercise.appliedScales.forEach((scaleData: any) => {
            const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
            if (scaleObj) {
              scaleChordManagement.handleKeyboardScaleApply(scaleData.root, scaleObj, scaleData.octave || 4)
            }
          })
        }

        // Apply chords
        if (currentExercise.appliedChords?.length > 0) {
          setChordMode('progression')
          currentExercise.appliedChords.forEach((chordData: any) => {
            const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
            if (chordObj) {
              scaleChordManagement.handleKeyboardChordApply(chordData.root, chordObj, chordData.octave || 4)
            }
          })
        }

        // Apply notes
        if (currentExercise.selectedNoteIds?.length > 0) {
          currentExercise.selectedNoteIds.forEach((noteId: string) => {
            const noteObj = getKeyboardNoteById(noteId, exerciseLower, exerciseHigher)
            if (noteObj) selectNote(noteObj, 'multi')
          })
        }
      }, 0)
    } else {
      // Guitar/Bass - store pending data
      setPendingSelectionData({
        instrument: exerciseInstrument,
        selectionData: currentExercise
      })
    }
  }, [viewMode, currentAssignment, lessonExercises, handleOctaveRangeChange, scaleChordManagement, setChordMode, selectNote])

  // Apply pending selection data for guitar/bass
  useEffect(() => {
    if (!pendingSelectionData) return

    const { instrument: pendingInstrument, selectionData } = pendingSelectionData

    const applyTimeoutId = setTimeout(() => {
      // Apply scales
      if (selectionData.appliedScales?.length > 0) {
        const scalesToApply: AppliedScale[] = []

        if (pendingInstrument === 'guitar') {
          selectionData.appliedScales.forEach((scaleData: any) => {
            // Extract fret range from displayName (e.g., "C Major (Frets 0-12)")
            const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
            const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
            const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
            const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
            const scaleObj = GUITAR_SCALES.find(s => s.name === baseScaleName || s.name === scaleData.scaleName)
            if (scaleObj) {
              const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
              const positions = allPositions.filter(pos => pos.fret >= fretLow && pos.fret <= fretHigh)
              const scaleNotes = positions.map(pos => {
                const noteId = `g-s${pos.string}-f${pos.fret}`
                const guitarNote = getGuitarNoteById(noteId)
                return {
                  id: noteId,
                  name: pos.note,
                  frequency: guitarNote?.frequency || 0,
                  isBlack: pos.note.includes('#'),
                  position: guitarNote?.position || 0,
                  __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret }
                }
              })
              const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
              scalesToApply.push({
                id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                root: scaleData.root,
                scale: scaleObj,
                displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                notes: scaleNotes
              })
            }
          })
        } else if (pendingInstrument === 'bass') {
          selectionData.appliedScales.forEach((scaleData: any) => {
            // Extract fret range from displayName (e.g., "C Major (Frets 0-12)")
            const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
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
                return {
                  id: noteId,
                  name: pos.note,
                  frequency: bassNote?.frequency || 0,
                  isBlack: pos.note.includes('#'),
                  position: bassNote?.position || 0,
                  __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret }
                }
              })
              const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
              scalesToApply.push({
                id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                root: scaleData.root,
                scale: scaleObj as any,
                displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                notes: scaleNotes
              })
            }
          })
        }

        if (scalesToApply.length > 0) {
          scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
        }
      }

      // Apply chords
      if (selectionData.appliedChords?.length > 0) {
        setChordMode('progression')
        const chordsToApply: AppliedChord[] = []

        if (pendingInstrument === 'guitar') {
          selectionData.appliedChords.forEach((chordData: any) => {
            let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
            baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
            const chordObj = GUITAR_CHORDS.find(c => c.name === baseChordName || c.name === chordData.chordName)
            if (chordObj) {
              // Compute actual chord positions
              const chordBoxes = getChordBoxes(chordData.root, chordObj, guitarNotes)
              if (chordBoxes.length > 0) {
                const boxIndex = Math.min(chordData.fretZone || 0, chordBoxes.length - 1)
                const chordBox = chordBoxes[boxIndex]
                const noteKeys = chordBox.positions.map(pos => {
                  const stringIndex = 6 - pos.string
                  const fretIndex = pos.fret
                  return fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
                })
                chordsToApply.push({
                  id: `guitar-${chordData.root}-${chordObj.name}-${Date.now()}-${Math.random()}`,
                  root: chordData.root,
                  chord: chordObj as any,
                  displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                  noteKeys: noteKeys,
                  fretZone: boxIndex
                })
              }
            }
          })
        } else if (pendingInstrument === 'bass') {
          selectionData.appliedChords.forEach((chordData: any) => {
            let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
            baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
            const chordObj = BASS_CHORDS.find(c => c.name === baseChordName || c.name === chordData.chordName)
            if (chordObj) {
              // Compute actual chord positions
              const chordBoxes = getBassChordBoxes(chordData.root, chordObj, bassNotes)
              if (chordBoxes.length > 0) {
                const boxIndex = Math.min(chordData.fretZone || 0, chordBoxes.length - 1)
                const chordBox = chordBoxes[boxIndex]
                const noteKeys = chordBox.positions.map(pos => {
                  const stringIndex = 4 - pos.string
                  const fretIndex = pos.fret
                  return fretIndex === 0 ? `${stringIndex}-open` : `${stringIndex}-${fretIndex - 1}`
                })
                chordsToApply.push({
                  id: `bass-${chordData.root}-${chordObj.name}-${Date.now()}-${Math.random()}`,
                  root: chordData.root,
                  chord: chordObj as any,
                  displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
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

      // Apply notes - set external note IDs for Guitar/Bass to sync from
      const validNoteIds = (selectionData.selectedNoteIds || []).filter((id: string | null) => id !== null) as string[]
      if (validNoteIds.length > 0) {
        setExternalSelectedNoteIds(validNoteIds)
      }

      setPendingSelectionData(null)
    }, 0)

    return () => clearTimeout(applyTimeoutId)
  }, [pendingSelectionData, scaleChordManagement, setChordMode, selectNote])

  // Trigger melody generation in lesson mode
  useEffect(() => {
    if (viewMode !== 'taking-lesson') return

    const hasContent = selectedNotes.length > 0 ||
      scaleChordManagement.appliedScales.length > 0 ||
      scaleChordManagement.appliedChords.length > 0

    if (hasContent && !hasGeneratedMelody) {
      const timeoutId = setTimeout(() => {
        handleGenerateMelody()
        setHasGeneratedMelody(true)
      }, 150)
      return () => clearTimeout(timeoutId)
    }
  }, [viewMode, selectedNotes.length, scaleChordManagement.appliedScales.length, scaleChordManagement.appliedChords.length, hasGeneratedMelody, handleGenerateMelody])

  // When generic welcome is done and there's no transcript, mark welcomeSpeechDone as true
  useEffect(() => {
    if (viewMode !== 'taking-lesson') return
    if (genericWelcomeDone && !welcomeSpeechDone) {
      const currentExercise = lessonExercises[lessonExerciseIndex]
      const hasTranscript = (currentExercise?.transcript || '').trim().length > 0
      if (!hasTranscript) {
        setWelcomeSpeechDone(true)
      }
    }
  }, [viewMode, genericWelcomeDone, welcomeSpeechDone, lessonExercises, lessonExerciseIndex])

  // Track when melody is ready (without announcing)
  useEffect(() => {
    if (viewMode !== 'taking-lesson') return
    if (welcomeSpeechDone && generatedMelody.length > 0 && recordedAudioBlob && !hasAnnouncedMelody.current) {
      hasAnnouncedMelody.current = true
      // Melody is ready - auto-play will be triggered by transcript speech end or immediately if no transcript
      setAutoPlayAudio(true)
    }
  }, [viewMode, welcomeSpeechDone, generatedMelody, recordedAudioBlob])

  // Feedback handling now done internally by CustomAudioPlayer

  const handleOpenModal = () => {
    if (!user) {
      setError(t('classroom.loginRequired'))
      return
    }
    setError(null)
    setNewTitle('')
    setIsModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setNewTitle('')
    setIsPublic(true)
    setError(null)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleCloseModal()
  }

  const handleOpenJoinModal = () => {
    if (!user) {
      setError(t('classroom.loginRequired'))
      return
    }
    setJoinError(null)
    setJoinCode('')
    setIsJoinModalOpen(true)
  }

  const handleCloseJoinModal = () => {
    setIsJoinModalOpen(false)
    setJoinCode('')
    setJoinError(null)
  }

  const handleJoinBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleCloseJoinModal()
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Create classroom modal
  const modal = isModalOpen && createPortal(
    <div className={`${styles.modalOverlay} ${isDarkMode ? 'dark' : ''}`} onClick={handleBackdropClick}>
      <div className={`${styles.modal} ${isDarkMode ? 'dark' : ''}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('classroom.createClass')}</h2>
          <button className={styles.closeButton} onClick={handleCloseModal} aria-label={t('common.close')}>×</button>
        </div>
        <form className={styles.form} onSubmit={handleCreateClassroom}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="classroomTitle">{t('classroom.className')}</label>
            <input
              id="classroomTitle"
              type="text"
              className={styles.formInput}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder={t('classroom.enterClassName')}
              autoFocus
              disabled={creating}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="classroomDescription">{t('classroom.classDescription')}</label>
            <textarea
              id="classroomDescription"
              className={styles.formTextarea}
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder={t('classroom.enterDescription')}
              disabled={creating}
              rows={3}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>{t('classroom.visibility')}</label>
            <div className={styles.visibilityOptions}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  disabled={creating}
                />
                <span className={styles.checkboxText}>{t('classroom.publicDescription')}</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  disabled={creating}
                />
                <span className={styles.checkboxText}>{t('classroom.privateDescription')}</span>
              </label>
            </div>
          </div>
          <button type="submit" className={styles.submitButton} disabled={creating || !newTitle.trim()}>
            {creating ? t('classroom.creating') : t('classroom.createClass')}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )

  // Join classroom modal
  const joinModal = isJoinModalOpen && createPortal(
    <div className={`${styles.modalOverlay} ${isDarkMode ? 'dark' : ''}`} onClick={handleJoinBackdropClick}>
      <div className={`${styles.modal} ${isDarkMode ? 'dark' : ''}`}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{t('classroom.joinClass')}</h2>
          <button className={styles.closeButton} onClick={handleCloseJoinModal} aria-label={t('common.close')}>×</button>
        </div>
        <form className={styles.form} onSubmit={handleJoinByCode}>
          {joinError && <div className={styles.errorMessage}>{joinError}</div>}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="joinCode">{t('classroom.classCode')}</label>
            <input
              id="joinCode"
              type="text"
              className={`${styles.formInput} ${styles.codeInput}`}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder={t('classroom.enterCode')}
              autoFocus
              disabled={isJoining}
              maxLength={6}
            />
          </div>
          <button type="submit" className={styles.submitButton} disabled={isJoining || !joinCode.trim()}>
            {isJoining ? t('classroom.joining') : t('classroom.joinClass')}
          </button>
        </form>
      </div>
    </div>,
    document.body
  )

  // Assignment title modal
  const assignTitleModal = showAssignTitleModal && createPortal(
    <div className={practiceStyles.modalOverlay} onClick={(e) => e.target === e.currentTarget && handleCloseAssignModal()}>
      <div className={practiceStyles.assignModal}>
        <div className={practiceStyles.assignModalHeader}>
          <h2 className={practiceStyles.assignModalTitle}>{editingAssignmentId ? t('classroom.assignment.update') : t('sandbox.createAssignment')}</h2>
          <button className={practiceStyles.assignModalClose} onClick={handleCloseAssignModal} aria-label={t('common.close')}>×</button>
        </div>
        <div className={practiceStyles.assignModalContent}>
          {assignmentError && <div className={practiceStyles.assignModalError}>{assignmentError}</div>}
          <div className={practiceStyles.assignModalField}>
            <label className={practiceStyles.assignModalLabel} htmlFor="assignmentTitle">{t('sandbox.assignmentTitle')}</label>
            <input
              id="assignmentTitle"
              type="text"
              className={practiceStyles.assignModalInput}
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder={t('sandbox.enterAssignmentTitle')}
              autoFocus
              disabled={isSavingAssignment}
            />
          </div>
          <div className={practiceStyles.assignModalInfo}>
            <p><strong>{t('sandbox.instrument')}:</strong> {instrumentNames[instrument]}</p>
            <p><strong>{t('sandbox.bpm')}:</strong> {bpm}</p>
            <p><strong>{t('sandbox.beats')}:</strong> {numberOfBeats}</p>
            <p><strong>{t('sandbox.type')}:</strong> {scaleChordManagement.appliedChords.length > 0 ? t('sandbox.chords') : t('sandbox.melodies')}</p>
          </div>
          <button
            className={practiceStyles.assignModalSubmit}
            onClick={handleSaveAssignment}
            disabled={isSavingAssignment || !assignmentTitle.trim()}
          >
            {isSavingAssignment ? t('sandbox.saving') : (editingAssignmentId ? t('classroom.assignment.update') : t('sandbox.createAssignment'))}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )

  // ========== RENDER: Taking Lesson Mode ==========
  if (viewMode === 'taking-lesson' && currentAssignment) {
    // Generic welcome message for the lesson
    const genericWelcomeMessage = !genericWelcomeDone ? t('sandbox.welcomeToLesson', { instrument: currentAssignment.title }) : ''

    // Get custom transcript from current exercise (only show after generic welcome)
    const currentExerciseForTranscript = lessonExercises[lessonExerciseIndex]
    const customTranscript = genericWelcomeDone ? (currentExerciseForTranscript?.transcript || '') : ''

    const octaveLow = currentAssignment.octave_low ?? 4
    const octaveHigh = currentAssignment.octave_high ?? 5
    const calculatedLowerOctaves = currentAssignment.instrument === 'keyboard' ? 4 - octaveLow : 0
    const calculatedHigherOctaves = currentAssignment.instrument === 'keyboard' ? octaveHigh - 5 : 0

    // Check if lesson has no scales or chords (use current exercise data)
    const currentExercise = lessonExercises[lessonExerciseIndex]
    const hasNoScalesOrChords = !currentExercise ||
      ((currentExercise.appliedScales?.length ?? 0) === 0 && (currentExercise.appliedChords?.length ?? 0) === 0)
    const hasChords = currentExercise && (currentExercise.appliedChords?.length ?? 0) > 0
    const hasScales = currentExercise && (currentExercise.appliedScales?.length ?? 0) > 0
    const hasBothScalesAndChords = hasScales && hasChords
    const hasMultipleExercises = lessonExercises.length > 1

    return (
      <>
        {/* Preview Mode Banner */}
        {isPreviewMode && (
          <div className={practiceStyles.previewModeBanner}>
            <PiEyeFill size={18} />
            <span>{t('classroom.previewMode')}</span>
          </div>
        )}

        <div className={practiceStyles.backButtonContainer}>
          <button className={practiceStyles.backButton} onClick={handleEndLesson} aria-label="End practice session">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          {/* Next button removed - user must complete melody feedback to advance */}
        </div>

        {/* Timeline for multi-exercise lessons (read-only progress indicator) */}
        {hasMultipleExercises && (
          <div className={practiceStyles.exerciseTimelineBar}>
            <span className={practiceStyles.exerciseTimelineLabel}>{t('classroom.timeline')}</span>
            <div className={`${practiceStyles.exerciseTimeline} ${practiceStyles.exerciseTimelineLesson}`}>
              <div className={practiceStyles.exerciseTimelineLine} />
              <div className={practiceStyles.exerciseCircles}>
                {lessonExercises.map((exercise, index) => (
                  <div
                    key={exercise.id}
                    className={`${practiceStyles.exerciseCircle} ${index === lessonExerciseIndex ? practiceStyles.exerciseCircleActive : ''} ${index < lessonExerciseIndex ? practiceStyles.exerciseCircleCompleted : ''}`}
                    title={exercise.name}
                    style={{ cursor: 'default' }}
                  >
                    {index + 1}
                  </div>
                ))}
              </div>
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
          hideOctaveRange={currentAssignment.instrument !== 'keyboard'}
          disableOctaveRange={true}
          hideBpmButtons={true}
          hideBeatsButtons={true}
          hideGenerateButton={true}
          hideDeselectAll={true}
          showOnlyAppliedList={true}
          hideChordMode={!hasChords}
          disableBpmInput={true}
          disableBeatsInput={true}
          disableChordMode={true}
          practiceMode={true}
          autoPlayAudio={autoPlayAudio}
          lessonType={hasBothScalesAndChords ? undefined : (currentAssignment.lesson_type as 'melodies' | 'chords' | undefined)}
          externalSelectedNoteIds={externalSelectedNoteIds}
          hideScalesChords={hasNoScalesOrChords}
          onLessonComplete={handleExerciseComplete}
          autoStartFeedback={true}
        />

        {genericWelcomeMessage && <WelcomeSubtitle message={genericWelcomeMessage} onSpeechEnd={() => setGenericWelcomeDone(true)} />}
        {customTranscript && <WelcomeSubtitle message={customTranscript} onSpeechEnd={() => setWelcomeSpeechDone(true)} />}
        {congratulationsMessage && <WelcomeSubtitle message={congratulationsMessage} onSpeechEnd={handleExerciseComplete} />}

        {/* Assignment Complete Animation */}
        {showAssignmentComplete && createPortal(
          <AssignmentCompleteOverlay onComplete={handleAssignmentCompleteFinish} />,
          document.body
        )}
      </>
    )
  }

  // ========== RENDER: Assignment Editor Mode ==========
  if (viewMode === 'creating-assignment') {
    const userClassrooms = classrooms.filter(c => c.created_by === user?.id)

    // Helper to check if an exercise has notes selected
    const exerciseHasNotes = (exercise: ExerciseData) =>
      exercise.selectedNoteIds.length > 0 ||
      exercise.appliedScales.length > 0 ||
      exercise.appliedChords.length > 0

    // Check current exercise content (for the current one being edited)
    const currentExerciseData = {
      selectedNoteIds: selectedNotes.map(n => n.id),
      appliedScales: scaleChordManagement.appliedScales,
      appliedChords: scaleChordManagement.appliedChords
    }
    const currentHasContent = currentExerciseData.selectedNoteIds.length > 0 ||
      currentExerciseData.appliedScales.length > 0 ||
      currentExerciseData.appliedChords.length > 0

    // Check if all exercises have content (including current unsaved state)
    const allExercisesHaveContent = exercises.every((exercise, index) => {
      if (index === currentExerciseIndex) {
        return currentHasContent
      }
      return exerciseHasNotes(exercise)
    })

    return (
      <>
        {/* Back button and header */}
        <div className={practiceStyles.backButtonContainer}>
          <button className={practiceStyles.backButton} onClick={handleCancelAssignment} aria-label="Cancel assignment">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        {/* Assignment Editor Header - All options in one bar */}
        <div className={practiceStyles.exerciseTimelineBar} style={{ flexDirection: 'column', gap: '0.75rem' }}>
          {/* Row 1: Classroom, Instrument, Title, Assign */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
            <select
              className={practiceStyles.classroomSelector}
              value={assigningToClassroomId || ''}
              onChange={(e) => setAssigningToClassroomId(e.target.value || null)}
            >
              <option value="">{t('classroom.selectClassroom')}</option>
              {userClassrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.title}
                </option>
              ))}
            </select>
            <select
              className={practiceStyles.classroomSelector}
              value={instrument}
              onChange={(e) => handleInstrumentChange(e.target.value as 'keyboard' | 'guitar' | 'bass')}
              style={{ color: instrument === 'keyboard' ? '#3b82f6' : instrument === 'guitar' ? '#22c55e' : '#ef4444' }}
            >
              <option value="keyboard">{t('instruments.keyboard')}</option>
              <option value="guitar">{t('instruments.guitar')}</option>
              <option value="bass">{t('instruments.bass')}</option>
            </select>
            <input
              type="text"
              className={practiceStyles.assignmentTitleInput}
              style={{ flex: 1 }}
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder={t('sandbox.assignmentTitle')}
            />
            <button
              className={practiceStyles.assignmentPreviewButton}
              onClick={handlePreviewAssignment}
              disabled={!assigningToClassroomId || !assignmentTitle.trim() || !allExercisesHaveContent || isSavingAssignment}
              style={{ opacity: (assigningToClassroomId && assignmentTitle.trim() && allExercisesHaveContent) ? 1 : 0.5 }}
              title={t('classroom.preview')}
            >
              <PiEyeFill size={16} />
              {t('classroom.preview')}
            </button>
            <button
              className={practiceStyles.assignmentAssignButton}
              onClick={handleSaveAssignment}
              disabled={!assigningToClassroomId || !assignmentTitle.trim() || !allExercisesHaveContent || isSavingAssignment}
              style={{ opacity: (assigningToClassroomId && assignmentTitle.trim() && allExercisesHaveContent) ? 1 : 0.5 }}
            >
              {isSavingAssignment ? t('sandbox.saving') : (editingAssignmentId ? t('common.update') : t('classroom.assign'))}
            </button>
          </div>
          {/* Row 2: Timeline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
            <span className={practiceStyles.exerciseTimelineLabel} style={{ minWidth: '70px' }}>{t('classroom.timeline')}</span>
            <div className={practiceStyles.exerciseTimeline}>
              <div className={practiceStyles.exerciseTimelineLine} />
              <div className={practiceStyles.exerciseCircles}>
                {exercises.map((exercise, index) => {
                  // Check if this exercise has content
                  const hasContent = index === currentExerciseIndex
                    ? currentHasContent
                    : exerciseHasNotes(exercise)
                  // Check if this exercise has a transcript
                  const hasTranscript = index === currentExerciseIndex
                    ? currentExerciseTranscript.trim().length > 0
                    : (exercise.transcript || '').trim().length > 0
                  return (
                    <div key={exercise.id} className={practiceStyles.exerciseCircleWrapper}>
                      <button
                        className={`${practiceStyles.exerciseCircle} ${index === currentExerciseIndex ? practiceStyles.exerciseCircleActive : ''} ${!hasContent ? practiceStyles.exerciseCircleEmpty : ''}`}
                        onClick={() => handleSwitchExercise(index)}
                        title={hasContent ? exercise.name : `${exercise.name} (no notes selected)`}
                      >
                        {index + 1}
                      </button>
                      {hasContent && (
                        <span className={practiceStyles.exerciseCircleReady} title="Ready for assignment">
                          <PiCheckCircleFill size={12} />
                        </span>
                      )}
                      {hasTranscript && (
                        <span className={practiceStyles.exerciseCircleTranscript} title="Has transcript">
                          <PiChatCircleFill size={12} />
                        </span>
                      )}
                      {exercises.length > 1 && index === currentExerciseIndex && (
                        <button
                          className={practiceStyles.exerciseCircleRemove}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleRemoveExercise(index)
                          }}
                          title="Remove exercise"
                        >
                          <PiTrashFill size={10} />
                        </button>
                      )}
                    </div>
                  )
                })}
                {exercises.length < 10 && (
                  <div className={practiceStyles.exerciseCircleWrapper}>
                    <button
                      className={practiceStyles.exerciseCircle}
                      onClick={handleAddExercise}
                      title="Add new exercise"
                    >
                      +
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* Row 3: Transcript */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
            <label style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--primary-purple)', whiteSpace: 'nowrap', minWidth: '70px' }}>
              {t('classroom.transcript')}
            </label>
            <input
              type="text"
              className={practiceStyles.assignmentTitleInput}
              style={{ flex: 1 }}
              value={currentExerciseTranscript}
              onChange={(e) => setCurrentExerciseTranscript(e.target.value)}
              placeholder={t('classroom.transcriptPlaceholder')}
            />
          </div>
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
          initialLowerOctaves={lowerOctaves}
          initialHigherOctaves={higherOctaves}
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
          externalSelectedNoteIds={externalSelectedNoteIds}
          hideInstrumentSelector={true}
          hideGenerateButton={true}
        />
      </>
    )
  }

  // ========== RENDER: Classroom Detail View ==========
  if (viewMode === 'classroom' && selectedClassroom) {
    const isOwner = user && user.id === selectedClassroom.created_by
    const joined = hasJoined(selectedClassroom)
    const studentCount = selectedClassroom.classroom_students?.length ?? 0
    const assignments = selectedClassroom.assignments ?? []

    return (
      <div className={styles.classroomContainer}>
        <div className={styles.fullPageView}>
          <button
            className={styles.backButtonCircle}
            onClick={() => { setSelectedClassroom(null); setViewMode('list') }}
            aria-label="Back to classes"
            title="Back to classes"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          <div className={styles.fullPageHeader}>
            {isEditingClassroom ? (
              <>
                <div className={styles.editFormGroup}>
                  <label className={styles.editLabel}>{t('classroom.className')}</label>
                  <input
                    type="text"
                    className={styles.editInput}
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    placeholder={t('classroom.enterClassName')}
                    autoFocus
                    disabled={isSavingEdit}
                  />
                </div>
                <div className={styles.editFormGroup}>
                  <label className={styles.editLabel}>{t('classroom.classDescription')}</label>
                  <textarea
                    className={styles.editTextarea}
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    placeholder={t('classroom.enterDescription')}
                    disabled={isSavingEdit}
                    rows={3}
                  />
                </div>
                <div className={styles.editActions}>
                  <button
                    className={styles.editCancelButton}
                    onClick={handleCancelEditClassroom}
                    disabled={isSavingEdit}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    className={styles.editSaveButton}
                    onClick={handleSaveClassroom}
                    disabled={isSavingEdit || !editTitle.trim()}
                  >
                    {isSavingEdit ? t('sandbox.saving') : t('common.save')}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className={styles.fullPageTitleRow}>
                  <h1 className={styles.fullPageTitle}>{selectedClassroom.title}</h1>
                  {isOwner && (
                    <div className={styles.titleActions}>
                      <button
                        className={styles.editButton}
                        onClick={handleStartEditClassroom}
                        title="Edit classroom"
                      >
                        <PiPencilSimpleFill size={16} />
                      </button>
                      <button
                        className={styles.deleteButton}
                        onClick={() => handleDeleteClassroom(selectedClassroom.id)}
                        title="Delete classroom"
                      >
                        <PiTrashFill size={16} />
                      </button>
                    </div>
                  )}
                </div>
                <p className={styles.fullPageAuthor}>{t('classroom.by')} {selectedClassroom.profiles?.username ?? t('classroom.unknown')}</p>
                {selectedClassroom.description && (
                  <p className={styles.fullPageDescription}>{selectedClassroom.description}</p>
                )}
                {(() => {
                  const classInstruments = [...new Set(selectedClassroom.assignments?.map(a => a.instrument).filter(Boolean) || [])]
                  return classInstruments.length > 0 ? (
                    <div className={styles.instrumentTags} style={{ marginTop: '0.75rem' }}>
                      {classInstruments.map(inst => (
                        <span
                          key={inst}
                          className={`${styles.instrumentTag} ${styles[`instrument${inst.charAt(0).toUpperCase() + inst.slice(1)}`]}`}
                        >
                          {inst}
                        </span>
                      ))}
                    </div>
                  ) : null
                })()}
                <p className={styles.fullPageMeta}>{t('classroom.created')} {formatDate(selectedClassroom.created_at)}</p>
              </>
            )}

            {!isEditingClassroom && isOwner && !selectedClassroom.is_public && selectedClassroom.join_code && (
              <div className={styles.joinCodeDisplay}>
                <span className={styles.joinCodeLabel}>{t('classroom.classCode')}:</span>
                <span className={styles.joinCodeValue}>{selectedClassroom.join_code}</span>
                <button
                  className={`${styles.copyCodeButton} ${codeCopied ? styles.copied : ''}`}
                  onClick={() => {
                    navigator.clipboard.writeText(selectedClassroom.join_code!)
                    setCodeCopied(true)
                    setTimeout(() => setCodeCopied(false), 2000)
                  }}
                  title="Copy code"
                >
                  {codeCopied ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  )}
                </button>
              </div>
            )}

            {user && !isOwner && (
              <button
                className={joined ? styles.leaveButton : styles.joinButton}
                onClick={() => joined ? handleLeaveClassroom(selectedClassroom.id) : handleJoinClassroom(selectedClassroom.id)}
                disabled={joiningClassId === selectedClassroom.id}
                style={{ marginTop: '1rem', width: 'auto' }}
              >
                {joiningClassId === selectedClassroom.id ? t('common.loading') : joined ? t('classroom.leaveClass') : t('classroom.joinClass')}
              </button>
            )}
          </div>

          <div className={styles.fullPageContent}>
            <div className={styles.fullPageColumn}>
              <div className={styles.fullPageSectionHeader}>
                <h2 className={styles.fullPageSectionTitle}>{t('classroom.students')}</h2>
                <span className={styles.fullPageCount}>{studentCount}</span>
              </div>
              {studentCount === 0 ? (
                <p className={styles.fullPageEmpty}>{t('classroom.noStudents')}</p>
              ) : (
                <div className={styles.fullPageStudentsList}>
                  {selectedClassroom.classroom_students.map((student) => (
                    <div key={student.user_id} className={styles.fullPageStudentItem}>
                      <div className={styles.studentAvatar}>
                        {(student.profiles?.username ?? 'U')[0].toUpperCase()}
                      </div>
                      <span className={styles.studentName}>{student.profiles?.username ?? t('classroom.unknown')}</span>
                      {isOwner && (
                        <button
                          className={styles.removeStudentButton}
                          onClick={() => handleRemoveStudent(selectedClassroom.id, student.user_id)}
                          aria-label="Remove student"
                          title="Remove student"
                        >
                          <PiTrashFill size={14} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.fullPageColumn}>
              <div className={styles.fullPageSectionHeader}>
                <h2 className={styles.fullPageSectionTitle}>{t('classroom.assignments')}</h2>
                {isOwner && (
                  <button
                    className={styles.addAssignmentButtonLarge}
                    onClick={() => handleCreateAssignment(selectedClassroom.id)}
                  >
                    + {t('classroom.addAssignment')}
                  </button>
                )}
              </div>
              {assignments.length === 0 ? (
                <p className={styles.fullPageEmpty}>{t('classroom.noAssignments')}</p>
              ) : (
                <div className={styles.fullPageAssignmentsList}>
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className={styles.fullPageAssignmentItem}>
                      <div className={styles.fullPageAssignmentInfo}>
                        <h3 className={styles.fullPageAssignmentTitle}>
                          {assignment.title}
                          {completedAssignmentIds.has(assignment.id) && (
                            <PiCheckCircleFill className={styles.completedTick} size={18} />
                          )}
                        </h3>
                        {assignment.instrument && (
                          <span
                            className={`${styles.instrumentTag} ${styles[`instrument${assignment.instrument.charAt(0).toUpperCase() + assignment.instrument.slice(1)}`]}`}
                          >
                            {assignment.instrument}
                          </span>
                        )}
                      </div>
                      <div className={styles.fullPageAssignmentActions}>
                        {user && (
                          <button
                            className={styles.startAssignmentButtonLarge}
                            onClick={() => handleStartAssignment(assignment)}
                          >
                            {t('classroom.assignment.start')}
                          </button>
                        )}
                        {isOwner && (
                          <button
                            className={styles.viewCompletionsButton}
                            onClick={() => setViewingCompletionsForAssignment(
                              viewingCompletionsForAssignment === assignment.id ? null : assignment.id
                            )}
                            title="View completions"
                          >
                            <PiEyeFill size={14} />
                          </button>
                        )}
                        {isOwner && (
                          <button
                            className={styles.editAssignmentButton}
                            onClick={() => handleEditAssignment(assignment, selectedClassroom.id)}
                            title={t('classroom.assignment.update')}
                          >
                            <PiPencilSimpleFill size={14} />
                          </button>
                        )}
                        {isOwner && (
                          <button
                            className={styles.deleteAssignmentButton}
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            title="Delete assignment"
                          >
                            <PiTrashFill size={14} />
                          </button>
                        )}
                      </div>
                      {viewingCompletionsForAssignment === assignment.id && (() => {
                        const completionsMap = new Map(
                          (assignmentCompletions.data ?? []).map(c => [c.user_id, c])
                        )
                        // Include owner and all students
                        const allMembers: Array<{ user_id: string; profiles: { username: string | null } | null; isOwner?: boolean; completion?: typeof assignmentCompletions.data extends (infer T)[] | null | undefined ? T : never }> = []

                        // Add owner first
                        if (selectedClassroom.created_by) {
                          allMembers.push({
                            user_id: selectedClassroom.created_by,
                            profiles: selectedClassroom.profiles,
                            isOwner: true,
                            completion: completionsMap.get(selectedClassroom.created_by)
                          })
                        }

                        // Add students
                        selectedClassroom.classroom_students.forEach(student => {
                          allMembers.push({
                            ...student,
                            completion: completionsMap.get(student.user_id)
                          })
                        })

                        const completedCount = allMembers.filter(s => s.completion).length
                        return (
                          <div className={styles.completionsList}>
                            <h4 className={styles.completionsListTitle}>
                              Progress ({completedCount}/{allMembers.length})
                            </h4>
                            {assignmentCompletions.isLoading ? (
                              <p className={styles.completionsLoading}>Loading...</p>
                            ) : allMembers.length > 0 ? (
                              <ul className={styles.completionsListItems}>
                                {allMembers.map((member) => (
                                  <li key={member.user_id} className={styles.completionItem}>
                                    {member.completion ? (
                                      <PiCheckCircleFill className={styles.completedIcon} size={18} />
                                    ) : (
                                      <PiXCircleFill className={styles.notCompletedIcon} size={18} />
                                    )}
                                    <div className={styles.completionAvatar}>
                                      {(member.profiles?.username ?? 'U')[0].toUpperCase()}
                                    </div>
                                    <span className={styles.completionName}>
                                      {member.profiles?.username || 'Unknown user'}
                                      {member.isOwner && ' (Owner)'}
                                    </span>
                                    {member.completion && (
                                      <span className={styles.completionDate}>
                                        {new Date(member.completion.completed_at).toLocaleDateString()}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className={styles.noCompletions}>No members in class</p>
                            )}
                          </div>
                        )
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ========== RENDER: Class List View ==========
  // Split classrooms into "My Classes" (owned + joined) and "Available Classes" (public, not joined)
  const myClasses = classrooms.filter(classroom => {
    if (!user) return false
    if (classroom.created_by === user.id) return true
    if (classroom.classroom_students?.some(s => s.user_id === user.id)) return true
    return false
  })

  const availableClasses = classrooms.filter(classroom => {
    if (!classroom.is_public) return false
    if (!user) return true
    // Exclude classes user owns or has joined
    if (classroom.created_by === user.id) return false
    if (classroom.classroom_students?.some(s => s.user_id === user.id)) return false
    return true
  })

  const renderClassCard = (classroom: ClassroomData, showOwnershipBadge: boolean = false) => {
    const isPrivate = !classroom.is_public
    const isOwner = user && classroom.created_by === user.id
    const isJoined = user && classroom.classroom_students?.some(s => s.user_id === user.id)

    // Get unique instruments from assignments
    const instruments = [...new Set(classroom.assignments?.map(a => a.instrument).filter(Boolean) || [])]

    return (
      <div
        key={classroom.id}
        className={styles.classCardClickable}
        onClick={() => { setSelectedClassroom(classroom); setViewMode('classroom') }}
      >
        <div className={styles.classTitleRow}>
          <h3 className={styles.classTitle}>{classroom.title}</h3>
          <div className={styles.tagGroup}>
            {showOwnershipBadge && isOwner && <span className={styles.ownerTag}>{t('classroom.owner')}</span>}
            {showOwnershipBadge && !isOwner && isJoined && <span className={styles.studentTag}>{t('classroom.student')}</span>}
            {isPrivate ? (
              <span className={styles.privateTag}>{t('classroom.private')}</span>
            ) : (
              <span className={styles.publicTag}>{t('classroom.public')}</span>
            )}
          </div>
        </div>
        <p className={styles.classAuthor}>{t('classroom.by')} {classroom.profiles?.username ?? t('classroom.unknown')}</p>
        {classroom.description && (
          <p className={styles.classDescription}>{classroom.description}</p>
        )}
        {instruments.length > 0 && (
          <div className={styles.instrumentTags}>
            {instruments.map(inst => (
              <span
                key={inst}
                className={`${styles.instrumentTag} ${styles[`instrument${inst.charAt(0).toUpperCase() + inst.slice(1)}`]}`}
              >
                {inst}
              </span>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={styles.classroomContainer}>
      <section className={styles.headerSection}>
        <h1 className={styles.pageTitle}>{t('classroom.title')}</h1>
        <p className={styles.pageSubtitle}>{t('classroom.subtitle')}</p>
      </section>

      {/* My Classes Section */}
      {user && (
        <section className={styles.classesSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{t('classroom.myClasses')}</h2>
            <div className={styles.sectionButtons}>
              <button
                className={styles.createButton}
                onClick={handleOpenModal}
                aria-label={t('classroom.createClass')}
                title={t('classroom.createClass')}
              >
                {t('classroom.create')}
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingState}>{t('classroom.loadingClasses')}</div>
          ) : myClasses.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>{t('classroom.noClassesJoined')}</p>
            </div>
          ) : (
            <div className={styles.classesGrid}>
              {myClasses.map(classroom => renderClassCard(classroom, true))}
            </div>
          )}
        </section>
      )}

      {/* Available Classes Section */}
      <section className={styles.classesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{t('classroom.availableClasses')}</h2>
          <div className={styles.sectionButtons}>
            <button
              className={styles.joinClassButton}
              onClick={handleOpenJoinModal}
              aria-label={t('classroom.joinPrivateClass')}
              title={user ? t('classroom.joinPrivateClass') : t('classroom.loginToJoin')}
            >
              {t('classroom.joinPrivateClass')}
            </button>
            {!user && (
              <button
                className={styles.createButton}
                onClick={handleOpenModal}
                aria-label={t('classroom.createClass')}
                title={t('classroom.loginToCreate')}
              >
                {t('classroom.create')}
              </button>
            )}
          </div>
        </div>

        <div className={styles.searchContainer}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder={t('classroom.searchClasses')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button
              className={styles.searchClear}
              onClick={() => setSearchQuery('')}
              aria-label="Clear search"
            >
              ×
            </button>
          )}
        </div>

        {(() => {
          const filteredClasses = availableClasses.filter(classroom =>
            classroom.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (classroom.profiles?.username?.toLowerCase().includes(searchQuery.toLowerCase()))
          )

          if (loading) {
            return <div className={styles.loadingState}>{t('classroom.loadingClasses')}</div>
          }
          if (availableClasses.length === 0) {
            return (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>
                  {user ? t('classroom.noMoreClasses') : t('classroom.noPublicClasses')}
                </p>
              </div>
            )
          }
          if (filteredClasses.length === 0) {
            return (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>{t('classroom.noClassesFound', { query: searchQuery })}</p>
              </div>
            )
          }
          return (
            <div className={styles.classesGrid}>
              {filteredClasses.map(classroom => renderClassCard(classroom, false))}
            </div>
          )
        })()}

        {!user && error && <div className={styles.errorMessage}>{error}</div>}
      </section>

      {modal}
      {joinModal}
      {assignTitleModal}

      {/* Tutorial Overlay */}
      <TutorialOverlay
        isActive={isTutorialActive}
        currentStep={tutorialStep}
        onNext={tutorialNextStep}
        onPrev={tutorialPrevStep}
        onSkip={skipTutorial}
        onComplete={completeTutorial}
        shouldShowWelcome={shouldShowTutorial}
        onStartTutorial={startTutorial}
      />
    </div>
  )
}

export default Classroom
