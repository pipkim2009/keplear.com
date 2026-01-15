/**
 * Classroom Page - View and create classrooms
 * Now includes embedded instrument UI for creating assignments and taking lessons
 */

import { useState, useEffect, useCallback, useContext, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '../../lib/supabase'
import AuthContext from '../../contexts/AuthContext'
import { useInstrument } from '../../contexts/InstrumentContext'
import InstrumentDisplay from '../instruments/shared/InstrumentDisplay'
import { useDSPPitchDetection, usePerformanceGrading } from '../../hooks'
import { LiveFeedback } from '../practice'
import type { PitchDetectionResult } from '../../hooks/usePitchDetection'
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
import styles from '../../styles/Classroom.module.css'
import practiceStyles from '../../styles/Practice.module.css'

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

const instrumentNames: Record<string, string> = {
  keyboard: 'Keyboard',
  guitar: 'Guitar',
  bass: 'Bass'
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
  const hasSpoken = useRef(false)

  useEffect(() => {
    if ('speechSynthesis' in window && !hasSpoken.current) {
      hasSpoken.current = true
      const utterance = new SpeechSynthesisUtterance(message)
      utterance.rate = 0.9
      utterance.pitch = 1
      utterance.volume = 1
      utterance.onend = () => {
        if (onSpeechEnd) onSpeechEnd()
      }
      window.speechSynthesis.speak(utterance)
    } else if (!('speechSynthesis' in window) && onSpeechEnd) {
      onSpeechEnd()
    }

    const timer = setTimeout(() => setIsVisible(false), 5000)
    return () => clearTimeout(timer)
  }, [message, onSpeechEnd])

  if (!isVisible) return null
  return <div className={practiceStyles.welcomeSubtitle}>{message}</div>
}

type ViewMode = 'list' | 'classroom' | 'creating-assignment' | 'taking-lesson'

function Classroom() {
  const authContext = useContext(AuthContext)
  const user = authContext?.user ?? null

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

  // Search state
  const [searchQuery, setSearchQuery] = useState('')

  // Assignment creation state
  const [assigningToClassroomId, setAssigningToClassroomId] = useState<string | null>(null)
  const [showAssignTitleModal, setShowAssignTitleModal] = useState(false)
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)

  // Multi-exercise state for assignment editor
  const [exercises, setExercises] = useState<ExerciseData[]>([])
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)

  // Lesson taking state
  const [currentAssignment, setCurrentAssignment] = useState<AssignmentData | null>(null)
  const [pendingSelectionData, setPendingSelectionData] = useState<any>(null)
  const [lessonExercises, setLessonExercises] = useState<ExerciseData[]>([])
  const [lessonExerciseIndex, setLessonExerciseIndex] = useState(0)
  const [externalSelectedNoteIds, setExternalSelectedNoteIds] = useState<string[]>([])
  const [welcomeSpeechDone, setWelcomeSpeechDone] = useState(false)
  const [hasGeneratedMelody, setHasGeneratedMelody] = useState(false)
  const [autoPlayAudio, setAutoPlayAudio] = useState(false)
  const [melodySetupMessage, setMelodySetupMessage] = useState<string>('')
  const [congratulationsMessage, setCongratulationsMessage] = useState<string>('')
  const hasInitializedNotes = useRef(false)
  const hasAnnouncedMelody = useRef(false)

  // DSP-based pitch detection and performance grading hooks
  const pitchDetection = useDSPPitchDetection({ instrument: instrument as 'keyboard' | 'guitar' | 'bass' })
  const performanceGrading = usePerformanceGrading()

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
              bpm: data.bpm || 120,
              beats: data.beats || 4,
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
            bpm: data.bpm || 120,
            beats: data.beats || 4,
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
      setError('Please log in to join a classroom')
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
      setError('Please enter a title')
      return
    }
    if (!user) {
      setError('You must be logged in to create a classroom')
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
          created_by: user.id,
          is_public: isPublic,
          join_code: joinCodeValue
        })
      if (insertError) {
        setError(insertError.message)
        return
      }
      setNewTitle('')
      setIsPublic(true)
      setIsModalOpen(false)
      fetchClassrooms()
    } catch (err) {
      setError('An error occurred while creating the classroom')
      console.error('Error creating classroom:', err)
    } finally {
      setCreating(false)
    }
  }

  // Join classroom by code
  const handleJoinByCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode.trim()) {
      setJoinError('Please enter a class code')
      return
    }
    if (!user) {
      setJoinError('You must be logged in to join a classroom')
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
        setJoinError('Invalid class code. Please check and try again.')
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
        setJoinError('You are already a member of this class')
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
      setJoinError('An error occurred while joining the classroom')
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
    setViewMode('creating-assignment')
  }

  // Cancel assignment creation
  const handleCancelAssignment = () => {
    setAssigningToClassroomId(null)
    clearSelection()
    triggerClearChordsAndScales()
    setExercises([])
    setCurrentExerciseIndex(0)
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

    // Clear instrument for new exercise
    clearSelection()
    triggerClearChordsAndScales()

    // Switch to new exercise
    setCurrentExerciseIndex(prev => exercises.length > 0 ? exercises.length : 0)
  }, [saveCurrentToExercise, currentExerciseIndex, exercises.length, clearSelection, triggerClearChordsAndScales, bpm, numberOfBeats, chordMode, lowerOctaves, higherOctaves])

  // Switch to a different exercise
  const handleSwitchExercise = useCallback((index: number) => {
    if (index === currentExerciseIndex || index < 0 || index >= exercises.length) return

    // Save current state before switching - merge intelligently
    const currentData = saveCurrentToExercise()
    setExercises(prev => {
      const updated = [...prev]
      const existingExercise = updated[currentExerciseIndex]
      updated[currentExerciseIndex] = {
        ...existingExercise,
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
      return updated
    })

    // Clear current selection
    clearSelection()
    scaleChordManagement.setAppliedScalesDirectly([])
    scaleChordManagement.setAppliedChordsDirectly([])

    // Load the target exercise data
    const targetExercise = exercises[index]
    if (targetExercise) {
      // Apply BPM, beats, chord mode, and octave range
      if (targetExercise.bpm) setBpm(targetExercise.bpm)
      if (targetExercise.beats) setNumberOfBeats(targetExercise.beats)
      if (targetExercise.chordMode) setChordMode(targetExercise.chordMode)
      // Apply octave range (use defaults if not set for backward compatibility)
      const targetLower = targetExercise.lowerOctaves ?? 0
      const targetHigher = targetExercise.higherOctaves ?? 0
      handleOctaveRangeChange(targetLower, targetHigher)

      setTimeout(() => {
        // Apply scales from exercise
        if (targetExercise.appliedScales?.length > 0) {
          if (instrument === 'keyboard') {
            targetExercise.appliedScales.forEach((scaleData) => {
              const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
              if (scaleObj) {
                scaleChordManagement.handleKeyboardScaleApply(scaleData.root, scaleObj, scaleData.octave || 4)
              }
            })
          }
          // TODO: Add guitar/bass scale loading similar to lesson mode
        }

        // Apply chords from exercise
        if (targetExercise.appliedChords?.length > 0) {
          setChordMode('progression')
          if (instrument === 'keyboard') {
            targetExercise.appliedChords.forEach((chordData) => {
              const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
              if (chordObj) {
                scaleChordManagement.handleKeyboardChordApply(chordData.root, chordObj, chordData.octave || 4)
              }
            })
          }
          // TODO: Add guitar/bass chord loading similar to lesson mode
        }

        // Apply notes from exercise (use target exercise octave range)
        if (targetExercise.selectedNoteIds?.length > 0 && instrument === 'keyboard') {
          targetExercise.selectedNoteIds.forEach((noteId) => {
            const noteObj = getKeyboardNoteById(noteId, targetLower, targetHigher)
            if (noteObj) selectNote(noteObj, 'multi')
          })
        }
      }, 100)
    }

    setCurrentExerciseIndex(index)
  }, [currentExerciseIndex, exercises, saveCurrentToExercise, clearSelection, scaleChordManagement, instrument, setChordMode, selectNote, handleOctaveRangeChange])

  // Remove an exercise
  const handleRemoveExercise = useCallback((index: number) => {
    if (exercises.length <= 1) return // Keep at least one exercise

    setExercises(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Rename exercises sequentially
      return updated.map((exercise, i) => ({
        ...exercise,
        name: `Exercise ${i + 1}`
      }))
    })

    // Adjust current index if needed
    if (currentExerciseIndex >= exercises.length - 1) {
      setCurrentExerciseIndex(Math.max(0, exercises.length - 2))
    } else if (index < currentExerciseIndex) {
      setCurrentExerciseIndex(prev => prev - 1)
    }
  }, [exercises.length, currentExerciseIndex])

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
      setAssignmentError('Please enter a title')
      return
    }
    if (!user || !assigningToClassroomId) {
      setAssignmentError('Invalid session')
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
      // Exercise timeline array
      exercises: updatedExercises.map(exercise => ({
        id: exercise.id,
        name: exercise.name,
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
          selection_data: hasAnyContent ? selectionData : null,
          created_by: user.id
        })

      if (insertError) {
        setAssignmentError(insertError.message)
        return
      }

      // Success - go back to classroom view
      const savedClassroomId = assigningToClassroomId
      setAssignmentTitle('')
      setAssigningToClassroomId(null)
      clearSelection()
      triggerClearChordsAndScales()
      setExercises([])
      setCurrentExerciseIndex(0)

      // Navigate to the classroom where assignment was saved
      const targetClassroom = classrooms.find(c => c.id === savedClassroomId)
      if (targetClassroom) {
        setSelectedClassroom(targetClassroom)
      }
      setViewMode('classroom')
      fetchClassrooms()
    } catch (err) {
      setAssignmentError('An error occurred while saving')
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
    setHasGeneratedMelody(false)
    setAutoPlayAudio(false)
    setMelodySetupMessage('')
    setCongratulationsMessage('')

    // Set up instrument
    setInstrument(assignment.instrument as 'keyboard' | 'guitar' | 'bass')
    setBpm(assignment.bpm)
    setNumberOfBeats(assignment.beats)

    // Clear ALL existing content (notes, scales, chords)
    clearSelection()
    scaleChordManagement.setAppliedScalesDirectly([])
    scaleChordManagement.setAppliedChordsDirectly([])
    setExternalSelectedNoteIds([])

    // Initialize exercises from assignment
    const selectionData = assignment.selection_data
    if (selectionData?.exercises && selectionData.exercises.length > 0) {
      // Map exercises with fallback for bpm/beats
      setLessonExercises(selectionData.exercises.map((ex: any) => ({
        ...ex,
        bpm: ex.bpm || assignment.bpm,
        beats: ex.beats || assignment.beats
      })))
    } else if (selectionData) {
      // Legacy format - single exercise from top-level fields
      setLessonExercises([{
        id: 'legacy-exercise',
        name: 'Exercise 1',
        bpm: assignment.bpm,
        beats: assignment.beats,
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

  // End lesson
  const handleEndLesson = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    pitchDetection.stopListening()
    performanceGrading.stopPerformance()
    setCurrentAssignment(null)
    setPendingSelectionData(null)
    setExternalSelectedNoteIds([])
    setLessonExercises([])
    setLessonExerciseIndex(0)
    clearSelection()
    triggerClearChordsAndScales()
    setViewMode('classroom')
  }

  // Switch to a different exercise in lesson mode
  const handleSwitchLessonExercise = useCallback((index: number) => {
    if (index === lessonExerciseIndex || index < 0 || index >= lessonExercises.length || !currentAssignment) return

    // Clear current content
    clearSelection()
    scaleChordManagement.setAppliedScalesDirectly([])
    scaleChordManagement.setAppliedChordsDirectly([])
    setExternalSelectedNoteIds([])

    // Reset melody state for new exercise
    setHasGeneratedMelody(false)
    setAutoPlayAudio(false)
    setMelodySetupMessage('')
    hasAnnouncedMelody.current = false

    // Load the target exercise
    const targetExercise = lessonExercises[index]
    if (targetExercise) {
      // Apply BPM, beats, and chord mode from exercise
      if (targetExercise.bpm) setBpm(targetExercise.bpm)
      if (targetExercise.beats) setNumberOfBeats(targetExercise.beats)
      if (targetExercise.chordMode) setChordMode(targetExercise.chordMode)
      // Apply octave range from exercise (use defaults if not set)
      const targetLower = targetExercise.lowerOctaves ?? 0
      const targetHigher = targetExercise.higherOctaves ?? 0
      handleOctaveRangeChange(targetLower, targetHigher)
    }

    if (targetExercise && currentAssignment.instrument === 'keyboard') {
      // Use exercise-level octave range or fall back to assignment-level
      const targetLower = targetExercise.lowerOctaves ?? 0
      const targetHigher = targetExercise.higherOctaves ?? 0

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
      }, 100)
    }
    // TODO: Add guitar/bass exercise switching

    setLessonExerciseIndex(index)
  }, [lessonExerciseIndex, lessonExercises, currentAssignment, clearSelection, scaleChordManagement, setChordMode, selectNote, handleOctaveRangeChange])

  // Auto-advance to next exercise or end lesson
  const handleExerciseComplete = useCallback(() => {
    if (lessonExerciseIndex < lessonExercises.length - 1) {
      // More exercises available - advance to next
      handleSwitchLessonExercise(lessonExerciseIndex + 1)
    } else {
      // Last exercise - end lesson
      handleEndLesson()
    }
  }, [lessonExerciseIndex, lessonExercises.length, handleSwitchLessonExercise, handleEndLesson])

  // Apply assignment selection data when in lesson mode (first exercise)
  useEffect(() => {
    if (viewMode !== 'taking-lesson' || !currentAssignment || hasInitializedNotes.current) return
    if (lessonExercises.length === 0) return

    hasInitializedNotes.current = true
    const currentExercise = lessonExercises[0] // Start with first exercise

    // For keyboard, apply immediately; for guitar/bass, store as pending
    if (currentAssignment.instrument === 'keyboard') {
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
      }, 300)
    } else {
      // Guitar/Bass - store pending data
      setPendingSelectionData({
        instrument: currentAssignment.instrument,
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
        } else if (pendingInstrument === 'bass') {
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
    }, 300)

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

  // Announce melody when ready
  useEffect(() => {
    if (viewMode !== 'taking-lesson') return
    if (welcomeSpeechDone && generatedMelody.length > 0 && recordedAudioBlob && !hasAnnouncedMelody.current) {
      hasAnnouncedMelody.current = true
      setMelodySetupMessage('I have set up a melody for you to attempt')
    }
  }, [viewMode, welcomeSpeechDone, generatedMelody, recordedAudioBlob])

  // Pitch detection handlers
  const handleStartPracticeWithFeedback = useCallback(() => {
    if (generatedMelody.length > 0) {
      if (currentAssignment) {
        pitchDetection.setInstrument(currentAssignment.instrument as 'keyboard' | 'guitar' | 'bass')
      }
      performanceGrading.startPerformance(generatedMelody, melodyBpm)
      pitchDetection.startListening()
    } else {
      pitchDetection.startListening()
    }
  }, [generatedMelody, currentAssignment, melodyBpm, performanceGrading, pitchDetection])

  const handleStopPracticeWithFeedback = useCallback(() => {
    pitchDetection.stopListening()
    performanceGrading.stopPerformance()
  }, [pitchDetection, performanceGrading])

  // Pass pitch detection results to grading system
  useEffect(() => {
    if (currentPitchForGrading && performanceGrading.state.isActive) {
      performanceGrading.processPitch(currentPitchForGrading)
    }
  }, [currentPitchForGrading, performanceGrading.state.isActive, performanceGrading.processPitch])

  const handleOpenModal = () => {
    if (!user) {
      setError('Please log in to create a classroom')
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
      setError('Please log in to join a classroom')
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
          <h2 className={styles.modalTitle}>Create Classroom</h2>
          <button className={styles.closeButton} onClick={handleCloseModal} aria-label="Close">×</button>
        </div>
        <form className={styles.form} onSubmit={handleCreateClassroom}>
          {error && <div className={styles.errorMessage}>{error}</div>}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="classroomTitle">Title</label>
            <input
              id="classroomTitle"
              type="text"
              className={styles.formInput}
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter classroom title"
              autoFocus
              disabled={creating}
            />
          </div>
          <div className={styles.formGroup}>
            <label className={styles.formLabel}>Visibility</label>
            <div className={styles.visibilityOptions}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={isPublic}
                  onChange={() => setIsPublic(true)}
                  disabled={creating}
                />
                <span className={styles.checkboxText}>Public - Anyone can see and join this class</span>
              </label>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  className={styles.checkbox}
                  checked={!isPublic}
                  onChange={() => setIsPublic(false)}
                  disabled={creating}
                />
                <span className={styles.checkboxText}>Private - Only users with the class code can join</span>
              </label>
            </div>
          </div>
          <button type="submit" className={styles.submitButton} disabled={creating || !newTitle.trim()}>
            {creating ? 'Creating...' : 'Create Classroom'}
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
          <h2 className={styles.modalTitle}>Join Classroom</h2>
          <button className={styles.closeButton} onClick={handleCloseJoinModal} aria-label="Close">×</button>
        </div>
        <form className={styles.form} onSubmit={handleJoinByCode}>
          {joinError && <div className={styles.errorMessage}>{joinError}</div>}
          <div className={styles.formGroup}>
            <label className={styles.formLabel} htmlFor="joinCode">Class Code</label>
            <input
              id="joinCode"
              type="text"
              className={`${styles.formInput} ${styles.codeInput}`}
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="XXXXXX"
              autoFocus
              disabled={isJoining}
              maxLength={6}
            />
          </div>
          <button type="submit" className={styles.submitButton} disabled={isJoining || !joinCode.trim()}>
            {isJoining ? 'Joining...' : 'Join Classroom'}
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
          <h2 className={practiceStyles.assignModalTitle}>Create Assignment</h2>
          <button className={practiceStyles.assignModalClose} onClick={handleCloseAssignModal} aria-label="Close">×</button>
        </div>
        <div className={practiceStyles.assignModalContent}>
          {assignmentError && <div className={practiceStyles.assignModalError}>{assignmentError}</div>}
          <div className={practiceStyles.assignModalField}>
            <label className={practiceStyles.assignModalLabel} htmlFor="assignmentTitle">Assignment Title</label>
            <input
              id="assignmentTitle"
              type="text"
              className={practiceStyles.assignModalInput}
              value={assignmentTitle}
              onChange={(e) => setAssignmentTitle(e.target.value)}
              placeholder="Enter assignment title"
              autoFocus
              disabled={isSavingAssignment}
            />
          </div>
          <div className={practiceStyles.assignModalInfo}>
            <p><strong>Instrument:</strong> {instrumentNames[instrument]}</p>
            <p><strong>BPM:</strong> {bpm}</p>
            <p><strong>Beats:</strong> {numberOfBeats}</p>
            <p><strong>Type:</strong> {scaleChordManagement.appliedChords.length > 0 ? 'Chords' : 'Melodies'}</p>
          </div>
          <button
            className={practiceStyles.assignModalSubmit}
            onClick={handleSaveAssignment}
            disabled={isSavingAssignment || !assignmentTitle.trim()}
          >
            {isSavingAssignment ? 'Saving...' : 'Create Assignment'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )

  // ========== RENDER: Taking Lesson Mode ==========
  if (viewMode === 'taking-lesson' && currentAssignment) {
    const instrumentName = instrumentNames[currentAssignment.instrument] || 'Instrument'
    const welcomeMessage = `Welcome to your ${instrumentName} lesson`

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
        <div className={practiceStyles.backButtonContainer}>
          <button className={practiceStyles.backButton} onClick={handleEndLesson} aria-label="End practice session">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <button className={practiceStyles.doneButton} onClick={handleEndLesson} aria-label="Done with lesson">
            Done
          </button>
        </div>

        {/* Timeline for multi-exercise lessons */}
        {hasMultipleExercises && (
          <div className={practiceStyles.exerciseTimelineBar}>
            <span className={practiceStyles.exerciseTimelineLabel}>Timeline</span>
            <div className={`${practiceStyles.exerciseTimeline} ${practiceStyles.exerciseTimelineLesson}`}>
              <div className={practiceStyles.exerciseTimelineLine} />
              <div className={practiceStyles.exerciseCircles}>
                {lessonExercises.map((exercise, index) => (
                  <button
                    key={exercise.id}
                    className={`${practiceStyles.exerciseCircle} ${index === lessonExerciseIndex ? practiceStyles.exerciseCircleActive : ''}`}
                    onClick={() => handleSwitchLessonExercise(index)}
                    title={exercise.name}
                  >
                    {index + 1}
                  </button>
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
        />

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

        <WelcomeSubtitle message={welcomeMessage} onSpeechEnd={() => setWelcomeSpeechDone(true)} />
        {melodySetupMessage && <WelcomeSubtitle message={melodySetupMessage} onSpeechEnd={() => setAutoPlayAudio(true)} />}
        {congratulationsMessage && <WelcomeSubtitle message={congratulationsMessage} onSpeechEnd={handleExerciseComplete} />}
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
        {/* Row 1: Header with title and action buttons */}
        <div className={practiceStyles.assignmentModeBar}>
          <span className={practiceStyles.assignmentModeText}>Assignment Editor</span>
          <div className={practiceStyles.assignmentModeButtons}>
            <button className={practiceStyles.assignmentCancelButton} onClick={handleCancelAssignment}>
              Cancel
            </button>
            <button
              className={practiceStyles.assignmentAssignButton}
              onClick={handleSaveAssignment}
              disabled={!assigningToClassroomId || !assignmentTitle.trim() || !allExercisesHaveContent || isSavingAssignment}
              style={{ opacity: (assigningToClassroomId && assignmentTitle.trim() && allExercisesHaveContent) ? 1 : 0.5 }}
            >
              {isSavingAssignment ? 'Saving...' : 'Assign'}
            </button>
          </div>
        </div>

        {/* Row 2: Selectors for instrument, classroom, and title */}
        <div className={practiceStyles.assignmentSelectorsBar}>
          <select
            className={practiceStyles.instrumentSelector}
            value={instrument}
            onChange={(e) => {
              const newInstrument = e.target.value as 'keyboard' | 'guitar' | 'bass'
              handleInstrumentChange(newInstrument)
            }}
          >
            <option value="keyboard">Keyboard</option>
            <option value="guitar">Guitar</option>
            <option value="bass">Bass</option>
          </select>
          <select
            className={practiceStyles.classroomSelector}
            value={assigningToClassroomId || ''}
            onChange={(e) => setAssigningToClassroomId(e.target.value || null)}
          >
            <option value="">Select Classroom</option>
            {userClassrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>
                {classroom.title}
              </option>
            ))}
          </select>
          <input
            type="text"
            className={practiceStyles.assignmentTitleInput}
            value={assignmentTitle}
            onChange={(e) => setAssignmentTitle(e.target.value)}
            placeholder="Assignment title"
          />
        </div>

        {/* Timeline Bar */}
        <div className={practiceStyles.exerciseTimelineBar}>
          <span className={practiceStyles.exerciseTimelineLabel}>Timeline</span>
          <div className={practiceStyles.exerciseTimeline}>
            <div className={practiceStyles.exerciseTimelineLine} />
            <div className={practiceStyles.exerciseCircles}>
              {exercises.map((exercise, index) => {
                // Check if this exercise has content
                const hasContent = index === currentExerciseIndex
                  ? currentHasContent
                  : exerciseHasNotes(exercise)
                return (
                  <div key={exercise.id} className={practiceStyles.exerciseCircleWrapper}>
                    <button
                      className={`${practiceStyles.exerciseCircle} ${index === currentExerciseIndex ? practiceStyles.exerciseCircleActive : ''} ${!hasContent ? practiceStyles.exerciseCircleEmpty : ''}`}
                      onClick={() => handleSwitchExercise(index)}
                      title={hasContent ? exercise.name : `${exercise.name} (no notes selected)`}
                    >
                      {index + 1}
                    </button>
                    {exercises.length > 1 && index === currentExerciseIndex && (
                      <button
                        className={practiceStyles.exerciseCircleRemove}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveExercise(index)
                        }}
                        title="Remove exercise"
                      >
                        ×
                      </button>
                    )}
                  </div>
                )
              })}
              {exercises.length < 10 && (
                <button
                  className={practiceStyles.exerciseCircleAdd}
                  onClick={handleAddExercise}
                  title="Add new exercise"
                >
                  +
                </button>
              )}
            </div>
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
          externalSelectedNoteIds={externalSelectedNoteIds}
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
            <div className={styles.fullPageTitleRow}>
              <h1 className={styles.fullPageTitle}>{selectedClassroom.title}</h1>
              {isOwner && (
                <button
                  className={styles.deleteButton}
                  onClick={() => handleDeleteClassroom(selectedClassroom.id)}
                  title="Delete classroom"
                >
                  ×
                </button>
              )}
            </div>
            <p className={styles.fullPageAuthor}>by {selectedClassroom.profiles?.username ?? 'Unknown'}</p>
            <p className={styles.fullPageMeta}>Created {formatDate(selectedClassroom.created_at)}</p>

            {isOwner && !selectedClassroom.is_public && selectedClassroom.join_code && (
              <div className={styles.joinCodeDisplay}>
                <span className={styles.joinCodeLabel}>Class Code:</span>
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
                {joiningClassId === selectedClassroom.id ? 'Loading...' : joined ? 'Leave Class' : 'Join Class'}
              </button>
            )}
          </div>

          <div className={styles.fullPageContent}>
            <div className={styles.fullPageColumn}>
              <div className={styles.fullPageSectionHeader}>
                <h2 className={styles.fullPageSectionTitle}>Students</h2>
                <span className={styles.fullPageCount}>{studentCount}</span>
              </div>
              {studentCount === 0 ? (
                <p className={styles.fullPageEmpty}>No students enrolled yet</p>
              ) : (
                <div className={styles.fullPageStudentsList}>
                  {selectedClassroom.classroom_students.map((student) => (
                    <div key={student.user_id} className={styles.fullPageStudentItem}>
                      <div className={styles.studentAvatar}>
                        {(student.profiles?.username ?? 'U')[0].toUpperCase()}
                      </div>
                      <span className={styles.studentName}>{student.profiles?.username ?? 'Unknown'}</span>
                      {isOwner && (
                        <button
                          className={styles.removeStudentButton}
                          onClick={() => handleRemoveStudent(selectedClassroom.id, student.user_id)}
                          aria-label="Remove student"
                          title="Remove student"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.fullPageColumn}>
              <div className={styles.fullPageSectionHeader}>
                <h2 className={styles.fullPageSectionTitle}>Assignments</h2>
                {isOwner && (
                  <button
                    className={styles.addAssignmentButtonLarge}
                    onClick={() => handleCreateAssignment(selectedClassroom.id)}
                  >
                    + Add Assignment
                  </button>
                )}
              </div>
              {assignments.length === 0 ? (
                <p className={styles.fullPageEmpty}>No assignments yet</p>
              ) : (
                <div className={styles.fullPageAssignmentsList}>
                  {assignments.map((assignment) => (
                    <div key={assignment.id} className={styles.fullPageAssignmentItem}>
                      <div className={styles.fullPageAssignmentInfo}>
                        <h3 className={styles.fullPageAssignmentTitle}>{assignment.title}</h3>
                        <div className={styles.fullPageAssignmentDetails}>
                          <span className={styles.assignmentDetailTag}>{assignment.instrument}</span>
                          <span className={styles.assignmentDetailTag}>{assignment.lesson_type}</span>
                          <span className={styles.assignmentDetailTag}>{assignment.bpm} BPM</span>
                          <span className={styles.assignmentDetailTag}>{assignment.beats} beats</span>
                        </div>
                      </div>
                      <div className={styles.fullPageAssignmentActions}>
                        {user && (
                          <button
                            className={styles.startAssignmentButtonLarge}
                            onClick={() => handleStartAssignment(assignment)}
                          >
                            Start
                          </button>
                        )}
                        {isOwner && (
                          <button
                            className={styles.deleteAssignmentButton}
                            onClick={() => handleDeleteAssignment(assignment.id)}
                            title="Delete assignment"
                          >
                            ×
                          </button>
                        )}
                      </div>
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
    const studentCount = classroom.classroom_students?.length ?? 0
    const assignmentCount = classroom.assignments?.length ?? 0
    const isPrivate = !classroom.is_public
    const isOwner = user && classroom.created_by === user.id
    const isJoined = user && classroom.classroom_students?.some(s => s.user_id === user.id)

    return (
      <div
        key={classroom.id}
        className={styles.classCardClickable}
        onClick={() => { setSelectedClassroom(classroom); setViewMode('classroom') }}
      >
        <div className={styles.classTitleRow}>
          <h3 className={styles.classTitle}>{classroom.title}</h3>
          <div className={styles.tagGroup}>
            {showOwnershipBadge && isOwner && <span className={styles.ownerTag}>Owner</span>}
            {showOwnershipBadge && !isOwner && isJoined && <span className={styles.studentTag}>Student</span>}
            {isPrivate ? (
              <span className={styles.privateTag}>Private</span>
            ) : (
              <span className={styles.publicTag}>Public</span>
            )}
          </div>
        </div>
        <p className={styles.classAuthor}>by {classroom.profiles?.username ?? 'Unknown'}</p>
        <p className={styles.classMeta}>Created {formatDate(classroom.created_at)}</p>
        <div className={styles.classCardStats}>
          <span className={styles.statItem}>{studentCount} {studentCount === 1 ? 'student' : 'students'}</span>
          <span className={styles.statDivider}>•</span>
          <span className={styles.statItem}>{assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'}</span>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.classroomContainer}>
      <section className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Classroom</h1>
        <p className={styles.pageSubtitle}>Structured lessons and courses for learning music theory</p>
      </section>

      {/* My Classes Section */}
      {user && (
        <section className={styles.classesSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>My Classes</h2>
            <div className={styles.sectionButtons}>
              <button
                className={styles.joinClassButton}
                onClick={handleOpenJoinModal}
                aria-label="Join a classroom"
                title="Join a classroom with code"
              >
                Join
              </button>
              <button
                className={styles.createButton}
                onClick={handleOpenModal}
                aria-label="Create new classroom"
                title="Create new classroom"
              >
                Create
              </button>
            </div>
          </div>

          {loading ? (
            <div className={styles.loadingState}>Loading classrooms...</div>
          ) : myClasses.length === 0 ? (
            <div className={styles.emptyState}>
              <p className={styles.emptyStateText}>You haven't created or joined any classes yet.</p>
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
          <h2 className={styles.sectionTitle}>Available Classes</h2>
          {!user && (
            <div className={styles.sectionButtons}>
              <button
                className={styles.joinClassButton}
                onClick={handleOpenJoinModal}
                aria-label="Join a classroom"
                title="Log in to join a classroom"
              >
                Join
              </button>
              <button
                className={styles.createButton}
                onClick={handleOpenModal}
                aria-label="Create new classroom"
                title="Log in to create a classroom"
              >
                Create
              </button>
            </div>
          )}
        </div>

        <div className={styles.searchContainer}>
          <svg className={styles.searchIcon} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input
            type="text"
            className={styles.searchInput}
            placeholder="Search classes..."
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
            return <div className={styles.loadingState}>Loading classrooms...</div>
          }
          if (availableClasses.length === 0) {
            return (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>
                  {user ? 'No more public classes available.' : 'No public classes yet. Be the first to create one!'}
                </p>
              </div>
            )
          }
          if (filteredClasses.length === 0) {
            return (
              <div className={styles.emptyState}>
                <p className={styles.emptyStateText}>No classes found matching "{searchQuery}"</p>
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
    </div>
  )
}

export default Classroom
