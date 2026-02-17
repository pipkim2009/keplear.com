/**
 * Classroom Page - View and create classrooms
 * Now includes embedded instrument UI for creating assignments and taking lessons
 */

import { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react'
import { AuthContext } from '../../contexts/AuthContext'
import {
  fetchClassroomList,
  deleteClassroom as deleteClassroomAction,
  updateClassroom as updateClassroomAction,
  deleteAssignment as deleteAssignmentAction,
  joinClassroom as joinClassroomAction,
  leaveClassroom as leaveClassroomAction,
  removeStudent as removeStudentAction,
  createClassroom as createClassroomAction,
  findAndJoinByCode,
  saveAssignment as saveAssignmentAction,
} from '../../hooks/useClassroomActions'
import { useTranslation } from '../../contexts/TranslationContext'
import { useInstrument } from '../../contexts/InstrumentContext'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import { type Note, generateNotesWithSeparateOctaves } from '../../utils/notes'
import type { AppliedScale, AppliedChord } from '../common/ScaleChordOptions'
import {
  KEYBOARD_SCALES,
  type KeyboardScale,
  applyScaleToKeyboard,
} from '../../utils/instruments/keyboard/keyboardScales'
import {
  KEYBOARD_CHORDS,
  applyChordToKeyboard,
} from '../../utils/instruments/keyboard/keyboardChords'
import {
  GUITAR_SCALES,
  type GuitarScale,
  getScalePositions,
} from '../../utils/instruments/guitar/guitarScales'
import {
  GUITAR_CHORDS,
  type GuitarChord,
  getChordBoxes,
} from '../../utils/instruments/guitar/guitarChords'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import {
  BASS_SCALES,
  type BassScale,
  getBassScalePositions,
} from '../../utils/instruments/bass/bassScales'
import {
  BASS_CHORDS,
  type BassChord,
  getBassChordBoxes,
} from '../../utils/instruments/bass/bassChords'
import { bassNotes } from '../../utils/instruments/bass/bassNotes'
import {
  getGuitarNoteById,
  getBassNoteById,
  getKeyboardNoteById,
} from '../../utils/practice/practiceNotes'
import { useRecordPracticeSession } from '../../hooks/usePracticeSessions'
import { supabase } from '../../lib/supabase'
import { containsScriptInjection } from '../../utils/security'
import {
  PiMusicNotesFill,
  PiMagnifyingGlass,
  PiPlay,
  PiPause,
  PiRepeat,
  PiX,
  PiArrowCounterClockwise,
  PiArrowClockwise,
  PiTrash,
  PiSpeakerHigh,
  PiSpeakerLow,
  PiSpeakerNone,
  PiPianoKeysFill,
  PiCaretRight,
  PiEyeFill,
  PiCheckCircleFill,
} from 'react-icons/pi'
import { GiGuitarHead, GiGuitarBassHead } from 'react-icons/gi'
import { useRecordCompletion, useUserCompletions } from '../../hooks/useClassrooms'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import styles from '../../styles/Classroom.module.css'
import practiceStyles from '../../styles/Practice.module.css'
import songStyles from '../../styles/Songs.module.css'
import { useTutorial } from '../../hooks/useTutorial'
import WelcomeSubtitle from '../sandbox/WelcomeSubtitle'
import AssignmentComplete from '../sandbox/AssignmentComplete'
import ClassroomList from '../classroom/ClassroomList'
import ClassroomDetail from '../classroom/ClassroomDetail'
import {
  CreateClassroomModal,
  JoinClassroomModal,
  AssignmentTitleModal,
} from '../classroom/ClassroomModals'
import SongPlayerUI from '../classroom/SongPlayerUI'
import { useWaveformData } from '../../hooks/useWaveformData'
import { generateFallbackWaveform, resamplePeaks } from '../../utils/waveformUtils'
import { apiUrl } from '../../lib/api'

// Type for serialized scale data from JSON
interface SerializedScaleData {
  root: string
  scaleName: string
  octave?: number
  displayName?: string
}

// Type for serialized chord data from JSON
interface SerializedChordData {
  root: string
  chordName: string
  octave?: number
  fretZone?: number
  displayName?: string
}

// Build AppliedScale[] from serialized data (avoids stale closure in handleKeyboardScaleApply)
function buildAppliedScalesFromData(scaleDataList: SerializedScaleData[]): AppliedScale[] {
  const fullRangeNotes = generateNotesWithSeparateOctaves(3, 3)
  return scaleDataList
    .map(scaleData => {
      const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
      if (!scaleObj) return null
      const octave = scaleData.octave || 4
      const displayName = `${scaleData.root} ${scaleObj.name} (Octave ${octave})`
      let scaleNotes = applyScaleToKeyboard(scaleData.root, scaleObj, fullRangeNotes)
      scaleNotes = scaleNotes.filter(note => {
        const noteOctave = parseInt(note.name.replace(/[^0-9]/g, ''), 10)
        return noteOctave === octave
      })
      return {
        id: `${scaleData.root}-${scaleObj.name}-${octave}-${Date.now()}-${Math.random()}`,
        root: scaleData.root,
        scale: scaleObj,
        displayName,
        notes: scaleNotes,
        octave,
      } as AppliedScale
    })
    .filter((s): s is AppliedScale => s !== null)
}

// Build AppliedChord[] from serialized data (avoids stale closure in handleKeyboardChordApply)
function buildAppliedChordsFromData(chordDataList: SerializedChordData[]): AppliedChord[] {
  const fullRangeNotes = generateNotesWithSeparateOctaves(3, 3)
  return chordDataList
    .map(chordData => {
      const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
      if (!chordObj) return null
      const octave = chordData.octave || 4
      const displayName = `${chordData.root} ${chordObj.name} (Octave ${octave})`
      let chordNotes = applyChordToKeyboard(chordData.root, chordObj, fullRangeNotes)
      chordNotes = chordNotes.filter(note => {
        const noteOctave = parseInt(note.name.replace(/[^0-9]/g, ''), 10)
        return noteOctave === octave
      })
      return {
        id: `keyboard-${chordData.root}-${chordObj.name}-${octave}-${Date.now()}-${Math.random()}`,
        root: chordData.root,
        chord: chordObj,
        displayName,
        notes: chordNotes,
        octave,
      } as AppliedChord
    })
    .filter((c): c is AppliedChord => c !== null)
}

// Type for serialized exercise data from JSON
interface SerializedExerciseData {
  id?: string
  name?: string
  transcript?: string
  bpm?: number
  beats?: number
  chordMode?: 'single' | 'progression'
  lowerOctaves?: number
  higherOctaves?: number
  selectedNoteIds?: string[]
  appliedScales?: SerializedScaleData[]
  appliedChords?: SerializedChordData[]
  type?: 'generator' | 'song'
  songData?: {
    videoId: string
    videoTitle: string
    markerA: number | null
    markerB: number | null
    playbackRate: number
  }
}

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

// Song assignment data structure (stored in selection_data)
interface SongAssignmentData {
  videoId: string
  videoTitle: string
  markerA: number | null // Start time in seconds
  markerB: number | null // End time in seconds
  playbackRate: number // Default playback speed
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
  // Song exercise fields (optional - if present, this is a song exercise)
  type?: 'generator' | 'song'
  songData?: {
    videoId: string
    videoTitle: string
    markerA: number | null
    markerB: number | null
    playbackRate: number
  }
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

// AssignmentCompleteOverlay - backward-compatible alias for extracted component
const AssignmentCompleteOverlay = AssignmentComplete

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
    startTutorial,
  } = useTutorial()

  // Hook to record practice sessions to Supabase
  const recordPracticeSession = useRecordPracticeSession()

  // Translated instrument names
  const instrumentNames = useMemo(
    () => ({
      keyboard: t('instruments.keyboard'),
      guitar: t('instruments.guitar'),
      bass: t('instruments.bass'),
    }),
    [t]
  )

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
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    melodyBpm,
    lowerOctaves,
    higherOctaves,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // Assignment type toggle (practice exercises vs song practice)
  const [assignmentType, setAssignmentType] = useState<'practice' | 'songs'>('practice')

  // Song assignment state
  const [songVideoId, setSongVideoId] = useState<string | null>(null)
  const [songVideoTitle, setSongVideoTitle] = useState('')
  const [songMarkerA, setSongMarkerA] = useState<number | null>(null)
  const [songMarkerB, setSongMarkerB] = useState<number | null>(null)
  const [songPlaybackRate, setSongPlaybackRate] = useState(1)
  const [songSearchQuery, setSongSearchQuery] = useState('')
  const [songSearchResults, setSongSearchResults] = useState<
    Array<{ videoId: string; title: string; author: string; lengthSeconds: number }>
  >([])
  const [isSearchingSongs, setIsSearchingSongs] = useState(false)
  const [songDuration, setSongDuration] = useState(0)
  const [songCurrentTime, setSongCurrentTime] = useState(0)
  const [isSongPlaying, setIsSongPlaying] = useState(false)
  const [songVolume, setSongVolume] = useState(80)
  const [songIsLooping, setSongIsLooping] = useState(false)
  const [songIsABLooping, setSongIsABLooping] = useState(false)
  const [songIsPlayerReady, setSongIsPlayerReady] = useState(false)
  const [ytApiLoaded, setYtApiLoaded] = useState(false)
  const songPlayerRef = useRef<unknown>(null)
  const songTimeUpdateRef = useRef<number | null>(null)

  // Real waveform data hook
  const { peaks: songRealPeaks } = useWaveformData(songVideoId)

  // Multi-exercise state for assignment editor
  const [exercises, setExercises] = useState<ExerciseData[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)
  const [currentExerciseTranscript, setCurrentExerciseTranscript] = useState('')

  // Lesson taking state
  const [currentAssignment, setCurrentAssignment] = useState<AssignmentData | null>(null)
  const [pendingSelectionData, setPendingSelectionData] = useState<{
    instrument: string
    selectionData: SelectionData
  } | null>(null)
  const [lessonExercises, setLessonExercises] = useState<ExerciseData[]>([])
  const [lessonExerciseIndex, setLessonExerciseIndex] = useState(0)
  const [externalSelectedNoteIds, setExternalSelectedNoteIds] = useState<string[]>([])
  const [welcomeSpeechDone, setWelcomeSpeechDone] = useState(false)
  const [genericWelcomeDone, setGenericWelcomeDone] = useState(false)
  const [hasGeneratedMelody, setHasGeneratedMelody] = useState(false)
  const [autoPlayAudio, setAutoPlayAudio] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [melodySetupMessage, setMelodySetupMessage] = useState<string>('')
  const [congratulationsMessage, setCongratulationsMessage] = useState<string>('')
  const [showAssignmentComplete, setShowAssignmentComplete] = useState(false)
  const hasInitializedNotes = useRef(false)
  const hasAnnouncedMelody = useRef(false)
  const hasAutoPlayedSong = useRef(false)

  // Assignment completion tracking
  const recordCompletion = useRecordCompletion()
  const userCompletions = useUserCompletions(user?.id)
  const completedAssignmentIds = useMemo(() => {
    if (!userCompletions.data) return new Set<string>()
    return new Set(userCompletions.data.map(c => c.assignment_id))
  }, [userCompletions.data])
  // viewingCompletionsForAssignment + assignmentCompletions now managed in ClassroomDetail

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
      const data = await fetchClassroomList()
      setClassrooms(data)

      // Check if we need to auto-select a classroom (from export redirect)
      const navigateToId = localStorage.getItem('navigateToClassroomId')
      if (navigateToId) {
        localStorage.removeItem('navigateToClassroomId')
        const classroomToSelect = data.find(c => c.id === navigateToId)
        if (classroomToSelect) {
          setSelectedClassroom(classroomToSelect)
          setViewMode('classroom')
        }
      } else if (selectedClassroom) {
        const updated = data.find(c => c.id === selectedClassroom.id)
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

  // Check for export data from Generator and apply it
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
                selectionData.appliedScales.forEach((scaleData: SerializedScaleData) => {
                  const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
                  if (scaleObj) {
                    scaleChordManagement.handleKeyboardScaleApply(
                      scaleData.root,
                      scaleObj,
                      scaleData.octave || 4
                    )
                  }
                })
              } else if (data.instrument === 'guitar') {
                const scalesToApply: AppliedScale[] = []
                selectionData.appliedScales.forEach((scaleData: SerializedScaleData) => {
                  const fretRangeMatch = scaleData.scaleName.match(/\(Frets (\d+)-(\d+)\)$/)
                  const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                  const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
                  const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
                  const scaleObj = GUITAR_SCALES.find(
                    s => s.name === baseScaleName || s.name === scaleData.scaleName
                  )
                  if (scaleObj) {
                    const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
                    const positions = allPositions.filter(
                      pos => pos.fret >= fretLow && pos.fret <= fretHigh
                    )
                    const scaleNotes = positions.map(pos => {
                      const noteId = `g-s${pos.string}-f${pos.fret}`
                      const guitarNote = getGuitarNoteById(noteId)
                      return {
                        id: noteId,
                        name: pos.note,
                        frequency: guitarNote?.frequency || 0,
                        isBlack: pos.note.includes('#'),
                        position: guitarNote?.position || 0,
                        __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
                      }
                    })
                    const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                    scalesToApply.push({
                      id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                      root: scaleData.root,
                      scale: scaleObj,
                      displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                      notes: scaleNotes,
                    })
                  }
                })
                if (scalesToApply.length > 0) {
                  scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
                }
              } else if (data.instrument === 'bass') {
                const scalesToApply: AppliedScale[] = []
                selectionData.appliedScales.forEach((scaleData: SerializedScaleData) => {
                  const fretRangeMatch = scaleData.scaleName.match(/\(Frets (\d+)-(\d+)\)$/)
                  const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                  const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
                  const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
                  const scaleObj = BASS_SCALES.find(
                    s => s.name === baseScaleName || s.name === scaleData.scaleName
                  )
                  if (scaleObj) {
                    const allPositions = getBassScalePositions(scaleData.root, scaleObj, bassNotes)
                    const positions = allPositions.filter(
                      pos => pos.fret >= fretLow && pos.fret <= fretHigh
                    )
                    const scaleNotes = positions.map(pos => {
                      const noteId = `b-s${pos.string}-f${pos.fret}`
                      const bassNote = getBassNoteById(noteId)
                      return {
                        id: noteId,
                        name: pos.note,
                        frequency: bassNote?.frequency || 0,
                        isBlack: pos.note.includes('#'),
                        position: bassNote?.position || 0,
                        __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
                      }
                    })
                    const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                    scalesToApply.push({
                      id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                      root: scaleData.root,
                      scale: scaleObj as GuitarScale | BassScale | KeyboardScale,
                      displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                      notes: scaleNotes,
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
                selectionData.appliedChords.forEach((chordData: SerializedChordData) => {
                  const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
                  if (chordObj) {
                    scaleChordManagement.handleKeyboardChordApply(
                      chordData.root,
                      chordObj,
                      chordData.octave || 4
                    )
                  }
                })
              } else if (data.instrument === 'guitar') {
                const chordsToApply: AppliedChord[] = []
                selectionData.appliedChords.forEach((chordData: SerializedChordData) => {
                  let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                  baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
                  const chordObj = GUITAR_CHORDS.find(
                    c => c.name === baseChordName || c.name === chordData.chordName
                  )
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
                        const noteKey =
                          fretIndex === 0
                            ? `${stringIndex}-open`
                            : `${stringIndex}-${fretIndex - 1}`
                        noteKeys.push(noteKey)
                        // Find the guitar note for this position
                        const guitarNote = guitarNotes.find(
                          n => n.string === pos.string && n.fret === pos.fret
                        )
                        if (guitarNote) {
                          chordNotes.push({
                            id: `g-s${pos.string}-f${pos.fret}`,
                            name: guitarNote.name,
                            frequency: guitarNote.frequency,
                            isBlack: guitarNote.name.includes('#'),
                            position: stringIndex * 100 + (fretIndex > 0 ? fretIndex - 1 : -1),
                            __guitarCoord: { stringIndex, fretIndex: pos.fret },
                          } as Note)
                        }
                      })
                      chordsToApply.push({
                        id: `guitar-${chordData.root}-${chordObj.name}-${Date.now()}-${Math.random()}`,
                        root: chordData.root,
                        chord: chordObj as GuitarChord | BassChord,
                        displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                        noteKeys: noteKeys,
                        notes: chordNotes,
                        fretZone: boxIndex,
                      })
                    }
                  }
                })
                if (chordsToApply.length > 0) {
                  scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
                }
              } else if (data.instrument === 'bass') {
                const chordsToApply: AppliedChord[] = []
                selectionData.appliedChords.forEach((chordData: SerializedChordData) => {
                  let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                  baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
                  const chordObj = BASS_CHORDS.find(
                    c => c.name === baseChordName || c.name === chordData.chordName
                  )
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
                        const noteKey =
                          fretIndex === 0
                            ? `${stringIndex}-open`
                            : `${stringIndex}-${fretIndex - 1}`
                        noteKeys.push(noteKey)
                        // Find the bass note for this position
                        const bassNote = bassNotes.find(
                          n => n.string === pos.string && n.fret === pos.fret
                        )
                        if (bassNote) {
                          chordNotes.push({
                            id: `b-s${pos.string}-f${pos.fret}`,
                            name: bassNote.name,
                            frequency: bassNote.frequency,
                            isBlack: bassNote.name.includes('#'),
                            position: stringIndex * 100 + (fretIndex > 0 ? fretIndex - 1 : -1),
                            __bassCoord: { stringIndex, fretIndex: pos.fret },
                          } as Note)
                        }
                      })
                      chordsToApply.push({
                        id: `bass-${chordData.root}-${chordObj.name}-${Date.now()}-${Math.random()}`,
                        root: chordData.root,
                        chord: chordObj as GuitarChord | BassChord,
                        displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                        noteKeys: noteKeys,
                        notes: chordNotes,
                        fretZone: boxIndex,
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
            setExercises([
              {
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
                appliedChords: selectionData.appliedChords || [],
              },
            ])
            setCurrentExerciseIndex(0)
          }, 300)
        } else {
          // No selection data - initialize with empty exercise
          const lowerOct = 4 - (data.octaveLow || 4)
          const higherOct = (data.octaveHigh || 5) - 5
          setExercises([
            {
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
              appliedChords: [],
            },
          ])
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
      await deleteClassroomAction(classroomId, user.id)
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
      await updateClassroomAction(selectedClassroom.id, user.id, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
      })
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
      await deleteAssignmentAction(assignmentId, user.id)
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
      await joinClassroomAction(classroomId, user.id)
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
      await leaveClassroomAction(classroomId, user.id)
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
      await removeStudentAction(classroomId, studentId)
      fetchClassrooms()
    } catch (err) {
      console.error('Error removing student:', err)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
    if (containsScriptInjection(newTitle) || containsScriptInjection(newDescription)) {
      setError(t('errors.invalidCharacters'))
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
      await createClassroomAction({
        title: newTitle.trim(),
        description: newDescription.trim() || null,
        created_by: user.id,
        is_public: isPublic,
        join_code: joinCodeValue,
      })
      setNewTitle('')
      setNewDescription('')
      setIsPublic(true)
      setIsModalOpen(false)
      fetchClassrooms()
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : null) || t('errors.generic'))
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

      const result = await findAndJoinByCode(joinCode, user.id)

      if (result.error === 'notFound') {
        setJoinError(t('classroom.invalidCode'))
        return
      }
      if (result.error === 'alreadyMember') {
        setJoinError(t('classroom.alreadyMember'))
        return
      }

      setJoinCode('')
      setIsJoinModalOpen(false)
      fetchClassrooms()
    } catch (err: unknown) {
      setJoinError((err instanceof Error ? err.message : null) || t('errors.generic'))
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
    setExercises([
      {
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
        appliedChords: [],
      },
    ])
    setCurrentExerciseIndex(0)
    setEditingAssignmentId(null)
    // Reset assignment type and song state
    setAssignmentType('practice')
    setSongVideoId(null)
    setSongVideoTitle('')
    setSongMarkerA(null)
    setSongMarkerB(null)
    setSongPlaybackRate(1)
    setSongSearchQuery('')
    setSongSearchResults([])
    setSongDuration(0)
    setSongCurrentTime(0)
    setViewMode('creating-assignment')
  }

  // Edit an existing assignment
  const handleEditAssignment = (assignment: AssignmentData, classroomId: string) => {
    setAssigningToClassroomId(classroomId)
    setEditingAssignmentId(assignment.id)
    setAssignmentTitle(assignment.title)
    clearSelection()
    triggerClearChordsAndScales()

    // Check if this is a song assignment
    if (assignment.lesson_type === 'songs') {
      setAssignmentType('songs')
      const songData = assignment.selection_data as unknown as SongAssignmentData | null
      if (songData) {
        setSongVideoId(songData.videoId)
        setSongVideoTitle(songData.videoTitle)
        // Ensure null instead of undefined for markers
        setSongMarkerA(songData.markerA ?? null)
        setSongMarkerB(songData.markerB ?? null)
        setSongPlaybackRate(songData.playbackRate || 1)
      }
      setViewMode('creating-assignment')
      return
    }

    // Practice assignment - reset song state
    setAssignmentType('practice')
    setSongVideoId(null)
    setSongVideoTitle('')
    setSongMarkerA(null)
    setSongMarkerB(null)
    setSongPlaybackRate(1)

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
      const loadedExercises = selectionData.exercises.map((ex: SerializedExerciseData) => ({
        id: ex.id || `exercise-${Date.now()}-${Math.random()}`,
        name: ex.name || 'Exercise',
        transcript: ex.transcript || '',
        bpm: ex.bpm || assignment.bpm,
        beats: ex.beats || assignment.beats,
        chordMode: ex.chordMode || 'single',
        lowerOctaves: ex.lowerOctaves ?? 4 - octaveLow,
        higherOctaves: ex.higherOctaves ?? octaveHigh - 5,
        selectedNoteIds: ex.selectedNoteIds || [],
        appliedScales: ex.appliedScales || [],
        appliedChords: ex.appliedChords || [],
        // Song exercise fields - ensure markers are properly null if undefined
        type: ex.type,
        songData: ex.songData
          ? {
              ...ex.songData,
              markerA: ex.songData.markerA ?? null,
              markerB: ex.songData.markerB ?? null,
              playbackRate: ex.songData.playbackRate || 1,
            }
          : undefined,
      }))
      setExercises(loadedExercises)
      setCurrentExerciseIndex(0)
      // Set transcript for first exercise
      if (selectionData.exercises[0]?.transcript) {
        setCurrentExerciseTranscript(selectionData.exercises[0].transcript)
      }

      // Check if first exercise is a song exercise
      const firstExercise = loadedExercises[0]
      if (firstExercise?.type === 'song' && firstExercise?.songData) {
        setAssignmentType('songs')
        setSongVideoId(firstExercise.songData.videoId)
        setSongVideoTitle(firstExercise.songData.videoTitle)
        setSongMarkerA(firstExercise.songData.markerA ?? null)
        setSongMarkerB(firstExercise.songData.markerB ?? null)
        setSongPlaybackRate(firstExercise.songData.playbackRate || 1)
        setViewMode('creating-assignment')
        return
      }

      // Apply first exercise's scales and chords after state settles
      const targetInstrument = assignment.instrument as 'keyboard' | 'guitar' | 'bass'

      setTimeout(() => {
        // Apply scales from first exercise
        if (firstExercise.appliedScales?.length > 0) {
          if (targetInstrument === 'keyboard') {
            firstExercise.appliedScales.forEach((scaleData: SerializedScaleData) => {
              const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleKeyboardScaleApply(
                  scaleData.root,
                  scaleObj,
                  scaleData.octave || 4
                )
              }
            })
          } else if (targetInstrument === 'guitar') {
            const scalesToApply: AppliedScale[] = []
            firstExercise.appliedScales.forEach((scaleData: SerializedScaleData) => {
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
              const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
              const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
              const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
              const scaleObj = GUITAR_SCALES.find(
                s => s.name === baseScaleName || s.name === scaleData.scaleName
              )
              if (scaleObj) {
                const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
                const positions = allPositions.filter(
                  pos => pos.fret >= fretLow && pos.fret <= fretHigh
                )
                const scaleNotes = positions.map(pos => {
                  const noteId = `g-s${pos.string}-f${pos.fret}`
                  const guitarNote = getGuitarNoteById(noteId)
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: guitarNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: guitarNote?.position || 0,
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes,
                })
              }
            })
            if (scalesToApply.length > 0) {
              scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
            }
          } else if (targetInstrument === 'bass') {
            const scalesToApply: AppliedScale[] = []
            firstExercise.appliedScales.forEach((scaleData: SerializedScaleData) => {
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
              const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
              const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
              const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
              const scaleObj = BASS_SCALES.find(
                s => s.name === baseScaleName || s.name === scaleData.scaleName
              )
              if (scaleObj) {
                const allPositions = getBassScalePositions(scaleData.root, scaleObj, bassNotes)
                const positions = allPositions.filter(
                  pos => pos.fret >= fretLow && pos.fret <= fretHigh
                )
                const scaleNotes = positions.map(pos => {
                  const noteId = `b-s${pos.string}-f${pos.fret}`
                  const bassNote = getBassNoteById(noteId)
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: bassNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: bassNote?.position || 0,
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj as GuitarScale | BassScale | KeyboardScale,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes,
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
            firstExercise.appliedChords.forEach((chordData: SerializedChordData) => {
              const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleKeyboardChordApply(
                  chordData.root,
                  chordObj,
                  chordData.octave || 4
                )
              }
            })
          } else if (targetInstrument === 'guitar') {
            const chordsToApply: AppliedChord[] = []
            firstExercise.appliedChords.forEach((chordData: SerializedChordData) => {
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
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
                  }
                })
                chordsToApply.push({
                  id: `guitar-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                  root: chordData.root,
                  chord: { name: chordData.chordName, intervals: [] },
                  displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                  notes: chordNotes,
                })
              }
            })
            if (chordsToApply.length > 0) {
              scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
            }
          } else if (targetInstrument === 'bass') {
            const chordsToApply: AppliedChord[] = []
            firstExercise.appliedChords.forEach((chordData: SerializedChordData) => {
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
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
                  }
                })
                chordsToApply.push({
                  id: `bass-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                  root: chordData.root,
                  chord: { name: chordData.chordName, intervals: [] },
                  displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                  notes: chordNotes,
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
            const validNoteIds = firstExercise.selectedNoteIds.filter(
              (id: string | null) => id !== null
            ) as string[]
            if (validNoteIds.length > 0) {
              // Also set external IDs as fallback
              setExternalSelectedNoteIds(validNoteIds)
              // Try to call handlers directly after a short delay for component to mount
              setTimeout(() => {
                if (
                  targetInstrument === 'guitar' &&
                  scaleChordManagement.noteHandlers?.handleSetManualNotes
                ) {
                  scaleChordManagement.noteHandlers.handleSetManualNotes(validNoteIds)
                } else if (
                  targetInstrument === 'bass' &&
                  scaleChordManagement.bassNoteHandlers?.handleSetManualNotes
                ) {
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
        appliedChords: selectionData?.appliedChords || [],
      }
      setExercises([legacyExercise])
      setCurrentExerciseIndex(0)

      // Apply legacy exercise's scales and chords after state settles
      const targetInstrument = assignment.instrument as 'keyboard' | 'guitar' | 'bass'

      setTimeout(() => {
        // Apply scales from legacy exercise
        if (legacyExercise.appliedScales?.length > 0) {
          if (targetInstrument === 'keyboard') {
            legacyExercise.appliedScales.forEach((scaleData: SerializedScaleData) => {
              const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleKeyboardScaleApply(
                  scaleData.root,
                  scaleObj,
                  scaleData.octave || 4
                )
              }
            })
          } else if (targetInstrument === 'guitar') {
            const scalesToApply: AppliedScale[] = []
            legacyExercise.appliedScales.forEach((scaleData: SerializedScaleData) => {
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
              const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
              const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
              const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
              const scaleObj = GUITAR_SCALES.find(
                s => s.name === baseScaleName || s.name === scaleData.scaleName
              )
              if (scaleObj) {
                const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
                const positions = allPositions.filter(
                  pos => pos.fret >= fretLow && pos.fret <= fretHigh
                )
                const scaleNotes = positions.map(pos => {
                  const noteId = `g-s${pos.string}-f${pos.fret}`
                  const guitarNote = getGuitarNoteById(noteId)
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: guitarNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: guitarNote?.position || 0,
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes,
                })
              }
            })
            if (scalesToApply.length > 0) {
              scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
            }
          } else if (targetInstrument === 'bass') {
            const scalesToApply: AppliedScale[] = []
            legacyExercise.appliedScales.forEach((scaleData: SerializedScaleData) => {
              const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
              const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
              const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
              const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
              const scaleObj = BASS_SCALES.find(
                s => s.name === baseScaleName || s.name === scaleData.scaleName
              )
              if (scaleObj) {
                const allPositions = getBassScalePositions(scaleData.root, scaleObj, bassNotes)
                const positions = allPositions.filter(
                  pos => pos.fret >= fretLow && pos.fret <= fretHigh
                )
                const scaleNotes = positions.map(pos => {
                  const noteId = `b-s${pos.string}-f${pos.fret}`
                  const bassNote = getBassNoteById(noteId)
                  return {
                    id: noteId,
                    name: pos.note,
                    frequency: bassNote?.frequency || 0,
                    isBlack: pos.note.includes('#'),
                    position: bassNote?.position || 0,
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
                  }
                })
                const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                scalesToApply.push({
                  id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                  root: scaleData.root,
                  scale: scaleObj as GuitarScale | BassScale | KeyboardScale,
                  displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                  notes: scaleNotes,
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
            legacyExercise.appliedChords.forEach((chordData: SerializedChordData) => {
              const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleKeyboardChordApply(
                  chordData.root,
                  chordObj,
                  chordData.octave || 4
                )
              }
            })
          } else if (targetInstrument === 'guitar') {
            const chordsToApply: AppliedChord[] = []
            legacyExercise.appliedChords.forEach((chordData: SerializedChordData) => {
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
                    __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
                  }
                })
                chordsToApply.push({
                  id: `guitar-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                  root: chordData.root,
                  chord: { name: chordData.chordName, intervals: [] },
                  displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                  notes: chordNotes,
                })
              }
            })
            if (chordsToApply.length > 0) {
              scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
            }
          } else if (targetInstrument === 'bass') {
            const chordsToApply: AppliedChord[] = []
            legacyExercise.appliedChords.forEach((chordData: SerializedChordData) => {
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
                    __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
                  }
                })
                chordsToApply.push({
                  id: `bass-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                  root: chordData.root,
                  chord: { name: chordData.chordName, intervals: [] },
                  displayName: chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                  notes: chordNotes,
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
            const validNoteIds = legacyExercise.selectedNoteIds.filter(
              (id: string | null) => id !== null
            ) as string[]
            if (validNoteIds.length > 0) {
              // Also set external IDs as fallback
              setExternalSelectedNoteIds(validNoteIds)
              // Try to call handlers directly after a short delay for component to mount
              setTimeout(() => {
                if (
                  targetInstrument === 'guitar' &&
                  scaleChordManagement.noteHandlers?.handleSetManualNotes
                ) {
                  scaleChordManagement.noteHandlers.handleSetManualNotes(validNoteIds)
                } else if (
                  targetInstrument === 'bass' &&
                  scaleChordManagement.bassNoteHandlers?.handleSetManualNotes
                ) {
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
        displayName: s.displayName,
      })),
      appliedChords: scaleChordManagement.appliedChords.map(c => ({
        root: c.root,
        chordName: c.chord?.name || 'Major',
        octave: c.octave,
        fretZone: c.fretZone,
        displayName: c.displayName,
      })),
    }
  }, [
    selectedNotes,
    scaleChordManagement.appliedScales,
    scaleChordManagement.appliedChords,
    bpm,
    numberOfBeats,
    chordMode,
    lowerOctaves,
    higherOctaves,
  ])

  // Add a new exercise (saves current state first) - max 10 exercises
  const handleAddExercise = useCallback(() => {
    if (exercises.length >= 10) return // Max 10 exercises

    const currentData = saveCurrentToExercise()

    // Update current exercise with latest data - merge intelligently
    setExercises(prev => {
      const updated = [...prev]
      if (updated.length > 0) {
        const existingExercise = updated[currentExerciseIndex]

        // Check if current exercise is in song mode with a video selected
        if (assignmentType === 'songs' && songVideoId) {
          // Save as song exercise
          updated[currentExerciseIndex] = {
            ...existingExercise,
            transcript: currentExerciseTranscript,
            bpm: currentData.bpm,
            beats: currentData.beats,
            chordMode: currentData.chordMode,
            lowerOctaves: currentData.lowerOctaves,
            higherOctaves: currentData.higherOctaves,
            selectedNoteIds: [],
            appliedScales: [],
            appliedChords: [],
            type: 'song',
            songData: {
              videoId: songVideoId,
              videoTitle: songVideoTitle,
              markerA: songMarkerA,
              markerB: songMarkerB,
              playbackRate: songPlaybackRate,
            },
          }
        } else {
          // Save as Generator exercise
          updated[currentExerciseIndex] = {
            ...existingExercise,
            transcript: currentExerciseTranscript,
            bpm: currentData.bpm,
            beats: currentData.beats,
            chordMode: currentData.chordMode,
            lowerOctaves: currentData.lowerOctaves,
            higherOctaves: currentData.higherOctaves,
            selectedNoteIds:
              currentData.selectedNoteIds.length > 0
                ? currentData.selectedNoteIds
                : existingExercise.selectedNoteIds,
            appliedScales:
              currentData.appliedScales.length > 0
                ? currentData.appliedScales
                : existingExercise.appliedScales,
            appliedChords:
              currentData.appliedChords.length > 0
                ? currentData.appliedChords
                : existingExercise.appliedChords,
            type: undefined,
            songData: undefined,
          }
        }
      }

      // Add new exercise (always starts as Generator)
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
        appliedChords: [],
      }
      return [...updated, newExercise]
    })

    // Clear notes for new exercise
    clearSelection()
    triggerClearChordsAndScales()
    setCurrentExerciseTranscript('')

    // Reset to Generator mode and clear song state for new exercise
    setAssignmentType('practice')
    setSongVideoId(null)
    setSongVideoTitle('')
    setSongMarkerA(null)
    setSongMarkerB(null)
    setSongPlaybackRate(1)
    setSongIsPlayerReady(false)
    setIsSongPlaying(false)
    setSongSearchQuery('')
    setSongSearchResults([])

    // Switch to new exercise
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    setCurrentExerciseIndex(prev => (exercises.length > 0 ? exercises.length : 0))
  }, [
    saveCurrentToExercise,
    currentExerciseIndex,
    exercises.length,
    clearSelection,
    triggerClearChordsAndScales,
    bpm,
    numberOfBeats,
    chordMode,
    lowerOctaves,
    higherOctaves,
    currentExerciseTranscript,
    assignmentType,
    songVideoId,
    songVideoTitle,
    songMarkerA,
    songMarkerB,
    songPlaybackRate,
  ])

  // Switch to a different exercise
  const handleSwitchExercise = useCallback(
    (index: number) => {
      if (index === currentExerciseIndex || index < 0 || index >= exercises.length) return

      // Save current state before switching - handle song vs Generator exercises
      const currentData = saveCurrentToExercise()

      // Build updated exercises array synchronously so we can read target exercise from it
      const updatedExercises = [...exercises]
      const existingExercise = updatedExercises[currentExerciseIndex]

      // Check if current exercise is in song mode with a video selected
      if (assignmentType === 'songs' && songVideoId) {
        // Save as song exercise
        updatedExercises[currentExerciseIndex] = {
          ...existingExercise,
          transcript: currentExerciseTranscript,
          bpm: currentData.bpm,
          beats: currentData.beats,
          chordMode: currentData.chordMode,
          lowerOctaves: currentData.lowerOctaves,
          higherOctaves: currentData.higherOctaves,
          selectedNoteIds: [],
          appliedScales: [],
          appliedChords: [],
          type: 'song',
          songData: {
            videoId: songVideoId,
            videoTitle: songVideoTitle,
            markerA: songMarkerA,
            markerB: songMarkerB,
            playbackRate: songPlaybackRate,
          },
        }
      } else {
        // Save as Generator exercise
        updatedExercises[currentExerciseIndex] = {
          ...existingExercise,
          transcript: currentExerciseTranscript,
          bpm: currentData.bpm,
          beats: currentData.beats,
          chordMode: currentData.chordMode,
          lowerOctaves: currentData.lowerOctaves,
          higherOctaves: currentData.higherOctaves,
          selectedNoteIds:
            currentData.selectedNoteIds.length > 0
              ? currentData.selectedNoteIds
              : existingExercise.selectedNoteIds,
          appliedScales:
            currentData.appliedScales.length > 0
              ? currentData.appliedScales
              : existingExercise.appliedScales,
          appliedChords:
            currentData.appliedChords.length > 0
              ? currentData.appliedChords
              : existingExercise.appliedChords,
          type: undefined,
          songData: undefined,
        }
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
        // Handle song vs Generator exercise type switching
        if (targetExercise.type === 'song' && targetExercise.songData) {
          // Switching TO a song exercise - load song data
          setAssignmentType('songs')
          setSongVideoId(targetExercise.songData.videoId)
          setSongVideoTitle(targetExercise.songData.videoTitle)
          // Ensure null instead of undefined for markers
          setSongMarkerA(targetExercise.songData.markerA ?? null)
          setSongMarkerB(targetExercise.songData.markerB ?? null)
          setSongPlaybackRate(targetExercise.songData.playbackRate || 1)
          setSongIsPlayerReady(false)
          setIsSongPlaying(false)
          // Clear Generator state since we're on a song exercise
          clearSelection()
          scaleChordManagement.setAppliedScalesDirectly([])
          scaleChordManagement.setAppliedChordsDirectly([])
          setExternalSelectedNoteIds([])
          setCurrentExerciseTranscript(targetExercise.transcript || '')
          setCurrentExerciseIndex(index)
          return // Exit early - song exercises don't need scale/chord/note loading
        } else {
          // Switching TO a Generator exercise - clear song state
          setSongVideoId(null)
          setSongVideoTitle('')
          setSongMarkerA(null)
          setSongMarkerB(null)
          setSongPlaybackRate(1)
          setSongIsPlayerReady(false)
          setIsSongPlaying(false)
          setSongSearchQuery('')
          setSongSearchResults([])
          setAssignmentType('practice')
        }

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
              targetExercise.appliedScales.forEach(scaleData => {
                const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
                if (scaleObj) {
                  scaleChordManagement.handleKeyboardScaleApply(
                    scaleData.root,
                    scaleObj,
                    scaleData.octave || 4
                  )
                }
              })
            } else if (targetInstrument === 'guitar') {
              const scalesToApply: AppliedScale[] = []
              targetExercise.appliedScales.forEach(scaleData => {
                // Extract fret range from displayName (e.g., "C Major (Frets 0-12)")
                const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
                const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
                const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
                const scaleObj = GUITAR_SCALES.find(
                  s => s.name === baseScaleName || s.name === scaleData.scaleName
                )
                if (scaleObj) {
                  const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
                  const positions = allPositions.filter(
                    pos => pos.fret >= fretLow && pos.fret <= fretHigh
                  )
                  const scaleNotes = positions.map(pos => {
                    const noteId = `g-s${pos.string}-f${pos.fret}`
                    const guitarNote = getGuitarNoteById(noteId)
                    return {
                      id: noteId,
                      name: pos.note,
                      frequency: guitarNote?.frequency || 0,
                      isBlack: pos.note.includes('#'),
                      position: guitarNote?.position || 0,
                      __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
                    }
                  })
                  const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                  scalesToApply.push({
                    id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                    root: scaleData.root,
                    scale: scaleObj,
                    displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                    notes: scaleNotes,
                  })
                }
              })
              if (scalesToApply.length > 0) {
                scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
              }
            } else if (targetInstrument === 'bass') {
              const scalesToApply: AppliedScale[] = []
              targetExercise.appliedScales.forEach(scaleData => {
                // Extract fret range from displayName (e.g., "C Major (Frets 0-12)")
                const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
                const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
                const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
                const scaleObj = BASS_SCALES.find(
                  s => s.name === baseScaleName || s.name === scaleData.scaleName
                )
                if (scaleObj) {
                  const allPositions = getBassScalePositions(scaleData.root, scaleObj, bassNotes)
                  const positions = allPositions.filter(
                    pos => pos.fret >= fretLow && pos.fret <= fretHigh
                  )
                  const scaleNotes = positions.map(pos => {
                    const noteId = `b-s${pos.string}-f${pos.fret}`
                    const bassNote = getBassNoteById(noteId)
                    return {
                      id: noteId,
                      name: pos.note,
                      frequency: bassNote?.frequency || 0,
                      isBlack: pos.note.includes('#'),
                      position: bassNote?.position || 0,
                      __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
                    }
                  })
                  const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                  scalesToApply.push({
                    id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                    root: scaleData.root,
                    scale: scaleObj as GuitarScale | BassScale | KeyboardScale,
                    displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                    notes: scaleNotes,
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
              targetExercise.appliedChords.forEach(chordData => {
                const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
                if (chordObj) {
                  scaleChordManagement.handleKeyboardChordApply(
                    chordData.root,
                    chordObj,
                    chordData.octave || 4
                  )
                }
              })
            } else if (targetInstrument === 'guitar') {
              const chordsToApply: AppliedChord[] = []
              targetExercise.appliedChords.forEach(chordData => {
                let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
                const chordObj = GUITAR_CHORDS.find(
                  c => c.name === baseChordName || c.name === chordData.chordName
                )
                if (chordObj) {
                  const chordBoxes = getChordBoxes(chordData.root, chordObj, guitarNotes)
                  if (chordBoxes.length > 0) {
                    const boxIndex = Math.min(chordData.fretZone || 0, chordBoxes.length - 1)
                    const chordBox = chordBoxes[boxIndex]
                    const noteKeys = chordBox.positions.map(pos => {
                      const stringIndex = 6 - pos.string
                      const fretIndex = pos.fret
                      return fretIndex === 0
                        ? `${stringIndex}-open`
                        : `${stringIndex}-${fretIndex - 1}`
                    })
                    chordsToApply.push({
                      id: `guitar-${chordData.root}-${chordObj.name}-${Date.now()}-${Math.random()}`,
                      root: chordData.root,
                      chord: chordObj as GuitarChord | BassChord,
                      displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                      noteKeys: noteKeys,
                      fretZone: boxIndex,
                    })
                  }
                }
              })
              if (chordsToApply.length > 0) {
                scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
              }
            } else if (targetInstrument === 'bass') {
              const chordsToApply: AppliedChord[] = []
              targetExercise.appliedChords.forEach(chordData => {
                let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
                const chordObj = BASS_CHORDS.find(
                  c => c.name === baseChordName || c.name === chordData.chordName
                )
                if (chordObj) {
                  const chordBoxes = getBassChordBoxes(chordData.root, chordObj, bassNotes)
                  if (chordBoxes.length > 0) {
                    const boxIndex = Math.min(chordData.fretZone || 0, chordBoxes.length - 1)
                    const chordBox = chordBoxes[boxIndex]
                    const noteKeys = chordBox.positions.map(pos => {
                      const stringIndex = 4 - pos.string
                      const fretIndex = pos.fret
                      return fretIndex === 0
                        ? `${stringIndex}-open`
                        : `${stringIndex}-${fretIndex - 1}`
                    })
                    chordsToApply.push({
                      id: `bass-${chordData.root}-${chordObj.name}-${Date.now()}-${Math.random()}`,
                      root: chordData.root,
                      chord: chordObj as GuitarChord | BassChord,
                      displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                      noteKeys: noteKeys,
                      fretZone: boxIndex,
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
              targetExercise.selectedNoteIds.forEach(noteId => {
                const noteObj = getKeyboardNoteById(noteId, targetLower, targetHigher)
                if (noteObj) selectNote(noteObj, 'multi')
              })
            } else {
              // Guitar/Bass - use direct handler call like keyboard does
              const validNoteIds = targetExercise.selectedNoteIds.filter(
                (id: string | null) => id !== null
              ) as string[]
              if (validNoteIds.length > 0) {
                // Also set external IDs as fallback
                setExternalSelectedNoteIds(validNoteIds)
                // Try to call handlers directly after a short delay for component to mount
                setTimeout(() => {
                  if (
                    targetInstrument === 'guitar' &&
                    scaleChordManagement.noteHandlers?.handleSetManualNotes
                  ) {
                    scaleChordManagement.noteHandlers.handleSetManualNotes(validNoteIds)
                  } else if (
                    targetInstrument === 'bass' &&
                    scaleChordManagement.bassNoteHandlers?.handleSetManualNotes
                  ) {
                    scaleChordManagement.bassNoteHandlers.handleSetManualNotes(validNoteIds)
                  }
                }, 50)
              }
            }
          }
        }, 0)
      }

      setCurrentExerciseIndex(index)
    },
    [
      currentExerciseIndex,
      exercises,
      saveCurrentToExercise,
      clearSelection,
      scaleChordManagement,
      instrument,
      setChordMode,
      selectNote,
      handleOctaveRangeChange,
      currentExerciseTranscript,
      assignmentType,
      songVideoId,
      songVideoTitle,
      songMarkerA,
      songMarkerB,
      songPlaybackRate,
    ]
  )

  // Remove an exercise
  const handleRemoveExercise = useCallback(
    (indexToRemove: number) => {
      if (exercises.length <= 1) return // Keep at least one exercise

      // Filter out the exercise to remove and rename
      const updatedExercises = exercises
        .filter((_, i) => i !== indexToRemove)
        .map((exercise, i) => ({
          ...exercise,
          name: `Exercise ${i + 1}`,
        }))

      setExercises(updatedExercises)

      // Calculate new current index - stay at same position or go to previous if at end
      const newLength = updatedExercises.length
      const newCurrentIndex =
        indexToRemove >= newLength ? Math.max(0, newLength - 1) : indexToRemove
      setCurrentExerciseIndex(newCurrentIndex)

      // Get the exercise we're switching to
      const targetExercise = updatedExercises[newCurrentIndex]
      const targetInstrument = instrument

      // Clear current state
      clearSelection()
      scaleChordManagement.setAppliedScalesDirectly([])
      scaleChordManagement.setAppliedChordsDirectly([])
      setExternalSelectedNoteIds([])

      if (targetExercise) {
        // Handle song vs Generator exercise
        if (targetExercise.type === 'song' && targetExercise.songData) {
          // Switching TO a song exercise - load song data
          setAssignmentType('songs')
          setSongVideoId(targetExercise.songData.videoId)
          setSongVideoTitle(targetExercise.songData.videoTitle)
          setSongMarkerA(targetExercise.songData.markerA ?? null)
          setSongMarkerB(targetExercise.songData.markerB ?? null)
          setSongPlaybackRate(targetExercise.songData.playbackRate || 1)
          setSongIsPlayerReady(false)
          setIsSongPlaying(false)
          setCurrentExerciseTranscript(targetExercise.transcript || '')
          return // Exit early - song exercises don't need scale/chord/note loading
        } else {
          // Switching TO a Generator exercise - clear song state
          setSongVideoId(null)
          setSongVideoTitle('')
          setSongMarkerA(null)
          setSongMarkerB(null)
          setSongPlaybackRate(1)
          setSongIsPlayerReady(false)
          setIsSongPlaying(false)
          setAssignmentType('practice')
        }

        // Apply Generator exercise settings
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
              targetExercise.appliedScales.forEach((scaleData: SerializedScaleData) => {
                const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
                if (scaleObj) {
                  scaleChordManagement.handleKeyboardScaleApply(
                    scaleData.root,
                    scaleObj,
                    scaleData.octave || 4
                  )
                }
              })
            } else if (targetInstrument === 'guitar') {
              const scalesToApply: AppliedScale[] = []
              targetExercise.appliedScales.forEach((scaleData: SerializedScaleData) => {
                const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
                const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
                const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
                const scaleObj = GUITAR_SCALES.find(
                  s => s.name === baseScaleName || s.name === scaleData.scaleName
                )
                if (scaleObj) {
                  const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
                  const positions = allPositions.filter(
                    pos => pos.fret >= fretLow && pos.fret <= fretHigh
                  )
                  const scaleNotes = positions.map(pos => {
                    const noteId = `g-s${pos.string}-f${pos.fret}`
                    const guitarNote = getGuitarNoteById(noteId)
                    return {
                      id: noteId,
                      name: pos.note,
                      frequency: guitarNote?.frequency || 0,
                      isBlack: pos.note.includes('#'),
                      position: guitarNote?.position || 0,
                      __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
                    }
                  })
                  const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                  scalesToApply.push({
                    id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                    root: scaleData.root,
                    scale: scaleObj,
                    displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                    notes: scaleNotes,
                  })
                }
              })
              if (scalesToApply.length > 0) {
                scaleChordManagement.setAppliedScalesDirectly(scalesToApply)
              }
            } else if (targetInstrument === 'bass') {
              const scalesToApply: AppliedScale[] = []
              targetExercise.appliedScales.forEach((scaleData: SerializedScaleData) => {
                const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
                const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
                const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
                const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
                const scaleObj = BASS_SCALES.find(
                  s => s.name === baseScaleName || s.name === scaleData.scaleName
                )
                if (scaleObj) {
                  const allPositions = getBassScalePositions(scaleData.root, scaleObj, bassNotes)
                  const positions = allPositions.filter(
                    pos => pos.fret >= fretLow && pos.fret <= fretHigh
                  )
                  const scaleNotes = positions.map(pos => {
                    const noteId = `b-s${pos.string}-f${pos.fret}`
                    const bassNote = getBassNoteById(noteId)
                    return {
                      id: noteId,
                      name: pos.note,
                      frequency: bassNote?.frequency || 0,
                      isBlack: pos.note.includes('#'),
                      position: bassNote?.position || 0,
                      __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
                    }
                  })
                  const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
                  scalesToApply.push({
                    id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                    root: scaleData.root,
                    scale: scaleObj as GuitarScale | BassScale | KeyboardScale,
                    displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                    notes: scaleNotes,
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
              targetExercise.appliedChords.forEach((chordData: SerializedChordData) => {
                const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
                if (chordObj) {
                  scaleChordManagement.handleKeyboardChordApply(
                    chordData.root,
                    chordObj,
                    chordData.octave || 4
                  )
                }
              })
            } else if (targetInstrument === 'guitar') {
              const chordsToApply: AppliedChord[] = []
              targetExercise.appliedChords.forEach((chordData: SerializedChordData) => {
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
                      __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
                    }
                  })
                  chordsToApply.push({
                    id: `guitar-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                    root: chordData.root,
                    chord: { name: chordData.chordName, intervals: [] },
                    displayName:
                      chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                    notes: chordNotes,
                  })
                }
              })
              if (chordsToApply.length > 0) {
                scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
              }
            } else if (targetInstrument === 'bass') {
              const chordsToApply: AppliedChord[] = []
              targetExercise.appliedChords.forEach((chordData: SerializedChordData) => {
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
                      __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
                    }
                  })
                  chordsToApply.push({
                    id: `bass-${chordData.root}-${chordData.chordName}-${chordData.fretZone ?? 0}-${Date.now()}`,
                    root: chordData.root,
                    chord: { name: chordData.chordName, intervals: [] },
                    displayName:
                      chordData.displayName || `${chordData.root} ${chordData.chordName}`,
                    notes: chordNotes,
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
              const validNoteIds = targetExercise.selectedNoteIds.filter(
                (id: string | null) => id !== null
              ) as string[]
              if (validNoteIds.length > 0) {
                setExternalSelectedNoteIds(validNoteIds)
                setTimeout(() => {
                  if (
                    targetInstrument === 'guitar' &&
                    scaleChordManagement.noteHandlers?.handleSetManualNotes
                  ) {
                    scaleChordManagement.noteHandlers.handleSetManualNotes(validNoteIds)
                  } else if (
                    targetInstrument === 'bass' &&
                    scaleChordManagement.bassNoteHandlers?.handleSetManualNotes
                  ) {
                    scaleChordManagement.bassNoteHandlers.handleSetManualNotes(validNoteIds)
                  }
                }, 50)
              }
            }
          }
        }, 50)
      }
    },
    [
      exercises,
      clearSelection,
      scaleChordManagement,
      instrument,
      setChordMode,
      selectNote,
      handleOctaveRangeChange,
    ]
  )

  // Open assignment title modal
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // Song search for song assignments
  const PIPED_PROXIES = import.meta.env.PROD
    ? [apiUrl('/api/piped')]
    : ['/api/piped1', '/api/piped2', '/api/piped3', '/api/piped4']

  const handleSongSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSongSearchResults([])
      return
    }

    setIsSearchingSongs(true)
    const IS_PRODUCTION = import.meta.env.PROD

    for (const proxy of PIPED_PROXIES) {
      try {
        const url = IS_PRODUCTION
          ? `${proxy}?q=${encodeURIComponent(query)}&filter=videos`
          : `${proxy}/search?q=${encodeURIComponent(query)}&filter=videos`

        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 15000)

        const response = await fetch(url, {
          signal: controller.signal,
          credentials: 'omit',
          headers: { Accept: 'application/json' },
        })

        clearTimeout(timeoutId)

        if (!response.ok) continue

        const contentType = response.headers.get('content-type')
        if (!contentType || !contentType.includes('application/json')) continue

        const data = await response.json()
        const items = data.items || data
        const results = items
          .filter((item: { url?: string }) => item.url?.includes('/watch?v='))
          .slice(0, 10)
          .map(
            (item: { url: string; title?: string; uploaderName?: string; duration?: number }) => {
              const videoIdMatch = item.url.match(/[?&]v=([a-zA-Z0-9_-]{11})/)
              return {
                videoId: videoIdMatch ? videoIdMatch[1] : '',
                title: item.title || 'Unknown',
                author: item.uploaderName || 'Unknown',
                lengthSeconds: item.duration || 0,
              }
            }
          )
          .filter((item: { videoId: string }) => item.videoId)

        setSongSearchResults(results)
        setIsSearchingSongs(false)
        return
      } catch (err) {
        console.warn(`Piped proxy ${proxy} failed:`, err)
      }
    }

    setSongSearchResults([])
    setIsSearchingSongs(false)
  }, [])

  // Select a song from search results
  const handleSelectSong = useCallback(
    (result: { videoId: string; title: string; lengthSeconds?: number }) => {
      setSongVideoId(result.videoId)
      setSongVideoTitle(result.title)
      setSongSearchResults([])
      setSongSearchQuery('')
      setSongMarkerA(null)
      setSongMarkerB(null)
      setSongDuration(result.lengthSeconds || 0)
      setSongCurrentTime(0)
      setSongIsPlayerReady(false)
      setSongIsABLooping(false)
      // Generate waveform based on video ID
    },
    []
  )

  // Clear selected song
  const handleClearSong = useCallback(() => {
    // Stop time updates
    if (songTimeUpdateRef.current) {
      cancelAnimationFrame(songTimeUpdateRef.current)
      songTimeUpdateRef.current = null
    }
    // Destroy player
    if (songPlayerRef.current) {
      songPlayerRef.current.destroy()
      songPlayerRef.current = null
    }
    setSongVideoId(null)
    setSongVideoTitle('')
    setSongMarkerA(null)
    setSongMarkerB(null)
    setSongDuration(0)
    setSongCurrentTime(0)
    setSongIsPlayerReady(false)
    setIsSongPlaying(false)
    setSongIsABLooping(false)
  }, [])

  // Song player controls
  const toggleSongPlayPause = useCallback(() => {
    if (!songPlayerRef.current || !songIsPlayerReady) return
    if (isSongPlaying) {
      songPlayerRef.current.pauseVideo()
    } else {
      // If A-B looping is enabled and we're before marker A, seek to A first
      if (songIsABLooping && songMarkerA !== null) {
        const currentTime = songPlayerRef.current.getCurrentTime()
        if (currentTime < songMarkerA) {
          songPlayerRef.current.seekTo(songMarkerA, true)
        }
      }
      songPlayerRef.current.playVideo()
    }
  }, [isSongPlaying, songIsPlayerReady, songIsABLooping, songMarkerA])

  const handleSongSeek = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const time = parseFloat(e.target.value)
      setSongCurrentTime(time)
      if (songPlayerRef.current && songIsPlayerReady) {
        songPlayerRef.current.seekTo(time, true)
      }
    },
    [songIsPlayerReady]
  )

  const handleSongSkip = useCallback(
    (seconds: number) => {
      if (!songPlayerRef.current || !songIsPlayerReady) return
      const target = Math.max(0, Math.min(songDuration, songCurrentTime + seconds))
      setSongCurrentTime(target)
      songPlayerRef.current.seekTo(target, true)
    },
    [songIsPlayerReady, songDuration, songCurrentTime]
  )

  const handleSongVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const vol = parseInt(e.target.value)
      setSongVolume(vol)
      if (songPlayerRef.current && songIsPlayerReady) {
        songPlayerRef.current.setVolume(vol)
      }
    },
    [songIsPlayerReady]
  )

  const setMarkerAAtCurrent = useCallback(() => {
    const t = songCurrentTime
    if (songMarkerB !== null && t >= songMarkerB) {
      setSongMarkerA(songMarkerB)
      setSongMarkerB(t)
    } else {
      setSongMarkerA(t)
    }
  }, [songCurrentTime, songMarkerB])

  const setMarkerBAtCurrent = useCallback(() => {
    const t = songCurrentTime
    if (songMarkerA !== null && t <= songMarkerA) {
      setSongMarkerB(songMarkerA)
      setSongMarkerA(t)
    } else {
      setSongMarkerB(t)
      if (songMarkerA !== null) setSongIsABLooping(true)
    }
  }, [songCurrentTime, songMarkerA])

  const clearSongMarkers = useCallback(() => {
    setSongMarkerA(null)
    setSongMarkerB(null)
    setSongIsABLooping(false)
  }, [])

  const toggleSongABLoop = useCallback(() => {
    if (songMarkerA !== null && songMarkerB !== null) {
      setSongIsABLooping(!songIsABLooping)
    }
  }, [songMarkerA, songMarkerB, songIsABLooping])

  // Keyboard shortcuts: Space=play/pause, Arrows=skip, L=loop, A/B=markers
  useEffect(() => {
    if (!songVideoId) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          toggleSongPlayPause()
          break
        case 'ArrowLeft':
          e.preventDefault()
          handleSongSkip(-10)
          break
        case 'ArrowRight':
          e.preventDefault()
          handleSongSkip(10)
          break
        case 'l':
        case 'L':
          setSongIsLooping(prev => !prev)
          break
        case 'a':
        case 'A':
          setMarkerAAtCurrent()
          break
        case 'b':
        case 'B':
          setMarkerBAtCurrent()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    songVideoId,
    toggleSongPlayPause,
    handleSongSkip,
    setMarkerAAtCurrent,
    setMarkerBAtCurrent,
    songMarkerA,
  ])

  // Apply song to current exercise in timeline
  const applySongToExercise = useCallback(
    (useLoop: boolean) => {
      if (!songVideoId) return

      const songExerciseData: ExerciseData = {
        id: exercises[currentExerciseIndex]?.id || `exercise-${Date.now()}`,
        name: exercises[currentExerciseIndex]?.name || `Exercise ${currentExerciseIndex + 1}`,
        transcript: currentExerciseTranscript,
        bpm: bpm,
        beats: numberOfBeats,
        chordMode: 'single',
        lowerOctaves: 0,
        higherOctaves: 0,
        selectedNoteIds: [],
        appliedScales: [],
        appliedChords: [],
        type: 'song',
        songData: {
          videoId: songVideoId,
          videoTitle: songVideoTitle,
          markerA: useLoop ? songMarkerA : null,
          markerB: useLoop ? songMarkerB : null,
          playbackRate: songPlaybackRate,
        },
      }

      // Update the exercises array
      setExercises(prev => {
        const updated = [...prev]
        updated[currentExerciseIndex] = songExerciseData
        return updated
      })

      // Don't clear song UI or switch modes - just mark as applied
      // User stays in song mode with the song still visible
    },
    [
      songVideoId,
      songVideoTitle,
      songMarkerA,
      songMarkerB,
      songPlaybackRate,
      exercises,
      currentExerciseIndex,
      currentExerciseTranscript,
      bpm,
      numberOfBeats,
    ]
  )

  // Get volume icon
  const SongVolumeIcon =
    songVolume === 0 ? PiSpeakerNone : songVolume < 50 ? PiSpeakerLow : PiSpeakerHigh

  // Song player container ref
  const songPlayerContainerRef = useRef<HTMLDivElement>(null)

  // Load YouTube IFrame API
  useEffect(() => {
    if (window.YT && window.YT.Player) {
      setYtApiLoaded(true)
      return
    }

    // Check if script is already being loaded
    const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]')
    if (!existingScript) {
      const tag = document.createElement('script')
      tag.src = 'https://www.youtube.com/iframe_api'
      const firstScriptTag = document.getElementsByTagName('script')[0]
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag)
    }

    // Set up callback for when API is ready
    const existingCallback = window.onYouTubeIframeAPIReady
    window.onYouTubeIframeAPIReady = () => {
      if (existingCallback) existingCallback()
      setYtApiLoaded(true)
    }

    return () => {
      // Don't clear the callback as other components might need it
    }
  }, [])

  // Initialize YouTube player when song is selected and API is loaded
  useEffect(() => {
    if (!songVideoId || !songPlayerContainerRef.current || !ytApiLoaded) return
    if (!window.YT || !window.YT.Player) return

    // Destroy existing player
    if (songPlayerRef.current) {
      songPlayerRef.current.destroy()
      songPlayerRef.current = null
    }

    const containerId = 'classroom-yt-player-' + Date.now()
    const playerDiv = document.createElement('div')
    playerDiv.id = containerId
    songPlayerContainerRef.current.textContent = ''
    songPlayerContainerRef.current.appendChild(playerDiv)

    songPlayerRef.current = new window.YT.Player(containerId, {
      height: '0',
      width: '0',
      videoId: songVideoId,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
      },
      events: {
        onReady: (event: {
          target: {
            getDuration: () => number
            setVolume: (v: number) => void
            setPlaybackRate: (r: number) => void
          }
        }) => {
          setSongIsPlayerReady(true)
          setSongDuration(event.target.getDuration())
          event.target.setVolume(songVolume)
          event.target.setPlaybackRate(songPlaybackRate)
          // Start time update
          if (songTimeUpdateRef.current) cancelAnimationFrame(songTimeUpdateRef.current)
          const tick = () => {
            if (songPlayerRef.current) {
              try {
                setSongCurrentTime(songPlayerRef.current.getCurrentTime())
              } catch {
                /* ignore */
              }
            }
            songTimeUpdateRef.current = requestAnimationFrame(tick)
          }
          songTimeUpdateRef.current = requestAnimationFrame(tick)
        },
        onStateChange: (event: {
          data: number
          target: { seekTo: (s: number, a: boolean) => void; playVideo: () => void }
        }) => {
          if (event.data === window.YT.PlayerState.PLAYING) {
            setIsSongPlaying(true)
          } else if (event.data === window.YT.PlayerState.PAUSED) {
            setIsSongPlaying(false)
          } else if (event.data === window.YT.PlayerState.ENDED) {
            setIsSongPlaying(false)
            if (songIsLooping) {
              event.target.seekTo(0, true)
              event.target.playVideo()
            }
          }
        },
      },
    })

    return () => {
      if (songTimeUpdateRef.current) {
        cancelAnimationFrame(songTimeUpdateRef.current)
        songTimeUpdateRef.current = null
      }
    }
  }, [songVideoId, ytApiLoaded])

  // Update playback rate when changed
  useEffect(() => {
    if (songPlayerRef.current && songIsPlayerReady) {
      songPlayerRef.current.setPlaybackRate(songPlaybackRate)
    }
  }, [songPlaybackRate, songIsPlayerReady])

  // Handle A-B loop
  useEffect(() => {
    if (!songPlayerRef.current || !songIsPlayerReady) return
    if (songIsABLooping && songMarkerA !== null && songMarkerB !== null) {
      if (songCurrentTime >= songMarkerB) {
        songPlayerRef.current.seekTo(songMarkerA, true)
      }
    }
  }, [songCurrentTime, songIsABLooping, songMarkerA, songMarkerB, songIsPlayerReady])

  // Load song data when switching to a song exercise in lesson mode
  useEffect(() => {
    if (viewMode !== 'taking-lesson' || !currentAssignment) return
    if (currentAssignment.lesson_type === 'songs') return // Handled separately

    const currentExercise = lessonExercises[lessonExerciseIndex]
    if (!currentExercise) return

    // Check if current exercise is a song exercise
    if (currentExercise.type === 'song' && currentExercise.songData?.videoId) {
      const exerciseSongData = currentExercise.songData
      // Only update if video changed
      if (songVideoId !== exerciseSongData.videoId) {
        setSongVideoId(exerciseSongData.videoId)
        setSongVideoTitle(exerciseSongData.videoTitle)
        setSongMarkerA(exerciseSongData.markerA ?? null)
        setSongMarkerB(exerciseSongData.markerB ?? null)
        setSongPlaybackRate(exerciseSongData.playbackRate || 1)
        setSongIsPlayerReady(false)
        setIsSongPlaying(false)
        const hasLoop =
          typeof exerciseSongData.markerA === 'number' &&
          !isNaN(exerciseSongData.markerA) &&
          typeof exerciseSongData.markerB === 'number' &&
          !isNaN(exerciseSongData.markerB)
        setSongIsABLooping(hasLoop)
      }
    }
  }, [viewMode, currentAssignment, lessonExercises, lessonExerciseIndex, songVideoId])

  // Format time for display (0.1 second precision)
  const formatSongTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    const secsWhole = Math.floor(secs)
    const secsTenth = Math.floor((secs - secsWhole) * 10)
    return `${mins}:${secsWhole.toString().padStart(2, '0')}.${secsTenth}`
  }

  // Save assignment
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleSaveAssignment = async (overrideMarkers?: {
    markerA: number | null
    markerB: number | null
  }) => {
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

      // If currently in song mode with a video selected, save as song exercise
      if (assignmentType === 'songs' && songVideoId) {
        updatedExercises[currentExerciseIndex] = {
          ...existingExercise,
          transcript: currentExerciseTranscript,
          bpm: currentData.bpm,
          beats: currentData.beats,
          chordMode: currentData.chordMode,
          lowerOctaves: currentData.lowerOctaves,
          higherOctaves: currentData.higherOctaves,
          selectedNoteIds: [],
          appliedScales: [],
          appliedChords: [],
          type: 'song',
          songData: {
            videoId: songVideoId,
            videoTitle: songVideoTitle,
            markerA: songMarkerA,
            markerB: songMarkerB,
            playbackRate: songPlaybackRate,
          },
        }
      } else {
        // Generator mode - save notes/scales/chords
        updatedExercises[currentExerciseIndex] = {
          ...existingExercise,
          // Use current state if it has content, otherwise keep original
          transcript: currentExerciseTranscript,
          bpm: currentData.bpm,
          beats: currentData.beats,
          chordMode: currentData.chordMode,
          lowerOctaves: currentData.lowerOctaves,
          higherOctaves: currentData.higherOctaves,
          selectedNoteIds:
            currentData.selectedNoteIds.length > 0
              ? currentData.selectedNoteIds
              : existingExercise.selectedNoteIds,
          appliedScales:
            currentData.appliedScales.length > 0
              ? currentData.appliedScales
              : existingExercise.appliedScales,
          appliedChords:
            currentData.appliedChords.length > 0
              ? currentData.appliedChords
              : existingExercise.appliedChords,
          // Clear song data if switching from song to Generator
          type: undefined,
          songData: undefined,
        }
      }
    }

    // Check if any exercise has content (including song exercises)
    const hasAnyContent = updatedExercises.some(
      exercise =>
        exercise.selectedNoteIds.length > 0 ||
        exercise.appliedScales.length > 0 ||
        exercise.appliedChords.length > 0 ||
        (exercise.type === 'song' && exercise.songData?.videoId)
    )

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const hasScales = scaleChordManagement.appliedScales.length > 0
    const hasChords = scaleChordManagement.appliedChords.length > 0
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        appliedChords: exercise.appliedChords,
        // Song exercise fields
        type: exercise.type,
        songData: exercise.songData,
      })),
    }

    const octaveLow = 4 - lowerOctaves
    const octaveHigh = 5 + higherOctaves

    // Validate assignment title for XSS
    if (containsScriptInjection(assignmentTitle)) {
      setAssignmentError('Assignment title contains invalid characters')
      return
    }

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
        selection_data: hasAnyContent ? selectionData : null,
      }

      try {
        await saveAssignmentAction(assignmentData, editingAssignmentId, user.id)
      } catch (err: unknown) {
        setAssignmentError(
          (err instanceof Error ? err.message : null) || 'Failed to save assignment'
        )
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
      // Reset song state
      setSongVideoId(null)
      setSongVideoTitle('')
      setSongMarkerA(null)
      setSongMarkerB(null)
      setSongPlaybackRate(1)
      setSongSearchQuery('')
      setSongSearchResults([])
      setAssignmentType('practice')

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
    hasAutoPlayedSong.current = false
    setWelcomeSpeechDone(false)
    setGenericWelcomeDone(false)
    setHasGeneratedMelody(false)
    setAutoPlayAudio(false)
    setMelodySetupMessage('')
    setCongratulationsMessage('')

    // Handle song assignments - load song data into the song player state
    if (assignment.lesson_type === 'songs') {
      const songData = assignment.selection_data as unknown as SongAssignmentData | null
      if (songData) {
        setSongVideoId(songData.videoId)
        setSongVideoTitle(songData.videoTitle)
        // Ensure null instead of undefined for markers (undefined !== null check would fail)
        const markerA = songData.markerA ?? null
        const markerB = songData.markerB ?? null
        setSongMarkerA(markerA)
        setSongMarkerB(markerB)
        setSongPlaybackRate(songData.playbackRate || 1)
        // Generate waveform for the player
        // Initialize player state
        setSongDuration(0)
        setSongCurrentTime(0)
        setSongIsPlayerReady(false)
        setIsSongPlaying(false)
        // Enable A-B looping if teacher set markers (check both are valid numbers)
        setSongIsABLooping(typeof markerA === 'number' && typeof markerB === 'number')
      }
      setViewMode('taking-lesson')
      return
    }

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

    let loadedExercises: ExerciseData[] = []
    if (selectionData?.exercises && selectionData.exercises.length > 0) {
      // Map exercises with fallback for bpm/beats, transcript
      loadedExercises = selectionData.exercises.map((ex: SerializedExerciseData) => ({
        ...ex,
        transcript: ex.transcript || '',
        bpm: ex.bpm || assignment.bpm,
        beats: ex.beats || assignment.beats,
      }))
      setLessonExercises(loadedExercises)
    } else if (selectionData) {
      // Legacy format - single exercise from top-level fields
      loadedExercises = [
        {
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
          appliedChords: selectionData.appliedChords || [],
        },
      ]
      setLessonExercises(loadedExercises)
    } else {
      setLessonExercises([])
    }
    setLessonExerciseIndex(0)

    // If the first exercise is a song exercise, initialize song player state
    const firstExercise = loadedExercises[0]
    if (firstExercise?.type === 'song' && firstExercise?.songData) {
      const songData = firstExercise.songData
      setSongVideoId(songData.videoId)
      setSongVideoTitle(songData.videoTitle)
      setSongMarkerA(songData.markerA ?? null)
      setSongMarkerB(songData.markerB ?? null)
      setSongPlaybackRate(songData.playbackRate || 1)
      setSongDuration(0)
      setSongCurrentTime(0)
      setSongIsPlayerReady(false)
      setIsSongPlaying(false)
      // Enable A-B looping if markers are set
      setSongIsABLooping(
        typeof songData.markerA === 'number' && typeof songData.markerB === 'number'
      )
    } else {
      // Clear song state for Generator exercises
      setSongVideoId(null)
      setSongVideoTitle('')
      setSongMarkerA(null)
      setSongMarkerB(null)
      setSongPlaybackRate(1)
      setSongIsPlayerReady(false)
      setIsSongPlaying(false)
    }

    setViewMode('taking-lesson')
  }

  // Track if we've already recorded progress for the current lesson session
  const hasRecordedProgressRef = useRef(false)
  // Track completed exercises synchronously (state updates are async)
  const completedExercisesRef = useRef(0)
  // Store access token for keepalive fetch in beforeunload (can't await async getSession)
  const accessTokenRef = useRef<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      accessTokenRef.current = session?.access_token || null
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_, session) => {
      accessTokenRef.current = session?.access_token || null
    })
    return () => subscription.unsubscribe()
  }, [])

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
        melodiesCompleted: completedExercisesRef.current,
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
        melodies_completed: completedExercisesRef.current,
      }

      // Use fetch with keepalive for browser close — needs user's session token for RLS
      const token = accessTokenRef.current
      if (!token) return

      fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/practice_sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          Authorization: `Bearer ${token}`,
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(data),
        keepalive: true,
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
    if (
      !hasRecordedProgressRef.current &&
      !isPreviewMode &&
      user?.id &&
      currentAssignment &&
      completedExercisesRef.current > 0
    ) {
      hasRecordedProgressRef.current = true
      recordPracticeSession.mutate({
        type: 'classroom',
        instrument: currentAssignment.instrument,
        melodiesCompleted: completedExercisesRef.current,
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
      chordMode,
    }

    // Build a preview assignment object
    const previewAssignment: AssignmentData = {
      id: 'preview',
      title: assignmentTitle || 'Preview Assignment',
      instrument,
      bpm,
      beats: numberOfBeats,
      selection_data: {
        exercises: updatedExercises,
      },
      created_at: new Date().toISOString(),
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
    setLessonExercises(
      updatedExercises.map(ex => ({
        ...ex,
        transcript: ex.transcript || '',
        bpm: ex.bpm || bpm,
        beats: ex.beats || numberOfBeats,
      }))
    )
    setLessonExerciseIndex(0)

    // Switch to lesson mode
    setViewMode('taking-lesson')
  }

  // Handle Done button click - show animation before ending
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleDoneClick = useCallback(() => {
    setShowAssignmentComplete(true)
  }, [])

  // Callback when assignment complete animation finishes
  const handleAssignmentCompleteFinish = useCallback(() => {
    setShowAssignmentComplete(false)
    handleEndLesson()
  }, [])

  // Switch to a different exercise in lesson mode
  const handleSwitchLessonExercise = useCallback(
    (index: number) => {
      if (
        index === lessonExerciseIndex ||
        index < 0 ||
        index >= lessonExercises.length ||
        !currentAssignment
      )
        return

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
      hasAutoPlayedSong.current = false

      // Load the target exercise
      const targetExercise = lessonExercises[index]

      // If no transcript, mark speech as done immediately so auto-play can proceed
      if (!targetExercise?.transcript) {
        setWelcomeSpeechDone(true)
      } else {
        setWelcomeSpeechDone(false)
      }

      // Check if target exercise is a song exercise
      if (targetExercise?.type === 'song' && targetExercise?.songData) {
        // Load song data into player state
        const songData = targetExercise.songData
        setSongVideoId(songData.videoId)
        setSongVideoTitle(songData.videoTitle)
        setSongMarkerA(songData.markerA ?? null)
        setSongMarkerB(songData.markerB ?? null)
        setSongPlaybackRate(songData.playbackRate || 1)
        setSongDuration(0)
        setSongCurrentTime(0)
        setSongIsPlayerReady(false)
        setIsSongPlaying(false)
        // Enable A-B looping if markers are set
        setSongIsABLooping(
          typeof songData.markerA === 'number' && typeof songData.markerB === 'number'
        )
        setLessonExerciseIndex(index)
        return // Song exercises don't need scale/chord/note loading
      }

      // Clear song state when switching to Generator exercise
      setSongVideoId(null)
      setSongVideoTitle('')
      setSongMarkerA(null)
      setSongMarkerB(null)
      setSongPlaybackRate(1)
      setSongIsPlayerReady(false)
      setIsSongPlaying(false)

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
          // Build and apply scales/chords directly to avoid stale closure issues
          // (handleKeyboardScaleApply closes over old appliedScales for dedup checks)
          if (targetExercise.appliedScales?.length > 0) {
            const scales = buildAppliedScalesFromData(targetExercise.appliedScales)
            scaleChordManagement.setAppliedScalesDirectly(scales)
          }
          if (targetExercise.appliedChords?.length > 0) {
            setChordMode('progression')
            const chords = buildAppliedChordsFromData(targetExercise.appliedChords)
            scaleChordManagement.setAppliedChordsDirectly(chords)
          }
          // Apply notes from exercise
          if (targetExercise.selectedNoteIds?.length > 0) {
            targetExercise.selectedNoteIds.forEach(noteId => {
              const noteObj = getKeyboardNoteById(noteId, targetLower, targetHigher)
              if (noteObj) selectNote(noteObj, 'multi')
            })
          }
        } else {
          // Guitar/Bass - use pending selection data pattern
          setPendingSelectionData({
            instrument: exerciseInstrument,
            selectionData: targetExercise,
          })
        }
      }

      setLessonExerciseIndex(index)
    },
    [
      lessonExerciseIndex,
      lessonExercises,
      currentAssignment,
      clearSelection,
      triggerClearChordsAndScales,
      scaleChordManagement,
      setChordMode,
      selectNote,
      handleOctaveRangeChange,
    ]
  )

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
          melodiesCompleted: lessonExercises.length,
        })
      }
    }
  }, [
    lessonExerciseIndex,
    lessonExercises.length,
    handleSwitchLessonExercise,
    currentAssignment,
    user?.id,
    recordCompletion,
    recordPracticeSession,
  ])

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

      // Build and apply scales/chords directly (no setTimeout, no stale closure issues)
      if (currentExercise.appliedScales?.length > 0) {
        const scales = buildAppliedScalesFromData(currentExercise.appliedScales)
        scaleChordManagement.setAppliedScalesDirectly(scales)
      }
      if (currentExercise.appliedChords?.length > 0) {
        setChordMode('progression')
        const chords = buildAppliedChordsFromData(currentExercise.appliedChords)
        scaleChordManagement.setAppliedChordsDirectly(chords)
      }
      // Apply notes
      if (currentExercise.selectedNoteIds?.length > 0) {
        currentExercise.selectedNoteIds.forEach((noteId: string) => {
          const noteObj = getKeyboardNoteById(noteId, exerciseLower, exerciseHigher)
          if (noteObj) selectNote(noteObj, 'multi')
        })
      }
    } else {
      // Guitar/Bass - store pending data
      setPendingSelectionData({
        instrument: exerciseInstrument,
        selectionData: currentExercise,
      })
    }
  }, [
    viewMode,
    currentAssignment,
    lessonExercises,
    handleOctaveRangeChange,
    scaleChordManagement,
    setChordMode,
    selectNote,
  ])

  // Auto-play song when player becomes ready and speech is done (for both legacy song assignments and song exercises)
  // Only auto-plays once per exercise - uses ref to prevent re-triggering when user pauses
  useEffect(() => {
    if (viewMode !== 'taking-lesson') return
    if (!currentAssignment) return
    if (hasAutoPlayedSong.current) return // Already auto-played for this exercise

    // Check if this is a legacy song assignment
    const isLegacySongAssignment = currentAssignment.lesson_type === 'songs' && songVideoId

    // Check if current exercise is a song exercise
    const currentExercise = lessonExercises[lessonExerciseIndex]
    const isSongExercise = currentExercise?.type === 'song' && currentExercise?.songData?.videoId

    if (!isLegacySongAssignment && !isSongExercise) return

    // Check if all speech is done
    let speechDone = false
    if (isLegacySongAssignment) {
      // Legacy song assignments only have welcome message (no transcript)
      speechDone = genericWelcomeDone
    } else if (isSongExercise && currentExercise) {
      // Song exercises may have transcript
      const hasTranscript = (currentExercise.transcript || '').trim().length > 0
      speechDone = hasTranscript ? genericWelcomeDone && welcomeSpeechDone : genericWelcomeDone
    }

    // Auto-play when player is ready and speech is done (only once)
    if (songIsPlayerReady && speechDone) {
      hasAutoPlayedSong.current = true
      toggleSongPlayPause()
    }
  }, [
    viewMode,
    currentAssignment,
    lessonExercises,
    lessonExerciseIndex,
    songIsPlayerReady,
    genericWelcomeDone,
    welcomeSpeechDone,
    toggleSongPlayPause,
    songVideoId,
  ])

  // Apply pending selection data for guitar/bass
  useEffect(() => {
    if (!pendingSelectionData) return

    const { instrument: pendingInstrument, selectionData } = pendingSelectionData

    const applyTimeoutId = setTimeout(() => {
      // Apply scales
      if (selectionData.appliedScales?.length > 0) {
        const scalesToApply: AppliedScale[] = []

        if (pendingInstrument === 'guitar') {
          selectionData.appliedScales.forEach((scaleData: SerializedScaleData) => {
            // Extract fret range from displayName (e.g., "C Major (Frets 0-12)")
            const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
            const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
            const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
            const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
            const scaleObj = GUITAR_SCALES.find(
              s => s.name === baseScaleName || s.name === scaleData.scaleName
            )
            if (scaleObj) {
              const allPositions = getScalePositions(scaleData.root, scaleObj, guitarNotes)
              const positions = allPositions.filter(
                pos => pos.fret >= fretLow && pos.fret <= fretHigh
              )
              const scaleNotes = positions.map(pos => {
                const noteId = `g-s${pos.string}-f${pos.fret}`
                const guitarNote = getGuitarNoteById(noteId)
                return {
                  id: noteId,
                  name: pos.note,
                  frequency: guitarNote?.frequency || 0,
                  isBlack: pos.note.includes('#'),
                  position: guitarNote?.position || 0,
                  __guitarCoord: { stringIndex: 6 - pos.string, fretIndex: pos.fret },
                }
              })
              const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
              scalesToApply.push({
                id: `guitar-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                root: scaleData.root,
                scale: scaleObj,
                displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                notes: scaleNotes,
              })
            }
          })
        } else if (pendingInstrument === 'bass') {
          selectionData.appliedScales.forEach((scaleData: SerializedScaleData) => {
            // Extract fret range from displayName (e.g., "C Major (Frets 0-12)")
            const fretRangeMatch = (scaleData.displayName || '').match(/\(Frets (\d+)-(\d+)\)$/)
            const baseScaleName = scaleData.scaleName.replace(/\s*\(Frets \d+-\d+\)$/, '')
            const fretLow = fretRangeMatch ? parseInt(fretRangeMatch[1], 10) : 0
            const fretHigh = fretRangeMatch ? parseInt(fretRangeMatch[2], 10) : 24
            const scaleObj = BASS_SCALES.find(
              s => s.name === baseScaleName || s.name === scaleData.scaleName
            )
            if (scaleObj) {
              const allPositions = getBassScalePositions(scaleData.root, scaleObj, bassNotes)
              const positions = allPositions.filter(
                pos => pos.fret >= fretLow && pos.fret <= fretHigh
              )
              const scaleNotes = positions.map(pos => {
                const noteId = `b-s${pos.string}-f${pos.fret}`
                const bassNote = getBassNoteById(noteId)
                return {
                  id: noteId,
                  name: pos.note,
                  frequency: bassNote?.frequency || 0,
                  isBlack: pos.note.includes('#'),
                  position: bassNote?.position || 0,
                  __bassCoord: { stringIndex: 4 - pos.string, fretIndex: pos.fret },
                }
              })
              const fretInfo = fretRangeMatch ? ` (Frets ${fretLow}-${fretHigh})` : ''
              scalesToApply.push({
                id: `bass-${scaleData.root}-${scaleObj.name}-${Date.now()}`,
                root: scaleData.root,
                scale: scaleObj as GuitarScale | BassScale | KeyboardScale,
                displayName: `${scaleData.root} ${scaleObj.name}${fretInfo}`,
                notes: scaleNotes,
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
          selectionData.appliedChords.forEach((chordData: SerializedChordData) => {
            let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
            baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
            const chordObj = GUITAR_CHORDS.find(
              c => c.name === baseChordName || c.name === chordData.chordName
            )
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
                  chord: chordObj as GuitarChord | BassChord,
                  displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                  noteKeys: noteKeys,
                  fretZone: boxIndex,
                })
              }
            }
          })
        } else if (pendingInstrument === 'bass') {
          selectionData.appliedChords.forEach((chordData: SerializedChordData) => {
            let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
            baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
            const chordObj = BASS_CHORDS.find(
              c => c.name === baseChordName || c.name === chordData.chordName
            )
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
                  chord: chordObj as GuitarChord | BassChord,
                  displayName: `${chordData.root} ${chordObj.name} (Frets ${chordBox.minFret}-${chordBox.maxFret})`,
                  noteKeys: noteKeys,
                  fretZone: boxIndex,
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
      const validNoteIds = (selectionData.selectedNoteIds || []).filter(
        (id: string | null) => id !== null
      ) as string[]
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

    const hasContent =
      selectedNotes.length > 0 ||
      scaleChordManagement.appliedScales.length > 0 ||
      scaleChordManagement.appliedChords.length > 0

    if (hasContent && !hasGeneratedMelody) {
      const timeoutId = setTimeout(() => {
        handleGenerateMelody()
        setHasGeneratedMelody(true)
      }, 150)
      return () => clearTimeout(timeoutId)
    }
  }, [
    viewMode,
    selectedNotes.length,
    scaleChordManagement.appliedScales.length,
    scaleChordManagement.appliedChords.length,
    hasGeneratedMelody,
    handleGenerateMelody,
  ])

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
    if (
      welcomeSpeechDone &&
      generatedMelody.length > 0 &&
      recordedAudioBlob &&
      !hasAnnouncedMelody.current
    ) {
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleJoinBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleCloseJoinModal()
  }

  // Modals rendered via extracted components (see return statements below)

  // ========== RENDER: Taking Lesson Mode ==========
  if (viewMode === 'taking-lesson' && currentAssignment) {
    // ========== SONG ASSIGNMENT VIEW (legacy single-song assignments) ==========
    if (currentAssignment.lesson_type === 'songs' && songVideoId) {
      // Check that markers are valid numbers (not null, undefined, or NaN)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const hasLoop =
        typeof songMarkerA === 'number' &&
        !isNaN(songMarkerA) &&
        typeof songMarkerB === 'number' &&
        !isNaN(songMarkerB)

      // Welcome message for song assignment
      const songAssignmentWelcome = !genericWelcomeDone
        ? t('generator.welcomeToLesson', { instrument: currentAssignment.title })
        : ''

      // Auto-play handler for when welcome ends
      const handleSongAssignmentWelcomeEnd = () => {
        setGenericWelcomeDone(true)
        setWelcomeSpeechDone(true)
        if (songIsPlayerReady && !isSongPlaying) {
          toggleSongPlayPause()
        }
      }

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
            <button
              className={practiceStyles.backButton}
              onClick={handleEndLesson}
              aria-label="End practice session"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          <div
            className={songStyles.songsContainer}
            style={{ padding: '1rem 2rem', maxWidth: '900px', margin: '0 auto' }}
          >
            {/* Hidden YouTube Player Container */}
            <div ref={songPlayerContainerRef} style={{ position: 'absolute', left: '-9999px' }} />

            <SongPlayerUI
              videoId={songVideoId}
              videoTitle={songVideoTitle}
              markerA={songMarkerA}
              markerB={songMarkerB}
              currentTime={songCurrentTime}
              duration={songDuration}
              isPlaying={isSongPlaying}
              isPlayerReady={songIsPlayerReady}
              volume={songVolume}
              playbackRate={songPlaybackRate}
              onTogglePlayPause={toggleSongPlayPause}
              onSeek={handleSongSeek}
              onVolumeChange={handleSongVolumeChange}
              onPlaybackRateChange={setSongPlaybackRate}
              onSkip={handleSongSkip}
              formatTime={formatSongTime}
            />

            {/* Mark as Complete button */}
            {!isPreviewMode && user && (
              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1.5rem' }}>
                <button
                  onClick={() => {
                    recordCompletion.mutate({ assignmentId: currentAssignment.id, userId: user.id })
                    setShowAssignmentComplete(true)
                  }}
                  disabled={completedAssignmentIds.has(currentAssignment.id)}
                  style={{
                    padding: '1rem 2rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: completedAssignmentIds.has(currentAssignment.id)
                      ? 'var(--gray-600)'
                      : 'var(--primary-purple)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: completedAssignmentIds.has(currentAssignment.id)
                      ? 'default'
                      : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  {completedAssignmentIds.has(currentAssignment.id) ? (
                    <>
                      <PiCheckCircleFill size={20} />
                      Completed
                    </>
                  ) : (
                    'Mark as Complete'
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Welcome subtitle for song assignment */}
          {songAssignmentWelcome && (
            <WelcomeSubtitle
              message={songAssignmentWelcome}
              onSpeechEnd={handleSongAssignmentWelcomeEnd}
            />
          )}

          {/* Assignment Complete Animation */}
          {showAssignmentComplete &&
            createPortal(
              <AssignmentCompleteOverlay
                onComplete={() => {
                  setShowAssignmentComplete(false)
                  handleEndLesson()
                }}
              />,
              document.body
            )}
        </>
      )
    }

    // ========== PRACTICE ASSIGNMENT VIEW ==========
    // Generic welcome message for the lesson
    const genericWelcomeMessage = !genericWelcomeDone
      ? t('generator.welcomeToLesson', { instrument: currentAssignment.title })
      : ''

    // Get custom transcript from current exercise (only show after generic welcome)
    const currentExerciseForTranscript = lessonExercises[lessonExerciseIndex]
    const customTranscript = genericWelcomeDone
      ? currentExerciseForTranscript?.transcript || ''
      : ''

    const octaveLow = currentAssignment.octave_low ?? 4
    const octaveHigh = currentAssignment.octave_high ?? 5
    const calculatedLowerOctaves = currentAssignment.instrument === 'keyboard' ? 4 - octaveLow : 0
    const calculatedHigherOctaves = currentAssignment.instrument === 'keyboard' ? octaveHigh - 5 : 0

    // Check if lesson has no scales or chords (use current exercise data)
    const currentExercise = lessonExercises[lessonExerciseIndex]
    const hasNoScalesOrChords =
      !currentExercise ||
      ((currentExercise.appliedScales?.length ?? 0) === 0 &&
        (currentExercise.appliedChords?.length ?? 0) === 0)
    const hasChords = currentExercise && (currentExercise.appliedChords?.length ?? 0) > 0
    const hasScales = currentExercise && (currentExercise.appliedScales?.length ?? 0) > 0
    const hasBothScalesAndChords = hasScales && hasChords
    const hasMultipleExercises = lessonExercises.length > 1

    // Check if current exercise is a song exercise
    const isSongExercise = currentExercise?.type === 'song' && currentExercise?.songData?.videoId

    // If current exercise is a song, render song player UI
    if (isSongExercise && currentExercise.songData) {
      const exerciseSongData = currentExercise.songData
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const exerciseHasLoop =
        typeof exerciseSongData.markerA === 'number' &&
        !isNaN(exerciseSongData.markerA) &&
        typeof exerciseSongData.markerB === 'number' &&
        !isNaN(exerciseSongData.markerB)

      // Get transcript for song exercise (same pattern as Generator)
      const songExerciseTranscript = genericWelcomeDone ? currentExercise.transcript || '' : ''
      const hasTranscript = (currentExercise.transcript || '').trim().length > 0

      // Auto-play song when all speech is done and player is ready
      const handleSongAutoPlay = () => {
        if (songIsPlayerReady && !isSongPlaying) {
          toggleSongPlayPause()
        }
      }

      // Handle welcome message end - if no transcript, auto-play
      const handleWelcomeEnd = () => {
        setGenericWelcomeDone(true)
        if (!hasTranscript) {
          setWelcomeSpeechDone(true)
          handleSongAutoPlay()
        }
      }

      // Handle transcript end - auto-play after transcript
      const handleTranscriptEnd = () => {
        setWelcomeSpeechDone(true)
        handleSongAutoPlay()
      }

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
            <button
              className={practiceStyles.backButton}
              onClick={handleEndLesson}
              aria-label="End practice session"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          {/* Timeline for multi-exercise lessons */}
          {hasMultipleExercises && (
            <div className={practiceStyles.exerciseTimelineBar}>
              <span className={practiceStyles.exerciseTimelineLabel}>
                {t('classroom.timeline')}
              </span>
              <div
                className={`${practiceStyles.exerciseTimeline} ${practiceStyles.exerciseTimelineLesson}`}
              >
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

          <div
            className={songStyles.songsContainer}
            style={{ padding: '1rem 2rem', maxWidth: '900px', margin: '0 auto' }}
          >
            {/* Hidden YouTube Player Container */}
            <div ref={songPlayerContainerRef} style={{ position: 'absolute', left: '-9999px' }} />

            <SongPlayerUI
              videoId={exerciseSongData.videoId}
              videoTitle={exerciseSongData.videoTitle}
              markerA={exerciseSongData.markerA ?? null}
              markerB={exerciseSongData.markerB ?? null}
              currentTime={songCurrentTime}
              duration={songDuration}
              isPlaying={isSongPlaying}
              isPlayerReady={songIsPlayerReady}
              volume={songVolume}
              playbackRate={songPlaybackRate}
              onTogglePlayPause={toggleSongPlayPause}
              onSeek={handleSongSeek}
              onVolumeChange={handleSongVolumeChange}
              onPlaybackRateChange={setSongPlaybackRate}
              onSkip={handleSongSkip}
              formatTime={formatSongTime}
            />

            {/* Next Exercise / Complete button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                marginTop: '1.5rem',
                gap: '1rem',
              }}
            >
              {lessonExerciseIndex < lessonExercises.length - 1 ? (
                <button
                  onClick={() => handleSwitchLessonExercise(lessonExerciseIndex + 1)}
                  style={{
                    padding: '1rem 2rem',
                    borderRadius: '12px',
                    border: 'none',
                    background: 'var(--primary-purple)',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  Next Exercise
                  <PiCaretRight size={20} />
                </button>
              ) : (
                !isPreviewMode &&
                user && (
                  <button
                    onClick={() => {
                      recordCompletion.mutate({
                        assignmentId: currentAssignment.id,
                        userId: user.id,
                      })
                      setShowAssignmentComplete(true)
                    }}
                    disabled={completedAssignmentIds.has(currentAssignment.id)}
                    style={{
                      padding: '1rem 2rem',
                      borderRadius: '12px',
                      border: 'none',
                      background: completedAssignmentIds.has(currentAssignment.id)
                        ? 'var(--gray-600)'
                        : 'var(--primary-purple)',
                      color: 'white',
                      fontWeight: 600,
                      fontSize: '1rem',
                      cursor: completedAssignmentIds.has(currentAssignment.id)
                        ? 'default'
                        : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    {completedAssignmentIds.has(currentAssignment.id) ? (
                      <>
                        <PiCheckCircleFill size={20} />
                        Completed
                      </>
                    ) : (
                      'Mark as Complete'
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Welcome and transcript subtitles for song exercises */}
          {genericWelcomeMessage && (
            <WelcomeSubtitle message={genericWelcomeMessage} onSpeechEnd={handleWelcomeEnd} />
          )}
          {songExerciseTranscript && (
            <WelcomeSubtitle message={songExerciseTranscript} onSpeechEnd={handleTranscriptEnd} />
          )}

          {showAssignmentComplete &&
            createPortal(
              <AssignmentCompleteOverlay
                onComplete={() => {
                  setShowAssignmentComplete(false)
                  handleEndLesson()
                }}
              />,
              document.body
            )}
        </>
      )
    }

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
          <button
            className={practiceStyles.backButton}
            onClick={handleEndLesson}
            aria-label="End practice session"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          {/* Next button removed - user must complete melody feedback to advance */}
        </div>

        {/* Timeline for multi-exercise lessons (read-only progress indicator) */}
        {hasMultipleExercises && (
          <div className={practiceStyles.exerciseTimelineBar}>
            <span className={practiceStyles.exerciseTimelineLabel}>{t('classroom.timeline')}</span>
            <div
              className={`${practiceStyles.exerciseTimeline} ${practiceStyles.exerciseTimelineLesson}`}
            >
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
            mode: flashingInputs.mode || activeInputs.mode,
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
          hideBpmButtons={false}
          hideBeatsButtons={false}
          hideGenerateButton={true}
          hideDeselectAll={true}
          showOnlyAppliedList={true}
          hideChordMode={!hasChords}
          disableBpmInput={true}
          disableBeatsInput={true}
          disableChordMode={true}
          practiceMode={true}
          autoPlayAudio={autoPlayAudio}
          lessonType={
            hasBothScalesAndChords
              ? undefined
              : hasScales
                ? 'melodies'
                : hasChords
                  ? 'chords'
                  : undefined
          }
          externalSelectedNoteIds={externalSelectedNoteIds}
          hideScalesChords={hasNoScalesOrChords}
          onLessonComplete={handleExerciseComplete}
          autoStartFeedback={true}
        />

        {genericWelcomeMessage && (
          <WelcomeSubtitle
            message={genericWelcomeMessage}
            onSpeechEnd={() => setGenericWelcomeDone(true)}
          />
        )}
        {customTranscript && (
          <WelcomeSubtitle
            message={customTranscript}
            onSpeechEnd={() => setWelcomeSpeechDone(true)}
          />
        )}
        {congratulationsMessage && (
          <WelcomeSubtitle message={congratulationsMessage} onSpeechEnd={handleExerciseComplete} />
        )}

        {/* Assignment Complete Animation */}
        {showAssignmentComplete &&
          createPortal(
            <AssignmentCompleteOverlay onComplete={handleAssignmentCompleteFinish} />,
            document.body
          )}
      </>
    )
  }

  // ========== RENDER: Assignment Editor Mode ==========
  if (viewMode === 'creating-assignment') {
    const userClassrooms = classrooms.filter(c => c.created_by === user?.id)

    // Helper to check if an exercise has content (notes OR song)
    const exerciseHasContent = (exercise: ExerciseData) =>
      exercise.selectedNoteIds.length > 0 ||
      exercise.appliedScales.length > 0 ||
      exercise.appliedChords.length > 0 ||
      (exercise.type === 'song' && exercise.songData?.videoId)

    // Check current exercise content (for the current one being edited)
    const currentExerciseData = {
      selectedNoteIds: selectedNotes.map(n => n.id),
      appliedScales: scaleChordManagement.appliedScales,
      appliedChords: scaleChordManagement.appliedChords,
    }
    // Current has content if Generator mode with notes OR song mode with video selected
    const currentHasContent =
      assignmentType === 'songs'
        ? !!songVideoId
        : currentExerciseData.selectedNoteIds.length > 0 ||
          currentExerciseData.appliedScales.length > 0 ||
          currentExerciseData.appliedChords.length > 0

    // Check if all exercises have content (including current unsaved state)
    const allExercisesHaveContent = exercises.every((exercise, index) => {
      if (index === currentExerciseIndex) {
        return currentHasContent
      }
      return exerciseHasContent(exercise)
    })

    return (
      <>
        {/* Back button and header */}
        <div className={practiceStyles.backButtonContainer}>
          <button
            className={practiceStyles.backButton}
            onClick={handleCancelAssignment}
            aria-label="Cancel assignment"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>

        {/* Assignment Editor Header - All options in one bar */}
        <div
          className={practiceStyles.exerciseTimelineBar}
          style={{ flexDirection: 'column', gap: '0.75rem' }}
        >
          {/* Row 1: Classroom, Instrument, Title, Preview, Assign - same for both modes */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%' }}>
            <select
              className={practiceStyles.classroomSelector}
              value={assigningToClassroomId || ''}
              onChange={e => setAssigningToClassroomId(e.target.value || null)}
            >
              <option value="">{t('classroom.selectClassroom')}</option>
              {userClassrooms.map(classroom => (
                <option key={classroom.id} value={classroom.id}>
                  {classroom.title}
                </option>
              ))}
            </select>
            <select
              className={practiceStyles.classroomSelector}
              value={instrument}
              onChange={e =>
                handleInstrumentChange(e.target.value as 'keyboard' | 'guitar' | 'bass')
              }
              style={{
                color:
                  instrument === 'keyboard'
                    ? '#3b82f6'
                    : instrument === 'guitar'
                      ? '#22c55e'
                      : '#ef4444',
              }}
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
              onChange={e => setAssignmentTitle(e.target.value)}
              placeholder={t('generator.assignmentTitle')}
            />
            <button
              className={practiceStyles.assignmentPreviewButton}
              onClick={handlePreviewAssignment}
              disabled={
                !assigningToClassroomId ||
                !assignmentTitle.trim() ||
                (assignmentType === 'practice' ? !allExercisesHaveContent : !songVideoId) ||
                isSavingAssignment
              }
              style={{
                opacity:
                  assigningToClassroomId &&
                  assignmentTitle.trim() &&
                  (assignmentType === 'practice' ? allExercisesHaveContent : songVideoId)
                    ? 1
                    : 0.5,
              }}
              title={t('classroom.preview')}
            >
              <PiEyeFill size={16} />
              {t('classroom.preview')}
            </button>
            <button
              className={practiceStyles.assignmentAssignButton}
              onClick={handleSaveAssignment}
              disabled={
                !assigningToClassroomId ||
                !assignmentTitle.trim() ||
                (assignmentType === 'practice' ? !allExercisesHaveContent : !songVideoId) ||
                isSavingAssignment
              }
              style={{
                opacity:
                  assigningToClassroomId &&
                  assignmentTitle.trim() &&
                  (assignmentType === 'practice' ? allExercisesHaveContent : songVideoId)
                    ? 1
                    : 0.5,
              }}
            >
              {isSavingAssignment
                ? t('generator.saving')
                : editingAssignmentId
                  ? t('common.update')
                  : t('classroom.assign')}
            </button>
          </div>
          {/* Timeline and Transcript rows - shown in both modes */}
          <>
            {/* Row 2: Timeline */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
              <span className={practiceStyles.exerciseTimelineLabel} style={{ minWidth: '70px' }}>
                {t('classroom.timeline')}
              </span>
              <div className={practiceStyles.exerciseTimeline}>
                <div className={practiceStyles.exerciseTimelineLine} />
                <div className={practiceStyles.exerciseCircles}>
                  {exercises.map((exercise, index) => {
                    // Check if this exercise has content
                    const hasContent =
                      index === currentExerciseIndex
                        ? currentHasContent
                        : exerciseHasContent(exercise)
                    // Check if this exercise has a transcript
                    const hasTranscript =
                      index === currentExerciseIndex
                        ? currentExerciseTranscript.trim().length > 0
                        : (exercise.transcript || '').trim().length > 0
                    // Check if this is a song exercise
                    const isSongExercise = exercise.type === 'song' && exercise.songData?.videoId
                    return (
                      <div key={exercise.id} className={practiceStyles.exerciseCircleWrapper}>
                        <button
                          className={`${practiceStyles.exerciseCircle} ${index === currentExerciseIndex ? practiceStyles.exerciseCircleActive : ''} ${!hasContent ? practiceStyles.exerciseCircleEmpty : ''}`}
                          onClick={() => handleSwitchExercise(index)}
                          title={
                            isSongExercise
                              ? `${exercise.name} (Song: ${exercise.songData?.videoTitle})`
                              : hasContent
                                ? exercise.name
                                : `${exercise.name} (no content)`
                          }
                        >
                          {index + 1}
                        </button>
                        {hasContent && (
                          <span
                            className={practiceStyles.exerciseCircleReady}
                            title={isSongExercise ? 'Song applied' : 'Ready for assignment'}
                          >
                            <PiCheckCircleFill size={12} />
                          </span>
                        )}
                        {hasTranscript && (
                          <span
                            className={practiceStyles.exerciseCircleTranscript}
                            title="Has transcript"
                          >
                            <PiChatCircleFill size={12} />
                          </span>
                        )}
                        {exercises.length > 1 && index === currentExerciseIndex && (
                          <button
                            className={practiceStyles.exerciseCircleRemove}
                            onClick={e => {
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
              <label
                style={{
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  color: 'var(--primary-purple)',
                  whiteSpace: 'nowrap',
                  minWidth: '70px',
                }}
              >
                {t('classroom.transcript')}
              </label>
              <input
                type="text"
                className={practiceStyles.assignmentTitleInput}
                style={{ flex: 1 }}
                value={currentExerciseTranscript}
                onChange={e => setCurrentExerciseTranscript(e.target.value)}
                placeholder={t('classroom.transcriptPlaceholder')}
              />
            </div>
          </>
        </div>

        {/* Assignment Type Toggle - Centered below header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '1rem',
            padding: '1.5rem 0',
          }}
        >
          <button
            onClick={() => setAssignmentType('practice')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              border:
                assignmentType === 'practice'
                  ? '2px solid var(--primary-purple)'
                  : '2px solid var(--gray-500)',
              background:
                assignmentType === 'practice' ? 'var(--primary-purple-alpha-15)' : 'transparent',
              color: assignmentType === 'practice' ? 'var(--primary-purple)' : 'var(--gray-200)',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {instrument === 'keyboard' && <PiPianoKeysFill size={20} />}
            {instrument === 'guitar' && <GiGuitarHead size={20} />}
            {instrument === 'bass' && <GiGuitarBassHead size={20} />}
            Generator
          </button>
          <button
            onClick={() => setAssignmentType('songs')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.75rem 1.5rem',
              borderRadius: '12px',
              border:
                assignmentType === 'songs'
                  ? '2px solid var(--primary-purple)'
                  : '2px solid var(--gray-500)',
              background:
                assignmentType === 'songs' ? 'var(--primary-purple-alpha-15)' : 'transparent',
              color: assignmentType === 'songs' ? 'var(--primary-purple)' : 'var(--gray-200)',
              fontWeight: 600,
              fontSize: '1rem',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            <PiMusicNotesFill size={20} />
            Song
          </button>
        </div>

        {/* Practice Assignment: Instrument Display */}
        {assignmentType === 'practice' && (
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
              mode: flashingInputs.mode || activeInputs.mode,
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
        )}

        {/* Song Assignment: Using Songs page styles */}
        {assignmentType === 'songs' && (
          <div className={songStyles.songsContainer} style={{ padding: '1rem 2rem' }}>
            {/* Search Section */}
            <form
              className={songStyles.searchSection}
              onSubmit={e => {
                e.preventDefault()
                handleSongSearch(songSearchQuery)
              }}
            >
              <div className={songStyles.searchInputWrapper}>
                <PiMagnifyingGlass className={songStyles.searchIcon} />
                <input
                  type="text"
                  className={songStyles.searchInput}
                  placeholder="Search YouTube for a song..."
                  value={songSearchQuery}
                  onChange={e => setSongSearchQuery(e.target.value)}
                />
                {songSearchQuery && (
                  <button
                    type="button"
                    className={songStyles.clearSearchButton}
                    onClick={() => {
                      setSongSearchQuery('')
                      setSongSearchResults([])
                    }}
                    aria-label="Clear"
                  >
                    <PiX />
                  </button>
                )}
              </div>
              <button type="submit" className={songStyles.loadButton} disabled={isSearchingSongs}>
                {isSearchingSongs ? 'Searching...' : 'Search'}
              </button>
            </form>

            {/* Search Results */}
            {songSearchResults.length > 0 && (
              <div className={songStyles.resultsSection}>
                <div className={songStyles.resultsSectionHeader}>
                  <h2 className={songStyles.sectionTitle}>Search Results</h2>
                  <span className={songStyles.resultsCount}>
                    {songSearchResults.length} results
                  </span>
                </div>
                <div className={songStyles.searchResultsList}>
                  {songSearchResults.map(result => (
                    <div
                      key={result.videoId}
                      className={songStyles.searchResultItem}
                      onClick={() => handleSelectSong(result)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => e.key === 'Enter' && handleSelectSong(result)}
                    >
                      <img
                        src={`https://i.ytimg.com/vi/${result.videoId}/mqdefault.jpg`}
                        alt={result.title}
                        className={songStyles.resultThumbnail}
                      />
                      <div className={songStyles.resultInfo}>
                        <span className={songStyles.resultTitle}>{result.title}</span>
                        <span className={songStyles.resultAuthor}>{result.author}</span>
                        <div className={songStyles.resultMeta}>
                          <span className={songStyles.resultDuration}>
                            {formatSongTime(result.lengthSeconds)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hidden YouTube Player Container */}
            <div ref={songPlayerContainerRef} style={{ position: 'absolute', left: '-9999px' }} />

            {/* Selected Song Player - Exact match of Songs page */}
            {songVideoId && (
              <div className={songStyles.playerSection}>
                <div className={songStyles.playerHeader}>
                  <div className={songStyles.playerTrackInfo}>
                    <img
                      src={`https://i.ytimg.com/vi/${songVideoId}/mqdefault.jpg`}
                      alt={songVideoTitle}
                      className={songStyles.playerArtwork}
                    />
                    <div className={songStyles.playerTrackDetails}>
                      <h2 className={songStyles.nowPlaying}>{songVideoTitle}</h2>
                      <p className={songStyles.playerArtist}>YouTube</p>
                    </div>
                  </div>
                  <button
                    className={`${songStyles.controlButton} ${songIsLooping ? songStyles.controlButtonActive : ''}`}
                    onClick={() => setSongIsLooping(!songIsLooping)}
                    aria-label="Loop"
                    title="Loop"
                  >
                    <PiRepeat />
                  </button>
                  <div className={songStyles.volumeControl}>
                    <SongVolumeIcon className={songStyles.volumeIcon} />
                    <input
                      type="range"
                      className={songStyles.volumeSlider}
                      min={0}
                      max={100}
                      step={1}
                      value={songVolume}
                      onChange={handleSongVolumeChange}
                      style={{ '--volume-percent': `${songVolume}%` } as React.CSSProperties}
                    />
                  </div>
                  <button
                    className={songStyles.closePlayerButton}
                    onClick={handleClearSong}
                    aria-label="Close"
                  >
                    <PiX />
                  </button>
                </div>

                {/* Loading indicator */}
                {!songIsPlayerReady && (
                  <div className={songStyles.audioLoading}>Loading audio...</div>
                )}

                {/* Timeline with A-B markers */}
                <div className={songStyles.timelineSection}>
                  <div className={songStyles.timelineWrapper}>
                    {/* Waveform visualization - 1 bar per 0.1 seconds */}
                    <div className={songStyles.waveformContainer}>
                      {(() => {
                        const numBars = Math.min(600, Math.max(1, Math.ceil(songDuration * 10)))
                        const bars = songRealPeaks
                          ? resamplePeaks(songRealPeaks, numBars)
                          : generateFallbackWaveform(songVideoId, numBars)

                        return bars.map((height, i) => {
                          const barProgress = (i + 1) / numBars
                          const currentProgress =
                            songDuration > 0 ? songCurrentTime / songDuration : 0
                          const isPassed = barProgress <= currentProgress

                          return (
                            <div
                              key={i}
                              className={`${songStyles.waveformBar} ${isPassed ? songStyles.waveformBarPassed : ''}`}
                              style={{ height: `${height * 100}%` }}
                            />
                          )
                        })
                      })()}
                    </div>
                    {/* A-B marker visualization */}
                    {songMarkerA !== null && songDuration > 0 && (
                      <div
                        className={songStyles.markerA}
                        style={{ left: `${(songMarkerA / songDuration) * 100}%` }}
                        title={`A: ${formatSongTime(songMarkerA)}`}
                      />
                    )}
                    {songMarkerB !== null && songDuration > 0 && (
                      <div
                        className={songStyles.markerB}
                        style={{ left: `${(songMarkerB / songDuration) * 100}%` }}
                        title={`B: ${formatSongTime(songMarkerB)}`}
                      />
                    )}
                    {songMarkerA !== null && songMarkerB !== null && songDuration > 0 && (
                      <div
                        className={songStyles.abRange}
                        style={{
                          left: `${(songMarkerA / songDuration) * 100}%`,
                          width: `${((songMarkerB - songMarkerA) / songDuration) * 100}%`,
                        }}
                      />
                    )}
                    <input
                      type="range"
                      className={songStyles.timeline}
                      min={0}
                      max={songDuration || 100}
                      value={songCurrentTime}
                      onChange={handleSongSeek}
                      step={0.1}
                      disabled={!songIsPlayerReady}
                    />
                  </div>
                  <div className={songStyles.timeDisplay}>
                    <span>{formatSongTime(songCurrentTime)}</span>
                    <span>{formatSongTime(songDuration)}</span>
                  </div>
                </div>

                {/* Controls + Looper Grid */}
                <div className={songStyles.controlsGrid}>
                  <div className={songStyles.controlsLeft}>
                    <div className={songStyles.transportRow}>
                      <button
                        className={songStyles.controlButtonSmall}
                        onClick={() => handleSongSkip(-10)}
                        disabled={!songIsPlayerReady}
                        aria-label="Rewind 10 seconds"
                        title="Rewind 10s"
                      >
                        <PiArrowCounterClockwise />
                      </button>
                      <button
                        className={songStyles.controlButton}
                        onClick={toggleSongPlayPause}
                        disabled={!songIsPlayerReady}
                        aria-label={isSongPlaying ? 'Pause' : 'Play'}
                      >
                        {isSongPlaying ? <PiPause /> : <PiPlay />}
                      </button>
                      <button
                        className={songStyles.controlButtonSmall}
                        onClick={() => handleSongSkip(10)}
                        disabled={!songIsPlayerReady}
                        aria-label="Forward 10 seconds"
                        title="Forward 10s"
                      >
                        <PiArrowClockwise />
                      </button>
                    </div>
                    <div className={songStyles.speedControl}>
                      <div className={songStyles.speedButtons}>
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map(speed => (
                          <button
                            key={speed}
                            className={`${songStyles.speedButton} ${songPlaybackRate === speed ? songStyles.speedButtonActive : ''}`}
                            onClick={() => setSongPlaybackRate(speed)}
                          >
                            {speed}x
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className={songStyles.abControls}>
                    <span className={songStyles.controlLabel}>Looper</span>
                    <div className={songStyles.abButtons}>
                      <button
                        className={`${songStyles.markerButton} ${songMarkerA !== null ? songStyles.markerButtonSet : ''}`}
                        onClick={setMarkerAAtCurrent}
                        disabled={!songIsPlayerReady}
                        title="Set marker A at current position"
                      >
                        A {songMarkerA !== null && `(${formatSongTime(songMarkerA)})`}
                      </button>
                      <button
                        className={`${songStyles.markerButton} ${songMarkerB !== null ? songStyles.markerButtonSet : ''}`}
                        onClick={setMarkerBAtCurrent}
                        disabled={songMarkerA === null || !songIsPlayerReady}
                        title="Set marker B at current position"
                      >
                        B {songMarkerB !== null && `(${formatSongTime(songMarkerB)})`}
                      </button>
                      <button
                        className={`${songStyles.abToggleButton} ${songIsABLooping ? songStyles.abToggleButtonActive : ''}`}
                        onClick={toggleSongABLoop}
                        disabled={songMarkerA === null || songMarkerB === null}
                        title="Toggle A-B loop"
                      >
                        <PiRepeat />
                      </button>
                      <button
                        className={songStyles.clearMarkersButton}
                        onClick={clearSongMarkers}
                        disabled={songMarkerA === null && songMarkerB === null}
                        title="Clear markers"
                      >
                        <PiTrash />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Assign Buttons */}
                {/* Apply Buttons - Add song to exercise timeline */}
                {(() => {
                  // Check if current exercise has this song applied
                  const currentExercise = exercises[currentExerciseIndex]
                  const isLoopApplied =
                    currentExercise?.type === 'song' &&
                    currentExercise?.songData?.videoId === songVideoId &&
                    currentExercise?.songData?.markerA !== null &&
                    currentExercise?.songData?.markerB !== null
                  const isEntireTrackApplied =
                    currentExercise?.type === 'song' &&
                    currentExercise?.songData?.videoId === songVideoId &&
                    currentExercise?.songData?.markerA === null &&
                    currentExercise?.songData?.markerB === null

                  return (
                    <div
                      style={{
                        display: 'flex',
                        gap: '1rem',
                        marginTop: '1rem',
                        justifyContent: 'center',
                      }}
                    >
                      <button
                        onClick={() => applySongToExercise(true)}
                        disabled={songMarkerA === null || songMarkerB === null}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '10px',
                          border: 'none',
                          background: isLoopApplied
                            ? 'var(--green-500)'
                            : songMarkerA !== null && songMarkerB !== null
                              ? 'var(--primary-purple)'
                              : 'var(--gray-600)',
                          color: 'white',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          cursor:
                            songMarkerA !== null && songMarkerB !== null
                              ? 'pointer'
                              : 'not-allowed',
                          opacity: songMarkerA !== null && songMarkerB !== null ? 1 : 0.5,
                          transition: 'all 0.2s ease',
                        }}
                        title={
                          songMarkerA === null || songMarkerB === null
                            ? 'Set A and B markers first'
                            : isLoopApplied
                              ? 'Loop applied to exercise'
                              : 'Apply the looped section as an exercise'
                        }
                      >
                        {isLoopApplied ? <PiCheckCircleFill size={18} /> : <PiRepeat size={18} />}
                        {isLoopApplied ? 'Applied Loop' : 'Apply Loop'}
                      </button>
                      <button
                        onClick={() => applySongToExercise(false)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem 1.5rem',
                          borderRadius: '10px',
                          border: isEntireTrackApplied ? 'none' : '2px solid var(--primary-purple)',
                          background: isEntireTrackApplied ? 'var(--green-500)' : 'transparent',
                          color: isEntireTrackApplied ? 'white' : 'var(--primary-purple)',
                          fontWeight: 600,
                          fontSize: '0.9rem',
                          cursor: 'pointer',
                          opacity: 1,
                          transition: 'all 0.2s ease',
                        }}
                        title={
                          isEntireTrackApplied
                            ? 'Entire track applied to exercise'
                            : 'Apply the entire song as an exercise'
                        }
                      >
                        {isEntireTrackApplied ? (
                          <PiCheckCircleFill size={18} />
                        ) : (
                          <PiMusicNotesFill size={18} />
                        )}
                        {isEntireTrackApplied ? 'Applied Entire Track' : 'Apply Entire Track'}
                      </button>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Empty State */}
            {!songVideoId && songSearchResults.length === 0 && (
              <div className={songStyles.emptyState}>
                <p className={songStyles.emptyStateText}>
                  Search for a YouTube song to assign to students
                </p>
              </div>
            )}
          </div>
        )}
      </>
    )
  }

  // ========== RENDER: Classroom Detail View ==========
  if (viewMode === 'classroom' && selectedClassroom) {
    return (
      <>
        <ClassroomDetail
          classroom={selectedClassroom}
          userId={user?.id ?? null}
          completedAssignmentIds={completedAssignmentIds}
          joiningClassId={joiningClassId}
          isEditing={isEditingClassroom}
          editTitle={editTitle}
          editDescription={editDescription}
          isSavingEdit={isSavingEdit}
          onEditTitleChange={setEditTitle}
          onEditDescriptionChange={setEditDescription}
          onStartEdit={handleStartEditClassroom}
          onCancelEdit={handleCancelEditClassroom}
          onSaveEdit={handleSaveClassroom}
          onBack={() => {
            setSelectedClassroom(null)
            setViewMode('list')
          }}
          onDelete={handleDeleteClassroom}
          onJoin={handleJoinClassroom}
          onLeave={handleLeaveClassroom}
          onRemoveStudent={handleRemoveStudent}
          onDeleteAssignment={handleDeleteAssignment}
          onStartAssignment={handleStartAssignment}
          onEditAssignment={handleEditAssignment}
          onCreateAssignment={handleCreateAssignment}
        />
        <CreateClassroomModal
          isOpen={isModalOpen}
          isDarkMode={isDarkMode}
          error={error}
          title={newTitle}
          description={newDescription}
          isPublic={isPublic}
          creating={creating}
          onTitleChange={setNewTitle}
          onDescriptionChange={setNewDescription}
          onPublicChange={setIsPublic}
          onSubmit={handleCreateClassroom}
          onClose={handleCloseModal}
        />
        <JoinClassroomModal
          isOpen={isJoinModalOpen}
          isDarkMode={isDarkMode}
          joinError={joinError}
          joinCode={joinCode}
          isJoining={isJoining}
          onCodeChange={setJoinCode}
          onSubmit={handleJoinByCode}
          onClose={handleCloseJoinModal}
        />
        <AssignmentTitleModal
          isOpen={showAssignTitleModal}
          isEditing={!!editingAssignmentId}
          assignmentError={assignmentError}
          title={assignmentTitle}
          instrumentName={instrumentNames[instrument]}
          bpm={bpm}
          beats={numberOfBeats}
          hasChords={scaleChordManagement.appliedChords.length > 0}
          isSaving={isSavingAssignment}
          onTitleChange={setAssignmentTitle}
          onSave={handleSaveAssignment}
          onClose={handleCloseAssignModal}
        />
      </>
    )
  }

  // ========== RENDER: Class List View (extracted to ClassroomList) ==========
  return (
    <>
      <ClassroomList
        classrooms={classrooms}
        userId={user?.id ?? null}
        loading={loading}
        searchQuery={searchQuery}
        error={error}
        onSearchChange={setSearchQuery}
        onSelectClassroom={classroom => {
          setSelectedClassroom(classroom as unknown as ClassroomData)
          setViewMode('classroom')
        }}
        onOpenCreateModal={handleOpenModal}
        onOpenJoinModal={handleOpenJoinModal}
        isTutorialActive={isTutorialActive}
        tutorialStep={tutorialStep}
        onTutorialNext={tutorialNextStep}
        onTutorialPrev={tutorialPrevStep}
        onTutorialSkip={skipTutorial}
        onTutorialComplete={completeTutorial}
        shouldShowTutorial={shouldShowTutorial}
        onStartTutorial={startTutorial}
      />
      <CreateClassroomModal
        isOpen={isModalOpen}
        isDarkMode={isDarkMode}
        error={error}
        title={newTitle}
        description={newDescription}
        isPublic={isPublic}
        creating={creating}
        onTitleChange={setNewTitle}
        onDescriptionChange={setNewDescription}
        onPublicChange={setIsPublic}
        onSubmit={handleCreateClassroom}
        onClose={handleCloseModal}
      />
      <JoinClassroomModal
        isOpen={isJoinModalOpen}
        isDarkMode={isDarkMode}
        joinError={joinError}
        joinCode={joinCode}
        isJoining={isJoining}
        onCodeChange={setJoinCode}
        onSubmit={handleJoinByCode}
        onClose={handleCloseJoinModal}
      />
      <AssignmentTitleModal
        isOpen={showAssignTitleModal}
        isEditing={!!editingAssignmentId}
        assignmentError={assignmentError}
        title={assignmentTitle}
        instrumentName={instrumentNames[instrument]}
        bpm={bpm}
        beats={numberOfBeats}
        hasChords={scaleChordManagement.appliedChords.length > 0}
        isSaving={isSavingAssignment}
        onTitleChange={setAssignmentTitle}
        onSave={handleSaveAssignment}
        onClose={handleCloseAssignModal}
      />
    </>
  )
}

export default Classroom
