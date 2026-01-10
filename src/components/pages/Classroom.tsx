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
import { GUITAR_CHORDS } from '../../utils/instruments/guitar/guitarChords'
import { guitarNotes } from '../../utils/instruments/guitar/guitarNotes'
import { BASS_SCALES, BASS_ROOT_NOTES, getBassScalePositions } from '../../utils/instruments/bass/bassScales'
import { BASS_CHORDS } from '../../utils/instruments/bass/bassChords'
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
  profiles: {
    username: string | null
  } | null
  classroom_students: StudentData[]
  assignments: AssignmentData[]
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
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [joiningClassId, setJoiningClassId] = useState<string | null>(null)

  // Assignment creation state
  const [assigningToClassroomId, setAssigningToClassroomId] = useState<string | null>(null)
  const [showAssignTitleModal, setShowAssignTitleModal] = useState(false)
  const [assignmentTitle, setAssignmentTitle] = useState('')
  const [isSavingAssignment, setIsSavingAssignment] = useState(false)
  const [assignmentError, setAssignmentError] = useState<string | null>(null)

  // Lesson taking state
  const [currentAssignment, setCurrentAssignment] = useState<AssignmentData | null>(null)
  const [pendingSelectionData, setPendingSelectionData] = useState<any>(null)
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

      if (selectedClassroom) {
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
      const { error: insertError } = await supabase
        .from('classrooms')
        .insert({ title: newTitle.trim(), created_by: user.id })
      if (insertError) {
        setError(insertError.message)
        return
      }
      setNewTitle('')
      setIsModalOpen(false)
      fetchClassrooms()
    } catch (err) {
      setError('An error occurred while creating the classroom')
      console.error('Error creating classroom:', err)
    } finally {
      setCreating(false)
    }
  }

  // Enter assignment creation mode
  const handleCreateAssignment = (classroomId: string) => {
    setAssigningToClassroomId(classroomId)
    clearSelection()
    triggerClearChordsAndScales()
    setViewMode('creating-assignment')
  }

  // Cancel assignment creation
  const handleCancelAssignment = () => {
    setAssigningToClassroomId(null)
    clearSelection()
    triggerClearChordsAndScales()
    setViewMode('classroom')
  }

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

    const hasScales = scaleChordManagement.appliedScales.length > 0
    const hasChords = scaleChordManagement.appliedChords.length > 0
    const hasNotes = selectedNotes.length > 0
    const lessonType = hasChords ? 'chords' : 'melodies'

    const appliedScaleNames = scaleChordManagement.appliedScales.map(s => s.scale?.name || 'Major')
    const appliedChordNames = scaleChordManagement.appliedChords.map(c => c.chord?.name || 'Major')

    const selectionData = {
      selectedNoteIds: selectedNotes.map(n => n.id),
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

      // Success - go back to classroom view
      setAssigningToClassroomId(null)
      setShowAssignTitleModal(false)
      clearSelection()
      triggerClearChordsAndScales()
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

    // Clear existing content
    clearSelection()

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
    clearSelection()
    triggerClearChordsAndScales()
    setViewMode('classroom')
  }

  // Apply assignment selection data when in lesson mode
  useEffect(() => {
    if (viewMode !== 'taking-lesson' || !currentAssignment || hasInitializedNotes.current) return

    hasInitializedNotes.current = true
    const selectionData = currentAssignment.selection_data

    if (!selectionData) return

    // For keyboard, apply immediately; for guitar/bass, store as pending
    if (currentAssignment.instrument === 'keyboard') {
      // Set octave range
      const octaveLow = currentAssignment.octave_low || 4
      const octaveHigh = currentAssignment.octave_high || 5
      handleOctaveRangeChange(4 - octaveLow, octaveHigh - 5)

      setTimeout(() => {
        // Apply scales
        if (selectionData.appliedScales?.length > 0) {
          selectionData.appliedScales.forEach((scaleData: any) => {
            const scaleObj = KEYBOARD_SCALES.find(s => s.name === scaleData.scaleName)
            if (scaleObj) {
              scaleChordManagement.handleKeyboardScaleApply(scaleData.root, scaleObj, scaleData.octave || 4)
            }
          })
        }

        // Apply chords
        if (selectionData.appliedChords?.length > 0) {
          setChordMode('progression')
          selectionData.appliedChords.forEach((chordData: any) => {
            const chordObj = KEYBOARD_CHORDS.find(c => c.name === chordData.chordName)
            if (chordObj) {
              scaleChordManagement.handleKeyboardChordApply(chordData.root, chordObj, chordData.octave || 4)
            }
          })
        }

        // Apply notes
        if (selectionData.selectedNoteIds?.length > 0) {
          selectionData.selectedNoteIds.forEach((noteId: string) => {
            const noteObj = getKeyboardNoteById(noteId, 4 - octaveLow, octaveHigh - 5)
            if (noteObj) selectNote(noteObj, 'multi')
          })
        }
      }, 300)
    } else {
      // Guitar/Bass - store pending data
      setPendingSelectionData({
        instrument: currentAssignment.instrument,
        selectionData: selectionData
      })
    }
  }, [viewMode, currentAssignment, handleOctaveRangeChange, scaleChordManagement, setChordMode, selectNote])

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
              chordsToApply.push({
                id: `guitar-${chordData.root}-${chordObj.name}-${Date.now()}`,
                root: chordData.root,
                chord: chordObj as any,
                displayName: `${chordData.root} ${chordObj.name}`,
                noteKeys: [],
                fretZone: chordData.fretZone || 0
              })
            }
          })
        } else if (pendingInstrument === 'bass') {
          selectionData.appliedChords.forEach((chordData: any) => {
            let baseChordName = chordData.chordName.replace(/\s*\(Frets \d+-\d+\)$/, '')
            baseChordName = baseChordName.replace(/^[A-G][#b]?\s+/, '')
            const chordObj = BASS_CHORDS.find(c => c.name === baseChordName || c.name === chordData.chordName)
            if (chordObj) {
              chordsToApply.push({
                id: `bass-${chordData.root}-${chordObj.name}-${Date.now()}`,
                root: chordData.root,
                chord: chordObj as any,
                displayName: `${chordData.root} ${chordObj.name}`,
                noteKeys: [],
                fretZone: chordData.fretZone || 0
              })
            }
          })
        }

        if (chordsToApply.length > 0) {
          scaleChordManagement.setAppliedChordsDirectly(chordsToApply)
        }
      }

      // Apply notes
      const validNoteIds = (selectionData.selectedNoteIds || []).filter((id: string | null) => id !== null)
      if (validNoteIds.length > 0) {
        if (pendingInstrument === 'guitar' && scaleChordManagement.noteHandlers?.handleSetManualNotes) {
          scaleChordManagement.noteHandlers.handleSetManualNotes(validNoteIds)
        } else if (pendingInstrument === 'bass' && scaleChordManagement.bassNoteHandlers?.handleSetManualNotes) {
          scaleChordManagement.bassNoteHandlers.handleSetManualNotes(validNoteIds)
        } else {
          validNoteIds.forEach((noteId: string) => {
            const noteObj = pendingInstrument === 'guitar' ? getGuitarNoteById(noteId) : getBassNoteById(noteId)
            if (noteObj) {
              selectNote({
                id: noteObj.id,
                name: noteObj.name,
                frequency: noteObj.frequency,
                isBlack: noteObj.name.includes('#'),
                position: noteObj.position
              }, 'multi')
            }
          })
        }
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
    setError(null)
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) handleCloseModal()
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
          <button type="submit" className={styles.submitButton} disabled={creating || !newTitle.trim()}>
            {creating ? 'Creating...' : 'Create Classroom'}
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

    return (
      <div className={styles.classroomContainer}>
        <div className={practiceStyles.backButtonContainer}>
          <button className={practiceStyles.backButton} onClick={handleEndLesson} aria-label="End practice session">
            End Session
          </button>
          <button className={practiceStyles.doneButton} onClick={handleEndLesson} aria-label="Done with lesson">
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
          autoPlayAudio={autoPlayAudio}
          lessonType={currentAssignment.lesson_type as 'melodies' | 'chords' | undefined}
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
        {congratulationsMessage && <WelcomeSubtitle message={congratulationsMessage} onSpeechEnd={handleEndLesson} />}
      </div>
    )
  }

  // ========== RENDER: Creating Assignment Mode ==========
  if (viewMode === 'creating-assignment' && assigningToClassroomId) {
    return (
      <div className={styles.classroomContainer}>
        <div className={practiceStyles.assignmentModeBar}>
          <span className={practiceStyles.assignmentModeText}>Creating Assignment</span>
          <div className={practiceStyles.assignmentModeButtons}>
            <button className={practiceStyles.assignmentCancelButton} onClick={handleCancelAssignment}>
              Cancel
            </button>
            <button className={practiceStyles.assignmentAssignButton} onClick={handleOpenAssignModal}>
              Assign
            </button>
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
        />

        {assignTitleModal}
      </div>
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
            ←
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
  return (
    <div className={styles.classroomContainer}>
      <section className={styles.headerSection}>
        <h1 className={styles.pageTitle}>Classroom</h1>
        <p className={styles.pageSubtitle}>Structured lessons and courses for learning music theory</p>
      </section>

      <section className={styles.classesSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Available Classes</h2>
          <button
            className={styles.addButton}
            onClick={handleOpenModal}
            aria-label="Create new classroom"
            title={user ? 'Create new classroom' : 'Log in to create a classroom'}
          >
            +
          </button>
        </div>

        {loading ? (
          <div className={styles.loadingState}>Loading classrooms...</div>
        ) : classrooms.length === 0 ? (
          <div className={styles.emptyState}>
            <p className={styles.emptyStateText}>No classrooms yet. Be the first to create one!</p>
          </div>
        ) : (
          <div className={styles.classesGrid}>
            {classrooms.map((classroom) => {
              const studentCount = classroom.classroom_students?.length ?? 0
              const assignmentCount = classroom.assignments?.length ?? 0

              return (
                <div
                  key={classroom.id}
                  className={styles.classCardClickable}
                  onClick={() => { setSelectedClassroom(classroom); setViewMode('classroom') }}
                >
                  <h3 className={styles.classTitle}>{classroom.title}</h3>
                  <p className={styles.classAuthor}>by {classroom.profiles?.username ?? 'Unknown'}</p>
                  <p className={styles.classMeta}>Created {formatDate(classroom.created_at)}</p>
                  <div className={styles.classCardStats}>
                    <span className={styles.statItem}>{studentCount} {studentCount === 1 ? 'student' : 'students'}</span>
                    <span className={styles.statDivider}>•</span>
                    <span className={styles.statItem}>{assignmentCount} {assignmentCount === 1 ? 'assignment' : 'assignments'}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!user && error && <div className={styles.errorMessage}>{error}</div>}
      </section>

      {modal}
    </div>
  )
}

export default Classroom
